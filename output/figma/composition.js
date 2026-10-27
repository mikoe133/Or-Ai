const root=await figma.getNodeByIdAsync(CONFIG.wrapperId);
if(!root||root.type!=='FRAME')throw new Error('Desktop artboard missing');
if(root.children.length)throw new Error('Artboard already populated; inspect before rebuilding');
const C=CONFIG.components;
const lookups={...Object.fromEntries(Object.entries(C.icons).map(([k,id])=>['icon_'+k,id]))};
for(const family of ['button','nav','chip','product','scene','mini'])for(const [name,id]of Object.entries(C[family].variants))lookups[family+'_'+name]=id;
const resolved=await Promise.all(Object.values(lookups).map(id=>figma.getNodeByIdAsync(id)));
const N=Object.fromEntries(Object.keys(lookups).map((key,i)=>[key,resolved[i]]));
if(resolved.some(n=>!n||n.type!=='COMPONENT'))throw new Error('Verified component unavailable');
const I=Object.fromEntries(Object.keys(C.icons).map(key=>[key,N['icon_'+key]]));
const button=(parent,label,style='Secondary',icon=null,width=null,height=36)=>{
  const props={[C.button.properties.label]:label,[C.button.properties.showIcon]:!!icon};
  if(icon)props[C.button.properties.icon]=I[icon].id;
  return instance(parent,N['button_Style='+style],label,props,width,height);
};
function iconButton(parent,name,key,color='secondary',background=null){
  const n=auto(parent,name,'HORIZONTAL',36,36,background);radius(n,'rFull');n.counterAxisAlignItems='CENTER';n.primaryAxisAlignItems='CENTER';
  const icon=instance(n,I[key],'Icon',{},18,18);tint(icon,color);return n;
}
root.itemSpacing=0;fill(root,'canvas');mutated.add(root.id);
const background=`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1024" viewBox="0 0 1440 1024"><defs><radialGradient id="v" cx=".95" cy=".95" r=".58"><stop stop-color="#9271B4" stop-opacity=".46"/><stop offset=".55" stop-color="#50425F" stop-opacity=".15"/><stop offset="1" stop-color="#101118" stop-opacity="0"/></radialGradient><radialGradient id="m" cx=".08" cy="1" r=".5"><stop stop-color="#B2C6A4" stop-opacity=".3"/><stop offset=".55" stop-color="#739384" stop-opacity=".09"/><stop offset="1" stop-color="#101118" stop-opacity="0"/></radialGradient></defs><rect width="1440" height="1024" fill="url(#v)"/><rect width="1440" height="1024" fill="url(#m)"/><g stroke="#D8D8F6" stroke-opacity=".055" fill="none"><ellipse cx="790" cy="1010" rx="470" ry="148"/><ellipse cx="790" cy="1010" rx="420" ry="122"/><ellipse cx="790" cy="1010" rx="350" ry="94"/><ellipse cx="790" cy="1010" rx="230" ry="148"/><ellipse cx="790" cy="1010" rx="120" ry="148"/><path d="M320 1010h940M355 960h870M428 910h724M790 862v162"/></g></svg>`;
absolute(svg(root,'Ambient glow and orbital grid',background,1440,1024),0,0);
const header=auto(root,'Header','HORIZONTAL',1440,72,'canvas','s16');fill(header,'canvas',0.65);header.counterAxisAlignItems='CENTER';padding(header,'s16','s24');border(header,'border',0.4);
const brand=auto(header,'Brand','HORIZONTAL',null,40,null,'s12');brand.counterAxisAlignItems='CENTER';
tint(svg(brand,'Or-Ai mark',logoSVG,32,32),'brand');text(brand,'Brand name','Or-Ai','brand');
text(header,'Breadcrumb separator','/','body','subtle');text(header,'Current destination','发现','bodyMedium');
const search=auto(header,'Search','HORIZONTAL',320,38,'raised','s8');padding(search,'s8','s12');radius(search,'rFull');border(search,'border',0.8);search.counterAxisAlignItems='CENTER';
const searchIcon=instance(search,I.search,'Search icon',{},18,18);tint(searchIcon,'secondary');
text(search,'Search placeholder','搜索测试、场景或关键词','caption','secondary');spacer(search);
const shortcut=auto(search,'Keyboard shortcut','HORIZONTAL',null,22);padding(shortcut,'s2','s6');radius(shortcut,'r8');border(shortcut,'border',0.65);shortcut.counterAxisAlignItems='CENTER';text(shortcut,'Shortcut','⌘ K','micro','secondary');
spacer(header);
iconButton(header,'Appearance','moon','secondary','raised');button(header,'我的空间','Secondary');button(header,'登录 / 注册','Primary');iconButton(header,'More','plus');
const hero=auto(root,'Intro','HORIZONTAL',1440,108);hero.paddingLeft=24;hero.paddingRight=24;hero.counterAxisAlignItems='CENTER';
const welcomeArea=auto(hero,'Welcome area','HORIZONTAL',316,108);welcomeArea.counterAxisAlignItems='CENTER';
const welcome=auto(welcomeArea,'Welcome capsule','HORIZONTAL',null,44,'raised','s10');padding(welcome,'s8','s12');radius(welcome,'rFull');welcome.counterAxisAlignItems='CENTER';
const avatar=auto(welcome,'Guest avatar','HORIZONTAL',28,28,'brand');radius(avatar,'rFull');avatar.counterAxisAlignItems='CENTER';avatar.primaryAxisAlignItems='CENTER';tint(instance(avatar,I.user,'Guest',{},16,16),'inverse');
const greeting=auto(welcome,'Greeting','VERTICAL',null,null,null,'s2');text(greeting,'Hello','你好，探索者','captionMedium');text(greeting,'Welcome message','今天，也多了解自己一点','micro','secondary');
const heroCenter=auto(hero,'Intro text','VERTICAL',760,108,null,'s4');heroCenter.counterAxisAlignItems='CENTER';heroCenter.primaryAxisAlignItems='CENTER';
text(heroCenter,'Page title','发现有趣的自己','display');text(heroCenter,'Page subtitle','从一个问题开始，看看你的生活倾向。','body','secondary');
auto(hero,'Balancing space','HORIZONTAL',316,1);
const workspace=auto(root,'Workspace','HORIZONTAL',1440,800,null,'s16');workspace.paddingLeft=20;workspace.paddingRight=20;
const leftRail=auto(workspace,'Explore rail','VERTICAL',36,800,null,'s20');leftRail.counterAxisAlignItems='CENTER';metric(leftRail,'paddingTop','s48');
iconButton(leftRail,'Browse','grid','brand','brandDeep');iconButton(leftRail,'Favorites','heart');iconButton(leftRail,'Reports','file');spacer(leftRail,true);iconButton(leftRail,'Support','headphones');metric(leftRail,'paddingBottom','s24');
const panel=auto(workspace,'Main glass panel','HORIZONTAL',1296,800,'surface');fill(panel,'surface',0.96);radius(panel,'r28');panel.clipsContent=true;border(panel,'border',0.8,1.2);panel.effectStyleId=CONFIG.foundations.effectStyleId;
const grid=`<svg xmlns="http://www.w3.org/2000/svg" width="1296" height="800" viewBox="0 0 1296 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9DBBB5" stop-opacity="0"/><stop offset=".6" stop-color="#BCCAD8" stop-opacity=".03"/><stop offset="1" stop-color="#DDBEE8" stop-opacity=".11"/></linearGradient></defs><rect width="1296" height="800" fill="url(#g)"/><g stroke="#E0D7F0" stroke-opacity=".075" fill="none"><ellipse cx="773" cy="562" rx="476" ry="214"/><ellipse cx="773" cy="562" rx="418" ry="188"/><ellipse cx="773" cy="562" rx="338" ry="150"/><ellipse cx="773" cy="562" rx="236" ry="103"/><ellipse cx="773" cy="562" rx="176" ry="214"/><ellipse cx="773" cy="562" rx="82" ry="214"/><path d="M299 562h948M356 467h835M356 657h835M773 348v428"/></g></svg>`;
absolute(svg(panel,'Glass tint and orbital grid',grid,1296,800),0,0);
const sidebar=auto(panel,'My space sidebar','VERTICAL',244,800,null,'s20');padding(sidebar,'s20');
const spaceHeading=auto(sidebar,'Space heading','HORIZONTAL',204,28);spaceHeading.counterAxisAlignItems='CENTER';text(spaceHeading,'My space','我的空间','section');spacer(spaceHeading);tint(instance(spaceHeading,I.chevron,'Collapse sidebar',{},16,16),'secondary');
const menu=auto(sidebar,'Personal navigation','VERTICAL',204,null,null,'s8');
const menuItems=[['应用商城','bag',true],['我的应用','grid',false],['我的报告','file',false],['我的收藏','bookmark',false],['使用帮助','help',false]];
for(const [label,icon,selected]of menuItems){
  const item=instance(menu,N['nav_Selected='+selected],label,{[C.nav.properties.label]:label,[C.nav.properties.icon]:I[icon].id},204,44);
  const iconNode=item.findAllWithCriteria({types:['INSTANCE']}).find(n=>n.name==='Icon'||n.name.startsWith('Or-Ai / Icon /'));if(iconNode)tint(iconNode,selected?'brand':'secondary');
}
spacer(sidebar,true);
const redeem=auto(sidebar,'Redeem entry','VERTICAL',204,null,null,'s12');
text(redeem,'Redeem heading','一份报告，一点新发现','bodyMedium','text',204);
text(redeem,'Redeem instruction','在购买平台获得兑换码，\n来到这里，开始认识自己。','caption','secondary',204);
button(redeem,'输入兑换码','Primary',null,204,40);
const help=text(redeem,'Redeem help','无需登录，也能兑换与查看报告','micro','secondary',204);help.textAlignHorizontal='CENTER';
const divider=track(figma.createRectangle());panel.appendChild(divider);divider.name='Sidebar divider';divider.resize(1,800);fill(divider,'border',0.5);
const main=auto(panel,'Store content','VERTICAL',1051,800,null,'s22');padding(main,'s20');
const toolbar=auto(main,'Categories and quick actions','HORIZONTAL',1011,36,null,'s12');toolbar.counterAxisAlignItems='CENTER';
const filters=auto(toolbar,'Scenario filters','HORIZONTAL',null,32,null,'s8');
for(const label of ['全部','关系情感','职场工作','自我探索','生活消费','趣味娱乐'])instance(filters,N['chip_Selected='+(label==='全部')],label,{[C.chip.properties.label]:label});
spacer(toolbar);button(toolbar,'继续上次测试','Secondary','clock');button(toolbar,'随机发现','Primary','sparkles');
const featured=auto(main,'Featured tests','HORIZONTAL',1011,300,null,'s16');
const products=[
  {tone:'Lavender',category:'01 / 关系情感',title:'伴侣协作体检',hook:'你找的是队友，\n还是第二份工作？',details:'16 道题 · 五维协作画像',price:'¥ 9.9'},
  {tone:'Teal',category:'02 / 职场工作',title:'职场隐形加班体检',hook:'你领一份工资，\n干了几个人的活？',details:'15 道题 · 职场边界观察',price:'¥ 9.9'},
  {tone:'Periwinkle',category:'03 / 自我探索',title:'关系脑补倾向',hook:'你喜欢的是 TA，\n还是自己写的剧本？',details:'18 道题 · 事实与期待分辨',price:'¥ 9.9'},
  {tone:'Blush',category:'04 / 趣味娱乐',title:'社交电量说明书',hook:'你是真的内向，\n还是只对某些人没电？',details:'16 道题 · 社交恢复方式',price:'¥ 9.9'},
];
for(const p of products){const props={};for(const key of ['category','title','hook','details','price'])props[C.product.properties[key]]=p[key];stretch(instance(featured,N['product_Tone='+p.tone],p.title,props,240.75,300));}
function section(parent,name,action){
  const outer=auto(parent,name,'VERTICAL',1011,null,null,'s12');
  const head=auto(outer,name+' heading','HORIZONTAL',1011,28,null,'s8');head.counterAxisAlignItems='CENTER';text(head,'Heading',name,'section');spacer(head);
  const link=auto(head,action,'HORIZONTAL',null,24,null,'s6');link.counterAxisAlignItems='CENTER';text(link,'Link label',action,'caption','secondary');tint(instance(link,I.arrow,'Link arrow',{},14,14),'secondary');return outer;
}
const scenarios=section(main,'按场景发现','查看全部');
const scenarioRow=auto(scenarios,'Scenarios','HORIZONTAL',1011,100,null,'s12');
const sceneData=[
  ['Ivory','关系情感','heart','看见彼此的相处方式','协作、沟通与关系边界'],
  ['Periwinkle','职场工作','briefcase','给隐形劳动一份说明','工作分工与职场边界'],
  ['Lavender','自我探索','sparkles','找到你的生活倾向','情绪、期待与自我观察'],
  ['Teal','生活消费','bag','读懂每一次心动消费','习惯、选择与消费动机'],
  ['Blush','趣味娱乐','smile','给日常一点轻松灵感','社交电量与生活关键词'],
];
for(const [tone,category,icon,headline,description]of sceneData){
  const props={[C.scene.properties.category]:category,[C.scene.properties.headline]:headline,[C.scene.properties.description]:description,[C.scene.properties.icon]:I[icon].id};
  const item=stretch(instance(scenarioRow,N['scene_Tone='+tone],category,props,192.6,100));const iconNode=item.findAllWithCriteria({types:['INSTANCE']}).find(n=>n.name==='Icon'||n.name.startsWith('Or-Ai / Icon /'));if(iconNode)tint(iconNode,'inverse');
}
const latest=section(main,'最新上架','最新优先');
const latestRow=auto(latest,'New releases','HORIZONTAL',1011,128,null,'s16');
const newTests=[['Blush','好说话成本账单','边界观察 · 16 道题','¥ 9.9'],['Lavender','友情供需报告','互惠关系 · 15 道题','¥ 9.9'],['Teal','消费人设测试','消费动机 · 12 道题','¥ 9.9'],['Periwinkle','本周生活关键词','娱乐抽签 · 日常行动提示','¥ 6.9']];
for(const [tone,title,details,price]of newTests)stretch(instance(latestRow,N['mini_Tone='+tone],title,{[C.mini.properties.title]:title,[C.mini.properties.details]:details,[C.mini.properties.price]:price},240.75,128));
const note=auto(main,'Content note','HORIZONTAL',1011,16);text(note,'Entertainment note','趣味自测，仅供娱乐与自我观察。','micro','secondary',null,0.8);spacer(note);text(note,'Delivery note','兑换码领取 · 支持匿名体验','micro','secondary',null,0.8);
const rightRail=auto(workspace,'Utilities rail','VERTICAL',36,800,null,'s20');rightRail.counterAxisAlignItems='CENTER';metric(rightRail,'paddingTop','s48');iconButton(rightRail,'Save','bookmark');iconButton(rightRail,'Add','plus');iconButton(rightRail,'Inspiration','sparkles');spacer(rightRail,true);iconButton(rightRail,'Help','help');metric(rightRail,'paddingBottom','s24');
const footer=auto(root,'Footer','HORIZONTAL',1440,44,null,'s12');footer.counterAxisAlignItems='CENTER';footer.paddingLeft=76;footer.paddingRight=76;
text(footer,'Copyright','Or-Ai © 2026','micro','secondary');text(footer,'Brand promise','每一个小问题，都藏着一点新的自己。','micro','secondary',null,0.75);spacer(footer);text(footer,'Support links','使用帮助  /  兑换说明  /  联系我们','micro','secondary');
figma.viewport.scrollAndZoomIntoView([root]);
const all=root.findAll(()=>true);for(const n of all)created.add(n.id);
const counts={};for(const n of all)counts[n.type]=(counts[n.type]||0)+1;
return {createdNodeIds:[...created],mutatedNodeIds:[...mutated],wrapperId:root.id,pageId:page.id,totalDescendants:all.length,nodeTypeCounts:counts,imageFilledNodes:all.filter(n=>'fills' in n&&Array.isArray(n.fills)&&n.fills.some(p=>p.type==='IMAGE')).map(n=>({id:n.id,name:n.name,type:n.type,width:n.width,height:n.height})),sections:root.children.filter(n=>n.layoutPositioning!=='ABSOLUTE').map(n=>({id:n.id,name:n.name,width:n.width,height:n.height,x:n.x,y:n.y})),bounds:{width:root.width,height:root.height},productNames:products.map(p=>p.title),fonts:[...new Set(all.filter(n=>n.type==='TEXT').flatMap(n=>n.getStyledTextSegments(['fontName']).map(s=>s.fontName.family)))]};
