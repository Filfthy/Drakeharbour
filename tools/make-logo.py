# tools/make-logo.py - cuts the title logo (art/title-logo.webp, a torn parchment on white) into web images:
#   img/logo.webp        the start screen's title, 1200 pixels wide
#   img/logo-small.webp  the corner badge during a game, 520 pixels wide
# The white round the parchment is found by flooding in from the edges, so whites inside the parchment
# stay put; the cut edge is softened by a pixel and cleared of its white fringe.
# Pure PIL. Run: python tools/make-logo.py
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "..", "art", "title-logo.webp")
OUT = os.path.join(HERE, "..", "img")
KEY = (255, 0, 255)


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    flood = im.copy()
    seeds = [(x, y) for x in range(0, w, 40) for y in (0, h - 1)] + [(x, y) for y in range(0, h, 40) for x in (0, w - 1)]
    for s in seeds:
        if flood.getpixel(s) != KEY and min(flood.getpixel(s)) > 225:
            ImageDraw.floodfill(flood, s, KEY, thresh=48)
    r, g, b = flood.split()
    # the background: exactly the flood colour
    bg = Image.merge("RGB", (r, g, b)).point(lambda v: v).convert("RGB")
    mask = Image.new("L", (w, h), 255)
    mp, fp = mask.load(), bg.load()
    for y in range(h):
        for x in range(w):
            if fp[x, y] == KEY:
                mp[x, y] = 0
    alpha = mask.filter(ImageFilter.GaussianBlur(0.8))
    # clear the white fringe from the half-transparent edge: colour = (c - (1 - a) * white) / a
    rgba = im.convert("RGBA")
    px, ap = rgba.load(), alpha.load()
    for y in range(h):
        for x in range(w):
            a = ap[x, y]
            if a == 0:
                px[x, y] = (0, 0, 0, 0)
            elif a < 255:
                f = a / 255
                c = px[x, y]
                px[x, y] = tuple(max(0, min(255, round((c[i] - (1 - f) * 255) / f))) for i in range(3)) + (a,)
    rgba = rgba.crop(rgba.getchannel("A").getbbox())
    for name, width in (("logo", 1200), ("logo-small", 520)):
        out = rgba.resize((width, round(rgba.height * width / rgba.width)), Image.LANCZOS)
        out.save(os.path.join(OUT, f"{name}.webp"), "WEBP", quality=90, method=6)
        print(f"{name}.webp {out.size[0]}x{out.size[1]}")


if __name__ == "__main__":
    main()
