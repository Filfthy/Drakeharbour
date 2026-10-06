# tools/make-suits.py - cuts the suit art in art/ into web images in img/:
#   emb-<suit>.webp  the large, ornate emblem in the middle of a card (from art/suit-emblems.webp)
#   pip-<suit>.webp  the simple emblem under a card's corner index (from art/suit-pips.webp)
# Each source sheet holds four emblems in a 2x2 grid on cream: dragon, moon / raven, tower.
# The cream becomes transparent, and the raven is mirrored so it faces away from the dragon.
# Pure PIL (no numpy). Run: python tools/make-suits.py
import os
from PIL import Image, ImageChops, ImageOps


def pixels(img):
    """All of an image's pixel values (Pillow 12 renamed getdata)."""
    return list(getattr(img, "get_flattened_data", img.getdata)())


HERE = os.path.dirname(__file__)
ART = os.path.join(HERE, "..", "art")
OUT = os.path.join(HERE, "..", "img")
NAMES = [["dragon", "moon"], ["raven", "tower"]]
MIRROR = {"raven"}


def background(im):
    """The sheet's cream: the average of its four corners."""
    w, h = im.size
    px = [im.getpixel(p) for p in [(3, 3), (w - 4, 3), (3, h - 4), (w - 4, h - 4)]]
    return tuple(round(sum(p[i] for p in px) / 4) for i in range(3))


def alpha_of(im, bg, lo=14, hi=70):
    """How far each pixel is from the cream (largest channel difference), as opacity."""
    d = ImageChops.difference(im, Image.new("RGB", im.size, bg))
    r, g, b = d.split()
    m = ImageChops.lighter(ImageChops.lighter(r, g), b)
    return m.point(lambda v: 0 if v <= lo else 255 if v >= hi else round((v - lo) * 255 / (hi - lo)))


def empty_run(profile, start, end, limit=0.6):
    """The middle of the longest stretch of near-empty columns (or rows) between start and end."""
    best, run = (0, start), None
    for i in range(start, end):
        if profile[i] < limit:
            run = i if run is None else run
            if i - run + 1 > best[0]:
                best = (i - run + 1, run)
        else:
            run = None
    return best[1] + best[0] // 2


def split(mask):
    """Four boxes, one per emblem, from the gaps between them."""
    w, h = mask.size
    cols = pixels(mask.resize((w, 1), Image.BOX))
    x = empty_run(cols, int(w * 0.3), int(w * 0.7))
    boxes = []
    for x0, x1 in [(0, x), (x, w)]:
        half = mask.crop((x0, 0, x1, h))
        rows = pixels(half.resize((1, h), Image.BOX))
        y = empty_run(rows, int(h * 0.3), int(h * 0.7))
        boxes.append([(x0, 0, x1, y), (x0, y, x1, h)])
    return [[boxes[0][0], boxes[1][0]], [boxes[0][1], boxes[1][1]]]


def cut(im, mask, bg, box, size, pad=0.04):
    """One emblem: trimmed, its edge colours freed of the cream, centred on a transparent square."""
    part, a = im.crop(box), mask.crop(box)
    bb = a.point(lambda v: 255 if v > 60 else 0).getbbox()
    part, a = part.crop(bb), a.crop(bb)
    # un-mix the cream from half-transparent edge pixels so no pale fringe shows on parchment
    rgb, al = pixels(part), pixels(a)
    out = []
    for (r, g, b), v in zip(rgb, al):
        if v == 0:
            out.append((0, 0, 0, 0))
        elif v == 255:
            out.append((r, g, b, 255))
        else:
            k = v / 255
            out.append(tuple(max(0, min(255, round((c - (1 - k) * c0) / k))) for c, c0 in zip((r, g, b), bg)) + (v,))
    rgba = Image.new("RGBA", part.size)
    rgba.putdata(out)
    w, h = rgba.size
    side = round(max(w, h) * (1 + 2 * pad))
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(rgba, ((side - w) // 2, (side - h) // 2))
    return sq.resize((size, size), Image.LANCZOS)


def sheet(src, prefix, size):
    im = Image.open(os.path.join(ART, src)).convert("RGB")
    bg = background(im)
    mask = alpha_of(im, bg)
    boxes = split(mask)
    for i in range(2):
        for j in range(2):
            name = NAMES[i][j]
            e = cut(im, mask, bg, boxes[i][j], size)
            if name in MIRROR:
                e = ImageOps.mirror(e)
            path = os.path.join(OUT, f"{prefix}-{name}.webp")
            e.save(path, "WEBP", quality=92, method=6)
            print(path, e.size, "box", boxes[i][j])


sheet("suit-emblems.webp", "emb", 256)
sheet("suit-pips.webp", "pip", 128)
