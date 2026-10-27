from pathlib import Path
from xml.etree import ElementTree as ET
from html import escape
import base64, json, re

ROOT = Path("/Volumes/outssd/mac-home/Ai 工作空间/Codex_workspace/orai")
OUT = ROOT / "output/figma"
W = 1011
parts = []
sections = []
cy = 0
TEXT = "#F6F4FA"
BODY = "#C9C4D3"
MUTED = "#A9A2B7"
BORDER = "#4A4655"
ACCENT = "#D5A7EE"
dim = [
    ("家务主动性",82,"#E8ECC0","愿意主动分担，也能看见日常任务。","house"),
    ("承诺兑现",76,"#D8B4F4","大多数约定会跟进，变化时可以更早告知。","heart"),
    ("共同决策",80,"#B3C8FF","倾向一起讨论，让双方都参与选择。","users"),
    ("沟通修复",68,"#B2ECDD","争执后需要缓冲，也需要明确的回应。","chat"),
    ("边界尊重",88,"#EFC2DE","能为彼此保留独处与休息的空间。","shield"),
]
# Preserve source SVG icons from the established product detail when available.
src = ET.fromstring((OUT / "product-detail-wide-hero-content.svg").read_text())
source_icons = {}
for g in src.iter():
    gid=g.attrib.get("id","")
    if g.tag.endswith("g") and ("icon" in gid.lower() or "info" in gid.lower()):
        paths=[ET.tostring(p,encoding="unicode") for p in g if p.tag.endswith(("path","circle","rect","line","polyline","ellipse"))]
        if paths: source_icons[gid]="".join(paths)

icons = {
 "house":'<path d="m3 11 9-8 9 8"/><path d="M5 10v11h5v-7h4v7h5V10"/>',
 "heart":'<path d="M20.8 4.6a5.3 5.3 0 0 0-7.5 0L12 5.9l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.9a5.3 5.3 0 0 0 0-7.5Z"/>',
 "users":'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9"/><circle cx="9" cy="7" r="4"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
 "chat":'<path d="M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10Z"/><path d="M7 7h10M7 11h7"/>',
 "shield":'<path d="M12 2 3 6v6c0 5 4 8 9 10 5-2 9-5 9-10V6l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
 "info":'<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
 "leaf":'<path d="M20 3c-8-1-16 2-16 9a6 6 0 0 0 12 0c0-4 2-7 4-9Z"/><path d="M3 21c4-7 8-10 13-13"/>',
 "star":'<path d="m12 2 3.1 6.3L22 9.4l-5 4.9 1.2 6.9L12 18l-6.2 3.2L7 14.3l-5-4.9 6.9-1.1L12 2Z"/>',
 "clock":'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 "calendar":'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
 "arrow-left":'<path d="M20 12H4M10 6l-6 6 6 6"/>',
 "share":'<path d="M12 16V3m-5 5 5-5 5 5M5 13H3v8h18v-8h-2"/>',
}
# Reuse the exact helper artwork-independent icon source for shared symbols.
helper=(OUT / "helpers.js").read_text()
for k in ["heart","leaf","clock"]:
    m=re.search(r"\s"+k+r":'([^']+)'",helper)
    if m: icons[k]=m.group(1)

def rect(name,x,y,w,h,fill="#20212B",radius=18,stroke=BORDER,opacity=1,sw=1):
    b=f'<rect id="{escape(name)}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" fill-opacity="{opacity}"'
    return b+(f' stroke="{stroke}" stroke-opacity=".72" stroke-width="{sw}"' if stroke else "")+"/>"

def txt(name,x,y,value,size=16,color=BODY,weight=400,font="Noto Sans SC",anchor="start"):
    return f'<text id="{escape(name)}" x="{x}" y="{y}" fill="{color}" font-family="{font}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{escape(value)}</text>'

def ico(name,key,x,y,size=24,color=BODY):
    return f'<g id="{escape(name)}" transform="translate({x} {y}) scale({size/24})" fill="none" stroke="{color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{icons[key]}</g>'

def image(name,filename,x,y,w,h,clip=None):
    uri="data:image/png;base64,"+base64.b64encode((OUT/"assets"/filename).read_bytes()).decode()
    return f'<image id="{escape(name)}" x="{x}" y="{y}" width="{w}" height="{h}" href="{uri}" preserveAspectRatio="xMidYMid meet"'+(f' clip-path="url(#{clip})"' if clip else "")+"/>"

def section(name,h,inner):
    global cy
    sections.append({"name":name,"height":h,"y":cy})
    parts.append(f'<g id="{escape(name)}" transform="translate(0 {cy})"><rect id="Layout bounds" width="{W}" height="{h}" fill="#FFFFFF" fill-opacity=".001"/>{inner}</g>')
    cy+=h+24

# 01: reading header
s=ico("Back arrow","arrow-left",0,16,22)+txt("Back to my reports",34,35,"返回我的报告",16)
s+=rect("Title divider",194,15,1,28,"#48434F",0,None)
s+=txt("Page title",217,36,"伴侣协作体检 · 完整报告",24,TEXT,700)
section("01 · 返回与报告标题",56,s)

# 02: wide result hero; only a discrete decorative artwork image
s=rect("Hero glass surface",0,0,W,380,"url(#heroBase)",24)
s+=image("Artwork · Lavender glass ribbon and sphere","featured-lavender.png",444,-90,660,771,"heroClip")
s+=f'<rect id="Reading gradient" width="{W}" height="380" rx="24" fill="url(#heroFade)"/>'
s+=rect("Result tag",40,32,114,34,"#3F2A53",17,"#8E6A9E")
s+=txt("Result tag label",97,55,"测评结果",14,"#E6BDEF",500,anchor="middle")
s+=txt("Result type",40,128,"协作型队友",48,TEXT,700)
s+=rect("Example report badge",310,95,104,32,"#49345A",16,"#806196")
s+=txt("Example report",362,117,"示例报告",13,"#E3C9F3",500,anchor="middle")
s+=txt("Hero message line 1",42,185,"你们擅长一起扛事，",24,TEXT,700)
s+=txt("Hero message line 2",42,223,"也值得给彼此多一点回应。",24,TEXT,700)
s+=rect("Overall score panel",40,259,244,88,"#252331",20,"#8D74A4")
s+=txt("Overall score",62,304,"78.80",40,"#E5BAF8",700,"Manrope")
s+=txt("Overall score scale",195,302,"/ 100",18,BODY,400,"Manrope")
s+=txt("Overall score label",62,329,"协作倾向评分",14,MUTED)
s+=rect("Demo data note",835,338,150,26,"#332741",13,None,.9)
s+=txt("Demo data note text",910,356,"数据为设计示意",12,"#E0C9EF",400,anchor="middle")
section("02 · 结果横幅 · 协作型队友",380,s)

# 03: narrative interpretation
s=rect("Interpretation surface",0,0,W,194)
s+=txt("Interpretation heading",28,46,"结果解读",26,TEXT,700)
s+=txt("Interpretation body",28,92,"你们在分工与边界上较有默契。意见不合时，可以先回应感受，再讨论方案。",18,BODY)
s+=rect("Group reference notice",28,117,955,48,"#252631",12,"#45434F")
s+=ico("Group reference info","info",45,129,24,"#BAC0D5")
s+=txt("Group reference explanation",83,148,"群体参考：样本不足，暂不展示比例",14,MUTED)
section("03 · 结果解读",194,s)

# 04: five dimension statistics
s=rect("Overview surface",0,0,W,288)
s+=txt("Overview heading",28,46,"五个协作维度",26,TEXT,700)
s+=txt("Overview subtitle",28,79,"从不同角度看见你们的协作特点",16,MUTED)
cw=(W-56-4*16)/5
for i,(label,score,tone,body,key) in enumerate(dim):
    x=28+i*(cw+16)
    g=rect("Dimension stat surface",0,0,cw,162,"#23242E",16,"#454250")
    g+=ico("Dimension icon",key,20,20,29,tone)
    g+=txt("Dimension label",20,79,label,18,TEXT,500)
    g+=txt("Dimension value",20,118,f"{score:.2f}",30,tone,700,"Manrope")
    g+=txt("Dimension scale",117,115,"/ 100",12,MUTED,400,"Manrope")
    g+=rect("Dimension track",20,136,cw-40,10,"#494955",5,None)
    g+=rect("Dimension fill",20,136,(cw-40)*score/100,10,tone,5,None)
    s+=f'<g id="{label} · 概览卡" transform="translate({x} 100)">{g}</g>'
section("04 · 五个协作维度",288,s)

# 05: all five detail rows visibly expanded
s=rect("Expanded analysis surface",0,0,W,474)
s+=txt("Analysis heading",28,47,"维度解析",26,TEXT,700)
s+=txt("Analysis subtitle",28,80,"更详细地了解每个维度的表现与含义",16,MUTED)
for i,(label,score,tone,body,key) in enumerate(dim):
    y=110+i*67
    g=ico("Dimension detail icon",key,0,18,26,tone)
    g+=txt("Dimension detail name",49,39,label,18,tone,700)
    g+=rect("Detail score track",205,24,270,16,"#41424E",8,None)
    g+=rect("Detail score fill",205,24,270*score/100,16,tone,8,None)
    g+=txt("Detail score",495,42,f"{score:.2f}",22,tone,700,"Manrope")
    g+=txt("Detail scale",566,40,"/ 100",12,MUTED,400,"Manrope")
    g+=txt("Dimension explanation",630,40,body,14,BODY)
    if i<4:g+=f'<path id="Row divider" d="M0 63H955" stroke="#46414E" stroke-opacity=".65"/>'
    s+=f'<g id="{label} · 展开解析" transform="translate(28 {y})">{g}</g>'
section("05 · 维度解析 · 全部展开",474,s)

# 06: strengths and observation panels
s=""
half=(W-20)/2
for column,(heading,entries) in enumerate([
    ("你的协作优势",[("主动分担","愿意把共同生活当成两个人的事。","star","#E8DC8F","#27333B"),("尊重空间","理解彼此需要独处和休息。","leaf","#B5E9D7","#263437")]),
    ("值得留意",[("情绪回应","讨论解决办法前，先确认彼此的感受。","info","#EFACCF","#342C38"),("提前告知","无法兑现约定时，及时说明变化。","clock","#EEDBA6","#343133")])
]):
    x=column*(half+20)
    g=rect("Insight panel surface",0,0,half,278)
    g+=txt("Insight heading",28,47,heading,26,TEXT,700)
    for j,(label,body,key,tone,fill) in enumerate(entries):
        y=81+j*88
        g+=rect("Insight card surface",24,y,half-48,78,fill,14,"#514755")
        g+=rect("Insight icon badge",40,y+14,50,50,"#464454",25,None,.7)
        g+=ico("Insight icon",key,51,y+25,28,tone)
        g+=txt("Insight title",110,y+32,label,20,tone,700)
        g+=txt("Insight explanation",110,y+57,body,14,BODY)
    s+=f'<g id="{heading}" transform="translate({x} 0)">{g}</g>'
section("06 · 协作优势与值得留意",278,s)

# 07: three actionable suggestions
s=rect("Action advice surface",0,0,W,280)
s+=txt("Action advice heading",28,46,"给你们的行动建议",26,TEXT,700)
s+=txt("Action advice subtitle",28,80,"从小的改变开始，让协作更轻松、更长久。",16,MUTED)
aw=(W-56-32)/3
actions=[("每周一次分工对齐","用十分钟确认下周的共同任务。","calendar"),("冲突时先回应感受","先说我听见了，再一起找办法。","chat"),("给彼此留出休息时间","约定可以安心独处的时段。","clock")]
for i,(heading,body,key) in enumerate(actions):
    x=28+i*(aw+16)
    g=rect("Action card surface",0,0,aw,164,"#24242F",16,"#4B4556")
    g+=txt("Action number",22,49,f"{i+1:02}",34,"#9270AD",700,"Manrope")
    g+=ico("Action icon",key,aw-50,24,28,"#CFB4E7")
    g+=txt("Action title",22,95,heading,20,TEXT,700)
    g+=txt("Action detail",22,129,body,15,BODY)
    s+=f'<g id="行动 {i+1:02} · {heading}" transform="translate({x} 99)">{g}</g>'
section("07 · 行动建议",280,s)

# 08: only a result summary is shared; actions are native editable UI
s=rect("Share section surface",0,0,W,304)
s+=txt("Share heading",28,46,"分享你的发现",26,TEXT,700)
s+=txt("Share subtitle",28,80,"把这份发现分享给对方，一起聊聊你们的协作方式。",16,MUTED)
s+=rect("Summary share card",28,107,596,168,"url(#shareBase)",20,"#A89DCE")
s+=image("Artwork · Blush glass sculpture","featured-blush.png",22,84,211,244,"shareClip")
s+=txt("Share result type",223,161,"协作型队友",30,"#24202F",700)
s+=txt("Share message line 1",223,204,"你们擅长一起扛事，",18,"#443653",500)
s+=txt("Share message line 2",223,236,"也值得给彼此多一点回应。",18,"#443653",500)
s+=rect("Save share card button",659,107,324,58,ACCENT,29,ACCENT)
s+=ico("Save share card icon","share",729,125,22,"#30203D")
s+=txt("Save share card label",832,144,"保存分享卡",18,"#30203D",700,anchor="middle")
s+=rect("Return to store button",659,181,324,58,"#21212C",29,"#B59AC9")
s+=txt("Return to store label",821,218,"返回商城",18,"#E3D3EF",500,anchor="middle")
s+=txt("Share privacy note",821,267,"分享卡仅包含结果摘要",14,MUTED,400,anchor="middle")
section("08 · 分享你的发现",304,s)

s=rect("Report disclaimer surface",0,0,W,56,"#20202B",14,"#44404C")
s+=ico("Entertainment disclaimer icon","info",22,17,22,MUTED)
s+=txt("Entertainment disclaimer",61,35,"趣味自测，仅供娱乐与自我观察。",14,MUTED)
section("09 · 趣味自测说明",56,s)
H=cy-24

defs=f'''<defs>
<linearGradient id="heroBase" x1="0" y1="0" x2="1" y2=".15"><stop stop-color="#23232F"/><stop offset=".42" stop-color="#282635"/><stop offset="1" stop-color="#DDD4FA"/></linearGradient>
<linearGradient id="heroFade" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#1C1D28" stop-opacity="1"/><stop offset=".43" stop-color="#20202C" stop-opacity=".98"/><stop offset=".73" stop-color="#26202F" stop-opacity=".2"/><stop offset="1" stop-color="#241F2D" stop-opacity="0"/></linearGradient>
<linearGradient id="shareBase" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#EDDFFA"/><stop offset="1" stop-color="#C5C0F3"/></linearGradient>
<clipPath id="heroClip"><rect width="{W}" height="380" rx="24"/></clipPath>
<clipPath id="shareClip"><rect x="28" y="107" width="596" height="168" rx="20"/></clipPath>
</defs>'''
svg=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}" id="完整报告 · 横幅叙事 · 可编辑内容">{defs}'+ "".join(parts)+"</svg>"
path=OUT/"full-report-wide-hero-content.svg"
path.write_text(svg)
r=ET.fromstring(svg)
manifest={
 "fileKey":"TluUhd92v2Z2HztvQeGqxe","pageId":"441:82","wrapperId":"444:83",
 "pageName":"07 · 完整报告 · 横幅叙事","frameName":"完整报告 · 伴侣协作体检 · 横幅叙事",
 "source":"output/imagegen/full-report-20261014/02-wide-hero-story.png",
 "shellSourceId":"184:452","contentAsset":str(path.relative_to(ROOT)),
 "contentSize":[W,H],"plannedWrapperSize":[1440,H+159],
 "fonts":["Noto Sans SC","Manrope"],"sections":sections,
 "nativeTextPlanned":len([n for n in r.iter() if n.tag.endswith("text")]),
 "discreteImages":2,"scores":[82.00,76.00,80.00,68.00,88.00],"overallScore":78.80,
 "designSystemDiscovery":{
   "codeConnect":"No Code Connect files found in repository.",
   "existingScreens":"Native editor: source frame 184:452 uses vertical Auto layout, color/canvas variable #101118 and existing marketplace navigation, header and CTA components; Noto Sans SC and Manrope match local foundation ledger.",
   "librarySearch":"MCP Starter limit blocks library inspection; existing native screen and local ledger provide authoritative foundations and component evidence."
 },
 "status":"in_progress"
}
(OUT/"full-report-wide-hero-state.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({"asset":str(path),"size":[W,H],"bytes":path.stat().st_size,"sections":sections,"textNodes":manifest["nativeTextPlanned"],"imageNodes":2},ensure_ascii=False))

