# tools/build-zip.py - packs the game for itch.io: dist/drakeharbour-itch.zip, index.html at the top.
# Takes the files git tracks, minus the tools, the art sources, the old poker prototype and images
# the game no longer loads.
import os, subprocess, zipfile
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SKIP_DIRS = ("tools/", "dist/", "art/", "old-poker/")
SKIP = {".gitignore", "spells.af", "spells.png", "img/map-wide-v2.webp", "img/bugvictim-scroll.webp",
        "img/more-games-german-whist.webp"}
files = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.splitlines()
files = [f for f in files if not f.startswith(SKIP_DIRS) and f not in SKIP]
out = os.path.join(ROOT, "dist", "drakeharbour-itch.zip")
os.makedirs(os.path.dirname(out), exist_ok=True)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(os.path.join(ROOT, f), f)
print(len(files), "files ->", out, os.path.getsize(out) // 1024, "KB")
