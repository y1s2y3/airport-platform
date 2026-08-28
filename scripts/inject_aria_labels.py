# -*- coding: utf-8 -*-
"""Inject aria-label from placeholder on Element Plus form controls lacking aria-label."""
from __future__ import annotations

import re
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "src"
tag_re = re.compile(
    r"<(el-input|el-select|el-date-picker|el-autocomplete|el-cascader|el-time-picker)\b([^>]*?)(/?)>",
    re.DOTALL,
)


def inject(attrs: str) -> tuple[str, bool]:
    if "aria-label" in attrs or ":aria-label" in attrs:
        return attrs, False
    m = re.search(r'placeholder="([^"]+)"', attrs)
    if m:
        return attrs.rstrip() + f' aria-label="{m.group(1)}"', True
    m = re.search(r':placeholder="([^"]+)"', attrs)
    if m:
        return attrs.rstrip() + f' :aria-label="{m.group(1)}"', True
    return attrs, False


def main() -> None:
    changed_files = []
    total = 0
    for path in root.rglob("*.vue"):
        text = path.read_text(encoding="utf-8")
        count = 0

        def repl(match: re.Match[str]) -> str:
            nonlocal count
            tag, attrs, slash = match.group(1), match.group(2), match.group(3)
            new_attrs, ok = inject(attrs)
            if ok:
                count += 1
                return f"<{tag}{new_attrs}{slash}>"
            return match.group(0)

        new_text = tag_re.sub(repl, text)
        if count:
            path.write_text(new_text, encoding="utf-8")
            changed_files.append((str(path.relative_to(root)), count))
            total += count

    print(f"updated {len(changed_files)} files, {total} controls")
    for rel, c in sorted(changed_files, key=lambda x: -x[1])[:40]:
        print(f"  {c:3d}  {rel}")


if __name__ == "__main__":
    main()
