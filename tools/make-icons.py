"""Bake the icons in img/icons/*.svg into icons.css as inline data, one rule per icon:
.ic-<name> { --m: url("data:image/svg+xml,..."); }

The icons are drawn as CSS masks, and browsers won't load mask images from separate files when the
game is opened straight from the disk (a file:// page), so the icons came out blank there. Inline,
they always show. Run this again after adding or changing an icon:  python tools/make-icons.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "img" / "icons"
OUT = ROOT / "icons.css"


def inline(svg: str) -> str:
    svg = re.sub(r"<\?xml[^>]*>|<!--.*?-->", "", svg, flags=re.S)
    svg = re.sub(r"\s+", " ", svg).strip().replace("> <", "><").replace('"', "'")
    for ch, code in (("%", "%25"), ("#", "%23"), ("<", "%3C"), (">", "%3E")):
        svg = svg.replace(ch, code)
    return f'url("data:image/svg+xml,{svg}")'


def main() -> None:
    rules = [f".ic-{p.stem} {{ --m: {inline(p.read_text(encoding='utf-8'))}; }}" for p in sorted(SRC.glob("*.svg"))]
    head = "/* made by tools/make-icons.py from img/icons/*.svg: the icons inline, so they show even when the game is opened from the disk */\n"
    OUT.write_text(head + "\n".join(rules) + "\n", encoding="utf-8")
    print(f"{len(rules)} icons, {OUT.stat().st_size // 1024} KB -> {OUT.name}")


if __name__ == "__main__":
    main()
