# -*- coding: utf-8 -*-
from pathlib import Path
import zipfile
from lxml import etree

p = Path(r"C:\Users\13065\Desktop\机场平台2期\《智慧工地建设管控一体化平台需求规格说明书》_updated.docx")
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

with zipfile.ZipFile(p) as z:
    num_xml = z.read("word/numbering.xml")
root = etree.fromstring(num_xml)
for abstract in root.findall("w:abstractNum", NS):
    if abstract.get(f"{W}abstractNumId") != "8":
        continue
    print("abstractNum 8")
    for lvl in abstract.findall("w:lvl", NS):
        ilvl = lvl.get(f"{W}ilvl")
        lt = lvl.find("w:lvlText", NS)
        print("ilvl", ilvl, "text", lt.get(f"{W}val") if lt is not None else "")
        print(etree.tostring(lvl, encoding="unicode", pretty_print=True)[:1200])
        print("---")
