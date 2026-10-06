# tools/make-characters.py - cuts the character art in art/ into web images in img/.
# A character sheet (art/char-<key>.webp) shows, left to right, a shield, a round portrait and
# a full-length figure, on a plain background, with the character's name above them.
#   arms-<key>.webp      the shield, for Charters a character owns
#   portrait-<key>.webp  the round portrait, for name plates and the player's board
# The pieces for the map come from art/tokens.webp: the five figures in outlined panels, in
# the order of TOKEN_ORDER. (Without it, the figure on each character sheet is used.)
#   token-<key>.webp     the figure, standing on the town map as the player's piece, drawn
#                        with a light outline so it stands out on the painting
# The background is removed by flooding in from the edges, so pale colours inside a
# picture stay, and each picture is cut along its own outline, not a rectangle.
# Pure PIL (no numpy). Run: python tools/make-characters.py [key ...] [--outline=light|dark|none]
import os, sys
from array import array
from collections import deque
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(__file__)
ART = os.path.join(HERE, "..", "art")
OUT = os.path.join(HERE, "..", "img")
SIZES = {"arms": 180, "portrait": 200, "token": 280}   # height of each output, in pixels
TOL = 26              # how far from the background a pixel can be and still count as background
OUTLINE = {"light": [((251, 243, 222), 5), ((40, 24, 12), 6.5)], "dark": [((26, 15, 6), 4)], "none": []}
TOKEN_ORDER = ["aldric", "velia", "anselm", "orrin", "kestra"]   # left to right in art/tokens.webp


def pixels(img):
    return list(getattr(img, "get_flattened_data", img.getdata)())


def background(im):
    """The sheet's background colour: the median of its border pixels."""
    w, h = im.size
    border = [im.getpixel((x, y)) for x in range(0, w, 7) for y in (0, h - 1)] + [im.getpixel((x, y)) for y in range(0, h, 7) for x in (0, w - 1)]
    return tuple(sorted(p[i] for p in border)[len(border) // 2] for i in range(3))


def distance(im, bg):
    """For each pixel, its largest channel difference from the background."""
    r, g, b = ImageChops.difference(im, Image.new("RGB", im.size, bg)).split()
    return ImageChops.lighter(ImageChops.lighter(r, g), b)


def flood(ok, w, h, seeds):
    """Every pixel reachable from the seeds through pixels where ok[i] is true."""
    seen = bytearray(w * h)
    q = deque()
    for i in seeds:
        if ok[i] and not seen[i]: seen[i] = 1; q.append(i)
    while q:
        i = q.popleft()
        x = i % w
        for j in (i - 1 if x > 0 else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
            if 0 <= j < w * h and not seen[j] and ok[j]:
                seen[j] = 1
                q.append(j)
    return seen


def label(fg, scale=2):
    """Connected pieces of the foreground, worked out at half size: a label for each pixel, and
    [(area, (x0, y0, x1, y1) in full-size pixels, label)]."""
    small = fg.resize((fg.size[0] // scale, fg.size[1] // scale), Image.BOX).point(lambda v: 255 if v > 40 else 0)
    w, h = small.size
    d = small.tobytes()
    lab = array("i", bytes(4 * w * h))
    out = []
    for s in range(w * h):
        if not d[s] or lab[s]: continue
        n = len(out) + 1
        lab[s] = n
        q, area, x0, y0, x1, y1 = [s], 0, w, h, 0, 0
        while q:
            i = q.pop()
            x, y = i % w, i // w
            area += 1
            x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if d[j] and not lab[j]: lab[j] = n; q.append(j)
        out.append((area, (x0 * scale, y0 * scale, (x1 + 1) * scale, (y1 + 1) * scale), n))
    return lab, (w, h), out


def pieces(fg):
    """The three pictures, left to right: the three biggest pieces, each with any small bits
    inside its box. Each comes with a mask of exactly its own pixels."""
    lab, (w, h), comps = label(fg)
    comps.sort(key=lambda c: -c[0])
    big = [{"box": list(c[1]), "ids": {c[2]}} for c in comps[:3]]
    for area, (x0, y0, x1, y1), n in comps[3:]:
        for b in big:
            bx = b["box"]
            if x0 >= bx[0] - 12 and x1 <= bx[2] + 12 and y0 >= bx[1] - 12 and y1 <= bx[3] + 12:
                b["ids"].add(n)
                bx[0], bx[1], bx[2], bx[3] = min(bx[0], x0), min(bx[1], y0), max(bx[2], x1), max(bx[3], y1)
                break
    out = []
    for b in sorted(big, key=lambda b: b["box"][0]):
        ids = b["ids"]
        small = Image.frombytes("L", (w, h), bytes(255 if lab[i] in ids else 0 for i in range(w * h)))
        mask = small.resize((w * 2, h * 2), Image.NEAREST).filter(ImageFilter.MaxFilter(7))
        if mask.size != fg.size: mask = mask.crop((0, 0) + fg.size) if mask.size[0] >= fg.size[0] else Image.new("L", fg.size).paste(mask)
        out.append((tuple(b["box"]), mask))
    return out


def shadow_of(im, bgseen, bg, box, w, h, dist):
    """The figure's ground shadow: background-like pixels darkened (the background colour times
    some k, a little warmer), reached from the background in the band under the feet, together
    with any background they enclose, like the gap between a figure's legs. Only flat background
    and smooth shadow count, so pale cloth (embroidered, folded) touching the ground is left alone.
    Returns the shadow's pixels and, for each, how dark it is (1 - k)."""
    x0, y0, x1, y1 = box
    zone_top = y1 - int(0.22 * (y1 - y0))
    px = im.load()
    hi, lo = dist.filter(ImageFilter.MaxFilter(5)).load(), dist.filter(ImageFilter.MinFilter(5)).load()
    sb = sum(bg)
    ok = bytearray(w * h)
    dark = {}
    for y in range(max(0, zone_top - 4), min(h, y1 + 12)):
        for x in range(max(0, x0 - 12), min(w, x1 + 12)):
            r, g, b = px[x, y]
            k = (r + g + b) / sb
            i = y * w + x
            flat = hi[x, y] <= 10
            smooth_shadow = 0.45 <= k <= 0.97 and max(abs(r - k * bg[0]), abs(g - k * bg[1]), abs(b - k * bg[2])) <= 30 and hi[x, y] - lo[x, y] <= 22
            if bgseen[i] or flat or smooth_shadow:
                ok[i] = 1
                dark[i] = max(0.0, 1 - k)
    seeds = [i for i in dark if bgseen[i]]
    seen = flood(ok, w, h, seeds)
    return {i: dark[i] for i in dark if seen[i] and not bgseen[i]}


def cutout(im, alpha, bg, box, pad=4):
    """One picture on transparency, with the background colour taken out of its soft edge."""
    x0, y0, x1, y1 = box
    box = (max(0, x0 - pad), max(0, y0 - pad), min(im.size[0], x1 + pad), min(im.size[1], y1 + pad))
    part, a = im.crop(box), alpha.crop(box)
    out = []
    for (r, g, b), v in zip(pixels(part), pixels(a)):
        if v == 0: out.append((0, 0, 0, 0))
        elif v == 255: out.append((r, g, b, 255))
        else:
            k = v / 255
            out.append(tuple(max(0, min(255, round((c - (1 - k) * c0) / k))) for c, c0 in zip((r, g, b), bg)) + (v,))
    rgba = Image.new("RGBA", part.size)
    rgba.putdata(out)
    return rgba, box


def circle(im, box, inset=1):
    """The portrait as a clean disc: a smooth circular edge instead of the cut-out one."""
    x0, y0, x1, y1 = box
    cx, cy, r = (x0 + x1) / 2, (y0 + y1) / 2, min(x1 - x0, y1 - y0) / 2 - inset
    side = int(2 * r) + 2
    part = im.crop((round(cx - side / 2), round(cy - side / 2), round(cx - side / 2) + side, round(cy - side / 2) + side)).convert("RGBA")
    big = Image.new("L", (side * 4, side * 4), 0)
    ImageDraw.Draw(big).ellipse((2 * 4, 2 * 4, (side - 2) * 4, (side - 2) * 4), fill=255)
    part.putalpha(big.resize((side, side), Image.LANCZOS))
    return part


def trim(img):
    return img.crop(img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())


def fit_height(img, h):
    return img.resize((round(img.size[0] * h / img.size[1]), h), Image.LANCZOS)


def token(im, alpha, bg, box, bgseen, style, dist):
    """The figure: cut out, scaled, outlined, standing on its own see-through shadow."""
    w, h = im.size
    shade = shadow_of(im, bgseen, bg, box, w, h, dist)
    # the shadow is not part of the figure
    fa = alpha.copy()
    fl = fa.load()
    for i in shade: fl[i % w, i // w] = 0
    fig, cbox = cutout(im, fa, bg, box, pad=16)
    sh = Image.new("RGBA", fig.size, (0, 0, 0, 0))
    sp = sh.load()
    for i, d in shade.items():
        x, y = i % w - cbox[0], i // w - cbox[1]
        if 0 <= x < fig.size[0] and 0 <= y < fig.size[1]: sp[x, y] = (40, 24, 10, max(0, min(255, round(d * 1.3 * 255))))
    # scale the figure (with room round it for the outline), then draw the outline and the shadow under it
    scale = SIZES["token"] / max(1, (box[3] - box[1]))
    size = (round(fig.size[0] * scale), round(fig.size[1] * scale))
    fig, sh = fig.resize(size, Image.LANCZOS), sh.resize(size, Image.LANCZOS)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.alpha_composite(sh)
    a = fig.getchannel("A").point(lambda v: 255 if v > 90 else 0)
    for colour, r in reversed(OUTLINE[style]):
        grown = a.filter(ImageFilter.MaxFilter(2 * int(r) + 1))
        grown = grown.filter(ImageFilter.GaussianBlur(0.8))
        layer = Image.new("RGBA", size, colour + (0,))
        layer.putalpha(grown)
        out.alpha_composite(layer)
    out.alpha_composite(fig)
    return trim(out)


def make(key, style="light"):
    im = Image.open(os.path.join(ART, f"char-{key}.webp")).convert("RGB")
    w, h = im.size
    bg = background(im)
    dist = distance(im, bg)
    d = dist.tobytes()
    ok = bytes(1 if v <= TOL else 0 for v in d)
    edge = [x for x in range(w)] + [(h - 1) * w + x for x in range(w)] + [y * w for y in range(h)] + [y * w + w - 1 for y in range(h)]
    bgseen = flood(ok, w, h, edge)
    bgmask = Image.frombytes("L", (w, h), bytes(255 if s else 0 for s in bgseen))
    fg = ImageChops.invert(bgmask)
    # a soft edge: in a thin band next to the background, opacity follows the distance from it
    band = ImageChops.multiply(fg, bgmask.filter(ImageFilter.MaxFilter(5)))
    soft = dist.point(lambda v: max(0, min(255, round((v - 12) * 255 / 70))))
    alpha = ImageChops.lighter(ImageChops.subtract(fg, band), ImageChops.multiply(band, soft))
    (arms_box, arms_mask), (portrait_box, _), (token_box, token_mask) = pieces(fg)
    out = {
        "arms": trim(cutout(im, ImageChops.multiply(alpha, arms_mask), bg, arms_box)[0]),
        "portrait": circle(im, portrait_box),
    }
    if not os.path.exists(os.path.join(ART, "tokens.webp")):
        out["token"] = token(im, ImageChops.multiply(alpha, token_mask), bg, token_box, bgseen, style, dist)
    for kind, img in out.items():
        if kind != "token": img = fit_height(img, SIZES[kind])
        path = os.path.join(OUT, f"{kind}-{key}.webp")
        img.save(path, "WEBP", quality=90, method=6)
        print(f"{path}  {img.size}")


def outlined(fig, style):
    """A figure with the outline drawn round it."""
    out = Image.new("RGBA", fig.size, (0, 0, 0, 0))
    a = fig.getchannel("A").point(lambda v: 255 if v > 90 else 0)
    for colour, r in reversed(OUTLINE[style]):
        grown = a.filter(ImageFilter.MaxFilter(2 * int(r) + 1)).filter(ImageFilter.GaussianBlur(0.8))
        layer = Image.new("RGBA", fig.size, colour + (0,))
        layer.putalpha(grown)
        out.alpha_composite(layer)
    out.alpha_composite(fig)
    return out


def frame_lines(prof, thr):
    """Thin runs where the profile is above thr: the panels' frame lines."""
    out, start = [], None
    for i, v in enumerate(prof + [0]):
        if v > thr and start is None: start = i
        if v <= thr and start is not None:
            if i - start <= 5: out.append((start, i - 1))
            start = None
    return out


def make_tokens(keys, style="light"):
    """The pieces for the map, from the panels of art/tokens.webp."""
    im = Image.open(os.path.join(ART, "tokens.webp")).convert("RGB")
    W, H = im.size
    lum = im.convert("L").load()
    cols = [sum(1 for y in range(0, H, 2) if lum[x, y] < 110) / (H / 2) for x in range(W)]
    rows = [sum(1 for x in range(0, W, 2) if lum[x, y] < 110) / (W / 2) for y in range(H)]
    vx, hy = frame_lines(cols, 0.93), frame_lines(rows, 0.9)
    top, bottom = hy[0][1] + 4, hy[-1][0] - 4
    panels = [(vx[i][1] + 4, top, vx[i + 1][0] - 4, bottom) for i in range(0, len(vx) - 1, 2)]
    assert len(panels) == len(TOKEN_ORDER), f"found {len(panels)} panels in art/tokens.webp, expected {len(TOKEN_ORDER)}"
    for key, box in zip(TOKEN_ORDER, panels):
        if keys and key not in keys: continue
        part = im.crop(box)
        w, h = part.size
        bg = background(part)
        dist = distance(part, bg)
        ok = bytes(1 if v <= TOL else 0 for v in dist.tobytes())
        edge = list(range(w)) + [(h - 1) * w + x for x in range(w)] + [y * w for y in range(h)] + [y * w + w - 1 for y in range(h)]
        bgmask = Image.frombytes("L", (w, h), bytes(255 if s else 0 for s in flood(ok, w, h, edge)))
        fg = ImageChops.invert(bgmask)
        band = ImageChops.multiply(fg, bgmask.filter(ImageFilter.MaxFilter(5)))
        soft = dist.point(lambda v: max(0, min(255, round((v - 12) * 255 / 70))))
        alpha = ImageChops.lighter(ImageChops.subtract(fg, band), ImageChops.multiply(band, soft))
        fbox = fg.point(lambda v: 255 if v > 0 else 0).getbbox()
        fig, _ = cutout(part, alpha, bg, fbox, pad=12)
        fig = fig.resize((round(fig.size[0] * SIZES["token"] / (fbox[3] - fbox[1])), round(fig.size[1] * SIZES["token"] / (fbox[3] - fbox[1]))), Image.LANCZOS)
        roomy = Image.new("RGBA", (fig.size[0] + 24, fig.size[1] + 24), (0, 0, 0, 0))   # room for the outline
        roomy.alpha_composite(fig, (12, 12))
        img = trim(outlined(roomy, style))
        path = os.path.join(OUT, f"token-{key}.webp")
        img.save(path, "WEBP", quality=90, method=6)
        print(f"{path}  {img.size}  from panel {box}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    style = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--outline=")), "light")
    keys = args or sorted(f[5:-5] for f in os.listdir(ART) if f.startswith("char-") and f.endswith(".webp"))
    for k in keys:
        make(k, style)
    if os.path.exists(os.path.join(ART, "tokens.webp")):
        make_tokens(args, style)
