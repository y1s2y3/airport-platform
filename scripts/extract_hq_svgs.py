"""Extract HQ SVG assets from agent transcript."""
import json
import re
from pathlib import Path

TRANSCRIPT = Path(
    r"C:\Users\13065\.cursor\projects\c-Users-13065-Desktop-2"
    r"\agent-transcripts\20ace25c-7b4f-4d70-b458-3ae1bdbfc7a9"
    r"\20ace25c-7b4f-4d70-b458-3ae1bdbfc7a9.jsonl"
)
OUT_BASE = Path(__file__).resolve().parents[1] / "src" / "coc" / "assets" / "hq"


def main() -> None:
    (OUT_BASE / "edge").mkdir(parents=True, exist_ok=True)
    (OUT_BASE / "header").mkdir(parents=True, exist_ok=True)

    left_svg = None
    nav_svg = None

    for line in TRANSCRIPT.read_text(encoding="utf-8").splitlines():
        if "166_1652" not in line and "166_1700" not in line:
            continue
        obj = json.loads(line)
        text = obj["message"]["content"][0]["text"]
        m1 = re.search(r'(<svg width="61" height="1065".*?</svg>)', text, re.DOTALL)
        if m1 and left_svg is None:
            left_svg = m1.group(1)
        m2 = re.search(r'(<svg width="531" height="57".*?</svg>)', text, re.DOTALL)
        if m2 and nav_svg is None:
            nav_svg = m2.group(1)

    if not left_svg or not nav_svg:
        raise SystemExit(f"Missing SVGs: left={bool(left_svg)} nav={bool(nav_svg)}")

    left_path = OUT_BASE / "edge" / "left-light.svg"
    nav_path = OUT_BASE / "header" / "nav-tabs-left.svg"
    left_path.write_text(left_svg, encoding="utf-8")
    nav_path.write_text(nav_svg, encoding="utf-8")
    print(f"Wrote {left_path} ({left_path.stat().st_size} bytes)")
    print(f"Wrote {nav_path} ({nav_path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
