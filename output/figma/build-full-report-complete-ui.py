from pathlib import Path
from xml.etree import ElementTree as ET
import re,json,html

ROOT=Path("/Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai/output/figma")
GREETING_H=108
W,H=1440,2661+GREETING_H
content=(ROOT/"full-report-wide-hero-content.svg").read_text()
inner=re.sub(r"^<svg[^>]*>","",content).rsplit("</svg>",1)[0]
atmosphere=(ROOT/"full-report-wide-hero-atmosphere.svg").read_text()
bg=re.sub(r"^<svg[^>]*>","",atmosphere).rsplit("</svg>",1)[0]
helper=(ROOT/"helpers.js").read_text()
paths={k:v for k,v in re.findall(r"^  (\w+):'([^']*)',",helper,re.M)}
def t(name,x,y,text,size=14,c="#C5BFD0",weight=400,anchor="start"):
 return f'<text id="{html.escape(name)}" x="{x}" y="{y}" font-family="Noto Sans SC" font-size="{size}" font-weight="{weight}" fill="{c}" text-anchor="{anchor}">{html.escape(text)}</text>'
def r(name,x,y,w,h,c,rad=0,stroke=None):
 return f'<rect id="{html.escape(name)}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{rad}" fill="{c}"'+(f' stroke="{stroke}" stroke-opacity=".65"' if stroke else "")+"/>"
def icon(name,key,x,y,size=22,c="#B9B2C8"):
 return f'<g id="{html.escape(name)}" transform="translate({x} {y}) scale({size/24})" fill="none" stroke="{c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{paths[key]}</g>'
def svg_children(element):
 # Figma's importer skips namespace-prefixed SVG children. Keep the root
 # namespace and emit standard, unprefixed child tags.
 for n in element.iter():n.tag=n.tag.rsplit("}",1)[-1]
 return "".join(ET.tostring(n,encoding="unicode") for n in element)
# Authoritative existing brand symbol, preserved as editable vectors.
logo=ET.fromstring((ROOT/"homepage-meetmyworld-symbol.svg").read_text())
brand='<g id="Brand · MeetMyWorld symbol" transform="translate(28 16) scale(.625)">'+svg_children(logo)+'</g>'
head=r("Header surface",0,0,W,72,"#101118")
head+=brand
head+=t("Header separator",82,44,"/",16,"#706D7C")
head+=t("Discover navigation",103,44,"发现",15,"#F6F4FA",500)
head+=r("Search input surface",147,18,392,36,"#24252F",18,"#484651")
head+=icon("Search icon","search",161,26,20)
head+=t("Search placeholder",192,41,"搜索测试、场景或关键词",13,"#9792A4")
head+=r("Shortcut chip",489,25,36,22,"#282934",8,"#4B4656")
head+=t("Keyboard shortcut",507,40,"⌘K",11,"#A7A0B4",anchor="middle")
head+=r("Appearance icon surface",1119,18,36,36,"#24252F",18)
head+=icon("Appearance moon","moon",1127,26,20)
head+=r("My space button",1174,18,84,36,"#24252F",18,"#4C4756")
head+=t("My space button label",1216,42,"我的空间",13,"#E7E1EC",anchor="middle")
head+=r("Login button",1272,18,100,36,"#D5A7EE",18)
head+=t("Login button label",1322,42,"登录 / 注册",13,"#261C31",500,"middle")
head+=icon("Header add icon","plus",1390,26,22)
head+='<path id="Header separator rule" d="M0 71.5H1440" stroke="#706C7D" stroke-opacity=".45"/>'
# Reuse the marketplace's greeting surface and avatar treatment.
greeting=ET.fromstring((ROOT/"option-grid-greeting.svg").read_text())
for n in greeting.iter():
 name=n.get("id")
 if name=="探索者问候胶囊":n.set("transform","translate(24 32)")
 elif name=="问候胶囊玻璃":n.attrib.update({"width":"172","height":"44","rx":"22"})
 elif name=="探索者头像":n.set("transform","translate(12 7)")
 elif name=="问候标题":n.attrib.update({"x":"50","y":"18","font-size":"12","font-weight":"500"})
 elif name=="问候副标题":n.attrib.update({"x":"50","y":"35","font-size":"10"})
greeting_inner=svg_children(greeting)
greeting_inner+=t("Greeting · centered heading",720,56,"发现有趣的自己",32,"#F6F4FA",700,"middle")
greeting_inner+=t("Greeting · centered subtitle",720,84,"从一个问题开始，看看你的生活倾向。",14,"#A8A3B4",anchor="middle")
side=""
side+=t("Sidebar title",96,224,"我的空间",24,"#F6F4FA",700)
side+=icon("Sidebar collapse","chevron",278,203,22)
nav=[("应用商城","bag"),("我的应用","grid"),("我的报告","file"),("我的收藏","bookmark"),("使用帮助","help")]
for i,(label,key) in enumerate(nav):
 y=248+i*52
 selected=label=="我的报告"
 row=""
 if selected:row+=r("Selected navigation surface",92,y,204,44,"#343441",14)
 row+=icon("Navigation icon",key,107,y+11,24,"#E9D8F4" if selected else "#B6AEC5")
 row+=t("Navigation label",140,y+29,label,16,"#F2E8FA" if selected else "#BAB3C9",500 if selected else 400)
 if selected:row+='<circle id="Selected navigation indicator" cx="280" cy="'+str(y+22)+'" r="2.5" fill="#D5A7EE"/>'
 side+=f'<g id="Navigation · {label}">{row}</g>'
side+=f'<path id="Sidebar divider" d="M318 181.2V{H-44}" stroke="#757387" stroke-opacity=".52"/>'
rail=""
for i,(key,label) in enumerate([("grid","应用"),("heart","收藏"),("file","报告")]):
 y=229+i*56
 if key=="file":rail+=r("Selected rail surface",20,y,36,36,"#664381",18)
 rail+=icon("Rail "+label,key,27,y+7,22,"#EAD2F6" if key=="file" else "#AAA2B8")
rail+=icon("Support headphones","headphones",25,H-78,22,"#B5ACBE")
rail+=icon("Utility bookmark","bookmark",1390,246,22)
rail+=icon("Utility add","plus",1390,302,22)
rail+=icon("Utility sparkles","sparkles",1390,358,22)
rail+=icon("Utility help","help",1390,H-82,22)
foot=t("Copyright",77,H-19,"meetmyworld © 2026",11,"#9990A3")
foot+=t("Brand footnote",205,H-19,"每一个小问题，都藏着一点新的自己。",11,"#9990A3")
foot+=t("Support footer links",1347,H-19,"使用帮助 / 免责声明 / 联系我们",11,"#9990A3",anchor="end")
whole=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'+r("Canvas · color/canvas",0,0,W,H,"#101118")+f'<g id="背景 · 长页面玻璃光晕与双描边" transform="translate(0 {GREETING_H})">{bg}</g><g id="Header · 商城原有风格">{head}</g><g id="Greeting · 商城同款顶部问候栏" transform="translate(0 72)">{greeting_inner}</g><g id="Sidebar · 我的报告选中">{side}</g><g id="Explore rail and utilities">{rail}</g><g id="报告内容 · 横幅叙事" transform="translate(338.2 {92+GREETING_H})">{inner}</g><g id="Footer">{foot}</g></svg>'
path=ROOT/"完整报告-伴侣协作体检-横幅叙事-已采用.svg"
path.write_text(whole)
root=ET.fromstring(whole)
counts={}
for n in root.iter():
 tag=n.tag.rsplit("}",1)[-1];counts[tag]=counts.get(tag,0)+1
print(json.dumps({"asset":str(path),"bytes":path.stat().st_size,"dimensions":[W,H],"editableElementCounts":counts},ensure_ascii=False))

