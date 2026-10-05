"""Extract the reviewed 2026-10-06 character images without generating pixels.

Usage: python scripts/import-user-tata-pdf.py <original PDF>
Requires PyMuPDF and Pillow. The original PDF is never modified.
"""
import hashlib
import io
import json
import sys
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
EXPECTED_SHA256 = "b587e5e6c0453e7406c71e867edc8adf1abe545433269ad48eae29598dd103df"
PAGES = {"rukaron": [1, 2, 3, 4], "pakuma": [5, 6, 7, 8], "nusuke": [10, 11, 12, 13]}


def main():
    source = Path(sys.argv[1])
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != EXPECTED_SHA256:
        raise ValueError("PDF does not match the visually reviewed source")
    document = fitz.open(source)
    if len(document) != 14:
        raise ValueError("Expected 14 physical pages")
    records = []
    for family_id, pages in PAGES.items():
        directory = ROOT / "assets" / "tata-provided" / family_id
        directory.mkdir(parents=True, exist_ok=True)
        for stage, page_number in enumerate(pages, 1):
            embedded = document[page_number - 1].get_images(full=True)
            if len(embedded) != 1 or not embedded[0][1]:
                raise ValueError(f"Page {page_number}: expected one image with an alpha mask")
            xref, mask_xref = embedded[0][:2]
            pixmap = fitz.Pixmap(fitz.Pixmap(document, xref), fitz.Pixmap(document, mask_xref))
            original = Image.open(io.BytesIO(pixmap.tobytes("png"))).convert("RGBA")
            bounds = original.getchannel("A").getbbox()
            cropped = original.crop(bounds)
            outputs = {}
            for size in [256, 512]:
                image = cropped.copy()
                scale = min(size * 0.90 / cropped.width, size * 0.90 / cropped.height)
                image = cropped.resize((round(cropped.width * scale), round(cropped.height * scale)), Image.Resampling.LANCZOS)
                canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
                canvas.paste(image, ((size - image.width) // 2, (size - image.height) // 2))
                target = directory / f"t{stage}-{size}.webp"
                canvas.save(target, "WEBP", lossless=True, method=6)
                outputs[str(size)] = {"path": "/" + target.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(target.read_bytes()).hexdigest()}
            records.append({"familyId": family_id, "stage": stage, "sourcePage": page_number, "sourceWidth": original.width, "sourceHeight": original.height, "alphaCropBounds": list(bounds), "outputs": outputs})
    manifest = {"sourceType": "user-provided-pdf", "sourceFile": "1-写真.pdf", "sourceSha256": source_hash, "pageCount": 14, "verifiedAt": "2026-10-06", "processing": "embedded image and alpha extraction; alpha bounds crop; contain resize; transparent padding; lossless WebP", "records": records}
    output = ROOT / "data" / "user-tata-evidence-2026-10-06.json"
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted {len(records)} reviewed forms / 24 responsive images")


if __name__ == "__main__":
    main()
