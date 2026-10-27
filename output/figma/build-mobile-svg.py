from pathlib import Path
import base64, re, html, json
root=Path('output/figma')
helper=(root/'helpers.js').read_text()
icons={k:v for k,v in re.findall(r"^  (\w+):'([^']*)',",helper,re.M)}
def text(name,x,y,value,size=14,color='#f8f7fa',weight=400,font='Noto Sans SC',anchor='start'):
 return f'<text id="{name}" x="{x}" y="{y}" fill="{color}" font-family="{font}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{html.escape(value)}</text>'
def icon(name,key,x,y,size=20,color='#282630',sw=1.6):
 return f'<g id="{name}" transform="translate({x} {y}) scale({size/24})" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{icons[key]}</g>'
def pic(file,x,y,w,h,extra=''):
 data=base64.b64encode((root/'assets'/file).read_bytes()).decode()
 return f'<image x="{x}" y="{y}" width="{w}" height="{h}" xlink:href="data:image/png;base64,{data}" preserveAspectRatio="xMidYMid slice" {extra}/>'
def group(name,body):return f'<g id="{name}">{body}</g>'
parts=['''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="384" height="832" viewBox="0 0 384 832">
<defs>
<linearGradient id="canvas" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#28282C"/><stop offset=".24" stop-color="#19191E"/><stop offset=".67" stop-color="#1C1B24"/><stop offset="1" stop-color="#24262B"/></linearGradient>
<radialGradient id="purple" cx=".24" cy=".98" r=".8" gradientTransform="translate(0 .13) scale(1 .87)"><stop stop-color="#965ABB" stop-opacity=".64"/><stop offset=".38" stop-color="#784390" stop-opacity=".28"/><stop offset="1" stop-color="#603975" stop-opacity="0"/></radialGradient>
<radialGradient id="green" cx=".87" cy="1" r=".52"><stop stop-color="#BEC88B" stop-opacity=".85"/><stop offset=".35" stop-color="#A7AE79" stop-opacity=".48"/><stop offset="1" stop-color="#9DA26E" stop-opacity="0"/></radialGradient>
<linearGradient id="search" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="#49494D"/><stop offset="1" stop-color="#333338"/></linearGradient>
<linearGradient id="searchEdge" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#B9B7C1" stop-opacity=".36"/><stop offset=".6" stop-color="#B9B7C1" stop-opacity=".18"/><stop offset="1" stop-color="#B9B7C1" stop-opacity=".32"/></linearGradient>
<linearGradient id="navGlass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#A998B0" stop-opacity=".15"/><stop offset=".5" stop-color="#998C9B" stop-opacity=".15"/><stop offset="1" stop-color="#DDE7CB" stop-opacity=".18"/></linearGradient>
<linearGradient id="navEdge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#DACBE3" stop-opacity=".27"/><stop offset=".55" stop-color="#E3DFF0" stop-opacity=".16"/><stop offset="1" stop-color="#F0F8D8" stop-opacity=".33"/></linearGradient>
<linearGradient id="selected" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#E3A1F5"/><stop offset=".55" stop-color="#E8A7F8"/><stop offset="1" stop-color="#ECB5F7"/></linearGradient>
<clipPath id="avatarClip"><circle cx="347.5" cy="29.5" r="17"/></clipPath>
<clipPath id="lavenderClip"><rect x="19" y="258" width="274" height="316" rx="12"/></clipPath>
<clipPath id="tealClip"><rect x="305" y="258" width="274" height="316" rx="12"/></clipPath>
</defs>''']
parts.append(group('00 · Atmosphere', '<rect id="Canvas" width="384" height="832" fill="url(#canvas)"/><rect id="Purple ambient glow" opacity=".7" y="536" width="384" height="296" fill="url(#purple)"/><rect id="Olive ambient glow" y="602" width="384" height="230" fill="url(#green)"/>'))
grid='''<g id="Orbital grid" opacity=".7" fill="none" stroke="#B7AEC9" stroke-opacity=".075" stroke-width=".7"><path d="M-30 726C57 639 197 586 417 593M-26 756C64 661 222 625 413 631M-10 792C66 699 230 665 415 674M36 839C109 750 249 711 421 726M76 558C126 630 189 674 361 737M129 556C110 638 151 730 249 832M204 560C226 638 256 736 275 845M276 548C267 642 300 730 327 844M340 560C324 659 348 745 382 838"/></g>'''
parts.append(grid)
header='''<g id="Or-Ai account mark"><circle cx="30.5" cy="30.5" r="12.5" fill="#F9FAFA"/><circle cx="30.5" cy="28" r="2.45" fill="#25272C"/><path d="M27.5 33.6v-.8a3 3 0 0 1 6 0v.8" fill="none" stroke="#25272C" stroke-width="1.5" stroke-linecap="round"/></g>'''
header+=text('Brand name',50,35,'Or-Ai',14,'#F6F5F8',700,'Manrope')
header+='''<g id="Notifications"><circle cx="301" cy="30" r="12.25" fill="#FBFCF8"/><path d="M294 33.5c1-1.3 1.5-2.9 1.9-5.6.3-3 2.1-5 5-5 2.9 0 4.8 2 5.1 5 .3 2.7.9 4.3 1.9 5.6Z" fill="#D8574E"/><path d="M293.9 33.7h14.2M299 36.6h4" fill="none" stroke="#315E60" stroke-width="1.15" stroke-linecap="round"/><path d="m301 23 5-4v6Z" fill="#D8574E"/></g>'''
header+=group('Profile avatar',pic('mobile-avatar-source.png',329.5,11.5,36,36,'clip-path="url(#avatarClip)"')+'<circle cx="347.5" cy="29.5" r="17" fill="none" stroke="#EAF7FC" stroke-opacity=".26" stroke-width=".75"/>')
parts.append(group('01 · Mobile header',header))
parts.append(group('02 · Hero',text('Page title',192,110,'发现有趣的自己',24,'#FCFCFD',700,anchor='middle')+text('Page subtitle',192,133,'从一个问题开始，看看你的生活倾向。',12,'#ADABB3',400,anchor='middle')))
search='<rect id="Search glass" x="32" y="153" width="320" height="42" rx="21" fill="url(#search)" stroke="url(#searchEdge)" stroke-width="1"/>'
search+=icon('Search icon','search',49,163,22,'#97969F',1.8)+text('Search placeholder',80,179,'搜索测试',11,'#9B99A1')
search+='<path id="Search sparkle" d="m327 165 3.8 3 4.2 2.3-1.6 4.3-3.8 1.5-3 4-2.6-3.1-4.2-1.8.7-5.2Z" fill="none" stroke="#B0AFB7" stroke-width="1.5" stroke-linejoin="round"/>'
parts.append(group('03 · Search',search))
chips=[]
for x,w,label in [(18,46,'全部'),(70,69,'关系情感'),(145,71,'职场工作'),(223,74,'生活消费'),(304,71,'趣味娱乐')]:
 chips.append(group('Filter · '+label,f'<rect x="{x}" y="213" width="{w}" height="29" rx="14.5" fill="#303034"/>'+text('Label',x+w/2,233,label,12,'#E5E3EA',500,anchor='middle')))
parts.append(group('04 · Categories',''.join(chips)))
for x,tone,title,hook,asset,clip in [(19,'Lavender','伴侣协作体检','发现隐藏的协作模式','featured-lavender.png','lavenderClip'),(305,'Teal','职场隐形加班体检','看见工作中的隐形付出','featured-teal.png','tealClip')]:
 art=f'<rect id="Card surface" x="{x}" y="258" width="274" height="316" rx="12" fill="{ "#E9E2FD" if tone=="Lavender" else "#547B7E"}"/>'
 art+=group('Artwork · '+tone,pic(asset,x,276 if tone=='Lavender' else 258,274,320,f'clip-path="url(#{clip})"'))
 art+=f'<rect id="Card outline" x="{x+.5}" y="258.5" width="273" height="315" rx="11.5" fill="none" stroke="#FFFFFF" stroke-opacity=".22"/>'
 art+=text('Title',x+18,481,title,21,'#15141B',700)+text('Hook',x+18,511,hook,14,'#302C3D')
 art+=group('View test',f'<rect x="{x+17}" y="528" width="126" height="34" rx="17" fill="#242229"/>'+icon('Bag','bag',x+29,536,17,'#F8F7FC',1.7)+text('Price',x+53,550,'¥ 9.9',11,'#F7F5FC',700,'Manrope')+text('View label',x+87,550,'查看测试',10,'#F7F5FC',400))
 parts.append(group('05 · Featured · '+tone,art))
parts.append(group('06 · Scenarios heading',text('Section title',18,619,'按场景发现',18,'#FBFAFD',700)))
scenes=[]
for x,label,key,headline,description,color in [(19,'关系情感','heart','看见彼此的相处方式','协作、沟通与关系边界','#F0FAFC'),(180,'职场工作','briefcase','给隐形劳动一份说明','工作分工与职场边界','#FBF3F8'),(341,'生活消费','bag','读懂每一次心动消费','习惯、选择与消费动机','#F0F0FA')]:
 body=f'<rect id="Surface" x="{x}" y="638" width="151" height="76" rx="10" fill="{color}"/>'
 body+=icon('Category icon',key,x+13,650,18,'#272A32',1.6)+text('Category',x+39,666,label,13,'#25252D',500)
 body+=text('Headline',x+13,687,headline,10.5,'#32343C',500)+text('Description',x+13,701,description,9.3,'#6E727A')
 scenes.append(group('Scenario · '+label,body))
parts.append(group('07 · Scenarios',''.join(scenes)))
nav='''<rect id="Glass surface" x=".5" y="757.5" width="383" height="90" rx="34.5" fill="url(#navGlass)" stroke="url(#navEdge)"/><path id="Top edge highlight" d="M20 762a35 35 0 0 1 15-4H349a35 35 0 0 1 17 4" stroke="#D6D1DD" stroke-opacity=".12" fill="none"/><rect id="Selected pill" x="10" y="766" width="96" height="56" rx="28" fill="url(#selected)" stroke="#F5CFFB" stroke-opacity=".3"/>'''
navicons={
'Discover':'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
'Apps':'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 7h10M8 12v5M6 14.5h4M15.5 12h.01M17.5 15h.01"/>',
'Reports':'<rect x="3" y="2" width="18" height="20" rx="3"/><path d="M7 6v5M11 5v6M15 8v3M17 5v6M7 15h3M14 15h3M7 18h3M14 18h3"/>',
'Profile':'<rect x="3" y="2" width="18" height="20" rx="3"/><circle cx="12" cy="8" r="2.3"/><path d="M7 17c0-5 10-5 10 0M8 19h8"/>'}
for cx,eng,label,color in [(58,'Discover','发现','#684A73'),(147,'Apps','应用','#F2EDF4'),(237,'Reports','报告','#F2EDF4'),(326,'Profile','我的','#F2EDF4')]:
 item=f'<g id="Icon" transform="translate({cx-11} 777) scale(.92)" fill="none" stroke="{color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{navicons[eng]}</g>'
 item+=text('Label',cx,813,label,10,color,400,anchor='middle')
 nav+=group('Tab · '+label,item)
parts.append(group('08 · Bottom navigation',nav))
parts.append('</svg>')
(root/'mobile-homepage.svg').write_text('\n'.join(parts))
meta={'reference':'design/phone.jpg','dimensions':{'width':384,'height':832},'fonts':['Noto Sans SC','Manrope'],'assets':['featured-lavender.png','featured-teal.png','mobile-avatar-source.png'],'source':'Native SVG import with editable text, vector shapes and discrete image fills; no flattened UI image.','sections':['Mobile header','Hero','Search','Categories','Featured carousel','Scenarios','Bottom navigation'],'componentStrategy':'Reuse existing brand fonts, card artwork, icons and copy; componentize mobile repeated controls after import.'}
(root/'mobile-source.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print('Built SVG:',(root/'mobile-homepage.svg').stat().st_size,'bytes; native text nodes:',sum(p.count('<text ') for p in parts))
