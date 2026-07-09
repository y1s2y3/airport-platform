"""Generate right-light.svg from left-light.svg via in-viewBox group mirror."""
from pathlib import Path
import re

base = Path(__file__).resolve().parents[1] / "src" / "coc" / "assets" / "hq" / "edge"
left_path = base / "left-light.svg"
right_path = base / "right-light.svg"

left = left_path.read_text(encoding="utf-8")
body_match = re.match(r"<svg[^>]*>(.*?)<defs>", left, re.DOTALL)
defs_match = re.search(r"<defs>.*</defs>", left, re.DOTALL)
if not body_match or not defs_match:
    raise SystemExit("Could not parse left-light.svg")

body = body_match.group(1).strip()
defs = defs_match.group(0)

# Mirror inside the same 61×1065 viewBox — no CSS transform needed.
right = (
    '<svg width="61" height="1065" viewBox="0 0 61 1065" fill="none" '
    'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n'
    '<g transform="translate(61 0) scale(-1 1)">\n'
    f"{body}\n"
    "</g>\n"
    f"{defs}\n"
    "</svg>\n"
)
right_path.write_text(right, encoding="utf-8")
print(f"Wrote {right_path} ({len(right)} bytes)")
