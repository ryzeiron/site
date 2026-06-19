from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE_ROOT = ROOT / "public" / "cartes" / "trainer-kit"
CATALOG_FILE = ROOT / "lib" / "catalog" / "cards" / "trainer-kit.ts"


def convert_png_to_webp(path: Path) -> None:
    out = path.with_suffix(".webp")

    with Image.open(path) as img:
        img = img.convert("RGBA")
        if img.width > 520:
            ratio = 520 / img.width
            img = img.resize((520, round(img.height * ratio)), Image.Resampling.LANCZOS)

        background = Image.new("RGB", img.size, "white")
        background.paste(img, mask=img.getchannel("A"))
        background.save(out, "WEBP", quality=84, method=6)

    path.unlink()


def main() -> None:
    if not IMAGE_ROOT.exists():
        print("Aucun dossier Trainer Kit a optimiser.")
        return

    converted = 0
    for png in IMAGE_ROOT.rglob("*.png"):
        convert_png_to_webp(png)
        converted += 1

    if CATALOG_FILE.exists():
        source = CATALOG_FILE.read_text(encoding="utf-8").replace(".png", ".webp")
        CATALOG_FILE.write_text(source, encoding="utf-8", newline="\n")

    print(f"Images Trainer Kit converties en WebP: {converted}")


if __name__ == "__main__":
    main()
