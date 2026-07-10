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
for num in root.findall("w:num", NS):
    if num.get(f"{W}numId") != "1":
        continue
    print(etree.tostring(num, encoding="unicode", pretty_print=True))
