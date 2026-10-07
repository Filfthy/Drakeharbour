# tools/make-parchment.py - the parchment for cards, tiles, banners and panels, cut from the blank parchment
# that goes with the title logo (art/blank parchment.png), and coloured to match the logo's own parchment:
#   img/parchment.webp   a seamless tile from the middle of the sheet, 1024 x 400, shown at half that size
#                        (background-size 512px 200px) so it stays crisp on large screens
#   img/parch-edge.png   the whole sheet, small, with its browned rim and clear round it: a frame laid over
#                        parchment pieces (border-image), so they have the logo's browned edges
#   img/parch-mask.png   the sheet's torn outline, the same size: parchment pieces are cut to it, so their
#                        edges are slightly ragged rather than neatly rounded
# The sheet's broadest shading is evened out first, so tiles don't show as lighter and darker blocks (its
# mottling is kept); then the tile's edges are blended across, so it repeats without seams. Both images are
# matched to the logo's parchment colour: its average tone and how much it varies, in Lab.
# Pure PIL. Run: python tools/make-parchment.py (after tools/make-logo.py)
import os
from PIL import Image, ImageChops, ImageCms, ImageDraw, ImageFilter, ImageStat

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "..", "art", "blank parchment.png")
LOGO = os.path.join(HERE, "..", "img", "logo.webp")
OUT = os.path.join(HERE, "..", "img", "parchment.webp")
EDGE = os.path.join(HERE, "..", "img", "parch-edge.png")
MASK = os.path.join(HERE, "..", "img", "parch-mask.png")
TILE = (1024, 400)
SCALE = 0.8        # the sheet's detail at the size the logo shows on the start screen, drawn at twice the density
INSET = 75         # keep this far (sheet pixels) inside the parchment, clear of the burnt edge
FEATHER = 90       # how wide the blend across the tile's seams is
FLATTEN = 160      # shading broader than this (pixels) is evened out; the mottling inside it stays
EDGE_W = 600       # the frame image's width
FADE_AT = 40       # in the frame image's pixels: it is solid out to its browned rim, then fades out by about here
FADE_SOFT = 9      #   over about this far (the CSS slices it at 48, so it is clear by then)

SRGB, LAB = ImageCms.createProfile("sRGB"), ImageCms.createProfile("LAB")
TO_LAB = ImageCms.buildTransform(SRGB, LAB, "RGB", "LAB")
TO_RGB = ImageCms.buildTransform(LAB, SRGB, "LAB", "RGB")


def lab_stats(img_lab, mask=None):
    st = ImageStat.Stat(img_lab, mask)
    return st.mean, st.stddev


def logo_stats():
    """The logo's clean parchment (no lettering, no burnt edge), in Lab: the mean and spread of each channel."""
    lg = Image.open(LOGO).convert("RGBA")
    rgb, a = lg.convert("RGB"), lg.getchannel("A")
    inner = a.point(lambda v: 255 if v > 250 else 0).filter(ImageFilter.MinFilter(41))
    ink = rgb.convert("L").point(lambda v: 255 if v < 150 else 0).filter(ImageFilter.MaxFilter(9))
    clean = ImageChops.subtract(inner, ink)
    return lab_stats(ImageCms.applyTransform(rgb, TO_LAB), clean)


def match(img, target, source=None, mask=None):
    """Give img (RGB) the target's Lab means and spreads (as measured on img, or on source if given)."""
    lab = ImageCms.applyTransform(img, TO_LAB)
    mean, sd = lab_stats(ImageCms.applyTransform(source, TO_LAB) if source else lab, mask)
    tmean, tsd = target
    bands = []
    for k, band in enumerate(lab.split()):
        g = tsd[k] / max(0.5, sd[k])
        bands.append(band.point(lambda v, g=g, k=k: max(0, min(255, round((v - mean[k]) * g + tmean[k])))))
    return ImageCms.applyTransform(Image.merge("LAB", bands), TO_RGB)


def flatten(img, radius):
    """Divide out shading broader than radius, then bring back the average colour."""
    mean = ImageStat.Stat(img).mean
    low = img.filter(ImageFilter.GaussianBlur(radius))
    bands = []
    for k, (b, l) in enumerate(zip(img.split(), low.split())):
        bands.append(ImageChops.multiply(b, Image.new("L", b.size, 255)).point(lambda v: v))   # a copy
        bp, lp, op = b.load(), l.load(), bands[-1].load()
        for y in range(img.size[1]):
            for x in range(img.size[0]):
                op[x, y] = max(0, min(255, round(bp[x, y] * mean[k] / max(1, lp[x, y]))))
    return Image.merge("RGB", bands)


def main():
    target = logo_stats()
    sheet = Image.open(SRC).convert("RGB")
    # the parchment's extent: everything that isn't the white round it
    ink = ImageChops.difference(sheet, Image.new("RGB", sheet.size, (255, 255, 255))).convert("L").point(lambda v: 255 if v > 30 else 0)
    x0, y0, x1, y1 = ink.getbbox()
    # ---- the tile, from the middle
    w, h = round(TILE[0] / SCALE), round(TILE[1] / SCALE)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    crop = sheet.crop((cx - w // 2, cy - h // 2, cx - w // 2 + w, cy - h // 2 + h)).resize(TILE, Image.LANCZOS)
    flat = flatten(crop, FLATTEN)
    W, H = TILE
    shifted = ImageChops.offset(flat, W // 2, H // 2)
    mask = Image.new("L", TILE, 0)
    d = ImageDraw.Draw(mask)
    d.rectangle((W // 2 - FEATHER, 0, W // 2 + FEATHER, H), fill=255)
    d.rectangle((0, H // 2 - FEATHER, W, H // 2 + FEATHER), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER / 2.2))
    tile = match(Image.composite(flat, shifted, mask), target)
    tile.save(OUT, "WEBP", quality=86, method=6)
    m = ImageStat.Stat(tile).mean
    print(f"parchment.webp {W}x{H}, {os.path.getsize(OUT) // 1024} KB, average #{round(m[0]):02x}{round(m[1]):02x}{round(m[2]):02x}")
    # ---- the frame: the whole sheet with its browned rim, clear round it, coloured like the tile
    body = sheet.crop((x0, y0, x1, y1))
    alpha = ink.crop((x0, y0, x1, y1)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    inner_box = (INSET, INSET, body.width - INSET, body.height - INSET)
    middle = Image.new("L", body.size, 0)
    ImageDraw.Draw(middle).rectangle(inner_box, fill=255)
    framed = match(body, target, source=body.crop(inner_box))
    # the frame fades out towards the middle, so it melts into the tile laid under it
    k = EDGE_W / body.width
    fade = Image.new("L", body.size, 0)
    ImageDraw.Draw(fade).rectangle((round(FADE_AT / k), round(FADE_AT / k), body.width - round(FADE_AT / k), body.height - round(FADE_AT / k)), fill=255)
    fade = fade.filter(ImageFilter.GaussianBlur(FADE_SOFT / k))
    framed.putalpha(ImageChops.multiply(alpha, ImageChops.invert(fade)))
    eh = round(framed.height * EDGE_W / framed.width)
    framed.resize((EDGE_W, eh), Image.LANCZOS).save(EDGE, optimize=True)
    print(f"parch-edge.png {EDGE_W}x{eh}, {os.path.getsize(EDGE) // 1024} KB")
    # ---- the outline: the sheet's torn edge as a mask, the same size as the frame, so pieces can be cut to it
    # (flooded in from outside, so the light patches inside the parchment are kept)
    pad = 6
    sheet_rgb = sheet.crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
    key = (255, 0, 255)
    for seed in [(0, 0), (sheet_rgb.width - 1, 0), (0, sheet_rgb.height - 1), (sheet_rgb.width - 1, sheet_rgb.height - 1)]:
        if sheet_rgb.getpixel(seed) != key:
            ImageDraw.floodfill(sheet_rgb, seed, key, thresh=40)
    out = Image.new("L", sheet_rgb.size, 255)
    op, sp = out.load(), sheet_rgb.load()
    for y in range(sheet_rgb.height):
        for x in range(sheet_rgb.width):
            if sp[x, y] == key:
                op[x, y] = 0
    sharp = out.crop((pad, pad, pad + body.width, pad + body.height)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    shape = Image.new("RGBA", body.size, (255, 255, 255, 0))
    shape.putalpha(sharp)
    shape.resize((EDGE_W, eh), Image.LANCZOS).save(MASK, optimize=True)
    print(f"parch-mask.png {EDGE_W}x{eh}, {os.path.getsize(MASK) // 1024} KB")


if __name__ == "__main__":
    main()
