# tools/make-cardback.py - the back of every card, from the user's art (art/cardback.png):
#   img/cardback.webp   twice the size a card shows at (192 x 268), its rounded corners left clear
# The table shows it four ways (as drawn, turned upside down, mirrored, and both), so cards lying side by
# side don't look identical (see .card.back in river.css). Pure PIL. Run: python tools/make-cardback.py
import os
from PIL import Image

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "..", "art", "cardback.png")
OUT = os.path.join(HERE, "..", "img", "cardback.webp")
SIZE = (192, 268)


def main():
    im = Image.open(SRC).convert("RGBA")
    im = im.crop(im.getchannel("A").getbbox())
    im.resize(SIZE, Image.LANCZOS).save(OUT, "WEBP", quality=90, method=6)
    print(f"cardback.webp {SIZE[0]}x{SIZE[1]} from {im.size[0]}x{im.size[1]}, {os.path.getsize(OUT) // 1024} KB")


if __name__ == "__main__":
    main()
