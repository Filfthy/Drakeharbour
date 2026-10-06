# tools/make-parchment.py - the parchment for cards, tiles, banners and panels, cut from the blank parchment
# that goes with the title logo (art/blank parchment.png):
#   img/parchment.webp   a seamless tile from the middle of the sheet, 1024 x 400, shown at half that size
#                        (background-size 512px 200px) so it stays crisp on large screens
# The sheet's broad shading (lighter in the middle, darker towards its burnt edges) is evened out first,
# so that tiles don't show as lighter and darker blocks; then the tile's edges are blended across, so it
# repeats without seams. Pure PIL. Run: python tools/make-parchment.py
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "..", "art", "blank parchment.png")
OUT = os.path.join(HERE, "..", "img", "parchment.webp")
TILE = (1024, 400)
SCALE = 0.8        # the sheet's detail at the size the logo shows on the start screen, drawn at twice the density
INSET = 75         # keep this far (sheet pixels) inside the parchment, clear of the burnt edge
FEATHER = 90       # how wide the blend across the tile's seams is


def main():
    sheet = Image.open(SRC).convert("RGB")
    # the parchment's extent: everything that isn't the white round it
    ink = ImageChops.difference(sheet, Image.new("RGB", sheet.size, (255, 255, 255))).convert("L").point(lambda v: 255 if v > 30 else 0)
    x0, y0, x1, y1 = ink.getbbox()
    box = (x0 + INSET, y0 + INSET, x1 - INSET, y1 - INSET)
    w, h = round(TILE[0] / SCALE), round(TILE[1] / SCALE)
    cx, cy = (box[0] + box[2]) // 2, (box[1] + box[3]) // 2
    crop = sheet.crop((cx - w // 2, cy - h // 2, cx - w // 2 + w, cy - h // 2 + h))
    if crop.size != (w, h) or cx - w // 2 < box[0] or cy - h // 2 < box[1]:
        print("note: the tile reaches into the edge band", (cx - w // 2, cy - h // 2), box)
    img = crop.resize(TILE, Image.LANCZOS)
    # even out the broad shading: divide by a heavy blur, then bring back the average colour
    mean = ImageStat.Stat(img).mean
    low = img.filter(ImageFilter.GaussianBlur(70))
    bands = []
    for k, (b, l) in enumerate(zip(img.split(), low.split())):
        bp, lp = b.load(), l.load()
        out = Image.new("L", img.size)
        op = out.load()
        for y in range(img.size[1]):
            for x in range(img.size[0]):
                op[x, y] = max(0, min(255, round(bp[x, y] * mean[k] / max(1, lp[x, y]))))
        bands.append(out)
    flat = Image.merge("RGB", bands)
    # make it seamless: shift by half, so the seams cross the middle, and blend the original over them
    W, H = TILE
    shifted = ImageChops.offset(flat, W // 2, H // 2)
    mask = Image.new("L", TILE, 0)
    d = ImageDraw.Draw(mask)
    d.rectangle((W // 2 - FEATHER, 0, W // 2 + FEATHER, H), fill=255)
    d.rectangle((0, H // 2 - FEATHER, W, H // 2 + FEATHER), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER / 2.2))
    tile = Image.composite(flat, shifted, mask)
    tile.save(OUT, "WEBP", quality=86, method=6)
    m = ImageStat.Stat(tile).mean
    print(f"parchment.webp {W}x{H}, {os.path.getsize(OUT) // 1024} KB, average #{round(m[0]):02x}{round(m[1]):02x}{round(m[2]):02x}")


if __name__ == "__main__":
    main()
