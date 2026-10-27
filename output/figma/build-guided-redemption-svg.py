from pathlib import Path
import base64, html, json, re, struct

ROOT = Path(__file__).resolve().parent
W, H, GAP, LEFT, RIGHT = 1011, 866, 24, 640, 347
ICONS = {k: v for k, v in re.findall(r"^  (\w+):'([^']*)',", (ROOT / 'helpers.js').read_text(), re.M)}
ICONS.update({
    'clipboard': '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="2" width="6" height="5" rx="1"/>',
    'copy': '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
    'chart': '<path d="M3 21V12h4v9M10 21V6h4v15M17 21V2h4v19"/>',
    'info': '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
    'check': '<path d="m5 12 4 4 10-10"/>',
    'checkCircle': '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
    'cart': '<path d="M2 3h3l3 13h11l3-10H6"/><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>',
})

def g(name, body, transform=''):
    return f'<g id="{html.escape(name)}" {transform}>{body}</g>'

def t(name, x, y, label, size=16, color='#F6F4FA', weight=400, anchor='start', font='Noto Sans SC'):
    return f'<text id="{html.escape(name)}" x="{x}" y="{y}" font-family="{font}" font-size="{size}" font-weight="{weight}" fill="{color}" text-anchor="{anchor}">{html.escape(label)}</text>'

def r(name, x, y, w, h, radius=20, fill='url(#glass)', stroke='#444854', alpha=.9):
    return f'<rect id="{html.escape(name)}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-opacity="{alpha}"/>'

def icon(name, key, x, y, size=24, color='#CBC8D8'):
    return g(name, ICONS[key], f'transform="translate({x} {y}) scale({size/24})" fill="none" stroke="{color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"')

def image(name, x, y, w, h, clip):
    raw=(ROOT/'assets/featured-lavender.png').read_bytes()
    sw,sh=struct.unpack('>II',raw[16:24]); scale=max(w/sw,h/sh)
    return f'<image id="{name}" x="{x-(sw*scale-w)/2}" y="{y-(sh*scale-h)/2}" width="{sw*scale}" height="{sh*scale}" xlink:href="data:image/png;base64,{base64.b64encode(raw).decode()}" clip-path="url(#{clip})"/>'

def bounds(width, height):
    return f'<rect id="布局边界" width="{width}" height="{height}" fill="#FFFFFF" fill-opacity=".001"/>'

def button(label, x, y, width, primary=True):
    return g(('主按钮' if primary else '次按钮')+' · '+label, r('按钮表面',x,y,width,58,16,'#D9ACF1' if primary else '#1D1F29','#D9ACF1' if primary else '#B694CE')+t('按钮文字',x+width/2,y+37,label,19,'#21152B' if primary else '#F6F4FA',500,'middle'))

def chip(x,y,width,label,key):
    return g('信息标签 · '+label,r('标签表面',x,y,width,38,10,'#252834','#4C5261',.8)+icon('标签图标',key,x+11,y+10,19)+t('标签文字',x+38,y+25,label,13,'#DBD6E5'))

def metadata(x,y):
    return chip(x,y,112,'16 道题','file')+chip(x+122,y,122,'约 3 分钟','clock')+chip(x+254,y,120,'5 个维度','chart')

def product(success=False):
    if not success:
        return g('商品摘要 · 伴侣协作体检',image('独立封面图片',32,38,154,112,'coverForm')+t('商品标题',208,78,'伴侣协作体检',27,weight=700)+metadata(208,102))
    return g('已解锁商品摘要',r('商品摘要表面',28,208,584,132,18,'#232630','#454A58')+image('独立封面图片',44,224,138,100,'coverSuccess')+t('商品标题',204,253,'伴侣协作体检',25,weight=700)+metadata(204,276)+g('权益状态',r('状态表面',504,223,92,30,14,'#24443F','#64CBB4',.5)+icon('状态图标','checkCircle',513,229,18,'#83E5CB')+t('权益状态文字',538,244,'已解锁',13,'#83E5CB',500)))

def medal(x,y,size=136):
    a=size/136
    return g('可编辑玻璃成功徽章',f'<circle id="柔和光晕" cx="68" cy="68" r="68" fill="url(#halo)"/><circle id="玻璃主体" cx="68" cy="68" r="58" fill="url(#sphere)" stroke="#D9BDF6" stroke-width="2"/><path id="玻璃亮边" d="M25 60C23 37 47 18 69 21" fill="none" stroke="#F4E6FF" stroke-width="7" stroke-opacity=".85" stroke-linecap="round"/><path id="成功勾号" d="m42 67 17 17 37-40" fill="none" stroke="#F3E7FF" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>',f'transform="translate({x} {y}) scale({a})"')

def stepper(success=False):
    body=bounds(W,52)
    for i,(x,label) in enumerate([(0,'输入兑换码'),(323,'兑换成功'),(646,'开始测评')]):
        active=(i==1 if success else i==0); done=success and i==0
        fill='#D9ACF1' if active else '#1F2330'; stroke='#EACCF7' if active or done else '#798297'
        part=f'<circle id="步骤圆圈" cx="{x+22}" cy="26" r="21" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>'
        part+=icon('已完成勾号','check',x+9,13,26,'#D9ACF1') if done else t('步骤编号',x+22,33,str(i+1),21,'#261632' if active else '#CDC5DD',500,'middle','Manrope')
        part+=t('步骤文字',x+58,33,label,17,'#D9ACF1' if active or done else '#AAA9B9',500)
        body+=g(f'步骤 {i+1} · '+label,part)
        if i<2: body+=f'<path id="步骤连接线 {i+1}" d="M{x+188} 26h112" stroke="'+('#CA9DE5' if success and i==0 else '#555D6C')+'" stroke-width="1.5"/>'
    return body

def ticket_art():
    return g('可编辑玻璃兑换券', '<ellipse id="底座柔光" cx="152" cy="233" rx="126" ry="30" fill="url(#halo)"/><path id="底座侧面" d="M38 203v36c0 27 228 27 228 0v-36Z" fill="url(#pedestal)"/><ellipse id="底座顶面" cx="152" cy="203" rx="114" ry="27" fill="url(#pedestalTop)" stroke="#D7B2EF" stroke-opacity=".5"/><path id="券主体" d="M34 41h218v30a17 17 0 0 0 0 34v31H34v-31a17 17 0 0 0 0-34Z" fill="url(#ticket)" stroke="#DEC9FF" stroke-width="2" transform="rotate(-15 143 90)"/><path id="券内描边" d="M55 49h176v80H55Z" fill="none" stroke="#E5D8FB" stroke-opacity=".25" transform="rotate(-15 143 90)"/><circle id="券标记外圈" cx="142" cy="88" r="27" fill="none" stroke="#EADAF8" stroke-width="3"/><path id="券内符号" d="m121 91 8-1 5-12 8 24 6-31 7 17h11" fill="none" stroke="#F0E4FF" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>', 'transform="translate(22 88)"')

def orb_art():
    return g('可编辑玻璃悬浮球与底座','<ellipse id="光晕" cx="152" cy="208" rx="128" ry="36" fill="url(#halo)"/><path id="底座侧面" d="M34 185v49c0 28 236 28 236 0v-49Z" fill="url(#pedestal)"/><ellipse id="底座顶面" cx="152" cy="185" rx="118" ry="30" fill="url(#pedestalTop)" stroke="#D7B2EF" stroke-opacity=".45"/><path id="背景玻璃带" d="M17 71C63 101 226 144 290 26C258 151 161 184 56 157Z" fill="url(#ticket)" fill-opacity=".4" stroke="#D8C4EF" stroke-opacity=".2"/><circle id="透明玻璃球" cx="152" cy="122" r="75" fill="url(#sphere)" stroke="#CFC5F8" stroke-width="1.5"/><path id="高光" d="M92 105C91 76 115 56 141 56" fill="none" stroke="#F0E4FF" stroke-width="8" stroke-linecap="round" stroke-opacity=".7"/><path id="球体内弧" d="M81 132C128 101 200 99 225 133" fill="none" stroke="#E8DDFC" stroke-width="4" stroke-opacity=".2"/>', 'transform="translate(22 272)"')

def tips(success=False):
    height=538 if success else 622
    body=r('提示卡表面',0,0,RIGHT,height,22,'url(#tipsGlass)','#68617E')
    body+=t('提示卡标题',28,54,'开始前的小提示' if success else '如何获取兑换码',26,weight=700)
    if success:
        rows=[('clock','按第一反应作答'),('file','约 3 分钟完成'),('checkCircle','完成后查看报告')]
        positions=[107,164,221]; body+=orb_art()
    else:
        rows=[('cart','在购买平台完成购买'),('file','在订单中查看兑换码'),('copy','复制后粘贴到这里')]
        positions=[408,466,524]; body+=ticket_art()
    for (key,label),y in zip(rows,positions):
        body+=g('提示 · '+label,f'<circle cx="49" cy="{y-7}" r="22" fill="#2E3543" stroke="#5F697D" stroke-opacity=".7"/>'+icon('提示图标',key,37,y-19,24)+t('提示文字',84,y,label,16))
    if not success:
        body+='<path id="支持分隔线" d="M28 566h291" stroke="#505664"/>'
        body+=g('帮助入口',icon('帮助图标','help',28,585,21)+t('帮助文字',58,601,'兑换码在哪里？',14,'#D9ACF1')+icon('客服图标','headphones',208,585,21)+t('客服文字',238,601,'联系客服',14,'#D9ACF1'))
    return body

def form():
    body=r('兑换主卡表面',0,0,LEFT,622,22)+product()
    body+='<path id="商品与表单分隔线" d="M32 184h576" stroke="#4D5260"/>'
    body+=t('输入框标签',32,239,'兑换码',18,weight=500)
    body+=g('输入框 · 兑换码',r('输入框表面',32,261,576,60,14,'#252834','#C09ADC')+t('示例占位符',51,300,'DEMO-XXXX-XXXX',18,'#9496AA',font='Manrope')+'<path id="粘贴分隔线" d="M509 276v30" stroke="#555267"/>'+icon('粘贴图标','clipboard',528,279,23,'#D9ACF1')+t('粘贴文字',563,300,'粘贴',16,'#D9ACF1'))
    body+=t('兑换码获取提示',32,352,'在购买平台获取兑换码后，回到这里兑换',16,'#AAA9BC')
    body+=button('确认兑换',32,395,576)
    body+=g('访客提示',icon('提示图标','info',32,509,24)+t('提示文字',68,528,'无需登录，也能兑换与查看报告',16,'#C3BED2'))
    return body

def success_card():
    body=r('成功主卡表面',0,0,LEFT,538,22)+medal(28,31)
    body+=t('成功状态标题',207,94,'兑换成功',34,weight=700)+t('成功状态说明',207,131,'可以开始探索了',20,'#CCC6D8')
    body+=product(True)+button('开始测评',28,382,280)+button('返回商城',332,382,280,False)
    return body

DEFS='''<defs>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#252934"/><stop offset="1" stop-color="#1C2029"/></linearGradient>
<linearGradient id="tipsGlass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#262B37"/><stop offset=".6" stop-color="#292636"/><stop offset="1" stop-color="#1C2029"/></linearGradient>
<radialGradient id="sphere" cx=".32" cy=".23" r=".82"><stop stop-color="#EFDDFF"/><stop offset=".18" stop-color="#C6A2ED"/><stop offset=".47" stop-color="#9670D7"/><stop offset=".71" stop-color="#7750B2"/><stop offset=".9" stop-color="#BE96EA"/><stop offset="1" stop-color="#E7D9FC"/></radialGradient>
<radialGradient id="halo"><stop stop-color="#B686E6" stop-opacity=".3"/><stop offset="1" stop-color="#B686E6" stop-opacity="0"/></radialGradient>
<linearGradient id="ticket" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#E6D5FF" stop-opacity=".64"/><stop offset=".3" stop-color="#9D71D0" stop-opacity=".72"/><stop offset=".65" stop-color="#DDB4F3" stop-opacity=".55"/><stop offset="1" stop-color="#F2DEFF" stop-opacity=".75"/></linearGradient>
<linearGradient id="pedestal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#9882B9"/><stop offset="1" stop-color="#252233"/></linearGradient>
<radialGradient id="pedestalTop"><stop stop-color="#C5AFE2"/><stop offset="1" stop-color="#A68BBF"/></radialGradient>
<clipPath id="coverForm"><rect x="32" y="38" width="154" height="112" rx="16"/></clipPath>
<clipPath id="coverSuccess"><rect x="44" y="224" width="138" height="100" rx="14"/></clipPath>
</defs>'''

for success in [False,True]:
    sections=[]
    def section(name,height,body): sections.append((name,height,bounds(W,height)+body))
    section('01 · 返回入口',32,icon('返回图标','chevron',0,3,22)+t('返回商品详情',30,21,'返回商品详情',15,'#CCC6DA'))
    section('02 · 页面标题',88,t('页面标题',0,44,'兑换成功' if success else '兑换测评',44,weight=700)+t('页面副标题',0,82,'测评已解锁' if success else '输入兑换码，领取你的测评',22,'#D0CBDA'))
    section('03 · 三步进度',52,stepper(success))
    card_h=538 if success else 622
    section('04 · 主操作与提示',card_h,g('主操作卡片',success_card() if success else form())+g('辅助提示卡片',tips(success),f'transform="translate({LEFT+GAP} 0)"'))
    if success:
        section('05 · 登录同步提示',60,r('同步提示表面',0,0,W,60,16,'#242531','#514B63')+icon('提示图标','info',22,18,24)+t('提示文字',60,38,'登录后可同步到我的空间',16,'#CAC4D7')+t('登录注册链接',326,38,'登录 / 注册',16,'#D9ACF1',500))
    total=sum(h for _,h,_ in sections)+GAP*(len(sections)-1)
    assert total==H
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{DEFS}'
    y=0
    for name,height,body in sections:
        svg+=g(name,body,f'transform="translate(0 {y})"'); y+=height+GAP
    svg+='</svg>'
    path=ROOT/('guided-redemption-success-content.svg' if success else 'guided-redemption-content.svg')
    path.write_text(svg)
    print(json.dumps({'file':path.name,'size':[W,H],'editableTextLayers':svg.count('<text '),'discreteArtworkImages':1,'sections':len(sections)},ensure_ascii=False))

# Match the 72 px header and 907.4 px workspace; do not scale the long-page shell.
atmosphere='''<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1024" viewBox="0 0 1440 1024">
<defs>
<radialGradient id="lilac" cx=".98" cy=".98" r=".7"><stop stop-color="#9F72B1" stop-opacity=".48"/><stop offset=".5" stop-color="#5D4B74" stop-opacity=".19"/><stop offset="1" stop-color="#101118" stop-opacity="0"/></radialGradient>
<radialGradient id="green" cx=".02" cy=".99" r=".7"><stop stop-color="#BBCB9E" stop-opacity=".35"/><stop offset=".35" stop-color="#729584" stop-opacity=".17"/><stop offset="1" stop-color="#101118" stop-opacity="0"/></radialGradient>
<linearGradient id="sidebar" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#274B60" stop-opacity=".02"/><stop offset=".6" stop-color="#618DA1" stop-opacity=".16"/><stop offset="1" stop-color="#A7C1C5" stop-opacity=".25"/></linearGradient>
<linearGradient id="edge" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#8E9AB2" stop-opacity=".26"/><stop offset=".44" stop-color="#839DB7" stop-opacity=".3"/><stop offset=".86" stop-color="#ACCAD1" stop-opacity=".65"/><stop offset="1" stop-color="#E7DFF1" stop-opacity=".85"/></linearGradient>
<linearGradient id="outer" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#C9C1DE" stop-opacity="0"/><stop offset=".7" stop-color="#C9C1DE" stop-opacity=".02"/><stop offset=".91" stop-color="#CBD2E3" stop-opacity=".17"/><stop offset="1" stop-color="#F5ECFF" stop-opacity=".64"/></linearGradient>
</defs>
<g id="双色环境光"><rect width="1440" height="1024" fill="url(#lilac)"/><rect width="1440" height="1024" fill="url(#green)"/></g>
<g id="侧栏渐变玻璃"><rect x="73.2" y="73.2" width="244" height="905" rx="26" fill="url(#sidebar)"/></g>
<g id="底部轨道网格" fill="none" stroke="#B3AEC7" stroke-opacity=".05"><ellipse cx="862" cy="964" rx="480" ry="144"/><ellipse cx="862" cy="964" rx="380" ry="105"/><ellipse cx="862" cy="964" rx="230" ry="144"/><ellipse cx="862" cy="964" rx="115" ry="144"/><path d="M382 964h960M454 891h816M862 820v204"/></g>
<g id="玻璃面板双描边" fill="none"><rect x="72" y="72" width="1296" height="907.4" rx="28" stroke="url(#edge)" stroke-width="1.4"/><path d="M1382 610V965.4Q1382 993.4 1354 993.4H86Q58 993.4 58 965.4V720" stroke="url(#outer)" stroke-width="1.6"/><path d="M80 986H1360" stroke="#D7D6EC" stroke-width="7" stroke-opacity=".09"/><path d="M1372 844V961Q1372 987 1346 987" stroke="#F3EFFF" stroke-width="8" stroke-opacity=".07"/></g>
</svg>'''
(ROOT/'guided-redemption-atmosphere.svg').write_text(atmosphere)
