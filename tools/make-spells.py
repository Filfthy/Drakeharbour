# tools/make-spells.py - cuts the spell art into web images in img/:
#   spell-<key>.webp  the emblem in the middle of a spell card, 256x256 on transparent
# The source sheet (spells.png, at the top of the project or in art/) holds six emblems on transparent,
# three to a row: blink, glamour, scry / recall, haggle, renew. The gaps between them are found from
# the picture itself, since some reach past the sheet's thirds and halves.
# Pure PIL. Run: python tools/make-spells.py
import os
from PIL import Image

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, "..")
OUT = os.path.join(ROOT, "img")
NAMES = [["blink", "glamour", "scry"], ["recall", "haggle", "renew"]]
SIZE, MARGIN = 256, 0.03


def pixels(img):
    """All of an image's pixel values (Pillow 12 renamed getdata)."""
    return list(getattr(img, "get_flattened_data", img.getdata)())


def gap(profile, start, end):
    """The middle of the longest stretch of (nearly) empty columns or rows between start and end."""
    best, run = (0, start), None
    for i in range(start, end):
        if profile[i] < 0.5:
            run = i if run is None else run
            if i - run + 1 > best[0]:
                best = (i - run + 1, run)
        else:
            run = None
    return best[1] + best[0] // 2


def main():
    src = next(p for p in [os.path.join(ROOT, "art", "spells.png"), os.path.join(ROOT, "spells.png")] if os.path.exists(p))
    sheet = Image.open(src).convert("RGBA")
    w, h = sheet.size
    alpha = sheet.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    cols = pixels(alpha.resize((w, 1), Image.BOX))
    xs = [0, gap(cols, int(w * 0.2), int(w * 0.45)), gap(cols, int(w * 0.55), int(w * 0.8)), w]
    for c in range(3):
        strip = alpha.crop((xs[c], 0, xs[c + 1], h))
        rows = pixels(strip.resize((1, h), Image.BOX))
        ys = [0, gap(rows, int(h * 0.3), int(h * 0.7)), h]
        for r in range(2):
            box = (xs[c], ys[r], xs[c + 1], ys[r + 1])
            bb = alpha.crop(box).getbbox()
            art = sheet.crop(box).crop(bb)
            side = round(max(art.size) * (1 + 2 * MARGIN))
            sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
            sq.paste(art, ((side - art.width) // 2, (side - art.height) // 2))
            sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
            name = NAMES[r][c]
            sq.save(os.path.join(OUT, f"spell-{name}.webp"), "WEBP", quality=92, method=6)
            print(f"spell-{name}.webp  from {box} (art {art.size[0]}x{art.size[1]})")


if __name__ == "__main__":
    main()
