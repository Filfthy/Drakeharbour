# tools/make-water.py - finds the water in the town map, for the animated map (river-scenery.js):
#   img/water.png      half the map's size, three layers:
#                        red    where there is water, soft at the edges
#                        green  how far out from the shore (0 at the shore, full about 28 map pixels out),
#                               for the foam that rolls in
#                        blue   the fountain's basin in the Square, which shimmers but has no surf
#   scenery-data.js    the map and that water as data, for when the game is opened straight from the
#                      disk (browsers won't hand a file:// page's own pictures to WebGL)
# Water is the blue in the painting (bluer than green, unlike the shaded forests), less the blue roofs
# inside the town walls, the hazy mountains along the top and any small blue specks; whatever is left
# is grown a little so the foam at the water's edge moves with it. Pure PIL. Run: python tools/make-water.py
import base64
import os
from collections import deque
from PIL import Image, ImageFilter

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "..", "img", "map.webp")
OUT = os.path.join(HERE, "..", "img", "water.png")
# the blue roofs and the fountain in the middle of town, in the map's own pixels: centre and half-width/height
TOWN = (925, 495, 160, 80)
BASIN = (844, 468, 21, 9)   # the fountain's basin, the same way
TOP = 64          # the mountains and sky along the top of the map
MIN_AREA = 150    # smaller blue patches (at half size) are roofs, flags and shadows
SHORE = 14        # how far out the surf reaches, in half-size pixels


def is_blue(r, g, b):
    return b > r + 18 and b >= g - 6 and b > 92 and (b - r) + (b - g) * 0.3 > 34


def shore_distance(mask, sw, sh):
    """For each water pixel, roughly how far it is from the nearest land (two passes of a 3-4 chamfer)."""
    big = 10 ** 6
    mp = mask.load()
    d = [[0 if mp[x, y] < 128 else big for x in range(sw)] for y in range(sh)]
    for y in range(sh):
        row, up = d[y], d[y - 1] if y else None
        for x in range(sw):
            v = row[x]
            if not v:
                continue
            if x:
                v = min(v, row[x - 1] + 3)
            if up:
                v = min(v, up[x] + 3)
                if x:
                    v = min(v, up[x - 1] + 4)
                if x + 1 < sw:
                    v = min(v, up[x + 1] + 4)
            row[x] = v
    for y in range(sh - 1, -1, -1):
        row, dn = d[y], d[y + 1] if y + 1 < sh else None
        for x in range(sw - 1, -1, -1):
            v = row[x]
            if not v:
                continue
            if x + 1 < sw:
                v = min(v, row[x + 1] + 3)
            if dn:
                v = min(v, dn[x] + 3)
                if x + 1 < sw:
                    v = min(v, dn[x + 1] + 4)
                if x:
                    v = min(v, dn[x - 1] + 4)
            row[x] = v
    out = Image.new("L", (sw, sh), 0)
    op = out.load()
    for y in range(sh):
        for x in range(sw):
            op[x, y] = min(255, round(d[y][x] / 3 * 255 / SHORE))
    return out


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    small = im.resize((w // 2, h // 2), Image.BOX)
    sw, sh = small.size
    px = small.load()
    cx, cy, rx, ry = (v / 2 for v in TOWN)
    water = [[False] * sw for _ in range(sh)]
    for y in range(int(TOP / 2), sh):
        for x in range(sw):
            if is_blue(*px[x, y]) and ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1:
                water[y][x] = True
    # keep the big bodies of water only
    seen = [[False] * sw for _ in range(sh)]
    mask = Image.new("L", (sw, sh), 0)
    mp = mask.load()
    for y0 in range(sh):
        for x0 in range(sw):
            if not water[y0][x0] or seen[y0][x0]:
                continue
            seen[y0][x0] = True
            comp, q = [], deque([(x0, y0)])
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < sw and 0 <= ny < sh and water[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            if len(comp) >= MIN_AREA:
                for x, y in comp:
                    mp[x, y] = 255
    # the fountain's basin, too small to count as a body of water
    basin = Image.new("L", (sw, sh), 0)
    bp = basin.load()
    bx, by, brx, bry = (v / 2 for v in BASIN)
    for y in range(int(by - bry), int(by + bry) + 1):
        for x in range(int(bx - brx), int(bx + brx) + 1):
            if ((x - bx) / brx) ** 2 + ((y - by) / bry) ** 2 <= 1 and is_blue(*px[x, y]):
                mp[x, y] = 255
                bp[x, y] = 255
    # grow it a little over the foam at its edges and close the gaps round boats' wakes
    mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
    dist = shore_distance(mask, sw, sh).filter(ImageFilter.GaussianBlur(1.0))
    soft = mask.filter(ImageFilter.GaussianBlur(1.5))
    basin = basin.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.0))
    Image.merge("RGB", (soft, dist, basin)).save(OUT, optimize=True)
    print(f"water.png {sw}x{sh}, {os.path.getsize(OUT) // 1024} KB")
    data = lambda path, kind: f"data:image/{kind};base64," + base64.b64encode(open(path, "rb").read()).decode("ascii")
    js = os.path.join(HERE, "..", "scenery-data.js")
    with open(js, "w", encoding="utf-8") as f:
        f.write("// made by tools/make-water.py: the map and its water as data, for the animated map when the game\n")
        f.write("// is opened straight from the disk (browsers won't hand a file:// page's own pictures to WebGL)\n")
        f.write(f'window.SCENERY_DATA = {{ map: "{data(SRC, "webp")}", water: "{data(OUT, "png")}" }};\n')
    print(f"scenery-data.js {os.path.getsize(js) // 1024} KB")


if __name__ == "__main__":
    main()
