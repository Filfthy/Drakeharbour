# tools/make-folk.py - cuts the townsfolk sprite sheet into the atlas the animated map walks them from:
#   img/folk.png     every frame on a transparent background, one row per kind of figure, each frame in a
#                    cell of its row's size, feet at the middle of the cell's bottom edge; drawn at twice
#                    the size it appears on the map
#   folk-sheet.js    the atlas's layout (cell sizes), as a script so it loads when the game is opened from disk
# The source (art/townsfolk.png or .webp) is six rows, on white or on transparent: the traveller, the guard,
# the porter, the monk, the lady and the horse and cart. Each row has sixteen frames: four walking towards you, four
# walking left, four walking right and four walking away. The frames are found from the gaps between them.
# Pure PIL. Run: python tools/make-folk.py
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, "..")
OUT = os.path.join(ROOT, "img", "folk.png")
JS = os.path.join(ROOT, "folk-sheet.js")
KINDS = ["traveller", "guard", "porter", "monk", "lady", "cart"]
PERSON = 26        # a person's height in the atlas (twice the 13 map pixels they stand on the map)
PAD = 2


def pixels(img):
    return list(getattr(img, "get_flattened_data", img.getdata)())


def runs(profile, thresh, min_gap):
    """Stretches where profile > thresh, split by gaps of at least min_gap."""
    out, start, gap = [], None, 0
    for i, v in enumerate(profile):
        if v > thresh:
            if start is None:
                start = i
            gap, end = 0, i
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                out.append((start, end + 1))
                start, gap = None, 0
    if start is not None:
        out.append((start, end + 1))
    return out


def cutout(frame):
    """The frame on transparent: the white round it, flooded in from the edges, becomes clear."""
    rgb = frame.convert("RGB")
    w, h = rgb.size
    key = (255, 0, 255)
    flood = rgb.copy()
    for x in range(w):
        for y in (0, h - 1):
            if flood.getpixel((x, y)) != key and min(flood.getpixel((x, y))) > 200:
                ImageDraw.floodfill(flood, (x, y), key, thresh=60)
    for y in range(h):
        for x in (0, w - 1):
            if flood.getpixel((x, y)) != key and min(flood.getpixel((x, y))) > 200:
                ImageDraw.floodfill(flood, (x, y), key, thresh=60)
    mask = Image.new("L", (w, h), 255)
    mp, fp = mask.load(), flood.load()
    for y in range(h):
        for x in range(w):
            if fp[x, y] == key:
                mp[x, y] = 0
    out = rgb.convert("RGBA")
    out.putalpha(mask)
    return out


def main():
    src = next((p for p in [os.path.join(ROOT, "art", n) for n in ("townsfolk.png", "townsfolk.webp", "townsfolk.jpg")] if os.path.exists(p)), None)
    if not src:
        raise SystemExit("Save the sprite sheet as art/townsfolk.png first.")
    raw = Image.open(src)
    W, H = raw.size
    clear = raw.mode in ("RGBA", "LA") or "transparency" in raw.info
    sheet = raw.convert("RGBA") if clear else raw.convert("RGB")
    # ink: anything solid on a transparent sheet, or anything clearly not white on a white one
    if clear:
        ink = sheet.getchannel("A").point(lambda v: 255 if v > 40 else 0)
    else:
        ink = ImageChops.difference(sheet, Image.new("RGB", sheet.size, (255, 255, 255))).convert("L").point(lambda v: 255 if v > 40 else 0)
    rows = runs(pixels(ink.resize((1, H), Image.BOX)), 2, max(4, H // 120))
    rows = [r for r in rows if r[1] - r[0] > H // 30]
    if len(rows) != len(KINDS):
        raise SystemExit(f"expected {len(KINDS)} rows of figures, found {len(rows)}: {rows}")
    frames = []
    for (y0, y1) in rows:
        band = ink.crop((0, y0, W, y1))
        cols = runs(pixels(band.resize((W, 1), Image.BOX)), 2, max(3, W // 400))
        cols = [c for c in cols if c[1] - c[0] > W // 80]
        if len(cols) != 16:
            raise SystemExit(f"expected 16 frames in the row at y {y0}, found {len(cols)}")
        row = []
        for (x0, x1) in cols:
            f = sheet.crop((x0, y0, x1, y1)) if clear else cutout(sheet.crop((x0, y0, x1, y1)))
            row.append(f.crop(f.getchannel("A").getbbox()))
        frames.append(row)
    # one scale for every figure, so they keep their sizes: a person stands PERSON pixels tall
    heights = sorted(f.height for row in frames[:5] for f in row)
    k = PERSON / heights[len(heights) // 2]
    cells, atlas_rows = [], []
    for row in frames:
        cw = max(round(f.width * k) for f in row) + 2 * PAD
        ch = max(round(f.height * k) for f in row) + 2 * PAD
        cells.append((cw, ch))
        atlas_rows.append([f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS) for f in row])
    aw = max(cw * 16 for cw, _ in cells)
    ah = sum(ch for _, ch in cells)
    atlas = Image.new("RGBA", (aw, ah), (0, 0, 0, 0))
    y = 0
    for (cw, ch), row in zip(cells, atlas_rows):
        for i, f in enumerate(row):
            atlas.alpha_composite(f, (i * cw + (cw - f.width) // 2, y + ch - PAD - f.height))
        y += ch
    atlas.save(OUT, optimize=True)
    with open(JS, "w", encoding="utf-8") as fh:
        fh.write("// made by tools/make-folk.py from art/townsfolk.png: the layout of img/folk.png. Each row is one kind of\n")
        fh.write("// figure in cells of [width, height] (atlas pixels, twice map pixels), sixteen frames: four towards you,\n")
        fh.write("// four walking left, four right, four away; feet at the middle of each cell's bottom edge, PAD up.\n")
        fh.write("const FOLK_SHEET = { pad: %d, rows: {\n" % PAD)
        y = 0
        for name, (cw, ch) in zip(KINDS, cells):
            fh.write(f"  {name}: {{ y: {y}, w: {cw}, h: {ch} }},\n")
            y += ch
        fh.write("} };\n")
    print(f"folk.png {aw}x{ah} from {os.path.basename(src)} ({W}x{H}); scale {k:.3f}; cells " + ", ".join(f"{n} {c[0]}x{c[1]}" for n, c in zip(KINDS, cells)))


if __name__ == "__main__":
    main()
