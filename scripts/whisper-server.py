#!/usr/bin/env python3
"""
Local Whisper transcription server for Epic Scribe.

Runs on localhost:5111 — accepts audio uploads, returns transcripts.
Audio never leaves the device. HIPAA compliant by architecture.

Usage:
  python3 scripts/whisper-server.py
  python3 scripts/whisper-server.py --model small   # higher accuracy
  python3 scripts/whisper-server.py --port 5111
"""

import argparse
import io
import json
import os
import sys
import tempfile
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

# Fix SSL certificates for model download (Python 3.10 on macOS)
try:
    import certifi
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
except ImportError:
    pass

import whisper

# Global model reference (loaded once at startup)
_model = None
_model_name = None


def get_model(model_name: str = "base"):
    global _model, _model_name
    if _model is None or _model_name != model_name:
        print(f"Loading Whisper model '{model_name}'...")
        _model = whisper.load_model(model_name)
        _model_name = model_name
        print(f"Model loaded and ready.")
    return _model


class WhisperHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self):
        """Health check."""
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ready",
                "model": _model_name or "not loaded"
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        """Transcribe uploaded audio."""
        if self.path != "/transcribe":
            self.send_response(404)
            self.end_headers()
            return

        start_time = time.time()

        # Read audio data from request body
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self._error(400, "No audio data received")
            return

        audio_data = self.rfile.read(content_length)

        # Save to temp file (Whisper needs a file path)
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_data)
            temp_path = f.name

        try:
            model = get_model()
            print(f"Transcribing {len(audio_data)} bytes of audio...")
            result = model.transcribe(temp_path, language="en", verbose=False)

            transcript = result.get("text", "").strip()
            elapsed = time.time() - start_time

            print(f"Transcribed in {elapsed:.1f}s: {len(transcript)} chars")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "transcript": transcript,
                "duration_seconds": elapsed,
            }).encode())
        except Exception as e:
            print(f"Transcription error: {e}", file=sys.stderr)
            self._error(500, str(e))
        finally:
            os.unlink(temp_path)

    def _error(self, code: int, message: str):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())

    def log_message(self, format, *args):
        """Quieter logging — only show transcription events."""
        if "POST /transcribe" in str(args) or "error" in str(args).lower():
            super().log_message(format, *args)


def main():
    parser = argparse.ArgumentParser(description="Local Whisper transcription server")
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium"])
    parser.add_argument("--port", type=int, default=5111)
    args = parser.parse_args()

    # Pre-load model at startup
    get_model(args.model)

    server = HTTPServer(("127.0.0.1", args.port), WhisperHandler)
    print(f"\nWhisper server running on http://localhost:{args.port}")
    print(f"Model: {args.model}")
    print(f"Ready for transcription requests.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
