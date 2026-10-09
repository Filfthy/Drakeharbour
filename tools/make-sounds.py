# tools/make-sounds.py - recorded sounds for the game, cut from the sources in art/ (needs ffmpeg).
#   snd/choir.mp3: Faith arriving, the "aah" of art/short-choir.wav ("Short Choir" by Breviceps,
#   freesound.org/s/444491, CC0), its first 1.1 seconds, faded, mono.
# It also writes sounds-data.js, the same sounds as data URLs, for when the game is opened from disk
# (file:// pages can't fetch them).
import base64, os, subprocess

ROOT = os.path.join(os.path.dirname(__file__), "..")
SOUNDS = {
    "choir": ("art/short-choir.wav", "snd/choir.mp3", ["-ss", "0.04", "-t", "1.12", "-af", "afade=t=in:d=0.02,afade=t=out:st=0.72:d=0.4,loudnorm=I=-20:TP=-2", "-ac", "1", "-ar", "44100", "-b:a", "96k"]),
}

lines = []
for key, (src, dst, args) in SOUNDS.items():
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(ROOT, src)] + args + [os.path.join(ROOT, dst)], check=True)
    data = base64.b64encode(open(os.path.join(ROOT, dst), "rb").read()).decode()
    lines.append(f'  {key}: "data:audio/mpeg;base64,{data}"')
    print(dst, os.path.getsize(os.path.join(ROOT, dst)), "bytes")
with open(os.path.join(ROOT, "sounds-data.js"), "w", encoding="utf-8") as f:
    f.write("// sounds-data.js - made by tools/make-sounds.py: recorded sounds as data URLs (they work from disk too)\nconst SOUND_DATA = {\n" + ",\n".join(lines) + "\n};\n")
print("sounds-data.js written")
