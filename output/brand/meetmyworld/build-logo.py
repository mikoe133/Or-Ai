"""Build MeetMyWorld's vector identity. Requires fonttools; render SVGs with sharp."""
from pathlib import Path
from html import escape
import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parent
FONT = TTFont(ROOT / 'fonts/Manrope-Bold.ttf')
GLYPHS = FONT.getGlyphSet()
CMAP = FONT.getBestCmap()
UPM = FONT['head'].unitsPerEm

PALETTE = {
    'canvas': '#101118', 'surface': '#191B24', 'border': '#353744',
    'text': '#F7F3FB', 'muted': '#A8A3B4', 'brand': '#D8AFE9',
    'brandOnLight': '#8250A5', 'lavender': '#E9E1F9', 'teal': '#DDF2EC',
}

def start(w, h, title='MeetMyWorld'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{escape(title)}"><title>{escape(title)}</title>'

def label(value, x, y, size=16, color='#F7F3FB', weight=400, family='Manrope', spacing=0):
    return f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" font-weight="{weight}" letter-spacing="{spacing}" fill="{color}">{escape(value)}</text>'

def outline(value, x, y, size=48, color='#F7F3FB', spacing=-.8):
    paths=[]
    cur=0
    scale=size/UPM
    for ch in value:
        name=CMAP[ord(ch)]
        pen=SVGPathPen(GLYPHS)
        GLYPHS[name].draw(pen)
        d=pen.getCommands()
        if d:
            paths.append(f'<path d="{d}" transform="translate({cur:.4f} 0)"/>')
        cur += GLYPHS[name].width + spacing/scale
    return f'<g fill="{color}" transform="translate({x} {y}) scale({scale} {-scale})">'+''.join(paths)+'</g>', cur*scale-spacing

def mark(x=0, y=0, size=64, color='#D8AFE9'):
    # The open circular contour is a world. Two rounded valleys form a W,
    # and the independent dot is the person arriving in that world.
    return f'''<g id="MeetMyWorld-Symbol" transform="translate({x} {y}) scale({size/64})" fill="none" stroke="{color}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round">
      <path id="Open-world" d="M46.7 15.1A22 22 0 1 0 54 33"/>
      <path id="World-W" d="M16.7 27.6C20.3 43.2 24.5 45.1 31.8 30.2C37.6 43.1 42.2 42.9 47.7 26.7"/>
      <circle id="You" cx="53.3" cy="14.3" r="4.1" fill="{color}" stroke="none"/>
    </g>'''

def wordmark(x=0, y=0, size=48, color='#F7F3FB', accent='#D8AFE9'):
    out=[]
    left=x
    for part, fill in [('meet',color),('my',accent),('world',color)]:
        p,w=outline(part,left,y,size,fill,spacing=-.65*size/48)
        out.append(p);left+=w-.65*size/48
    return '<g id="MeetMyWorld-Wordmark">'+''.join(out)+'</g>',left-x

def lockup(x=0,y=0,icon=64,type_size=44,color='#F7F3FB',accent='#D8AFE9',gap=16):
    text,width=wordmark(x+icon+gap,y+icon*.5+type_size*.34,type_size,color,accent)
    return '<g id="MeetMyWorld-Horizontal">'+mark(x,y,icon,accent)+text+'</g>',icon+gap+width

def rounded(x,y,w,h,r,fill,stroke=None):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"'+(f' stroke="{stroke}"' if stroke else '')+'/>'

def save(name,body):
    (ROOT/name).write_text(body,encoding='utf-8')

for name,color in [('mark',PALETTE['brand']),('mark-dark',PALETTE['brandOnLight']),('mark-white',PALETTE['text']),('mark-black',PALETTE['canvas'])]:
    save(name+'.svg',start(64,64,'MeetMyWorld · Personal world symbol')+mark(color=color)+'</svg>')

for name,color,accent in [('logo-horizontal',PALETTE['text'],PALETTE['brand']),('logo-horizontal-dark',PALETTE['canvas'],PALETTE['brandOnLight']),('logo-horizontal-white',PALETTE['text'],PALETTE['text']),('logo-horizontal-black',PALETTE['canvas'],PALETTE['canvas'])]:
    content,w=lockup(0,0,64,44,color,accent)
    save(name+'.svg',start(round(w+3,2),64)+content+'</svg>')

save('favicon.svg',start(64,64,'MeetMyWorld favicon')+rounded(0,0,64,64,16,PALETTE['canvas'])+mark(7,7,50)+'</svg>')
save('app-icon.svg',start(512,512,'MeetMyWorld app icon')+rounded(0,0,512,512,120,PALETTE['canvas'])+mark(66,66,380)+'</svg>')

# A vector concept sheet for internal visual review before the final board.
prototype=start(1200,420,'MeetMyWorld logo · geometric exploration')+rounded(0,0,1200,420,0,PALETTE['canvas'])
prototype+=mark(90,86,236)
logo,w=lockup(400,160,72,49)
prototype+=logo+label('Meet your own little world.',486,262,20,PALETTE['muted'])
prototype+=label('OPEN WORLD  /  WORLD W  /  YOU',92,364,13,PALETTE['muted'],500,spacing=1.2)
save('logo-review.svg',prototype+'</svg>')

# Editable wordmark source for Figma; web-ready logo variants use outlined letters.
content,w=lockup()
editable=start(round(w+3,2),64)+mark()+f'<text id="Editable-wordmark" x="80" y="46.96" font-family="Manrope" font-size="44" font-weight="700" letter-spacing="-.5958" fill="{PALETTE["text"]}">meet<tspan fill="{PALETTE["brand"]}">my</tspan>world</text></svg>'
save('logo-editable-text.svg',editable)

board=start(1600,1160,'MeetMyWorld · Brand identity and application')
board+='''<defs>
  <radialGradient id="Aura" cx=".78" cy=".35" r=".64"><stop stop-color="#5B3E74" stop-opacity=".48"/><stop offset="1" stop-color="#101118" stop-opacity="0"/></radialGradient>
  <linearGradient id="Glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#292833"/><stop offset="1" stop-color="#191B24"/></linearGradient>
  <linearGradient id="Edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#918A9C" stop-opacity=".52"/><stop offset="1" stop-color="#535664" stop-opacity=".3"/></linearGradient>
</defs>'''
board+=rounded(0,0,1600,1160,0,PALETTE['canvas'])
board+='<rect x="930" y="0" width="670" height="445" fill="url(#Aura)"/>'
board+=label('MEETMYWORLD  /  BRAND IDENTITY',72,66,12,PALETTE['muted'],600,spacing=1.6)
board+=label('01  /  YOUR LITTLE WORLD',1250,66,11,PALETTE['muted'],500,spacing=1.4)
primary,width=lockup(70,177,112,65,gap=24)
board+='<g id="01-Primary-lockup">'+primary+'</g>'
board+=label('Meet yourself. Explore more.',204,335,20,PALETTE['muted'],500)
board+=label('An open world. A discovery path. A little you.',204,371,14,PALETTE['muted'])
board+='<g id="02-Hero-symbol">'+mark(1160,132,264)+'</g>'
board+='<path d="M72 436H1528" stroke="#353744"/>'

variant_specs=[
    (72,'03-Dark-background',PALETTE['surface'],PALETTE['text'],PALETTE['brand'],'PRIMARY / ON DARK'),
    (576,'04-Light-background','#F3F0F7',PALETTE['canvas'],PALETTE['brandOnLight'],'ALTERNATE / ON LIGHT'),
    (1080,'05-Monochrome',PALETTE['lavender'],PALETTE['canvas'],PALETTE['canvas'],'MONOCHROME / ONE COLOR')]
for x,name,bg,fg,ac,title in variant_specs:
    card=rounded(x,468,448,216,24,bg,PALETTE['border'] if bg==PALETTE['surface'] else None)
    card+=label(title,x+28,504,11,PALETTE['muted'] if bg==PALETTE['surface'] else '#6D6377',600,spacing=1.1)
    logo,width=lockup(x+28,556,46,27,fg,ac,gap=10)
    card+=logo
    card+=label('Rounded strokes. Clear at small sizes.',x+28,646,12,PALETTE['muted'] if bg==PALETTE['surface'] else '#6D6377')
    board+=f'<g id="{name}">{card}</g>'

# Navigation examples use the same canvas, soft borders, and pill controls as
# the existing Figma homepages. No complete UI screenshot is embedded.
nav=label('06 / IN THE INTERFACE',72,735,11,PALETTE['muted'],600,spacing=1.1)
nav+=rounded(72,760,956,104,24,'url(#Glass)','url(#Edge)')
small,width=lockup(96,796,32,20,gap=9)
nav+=small
nav+=rounded(316,790,340,44,22,'#252732','#474753')
nav+='<circle cx="340" cy="810" r="7" fill="none" stroke="#A8A3B4" stroke-width="1.5"/><path d="m345 815 5 5" stroke="#A8A3B4" stroke-width="1.5" stroke-linecap="round"/>'
nav+=label('Find your next little discovery',362,818,12,PALETTE['muted'])
nav+=rounded(794,792,110,40,20,PALETTE['brand'])+label('My world',820,817,12,PALETTE['canvas'],600)
nav+='<circle cx="961" cy="812" r="17" fill="#292B36" stroke="#484B58"/><circle cx="961" cy="807" r="4" fill="none" stroke="#C9C5D0" stroke-width="1.4"/><path d="M953 820a8 8 0 0 1 16 0" fill="none" stroke="#C9C5D0" stroke-width="1.4"/>'
nav+=label('Desktop navigation / 32 px symbol',96,902,12,PALETTE['muted'])
nav+=rounded(72,927,510,68,20,PALETTE['surface'],PALETTE['border'])
mobile,width=lockup(94,947,28,17,gap=8)
nav+=mobile
nav+='<circle cx="525" cy="961" r="12" fill="#D8AFE9"/><path d="M519 961h12M525 955v12" stroke="#191B24" stroke-width="1.4" stroke-linecap="round"/>'
nav+=label('Mobile / 28 px',617,968,12,PALETTE['muted'])
board+='<g id="06-Navigation-application">'+nav+'</g>'

app=label('07 / APP ICON & FAVICON',1080,735,11,PALETTE['muted'],600,spacing=1.1)
app+=rounded(1080,760,448,235,24,'#191B24',PALETTE['border'])
app+=rounded(1112,793,128,128,32,PALETTE['canvas'])+mark(1125,806,102)
app+=rounded(1300,823,64,64,16,PALETTE['canvas'])+mark(1305,828,54)
app+=rounded(1418,839,32,32,8,PALETTE['canvas'])+mark(1419,840,30)
app+=label('APP / 512 PX',1112,956,11,PALETTE['muted'],500)
app+=label('64 PX',1318,924,11,PALETTE['muted'],500)
app+=label('32 PX',1417,924,11,PALETTE['muted'],500)
board+='<g id="07-Icon-application">'+app+'</g>'

board+='<path d="M72 1030H1528" stroke="#353744"/>'
for x,color,title in [(72,PALETTE['canvas'],'#101118'),(272,PALETTE['brand'],'#D8AFE9'),(472,PALETTE['lavender'],'#E9E1F9'),(672,PALETTE['teal'],'#DDF2EC')]:
    board+=rounded(x,1064,24,24,8,color,'#4A4654')+label(title,x+36,1082,12,PALETTE['muted'],500)
board+=label('MANROPE / BOLD',1080,1082,12,PALETTE['muted'],600,spacing=.8)
board+=label('A soft, personal identity for discovery, choices and stories.',72,1130,12,PALETTE['muted'])
board+=label('MEETMYWORLD.COM',1336,1130,11,PALETTE['muted'],500,spacing=.7)
save('brand-board.svg',board+'</svg>')

assets=start(1600,620,'MeetMyWorld · Editable logo assets')
assets+=rounded(0,0,1600,620,0,PALETTE['canvas'])
assets+=label('MEETMYWORLD / LOGO ASSETS',40,48,14,PALETTE['muted'],600,spacing=1.2)
for x,y,w,h,bg in [(40,80,740,238,PALETTE['surface']),(820,80,740,238,'#F3F0F7'),(40,346,740,234,PALETTE['surface']),(820,346,740,234,PALETTE['surface'])]:
    assets+=rounded(x,y,w,h,20,bg)
def asset_label(value,x,y,color=PALETTE['muted']):
    return label(value,x,y,13,color,500,'Noto Sans SC')
assets+=asset_label('主标 / 文字转曲',68,112)
primary,_=lockup(68,132)
assets+='<g id="Primary-outlined">'+primary+'</g>'
assets+=asset_label('字标源文件 / 可编辑文字 · Manrope Bold',68,232)
assets+='<g id="Editable-lockup" transform="translate(68 244)">'+mark()+f'<text id="Editable-meetmyworld" x="80" y="46.96" font-family="Manrope" font-size="44" font-weight="700" letter-spacing="-.5958" fill="{PALETTE["text"]}">meet<tspan fill="{PALETTE["brand"]}">my</tspan>world</text></g>'
assets+=asset_label('浅色背景 / 深紫色主标',848,112,'#6D6377')
light,_=lockup(848,132,color=PALETTE['canvas'],accent=PALETTE['brandOnLight'])
assets+='<g id="Light-background-logo">'+light+'</g>'
assets+=asset_label('黑色单色版',848,232,'#6D6377')
black,_=lockup(848,244,color=PALETTE['canvas'],accent=PALETTE['canvas'])
assets+='<g id="Black-logo">'+black+'</g>'
assets+=asset_label('白色单色版',68,378)
white,_=lockup(68,394,color=PALETTE['text'],accent=PALETTE['text'])
assets+='<g id="White-logo">'+white+'</g>'
assets+=asset_label('独立图形 / 淡紫、深紫、白色',68,496)
assets+='<g id="Standalone-marks">'+mark(68,506)+mark(172,506,color=PALETTE['brandOnLight'])+mark(276,506,color=PALETTE['text'])+'</g>'
assets+=asset_label('应用图标 / 网站图标',848,378)
assets+='<g id="App-icon-source">'+rounded(848,402,128,128,30,PALETTE['canvas'])+mark(864.5,418.5,95)+'</g>'
assets+='<g id="Favicon-source">'+rounded(1032,434,64,64,16,PALETTE['canvas'])+mark(1039,441,50)+'</g>'
assets+=asset_label('SVG 可任意缩放，导出文件含透明背景版本',848,558)
save('logo-assets.svg',assets+'</svg>')

metadata={'brand':'meetmyworld','displayName':'MeetMyWorld','sourceFigmaFileKey':'TluUhd92v2Z2HztvQeGqxe','sourceDesktopNode':'40:371','sourceMobileNode':'74:466','date':'2026-10-13','font':'Manrope Bold','palette':PALETTE,'concept':'An open world, a rounded W-shaped discovery path, and the person arriving as a small dot.','variants':['primary lavender','dark on light','white monochrome','black monochrome','favicon','app icon'],'minimumIconSize':24,'faviconSizes':[16,32,48,64],'clearSpace':'At least 1/4 of the icon width around isolated marks; half a wordmark x-height around horizontal logos.'}
(ROOT/'brand.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
print('Created logo vectors in',ROOT)
