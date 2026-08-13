# -*- coding: utf-8 -*-
from pathlib import Path

base = Path(__file__).resolve().parents[1] / "src" / "views" / "quality" / "brand"
needle = "import './brand-page.css'\n"

for p in sorted(base.glob("*.vue")):
    t = p.read_text(encoding="utf-8")
    if needle.strip() in t:
        print("skip", p.name)
        continue
    if not t.startswith("<script setup>\n"):
        raise SystemExit(f"unexpected start {p.name}")
    t = t.replace("<script setup>\n", "<script setup>\n" + needle, 1)
    p.write_text(t, encoding="utf-8", newline="\n")
    print("ok", p.name)
