"""Generate iOS AppIcon sizes from a 512px master PNG."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MASTER = Path(r"C:\Users\Mahdi\Desktop\New folder\AppIcons\playstore.png")
OUT = ROOT / "ios" / "Runner" / "Assets.xcassets" / "AppIcon.appiconset"

SIZES: dict[str, int] = {
    "Icon-App-20x20@1x.png": 20,
    "Icon-App-20x20@2x.png": 40,
    "Icon-App-20x20@3x.png": 60,
    "Icon-App-29x29@1x.png": 29,
    "Icon-App-29x29@2x.png": 58,
    "Icon-App-29x29@3x.png": 87,
    "Icon-App-40x40@1x.png": 40,
    "Icon-App-40x40@2x.png": 80,
    "Icon-App-40x40@3x.png": 120,
    "Icon-App-60x60@2x.png": 120,
    "Icon-App-60x60@3x.png": 180,
    "Icon-App-76x76@1x.png": 76,
    "Icon-App-76x76@2x.png": 152,
    "Icon-App-83.5x83.5@2x.png": 167,
    "Icon-App-1024x1024@1x.png": 1024,
}


def main() -> None:
    master = Image.open(MASTER).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, px in SIZES.items():
        resized = master.resize((px, px), Image.Resampling.LANCZOS)
        resized.save(OUT / filename, format="PNG", optimize=True)
    print(f"Generated {len(SIZES)} iOS icons in {OUT}")


if __name__ == "__main__":
    main()
