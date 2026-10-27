from pathlib import Path
import base64, html, json, re, struct, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
W, H, GAP, LEFT, RIGHT = 1011, 750, 24, 650, 337
BRAND, TEXT, MUTED = '#D8AFE9', '#F7F3FB', '#A8A3B4'
ICONS = dict(re.findall(r"^  (\w+):'([^']*)',", (ROOT/'helpers.js').read_text(), re.M))
ICONS.update({
    'check': '<path d="m5 12 4 4 10-10"/>',
    'close': '<path d="m6 6 12 12M18 6 6 18"/>',
    'arrowRight': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    'arrowLeft': '<path d="M20 12H4m6-6-6 6 6 6"/>',
    'chevronUp': '<path d="m6 15 6-6 6 6"/>',
    'exit': '<path d="M9 4H4v16h5M12 12h9m-4-4 4 4-4 4"/>',
})
def esc(s): return html.escape(str(s),quote=True)
def g(name, body, x=0, y=0):
    return '<g id="'+esc(name)+'" transform="translate('+str(x)+' '+str(y)+')">'+body+'</g>'
def text(name,x,y,label,size=16,color=TEXT,weight=400,anchor='start',font='Noto Sans SC'):
    return f'<text id="{esc(name)}" x="{x}" y="{y}" font-family="{font}" font-weight="{weight}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{esc(label)}</text>'
def rect(name,x,y,w,h,radius=20,fill='url(#glass)',stroke='#444451'):
    return f'<rect id="{esc(name)}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="1"/>'
def bounds(width,height):
    return f'<rect id="布局边界" width="{width}" height="{height}" fill="#FFFFFF" fill-opacity=".001"/>'
def icon(name,key,x,y,size=20,color=MUTED):
    return g(name,ICONS[key],x,y).replace('transform="translate('+str(x)+' '+str(y)+')"','transform="translate('+str(x)+' '+str(y)+') scale('+str(size/24)+')" fill="none" stroke="'+color+'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"')
def chip(name,x,y,w,label,fill='#332C42',color=BRAND):
    return g(name,rect('标签表面',0,0,w,28,14,fill,'#61516E')+text('标签文字',w/2,19,label,12,color,500,'middle'),x,y)
def product(width):
    raw=(ROOT/'assets/featured-lavender.png').read_bytes()
    sw,sh=struct.unpack('>II',raw[16:24]); factor=max(72/sw,82/sh)
    image=f'<image id="独立商品封面图片" x="{(72-sw*factor)/2}" y="{(82-sh*factor)/2}" width="{sw*factor}" height="{sh*factor}" xlink:href="data:image/png;base64,{base64.b64encode(raw).decode()}" clip-path="url(#thumb)"/>'
    body=g('商品封面',image)+text('商品名称',96,35,'伴侣协作体检',32,weight=700)
    body+=chip('演示界面标记',392,10,80,'UI 预览')
    body+=text('商品分类与说明',96,70,'关系情感  /  发现隐藏的协作模式',15,MUTED)
    return g('02 · 商品摘要',bounds(width,82)+body,0,48)
def breadcrumb(width):
    return g('01 · 导航与退出',bounds(width,28)+text('页面路径',0,22,'我的应用 / 伴侣协作体检',14,MUTED)+icon('退出图标','exit',width-106,6,18)+text('退出测评',width,22,'退出测评',14,MUTED,anchor='end'))
def progress(width,saved):
    start=122; barwidth=width-182; gap=5; segment=(barwidth-15*gap)/16
    body=bounds(width,36)+text('已完成题数',0,26,f'已完成 {saved} / 16',14,MUTED)
    for i in range(16):
        body+=f'<rect id="进度段 {i+1:02d} · '+('已完成' if i<saved else '待答')+f'" x="{start+i*(segment+gap)}" y="15" width="{segment}" height="10" rx="5" fill="'+(BRAND if i<saved else '#353744')+'"/>'
    body+=text('完成百分比',width,26,'31%' if saved==5 else '25%',14,TEXT,anchor='end',font='Manrope')
    return g('03 · 十六段答题进度',body,0,150)
OPTIONS=[
('A','我先发现，也常常是我来安排'),
('B','说好分工后，各自完成'),
('C','谁看见谁处理，彼此补位'),
('D','很少讨论，临时再说'),
]
def tile(letter,label,width,height=114):
    selected=letter=='B'; size=16 if width<330 else 18
    body=rect('选项卡表面',0,0,width,height,16,'#332D40' if selected else 'url(#option)',BRAND if selected else '#414450')
    body+=f'<circle id="单选圆圈" cx="26" cy="{height/2}" r="10" fill="'+(BRAND if selected else 'none')+'" stroke="'+(BRAND if selected else '#D0CDD8')+'" stroke-width="1.5"/>'
    if selected: body+=f'<circle id="选中圆点" cx="26" cy="{height/2}" r="4" fill="#523065"/>'
    body+=text('选项字母',52,height/2+6,letter,19,BRAND if selected else TEXT,500,font='Manrope')
    if letter=='A' and width<330:
        body+=text('选项文案第一行',84,height/2-9,'我先发现，也常常是',size)
        body+=text('选项文案第二行',84,height/2+15,'我来安排',size)
    elif letter=='C' and width<330:
        body+=text('选项文案第一行',84,height/2-9,'谁看见谁处理，',size)
        body+=text('选项文案第二行',84,height/2+15,'彼此补位',size)
    else:
        body+=text('选项文案',84,height/2+6,label,size)
    return g('选项卡 · '+letter+' · '+('选中' if selected else '未选中'),body)
def button(label,width,primary=True,arrow=None):
    body=rect('按钮表面',0,0,width,54,27,BRAND if primary else '#23252F',BRAND if primary else '#64616F')
    body+=text('按钮文字',width/2+(9 if arrow=='left' else -9 if arrow else 0),34,label,17,'#251731' if primary else TEXT,500,'middle')
    if arrow: body+=icon('按钮箭头','arrowLeft' if arrow=='left' else 'arrowRight',width/2-60 if arrow=='left' else width/2+47,17,20,'#251731' if primary else TEXT)
    return g('按钮 · '+label,body)
def question(width,feedback):
    body=rect('题卡玻璃表面',0,0,width,500,24)
    body+=text('当前题号与主题',28,38,'第 05 / 16 题  /  日常分工',14,MUTED)
    if feedback:
        body+=chip('回答已保存',width-153,16,125,'回答已保存','#233E38','#9EE0CB')
        body+=text('题目第一行',28,86,'当家里有事情需要处理时，',28,weight=700)
        body+=text('题目第二行',28,120,'你们通常会怎么分工？',28,weight=700)
        body+=text('作答说明',28,153,'选择最贴近真实情况的一项',15,MUTED)
        ty=178; th=92
    else:
        body+=chip('选择尚未确认',width-165,16,137,'选择尚未确认','#3A302B','#D2B58B')
        body+=text('题目',28,92,'当家里有事情需要处理时，你们通常会怎么分工？',28,weight=700)
        body+=text('作答说明',28,130,'选择最贴近真实情况的一项',16,MUTED)
        ty=157; th=98
    tw=(width-56-18)/2
    for i,(letter,label) in enumerate(OPTIONS):
        body+=g('网格位置 · '+letter,tile(letter,label,tw,th),28+(tw+18)*(i%2),ty+(th+18)*(i//2))
    line=ty+th*2+18+26
    body+=f'<path id="操作区分隔线" d="M28 {line}H{width-28}" stroke="#45434F"/>'
    by=line+20
    body+=g('上一题实例位置',button('上一题',158,False,'left'),28,by)
    if feedback:
        body+=text('修改本题',width/2,by+34,'修改本题',14,MUTED,anchor='middle')
    pw=206 if feedback else 268
    body+=g('主操作按钮实例位置',button('下一题' if feedback else '确认选择',pw,True,'right'),width-28-pw,by)
    if not feedback:
        body+=text('确认后查看反馈说明',width-28,by+79,'确认后查看其他参与者的回答',12,MUTED,anchor='end')
    return g('04 · 题目与选项网格',bounds(width,500)+body,0,206)
def feedback_panel():
    width=RIGHT; height=750; x=LEFT+GAP
    body=rect('反馈玻璃表面',0,0,width,height,24,'url(#feedback)','#63586E')
    body+=text('反馈标题',22,44,'群体反馈',24,weight=700)+chip('示例数据标记',126,22,78,'示例数据')
    body+=text('收起反馈',width-22,43,'收起',12,MUTED,anchor='end')
    body+=text('统计说明',22,76,'以下为 UI 演示数据',12,MUTED)
    body+=g('当前选择摘要',rect('选择摘要表面',22,99,width-44,80,14,'#302B3C','#806691')+text('当前选择标签',36,124,'你的选择',13,BRAND)+text('当前选择文字',36,155,'B · 说好分工后，各自完成',16))
    body+=text('本题回答分布标题',22,205,'其他人怎么选',19,weight=700)+text('回答样本量',22,230,'本题：120 份其他有效回答',12,MUTED)
    answers=[('A · 我来安排',34),('B · 分工后各自完成',41),('C · 彼此补位',18),('D · 临时再说',7)]
    track=width-44
    for i,(label,percentage) in enumerate(answers):
        y=264+i*46; color=BRAND if i==1 else '#B6D0EC'
        row=text('选项标签',22,y,label,14,color if i==1 else TEXT)+text('百分比',width-22,y,f'{percentage}%',14,color,anchor='end',font='Manrope')
        row+=rect('条形图背景',22,y+12,track,9,4.5,'#393B49','#393B49')
        row+=rect('条形图数值',22,y+12,track*percentage/100,9,4.5,color,color)
        body+=g('回答分布 · '+OPTIONS[i][0],row)
    body+='<path id="两类统计分隔线" d="M22 450H315" stroke="#61576B"/>'
    body+=text('完成结论分布标题',22,482,'已完成答卷的结论',19,weight=700)+text('结论样本量',22,507,'80 份其他有效答卷',12,MUTED)
    results=[('仍在探索',30,'#B6D0EC'),('逐步平衡',45,BRAND),('相对稳定',25,'#9EE0CB')]
    for i,(label,percentage,color) in enumerate(results):
        y=543+i*46
        row=text('类型标签',22,y,label,14)+text('类型比例',width-22,y,f'{percentage}%',14,color,anchor='end',font='Manrope')
        row+=rect('比例条背景',22,y+12,track,9,4.5,'#393B49','#393B49')+rect('比例条数值',22,y+12,track*percentage/100,9,4.5,color,color)
        body+=g('结论分布 · '+label,row)
    body+='<path id="反馈脚注分隔线" d="M22 690H315" stroke="#514957"/>'
    body+=text('样本统计口径',22,719,'两类样本分别统计，均不含当前答卷',12,MUTED)
    body+=text('个人结果说明',22,742,'你的结果将在完成测评后生成',12,MUTED)
    return g('05 · 右侧群体反馈 · 展开',bounds(width,height)+body,x,0)
DEFS='<defs><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#252630"/><stop offset="1" stop-color="#1B1D25"/></linearGradient><linearGradient id="option" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#292A35"/><stop offset="1" stop-color="#22242D"/></linearGradient><linearGradient id="feedback" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#232530"/><stop offset=".7" stop-color="#23212D"/><stop offset="1" stop-color="#32273F"/></linearGradient><clipPath id="thumb"><rect width="72" height="82" rx="13"/></clipPath></defs>'
rows=[]
for feedback in [False,True]:
    cw=LEFT if feedback else W
    body=breadcrumb(cw)+product(cw)+progress(cw,5 if feedback else 4)+question(cw,feedback)
    body+=g('06 · 趣味自测说明',bounds(cw,24)+text('页脚说明',0,20,'趣味自测，仅供娱乐与自我观察。',12,MUTED),0,726)
    if feedback: body=g('01 · 作答主区',bounds(cw,H)+body)+feedback_panel()
    path=ROOT/('option-grid-feedback-content.svg' if feedback else 'option-grid-answer-content.svg')
    source=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{DEFS}{bounds(W,H)}{body}</svg>'
    path.write_text(source)
    doc=ET.fromstring(source); namespace={'svg':'http://www.w3.org/2000/svg'}
    rows.append({'path':str(path),'width':W,'height':H,'nativeTextElements':len(doc.findall('.//svg:text',namespace)),'discreteImages':len(doc.findall('.//svg:image',namespace)),'feedback':feedback})
manifest={'fileKey':'TluUhd92v2Z2HztvQeGqxe','pageId':'382:162','pageName':'06 · 答题与反馈 · 选项网格','status':'assets-ready; Figma composition pending','sourceImages':['output/imagegen/answer-feedback-20261014/answer-04-option-grid.png','output/imagegen/answer-feedback-20261014/feedback-04-option-grid.png'],'scope':'two editable desktop screens; keep 2x2 single-select cards and nonmodal right feedback; both distributions show distinct sample sizes','discovery':{'codeConnect':'No *.figma.ts/tsx/js, Kotlin or Swift Code Connect files found in this workspace.','existingScreens':'Native Figma editor and existing local foundation ledgers verify marketplace shell, Button instances, Or-Ai text styles and color/canvas bindings.','librarySearch':'MCP Starter quota blocks use_figma and library inspection; native editor is the fallback.','fonts':['Noto Sans SC','Manrope'],'referenceLedger':'output/figma/orai-state.json'},'assets':rows}
(ROOT/'option-grid-state.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'assets':rows,'state':str(ROOT/'option-grid-state.json')},ensure_ascii=False))

