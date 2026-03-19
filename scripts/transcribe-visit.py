#!/usr/bin/env python3
"""
Transcribe a visit recording with speaker labels.

Usage:
  python3 scripts/transcribe-visit.py recording.wav
  python3 scripts/transcribe-visit.py recording.wav --patient-id <uuid>
  python3 scripts/transcribe-visit.py recording.wav --model small

Expects a multi-channel WAV from EpicScribeAggregate:
  - Channel 0: AirPods Pro mic (provider — telehealth)
  - Channels 1-2: BlackHole 2ch (patient/system audio)
  - Channel 3: MacBook Air Microphone (provider — in-person)

The script auto-detects which mic has audio and uses it as the provider channel.

Outputs a labeled transcript to stdout and copies to clipboard.
"""

import argparse
import certifi
import os
import ssl
import subprocess
import sys
import tempfile
import time

# Fix SSL certificates for Python 3.10 on macOS
os.environ.setdefault("SSL_CERT_FILE", certifi.where())


def get_channel_volume(input_file: str, channel: int) -> float:
    """Get mean volume (dB) of a specific channel. Returns -91.0 for silence."""
    result = subprocess.run([
        "ffmpeg", "-i", input_file,
        "-af", f"pan=mono|c0=c{channel},volumedetect",
        "-f", "null", "/dev/null"
    ], capture_output=True, text=True)
    for line in result.stderr.split('\n'):
        if 'mean_volume' in line:
            return float(line.split('mean_volume:')[1].split('dB')[0].strip())
    return -91.0


def detect_channel_roles(input_file: str, total_channels: int) -> tuple:
    """Auto-detect which channels are provider mic vs patient (BlackHole).

    BlackHole channels always come in stereo pairs with near-identical volume.
    The provider mic is a mono channel with different volume from BlackHole.

    Returns (provider_channels, patient_channels) as lists of channel indices.
    """
    if total_channels < 2:
        return ([0], [])

    # Measure volume on all channels
    volumes = []
    for ch in range(total_channels):
        vol = get_channel_volume(input_file, ch)
        volumes.append(vol)
        print(f"  Channel {ch}: {vol:.1f} dB", file=sys.stderr)

    # Find stereo pairs (BlackHole) — two adjacent channels with near-identical volume
    blackhole_channels = []
    mic_channels = []

    i = 0
    while i < total_channels:
        if i + 1 < total_channels and abs(volumes[i] - volumes[i + 1]) < 3.0 and volumes[i] > -88.0:
            # Stereo pair — likely BlackHole
            blackhole_channels.extend([i, i + 1])
            i += 2
        elif i + 1 < total_channels and abs(volumes[i] - volumes[i + 1]) < 3.0 and volumes[i] <= -88.0:
            # Silent stereo pair — still BlackHole, just no system audio playing
            blackhole_channels.extend([i, i + 1])
            i += 2
        else:
            mic_channels.append(i)
            i += 1

    # If detection didn't find BlackHole pairs, fall back to heuristic:
    # last mono channel is mic, everything else is BlackHole
    if not blackhole_channels and total_channels >= 3:
        blackhole_channels = list(range(0, total_channels - 1))
        mic_channels = [total_channels - 1]

    print(f"  Detected: mic={mic_channels}, blackhole={blackhole_channels}", file=sys.stderr)
    return (mic_channels, blackhole_channels)


def split_channels(input_file: str, total_channels: int) -> tuple:
    """Split multi-channel recording into provider and patient audio files."""
    tmpdir = tempfile.mkdtemp(prefix="visit_transcribe_")
    provider_file = os.path.join(tmpdir, "provider.wav")
    patient_file = os.path.join(tmpdir, "patient.wav")

    if total_channels >= 3:
        # Auto-detect channel roles (handles AirPods connected or disconnected)
        mic_chs, bh_chs = detect_channel_roles(input_file, total_channels)

        # Provider = sum all mic channels
        if mic_chs:
            mic_sum = "+".join(f"c{ch}" for ch in mic_chs)
            provider_filter = f"pan=mono|c0={mic_sum}"
        else:
            provider_filter = "pan=mono|c0=c0"

        # Patient = first BlackHole channel (L and R are identical)
        if bh_chs:
            patient_filter = f"pan=mono|c0=c{bh_chs[0]}"
        else:
            patient_filter = "pan=mono|c0=c1"

        subprocess.run([
            "ffmpeg", "-y", "-i", input_file,
            "-filter_complex", f"[0:a]{provider_filter}[provider];[0:a]{patient_filter}[patient]",
            "-map", "[provider]", provider_file,
            "-map", "[patient]", patient_file,
        ], check=True, capture_output=True)
    elif total_channels == 2:
        # Stereo: left = provider, right = patient
        subprocess.run([
            "ffmpeg", "-y", "-i", input_file,
            "-filter_complex", "[0:a]pan=mono|c0=c0[provider];[0:a]pan=mono|c0=c1[patient]",
            "-map", "[provider]", provider_file,
            "-map", "[patient]", patient_file,
        ], check=True, capture_output=True)
    else:
        # Mono: single speaker, no separation possible
        subprocess.run(["ffmpeg", "-y", "-i", input_file, provider_file],
                       check=True, capture_output=True)
        patient_file = None

    return provider_file, patient_file


def get_channel_count(input_file: str) -> int:
    """Get number of audio channels in the file."""
    result = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=channels",
        "-of", "csv=p=0", input_file
    ], capture_output=True, text=True)
    return int(result.stdout.strip())


def transcribe(audio_file: str, model: str = "base") -> list:
    """Transcribe audio file using Whisper. Returns segments with timestamps."""
    import whisper

    print(f"  Loading Whisper model '{model}'...", file=sys.stderr)
    m = whisper.load_model(model)

    print(f"  Transcribing...", file=sys.stderr)
    result = m.transcribe(audio_file, language="en", verbose=False)

    return result.get("segments", [])


def merge_segments(provider_segs: list, patient_segs: list) -> str:
    """Merge provider and patient segments by timestamp into a labeled transcript."""
    labeled = []

    for seg in provider_segs:
        text = seg["text"].strip()
        if text:
            labeled.append((seg["start"], "Provider", text))

    if patient_segs:
        for seg in patient_segs:
            text = seg["text"].strip()
            if text:
                labeled.append((seg["start"], "Patient", text))

    # Sort by timestamp
    labeled.sort(key=lambda x: x[0])

    # Merge consecutive same-speaker segments
    merged_lines = []
    current_speaker = None
    current_text = []

    for _, speaker, text in labeled:
        if speaker == current_speaker:
            current_text.append(text)
        else:
            if current_speaker and current_text:
                merged_lines.append(f"{current_speaker}: {' '.join(current_text)}")
            current_speaker = speaker
            current_text = [text]

    if current_speaker and current_text:
        merged_lines.append(f"{current_speaker}: {' '.join(current_text)}")

    return "\n\n".join(merged_lines)


def copy_to_clipboard(text: str):
    """Copy text to macOS clipboard."""
    subprocess.run(["pbcopy"], input=text.encode(), check=True)


def main():
    parser = argparse.ArgumentParser(description="Transcribe a visit recording with speaker labels")
    parser.add_argument("recording", help="Path to the WAV recording file")
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium"],
                        help="Whisper model size (default: base, use 'small' for better accuracy)")
    parser.add_argument("--patient-id", help="Epic Scribe patient UUID")
    parser.add_argument("--channels", type=int, help="Override channel count detection")
    parser.add_argument("--output", "-o", help="Save transcript to file")
    args = parser.parse_args()

    if not os.path.exists(args.recording):
        print(f"Error: File not found: {args.recording}", file=sys.stderr)
        sys.exit(1)

    start_time = time.time()

    # Detect channels
    channels = args.channels or get_channel_count(args.recording)
    print(f"Detected {channels} audio channel(s)", file=sys.stderr)

    # Split channels
    print("Splitting audio channels...", file=sys.stderr)
    provider_file, patient_file = split_channels(args.recording, channels)

    # Transcribe provider
    print("Transcribing provider audio...", file=sys.stderr)
    provider_segments = transcribe(provider_file, model=args.model)

    # Transcribe patient (if separate channel exists)
    patient_segments = []
    if patient_file and os.path.exists(patient_file):
        # Check if patient audio has actual content (not silence)
        result = subprocess.run([
            "ffmpeg", "-i", patient_file, "-af", "volumedetect", "-f", "null", "/dev/null"
        ], capture_output=True, text=True)
        if "mean_volume" in result.stderr:
            mean_vol_line = [l for l in result.stderr.split('\n') if 'mean_volume' in l]
            if mean_vol_line:
                vol = float(mean_vol_line[0].split('mean_volume:')[1].split('dB')[0].strip())
                if vol > -60:  # Not silence
                    print("Transcribing patient audio...", file=sys.stderr)
                    patient_segments = transcribe(patient_file, model=args.model)
                else:
                    print("Patient channel is silent (in-person visit?), skipping.", file=sys.stderr)

    # Merge into labeled transcript
    print("Merging transcript...", file=sys.stderr)
    if patient_segments:
        transcript = merge_segments(provider_segments, patient_segments)
    else:
        # Single speaker — output without labels
        transcript = "\n\n".join(
            seg["text"].strip() for seg in provider_segments if seg["text"].strip()
        )

    elapsed = time.time() - start_time
    print(f"\nDone in {elapsed:.1f}s", file=sys.stderr)

    # Output
    if args.output:
        with open(args.output, "w") as f:
            f.write(transcript)
        print(f"Saved to {args.output}", file=sys.stderr)
    else:
        print("\n" + "=" * 60, file=sys.stderr)
        print(transcript)

    # Copy to clipboard
    copy_to_clipboard(transcript)
    print("\nTranscript copied to clipboard.", file=sys.stderr)

    # Cleanup temp files
    if provider_file and os.path.exists(provider_file):
        os.unlink(provider_file)
    if patient_file and os.path.exists(patient_file):
        os.unlink(patient_file)


if __name__ == "__main__":
    main()
