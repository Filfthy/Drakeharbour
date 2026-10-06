# tools/make-textures.py - generates the tileable textures in img/ (the parchment is cut from the user's
# blank parchment by tools/make-parchment.py):
#   wood.webp       dark wood for the table
#   leather.webp    dark leather for player boards
# Pure PIL (no numpy). Run: python tools/make-textures.py
import math, os, random
from PIL import Image, ImageFilter, ImageChops, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "img")
random.seed(7)


def noise(w, h):
    return Image.frombytes("L", (w, h), os.urandom(w * h))


def tile_smooth(cells_w, cells_h, size_w, size_h):
    """Smooth, tileable noise: random cells, tiled 3x3, scaled up, centre cropped."""
    small = noise(cells_w, cells_h)
    big = Image.new("L", (cells_w * 3, cells_h * 3))
    for i in range(3):
        for j in range(3):
            big.paste(small, (i * cells_w, j * cells_h))
    big = big.resize((size_w * 3, size_h * 3), Image.BICUBIC)
    return big.crop((size_w, size_h, size_w * 2, size_h * 2))


def tile_blur(img, radius):
    """Gaussian blur that wraps around, so the result still tiles."""
    w, h = img.size
    big = Image.new(img.mode, (w * 3, h * 3))
    for i in range(3):
        for j in range(3):
            big.paste(img, (i * w, j * h))
    big = big.filter(ImageFilter.GaussianBlur(radius))
    return big.crop((w, h, w * 2, h * 2))


def colourize(gray, dark, light):
    """Map a greyscale image onto a dark-to-light colour ramp."""
    lut = []
    for c in range(3):
        lut += [int(dark[c] + (light[c] - dark[c]) * i / 255) for i in range(256)]
    return Image.merge("RGB", (gray, gray, gray)).point(lut)


def mix(*layers):
    """Weighted sum of greyscale layers: mix((img, weight), ...), centred on 128."""
    w, h = layers[0][0].size
    acc = Image.new("L", (w, h), 128)
    for img, k in layers:
        # acc += (img - 128) * k
        lut = [max(0, min(255, int(128 + (i - 128) * k))) for i in range(256)]
        acc = ImageChops.add(acc, img.point(lut), scale=1.0, offset=-128)
    return acc


def normalise(img, lo_pct=2, hi_pct=98):
    """Map the lo..hi percentile range of a greyscale image onto 0..255."""
    hist = img.histogram()
    total = sum(hist)
    acc, lo, hi = 0, 0, 255
    for i, n in enumerate(hist):
        acc += n
        if acc <= total * lo_pct / 100: lo = i
        if acc <= total * hi_pct / 100: hi = i
    return stretch(img, lo, hi)


def stretch(img, lo, hi):
    lut = [max(0, min(255, int((i - lo) * 255 / max(1, hi - lo)))) for i in range(256)]
    return img.point(lut)


def wood(w=1024, h=512):
    # grain: noise stretched hard along x
    grain = tile_smooth(4, 90, w, h)
    rings = tile_smooth(3, 30, w, h)
    fine = tile_blur(noise(w, h).resize((w, h)), 0.6)
    streaks = noise(w // 64, h).resize((w, h), Image.BICUBIC)
    g = normalise(mix((tile_blur(grain, 1.2), 1.0), (rings, 0.5), (tile_blur(streaks, 1.5), 0.3), (fine, 0.15)))
    return colourize(g, (33, 21, 13), (66, 42, 26))


def leather(size=512):
    mid = tile_blur(tile_smooth(28, 28, size, size), 5)
    fine = tile_blur(noise(size, size), 1.1)
    pores = tile_blur(noise(size, size), 0.5)
    g = normalise(mix((mid, 0.6), (fine, 0.45), (pores, 0.25)))
    return colourize(g, (52, 31, 20), (84, 54, 35))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    import sys
    which = sys.argv[1:] or ["wood", "leather"]
    if "wood" in which:
        wood().save(os.path.join(OUT, "wood.webp"), "WEBP", quality=84, method=6)
    if "leather" in which:
        leather().save(os.path.join(OUT, "leather.webp"), "WEBP", quality=84, method=6)
    print("ok")
