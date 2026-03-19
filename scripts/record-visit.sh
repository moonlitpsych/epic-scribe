#!/bin/bash
#
# Record a patient visit using BlackHole + mic aggregate device.
#
# Usage:
#   ./scripts/record-visit.sh                    # Record, then transcribe
#   ./scripts/record-visit.sh --list-devices     # Show available audio devices
#   ./scripts/record-visit.sh --model small      # Use higher-accuracy Whisper model
#   ./scripts/record-visit.sh --no-transcribe    # Record only, skip transcription
#
# Press Ctrl+C to stop recording. Transcription starts automatically.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RECORDINGS_DIR="$SCRIPT_DIR/../recordings"
WHISPER_MODEL="base"
DO_TRANSCRIBE=true
DEVICE_NAME=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --list-devices)
            echo "Available audio input devices:"
            echo ""
            ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -A 100 "audio devices" | grep "^\[" || true
            echo ""
            echo "Look for your Aggregate Device (e.g., 'EpicScribeAggregate')"
            echo "If you don't see it, create one in Audio MIDI Setup first."
            exit 0
            ;;
        --model)
            WHISPER_MODEL="$2"
            shift 2
            ;;
        --device)
            DEVICE_NAME="$2"
            shift 2
            ;;
        --no-transcribe)
            DO_TRANSCRIBE=false
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create recordings directory
mkdir -p "$RECORDINGS_DIR"

# Auto-detect aggregate device if not specified
if [ -z "$DEVICE_NAME" ]; then
    # Try to find the aggregate device by name
    DEVICE_INDEX=$(ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | \
        grep -i "epicscribe\|aggregate" | \
        head -1 | sed -n 's/.*\[\([0-9]*\)\].*/\1/p' || echo "")

    if [ -z "$DEVICE_INDEX" ]; then
        echo "Could not auto-detect aggregate device."
        echo "Run with --list-devices to see available devices, then use --device <name>"
        echo ""
        echo "Or record from your default microphone (no speaker separation)?"
        read -p "Press Enter to use default mic, or Ctrl+C to cancel: "
        DEVICE_NAME="default"
    else
        DEVICE_NAME=":$DEVICE_INDEX"
    fi
fi

# Generate filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="$RECORDINGS_DIR/visit_${TIMESTAMP}.wav"

echo "=========================================="
echo "  Epic Scribe Visit Recorder"
echo "=========================================="
echo ""
echo "  Recording to: $OUTPUT_FILE"
echo "  Whisper model: $WHISPER_MODEL"
echo "  Device: $DEVICE_NAME"
echo ""
echo "  Press Ctrl+C to stop recording."
echo "=========================================="
echo ""

# Record — trap Ctrl+C to stop gracefully
trap 'echo ""; echo "Recording stopped."; echo ""' INT

if [ "$DEVICE_NAME" = "default" ]; then
    # Record from default input (mono)
    ffmpeg -f avfoundation -i ":default" \
        -ar 16000 -ac 1 \
        "$OUTPUT_FILE" 2>/dev/null || true
else
    # Record from aggregate device (multi-channel)
    ffmpeg -f avfoundation -i "$DEVICE_NAME" \
        -ar 16000 \
        "$OUTPUT_FILE" 2>/dev/null || true
fi

# Reset trap
trap - INT

# Check file was created
if [ ! -f "$OUTPUT_FILE" ] || [ ! -s "$OUTPUT_FILE" ]; then
    echo "Error: Recording file is empty or missing."
    exit 1
fi

DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT_FILE" 2>/dev/null | cut -d. -f1)
echo "Recorded ${DURATION}s of audio."
echo ""

# Transcribe
if [ "$DO_TRANSCRIBE" = true ]; then
    echo "Starting transcription..."
    SSL_CERT_FILE=$(python3 -c "import certifi; print(certifi.where())") \
        python3 "$SCRIPT_DIR/transcribe-visit.py" "$OUTPUT_FILE" --model "$WHISPER_MODEL"
else
    echo "Recording saved. To transcribe later:"
    echo "  python3 scripts/transcribe-visit.py $OUTPUT_FILE --model $WHISPER_MODEL"
fi
