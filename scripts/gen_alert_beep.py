"""Write assets/sounds/alert-beep.wav — two short tones (~0.45s) for EEG high-confidence."""
import math
import os
import struct
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "sounds", "alert-beep.wav")
RATE = 22050


def tone_block(samples: int, freq: float, amp: float) -> bytes:
    out = bytearray()
    for i in range(samples):
        env = min(1.0, i / 180.0, (samples - i) / 220.0)
        raw = 32767 * amp * env * math.sin(2 * math.pi * freq * (i / RATE))
        v = int(max(-32767, min(32767, raw)))
        out.extend(struct.pack("<h", v))
    return bytes(out)


def silence(samples: int) -> bytes:
    return struct.pack("<h", 0) * samples


def main() -> None:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    n1 = int(RATE * 0.16)
    gap = int(RATE * 0.045)
    n2 = int(RATE * 0.2)
    frames = tone_block(n1, 880.0, 0.58) + silence(gap) + tone_block(n2, 1040.0, 0.55)
    with wave.open(OUT, "wb") as wv:
        wv.setnchannels(1)
        wv.setsampwidth(2)
        wv.setframerate(RATE)
        wv.writeframes(frames)
    print("wrote", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
