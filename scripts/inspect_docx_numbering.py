# -*- coding: utf-8 -*-
from docx import Document
from docx.oxml.ns import qn
from pathlib import Path
import zipfile
from lxml import etree

p = Path(r"C:\Users\13065\Desktop\机场平台2期\《智慧工地建设管控一体化平台需求规格说明书》_updated.docx")
doc = Document(str(p))

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

for i in range(1, 5):
    s = doc.styles[f"Heading {i}"]
    print(f"=== Heading {i} ===")
    el = s.element
    rpr = el.find(qn("w:rPr"))
    if rpr is not None:
        print("rPr XML:", etree.tostring(rpr, encoding="unicode")[:500])
    ppr = el.find(qn("w:pPr"))
    if ppr is not None:
        numpr = ppr.find(qn("w:numPr"))
        if numpr is not None:
            print("numPr:", etree.tostring(numpr, encoding="unicode"))

with zipfile.ZipFile(p) as z:
    num_xml = z.read("word/numbering.xml")

root = etree.fromstring(num_xml)
for abstract in root.findall("w:abstractNum", NS):
    aid = abstract.get(qn("w:abstractNumId"))
    for lvl in abstract.findall("w:lvl", NS):
        ilvl = lvl.get(qn("w:ilvl"))
        if ilvl not in ("0", "1", "2", "3"):
            continue
        rpr = lvl.find("w:rPr", NS)
        lvlText = lvl.find("w:lvlText", NS)
        lt = lvlText.get(qn("w:val")) if lvlText is not None else ""
        print(f"--- abstractNum {aid} ilvl {ilvl} text={lt!r} ---")
        if rpr is not None:
            print(etree.tostring(rpr, encoding="unicode"))
        else:
            print("(no rPr)")
