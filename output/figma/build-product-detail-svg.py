from pathlib import Path
import base64, re, html, json, math, struct

ROOT = Path(__file__).resolve().parent
W = 1011
icons = {k: v for k, v in re.findall(r"^  (\w+):'([^']*)',", (ROOT / 'helpers.js').read_text(), re.M)}
icons.update({
 'home': '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>',
 'check': '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
 'people': '<circle cx="8" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2 21v-3a6 6 0 0 1 12 0v3M15 14a5 5 0 0 1 7 5v2"/>',
 'message': '<path d="M4 3h16v14H9l-5 4Z"/><path d="M8 8h8M8 12h5"/>',
 'shield': '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 11 3 3 5-5"/>',
 'chart': '<path d="M3 21V12h4v9M10 21V6h4v15M17 21V2h4v19"/>',
 'ticket': '<path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Z"/><path d="M14 5v3M14 11v2M14 16v3"/>',
 'code': '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m10 8-4 4 4 4m4-8 4 4-4 4"/>',
 'info': '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
})

def text(name, x, y, value, size=16, color='#F6F4FA', weight=400, font='Noto Sans SC', anchor='start'):
    return f'<text id="{html.escape(name)}" x="{x}" y="{y}" fill="{color}" font-family="{font}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{html.escape(value)}</text>'

def icon(name, key, x, y, size=24, color='#D9ACF1'):
    return f'<g id="{html.escape(name)}" transform="translate({x} {y}) scale({size/24})" fill="none" stroke="{color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{icons[key]}</g>'

def rect(name, x, y, w, h, radius=20, fill='url(#glass)', stroke='#424450', opacity=0.85):
    return f'<rect id="{html.escape(name)}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-opacity="{opacity}"/>'

def group(name, value, transform=''):
    return f'<g id="{html.escape(name)}" {transform}>{value}</g>'

def image(name, filename, x, y, w, h, clip):
    raw = (ROOT / 'assets' / filename).read_bytes()
    source_w, source_h = struct.unpack('>II', raw[16:24])
    scale = max(w / source_w, h / source_h)
    data = base64.b64encode(raw).decode()
    return f'<image id="{name}" x="{x}" y="{y}" width="{source_w*scale}" height="{source_h*scale}" xlink:href="data:image/png;base64,{data}" preserveAspectRatio="xMidYMin slice" clip-path="url(#{clip})"/>'

def bounds(height):
    return f'<rect id="Layout bounds" width="{W}" height="{height}" fill="#FFFFFF" fill-opacity=".001"/>'

def button(name, x, y, w, label, primary=False):
    return group(name, rect('Button surface', x, y, w, 46, 23, '#D9ACF1' if primary else '#262833', '#E5C0F8' if primary else '#686976', .75) + text('Label', x+w/2, y+30, label, 14, '#181420' if primary else '#F6F4FA', 500, anchor='middle'))

sections = []
def section(name, height, content):
    sections.append((name, height, bounds(height) + content))

nav = text('Breadcrumb', 0, 18, '应用商城  /  关系情感  /  伴侣协作体检', 13, '#A8A7B5')
nav += icon('Back arrow', 'chevron', 0, 36, 20, '#D7D3DF') + text('Back to store', 28, 52, '返回商城', 14, '#D7D3DF')
section('01 · 返回与面包屑', 64, nav)

hero = rect('Hero backdrop', 0, 0, W, 380, 24, '#E8DFFC', '#8B7AA3', .7)
hero += image('Artwork · Lavender glass ribbon and sphere', 'featured-lavender.png', 411, 0, 600, 380, 'heroClip')
hero += '<rect id="Left readable gradient" width="1011" height="380" rx="24" fill="url(#heroShade)"/>'
hero += group('Category · 关系情感', rect('Category pill', 40, 40, 100, 32, 16, '#483551', '#AD8ABA', .65) + text('Category label', 90, 61, '关系情感', 13, '#E1C3F0', 500, anchor='middle'))
hero += text('Product title', 40, 145, '伴侣协作体检', 48, '#FCFBFF', 700)
hero += text('Product hook', 40, 195, '你找的是队友，还是第二份工作？', 22, '#F6F4FA', 700)
hero += text('Product summary', 40, 234, '从日常分工、承诺与沟通中，', 16, '#D2CEDB')
hero += text('Product summary continuation', 40, 260, '看见你们的协作方式。', 16, '#D2CEDB')
hero += group('Demo availability', rect('Demo badge', 40, 308, 238, 34, 17, '#4A403E', '#B79875', .6) + icon('Demo info', 'info', 52, 318, 15, '#E4CBB4') + text('Availability', 76, 330, '演示商品 · 暂不开放购买', 13, '#E4CBB4', 500))
hero += '<rect id="Hero silver edge" x=".5" y=".5" width="1010" height="379" rx="23.5" fill="none" stroke="#DED0EE" stroke-opacity=".3"/>'
section('02 · 横幅主视觉', 380, hero)

redeem = rect('Redemption glass', 0, 0, W, 128, 20)
for x, key, value in [(24, 'file', '16 道题'), (168, 'clock', '约 3 分钟'), (319, 'chart', '5 个维度')]:
    redeem += group('Metadata · '+value, icon('Icon', key, x, 47, 23, '#D5D1DF') + text('Value', x+33, 65, value, 15, '#F0ECF5', 500))
redeem += '<path id="Pricing dividers" d="M446 28v72M596 28v72" stroke="#4B4B58" stroke-opacity=".7"/>'
redeem += text('Reference price label', 476, 46, '参考价', 13, '#A8A7B5') + text('Reference price', 476, 86, '¥ 9.9', 30, '#D9ACF1', 700, 'Manrope')
redeem += button('Primary · 输入兑换码', 620, 26, 184, '输入兑换码', True) + button('Secondary · 查看购买说明', 818, 26, 167, '查看购买说明')
redeem += text('Anonymous access', 620, 101, '无需登录，也能兑换与查看报告', 13, '#AAA7B5')
section('03 · 兑换与商品信息', 128, redeem)

about = text('About heading', 0, 27, '测评介绍', 24, '#F6F4FA', 700)
about += text('About introduction', 0, 62, '围绕共同生活中的具体场景，整理你眼中的关系协作倾向。', 16, '#BDB9C8')
about += text('Dimensions heading', 0, 109, '你将了解什么', 20, '#F6F4FA', 700)
dimensions = [('家务主动性','home',['日常事务中','谁更主动承担']),('承诺兑现','heart',['说到的事','是否愿意做到']),('共同决策','people',['一起面对选择','时的协作方式']),('沟通修复','message',['遇到分歧后','如何沟通与修复']),('边界尊重','shield',['尊重彼此的空间','与个人节奏'])]
cw = (W - 4*16)/5
for i, (title, key, lines) in enumerate(dimensions):
    x = i*(cw+16)
    card = rect('Dimension glass', x, 130, cw, 140, 16) + icon('Dimension icon', key, x+cw/2-15, 149, 30)
    card += text('Dimension title', x+cw/2, 206, title, 17, '#F6F4FA', 700, anchor='middle')
    card += text('Dimension description 1', x+cw/2, 235, lines[0], 14, '#B8B3C3', anchor='middle') + text('Dimension description 2', x+cw/2, 256, lines[1], 14, '#B8B3C3', anchor='middle')
    about += group('Dimension · '+title, card)
section('04 · 测评介绍与五维内容', 270, about)

report = text('Report heading', 0, 27, '报告样例', 24, '#F6F4FA', 700)
report += group('Illustrative badge', rect('Badge surface', 120, 4, 58, 28, 14, '#4C365B', '#9866AB', .7)+text('Illustrative label', 149, 24, '示意', 13, '#E2BAF3', 500, anchor='middle'))
report += text('Sample data disclaimer', W, 25, '样例数据，不代表真实测评结果', 13, '#AAA7B5', anchor='end')
report += rect('Report sample glass', 0, 52, W, 342, 22, 'url(#reportGlass)', '#6E657F', .7)
report += text('Sample result type', 40, 123, '协作型队友', 30, '#FCFBFF', 700)
for i, line in enumerate(['你们在大多数生活场景中能够相互配合，','愿意沟通、一起承担责任。适当关注边界','与独处需求，会让关系更加轻松和长久。']):
    report += text('Sample explanation '+str(i+1), 40, 167+i*27, line, 17, '#C5BFCE')
report += group('Sample takeaway', rect('Takeaway surface', 40, 265, 458, 91, 16, '#282A36', '#44414E', .65) + text('Quote mark', 60, 303, '“', 42, '#9A86AD', 700, 'Manrope') + text('Takeaway line 1', 97, 302, '好的关系，是两个人都能更自在。', 16, '#D5CBDD') + text('Takeaway line 2', 97, 329, '让付出被看见，让分工被说清。', 16, '#D5CBDD'))
cx, cy, radius = 766, 236, 105
angles = [-math.pi/2+i*2*math.pi/5 for i in range(5)]
def point(r,a): return (cx+r*math.cos(a),cy+r*math.sin(a))
def points(rs): return ' '.join(f'{x:.2f},{y:.2f}' for x,y in [point(r,a) for r,a in zip(rs,angles)])
radar = ''
for level in [20,40,60,80,100]:
    radar += f'<polygon id="Grid {level}" points="{points([radius*level/100]*5)}" fill="none" stroke="#92869E" stroke-opacity=".27"/>'
for a in angles:
    x,y=point(radius,a); radar+=f'<path d="M{cx} {cy}L{x:.2f} {y:.2f}" stroke="#92869E" stroke-opacity=".25"/>'
scores=[84,76,82,72,80]
radar += f'<polygon id="Example scores · 84 76 82 72 80" points="{points([radius*s/100 for s in scores])}" fill="url(#radarFill)" stroke="#D9ACF1" stroke-width="2"/>'
for s,a in zip(scores,angles):
    x,y=point(radius*s/100,a);radar+=f'<circle cx="{x:.2f}" cy="{y:.2f}" r="4" fill="#F2DBFE"/>'
for title,score,x,y,anc in [('家务主动性',84,cx,94,'middle'),('承诺兑现',76,944,213,'middle'),('共同决策',82,868,365,'middle'),('沟通修复',72,652,365,'middle'),('边界尊重',80,588,213,'middle')]:
    radar+=text('Radar label · '+title,x,y,title,13,'#D3CADA',anchor=anc)+text('Radar score · '+title,x,y+22,str(score),17,'#D9ACF1',700,'Manrope',anc)
radar+=text('Radar scale note',cx,385,'分值范围 0–100',11,'#908898',anchor='middle')
report += group('Editable five-dimension radar',radar)
section('05 · 公开报告样例',394,report)

purchase = text('Purchase heading',0,27,'购买与兑换说明',24,'#F6F4FA',700)
steps = [('平台购买','bag',['在购买平台','获得兑换权益']),('获取兑换码','ticket',['完成购买后','获取兑换码']),('输入兑换码','code',['在本页面输入','兑换码领取测评']),('完成测评','check',['兑换成功后','即可开始测评'])]
sw=(W-3*20)/4
for i,(title,key,lines) in enumerate(steps):
    x=i*(sw+20)
    card=rect('Step glass',x,52,sw,120,16)
    card+=f'<circle id="Step number circle" cx="{x+26}" cy="83" r="12" fill="#D9ACF1"/>'+text('Step number',x+26,87,str(i+1),12,'#24182D',700,'Manrope','middle')
    card+=icon('Step icon',key,x+48,70,27)+text('Step title',x+87,88,title,16,'#F6F4FA',500)
    for j,line in enumerate(lines): card+=text('Step body '+str(j),x+87,117+j*23,line,13,'#AAA7B5')
    purchase+=group(f'Step {i+1} · {title}',card)
    if i<3:purchase+=icon('Next step '+str(i+1),'arrow',x+sw+1,106,18,'#8E879A')
purchase+=group('Redemption instructions',rect('Instruction surface',0,188,W,76,16,'#20212B','#494552',.65)+icon('Instructions info','info',20,212,22,'#B6AEC3')+text('Instruction copy',56,222,'在购买平台获得兑换码后，回到这里领取测评。',14,'#BCB5C7')+text('Validity',W-24,222,'使用期限以兑换权益为准',13,'#B1A9BD',anchor='end')+text('Demo purchase note',56,247,'当前为演示商品，正式价格与购买入口以后续上线为准。',12,'#8F889C'))
section('06 · 购买与兑换四步',264,purchase)

related=text('Related heading',0,27,'你可能也感兴趣',24,'#F6F4FA',700)
related+=text('More tests',W-24,25,'查看全部',13,'#B9B4C4',anchor='end')+icon('More arrow','arrow',W-18,11,18,'#B9B4C4')
rw=(W-2*16)/3
for i,(title,hook,asset,tone) in enumerate([('职场隐形加班体检','看见工作中的隐形付出','featured-teal.png','#D2EEEA'),('关系脑补倾向','分清真实线索与内心剧本','featured-periwinkle.png','#D4D7FE'),('社交电量说明书','找到适合你的社交节奏','featured-blush.png','#F2DCEB')]):
    x=i*(rw+16)
    card=rect('Recommendation surface',x,52,rw,214,18,tone,'#EEE8F8',.45)
    card+=image('Artwork · '+title,asset,x,52,150,214,'relatedClip'+str(i))
    card+=text('Recommendation title',x+143,128,title,17,'#24202F',700)
    card+=text('Recommendation hook',x+143,160,hook,12,'#51485D')
    card+=group('View recommendation',rect('View pill',x+143,190,160,36,18,'#17161D','#17161D',1)+text('Price',x+157,213,'¥ 9.9',12,'#F6F4FA',700,'Manrope')+text('View test',x+205,213,'查看测试',11,'#F6F4FA')+icon('View arrow','arrow',x+274,200,17,'#F6F4FA'))
    related+=group('Recommendation · '+title,card)
section('07 · 相关测评推荐',266,related)

disclaimer=rect('Disclaimer surface',0,0,W,56,16,'#1D1E28','#44414C',.75)+icon('Entertainment info','info',20,17,22,'#B7AEC4')+text('Entertainment disclaimer',56,35,'趣味自测，仅供娱乐与自我观察。',14,'#BFB6CC')+text('Help link',W-24,35,'使用帮助',13,'#A9A0B5',anchor='end')
section('08 · 趣味自测说明',56,disclaimer)

HEIGHT=sum(h for _,h,_ in sections)+24*(len(sections)-1)
defs='''<defs>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#242630"/><stop offset="1" stop-color="#1D1F29"/></linearGradient>
<linearGradient id="reportGlass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#252634"/><stop offset="1" stop-color="#1D202A"/></linearGradient>
<linearGradient id="heroShade" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#1B1D27"/><stop offset=".43" stop-color="#1B1D27" stop-opacity=".99"/><stop offset=".56" stop-color="#373045" stop-opacity=".85"/><stop offset=".68" stop-color="#594972" stop-opacity=".34"/><stop offset=".83" stop-color="#594972" stop-opacity="0"/></linearGradient>
<linearGradient id="radarFill" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#AA72D3" stop-opacity=".28"/><stop offset="1" stop-color="#D6A1EF" stop-opacity=".7"/></linearGradient>
<clipPath id="heroClip"><rect width="1011" height="380" rx="24"/></clipPath>
'''
for i in range(3):
    x=i*(rw+16);defs+=f'<clipPath id="relatedClip{i}"><rect x="{x}" y="52" width="150" height="214" rx="18"/></clipPath>'
defs+='</defs>'
svg=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{HEIGHT}" viewBox="0 0 {W} {HEIGHT}">{defs}'
y=0
for name,height,content in sections:
    svg+=group(name,content,f'transform="translate(0 {y})"');y+=height+24
svg+='</svg>'
(ROOT/'product-detail-wide-hero-content.svg').write_text(svg)
meta={
 'fileKey':'TluUhd92v2Z2HztvQeGqxe','pageId':'184:441','wrapperId':'184:452',
 'source':'output/imagegen/product-detail-20261013/02-wide-hero.png',
 'variant':'02 · 横幅主视觉','contentSize':[W,HEIGHT],
 'wrapperPlannedSize':[1440,HEIGHT+40+72+44+2.4],
 'sectionHeights':[{ 'name':n,'height':h } for n,h,_ in sections],
 'nativeTextCount':svg.count('<text '),'discreteImages':4,
 'fonts':['Noto Sans SC','Manrope'],'sampleScores':scores,'sampleScoreRange':[0,100],
 'designSystemDiscovery':{
   'codeConnect':'No matching Code Connect files in this repository; checked in prior turn.',
   'existingScreens':'Native inspection of adopted homepage 40:371 and local source composition; clone preserves original header, navigation instances, color and spacing variable bindings, text/effect styles.',
   'librarySearch':'Figma MCP Starter monthly quota blocks API discovery and writes. Existing local foundation IDs and native editor inspector supply style evidence.',
   'content':'New editable SVG text, vectors, named hierarchy and discrete artwork. Full-page AI screenshot used only as a reference.'
 },
 'status':'Local semantic source prepared; Figma import and validation pending'
}
(ROOT/'product-detail-wide-hero-state.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print(json.dumps({'svgBytes':len(svg.encode()),'contentSize':[W,HEIGHT],'textLayers':meta['nativeTextCount'],'sectionCount':len(sections)},ensure_ascii=False))
