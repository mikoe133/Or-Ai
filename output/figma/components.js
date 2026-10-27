const existingShelf=page.children.find(n=>n.name==='Or-Ai / Homepage Components');
if(existingShelf)throw new Error('Component shelf already exists; inspect state before rebuilding');
const root=await figma.getNodeByIdAsync(CONFIG.wrapperId);
const shelf=auto(page,'Or-Ai / Homepage Components','VERTICAL',1152,null,'surface','s32');
shelf.x=root.x+root.width+120;shelf.y=root.y;padding(shelf,'s32');shelf.clipsContent=false;
text(shelf,'Component library title','Or-Ai · 主页组件','section');
text(shelf,'Component library description','品牌色与间距变量 · 中文文本属性 · 可替换图标 · 自动布局','caption','secondary');
const icons={};
const iconTray=auto(shelf,'Icons','HORIZONTAL',1088,24,null,'s12');
for(const key of Object.keys(iconPaths)){
  const holder=auto(iconTray,'Icon / '+key,'HORIZONTAL',24,24);
  holder.counterAxisAlignItems='CENTER';holder.primaryAxisAlignItems='CENTER';
  const drawing=svg(holder,'Vector',iconSVG(key),24,24);tint(drawing,'text');
  icons[key]=toComponent(holder,'Or-Ai / Icon / '+key,'24px editable vector icon. Swap inside navigation, controls, and cards.');
}
function group(title){const g=auto(shelf,title,'VERTICAL',1088,null,null,'s12');text(g,title+' label',title,'captionMedium','brand');return g;}
function variantSet(parent,name,items,step,height){
  const set=track(figma.combineAsVariants(items.map(i=>i.component),parent));set.name=name;set.fills=[];
  set.description='Reusable homepage family. Text and icon properties support content changes.';
  items.forEach((item,i)=>{item.component.x=16+i*step;item.component.y=16;});
  set.resize(items.length*step+16,height+32);return set;
}
function property(set,items,nodeKey,label,type,defaultValue,reference='characters'){
  const key=set.addComponentProperty(label,type,defaultValue);
  for(const item of items)item[nodeKey].componentPropertyReferences={...(item[nodeKey].componentPropertyReferences||{}),[reference]:key};return key;
}
const buttonItems=[];
const buttonGroup=group('Button · 按钮');
for(const style of ['Primary','Secondary','Quiet']){
  const n=auto(buttonGroup,'Style='+style,'HORIZONTAL',null,36,style==='Primary'?'brand':style==='Secondary'?'raised':null,'s8');
  padding(n,'s6','s16');radius(n,'rFull');n.primaryAxisAlignItems='CENTER';n.counterAxisAlignItems='CENTER';
  if(style==='Secondary')border(n,'border',0.65);
  const label=text(n,'Label','按钮','captionMedium',style==='Primary'?'inverse':'text');
  const icon=instance(n,icons.arrow,'Icon',{},16,16);tint(icon,style==='Primary'?'inverse':'text');icon.visible=false;
  const component=toComponent(n,'Style='+style,'Rounded homepage action, with optional trailing icon.');buttonItems.push({component,label,icon});
}
const buttonSet=variantSet(buttonGroup,'Or-Ai / Button',buttonItems,160,36);
const buttonProps={label:property(buttonSet,buttonItems,'label','Label','TEXT','按钮'),showIcon:property(buttonSet,buttonItems,'icon','Show icon','BOOLEAN',false,'visible'),icon:property(buttonSet,buttonItems,'icon','Icon','INSTANCE_SWAP',icons.arrow.id,'mainComponent')};
const navItems=[];
const navGroup=group('Navigation · 我的空间');
for(const selected of [false,true]){
  const n=auto(navGroup,'Selected='+selected,'HORIZONTAL',204,44,selected?'muted':null,'s12');
  padding(n,'s8','s12');radius(n,'r12');n.counterAxisAlignItems='CENTER';
  const icon=instance(n,icons.bag,'Icon',{},20,20);tint(icon,selected?'brand':'secondary');
  const label=text(n,'Label','应用商城','bodyMedium',selected?'text':'secondary');
  spacer(n);
  const dot=track(figma.createEllipse());n.appendChild(dot);dot.resize(5,5);fill(dot,'brand');dot.visible=selected;
  const component=toComponent(n,'Selected='+selected,'Personal-space menu item. Selected indicates the current destination.');navItems.push({component,label,icon});
}
const navSet=variantSet(navGroup,'Or-Ai / Nav Item',navItems,240,44);
const navProps={label:property(navSet,navItems,'label','Label','TEXT','应用商城'),icon:property(navSet,navItems,'icon','Icon','INSTANCE_SWAP',icons.bag.id,'mainComponent')};
const chipItems=[];
const chipGroup=group('Filter · 场景筛选');
for(const selected of [false,true]){
  const n=auto(chipGroup,'Selected='+selected,'HORIZONTAL',null,32,selected?'brandDeep':'raised');
  padding(n,'s6','s12');radius(n,'rFull');n.counterAxisAlignItems='CENTER';n.primaryAxisAlignItems='CENTER';
  if(selected)border(n,'brand',0.45);
  const label=text(n,'Label','全部','captionMedium',selected?'brand':'secondary');
  chipItems.push({component:toComponent(n,'Selected='+selected,'Scenario filter chip. Text grows with its label.'),label});
}
const chipSet=variantSet(chipGroup,'Or-Ai / Filter Chip',chipItems,120,32);
const chipProps={label:property(chipSet,chipItems,'label','Label','TEXT','全部')};
const tones={Lavender:'lavender',Teal:'teal',Periwinkle:'periwinkle',Blush:'blush',Ivory:'ivory'};
const productItems=[];
const productGroup=group('Featured Test · 主推测试');
for(const tone of ['Lavender','Teal','Periwinkle','Blush']){
  const n=auto(productGroup,'Tone='+tone,'VERTICAL',240.75,300,tones[tone]);
  padding(n,'s16');radius(n,'r16');n.clipsContent=true;border(n,'inverse',0.06);
  const art=svg(n,'Cover / '+tone,ART[tone],224,176);absolute(art,8,8);
  const category=text(n,'Category','精选测试','micro','inverse',null,0.65);
  spacer(n,true);
  const content=auto(n,'Content','VERTICAL',208.75,null,null,'s4');
  const title=text(content,'Title','伴侣协作体检','card','inverse',208.75);
  const hook=text(content,'Hook','你找的是队友，\n还是第二份工作？','caption','inverse',208.75,0.85);
  const details=text(content,'Details','16 道题 · 五维协作画像','micro','inverse',208.75,0.66);
  const cta=auto(content,'View test','HORIZONTAL',null,28,'canvas','s8');padding(cta,'s4','s12');radius(cta,'rFull');cta.counterAxisAlignItems='CENTER';
  const price=text(cta,'Price','¥ 9.9','price');
  text(cta,'View label','查看测试','micro');instance(cta,icons.arrow,'Arrow',{},12,12);
  productItems.push({component:toComponent(n,'Tone='+tone,'Featured test card. Gradient vector artwork remains editable.'),category,title,hook,details,price});
}
const productSet=variantSet(productGroup,'Or-Ai / Featured Test Card',productItems,260,300);
const productProps={category:property(productSet,productItems,'category','Category','TEXT','精选测试'),title:property(productSet,productItems,'title','Title','TEXT','伴侣协作体检'),hook:property(productSet,productItems,'hook','Hook','TEXT','你找的是队友，\n还是第二份工作？'),details:property(productSet,productItems,'details','Details','TEXT','16 道题 · 五维协作画像'),price:property(productSet,productItems,'price','Price','TEXT','¥ 9.9')};
const sceneItems=[];
const sceneGroup=group('Scenario · 场景入口');
for(const tone of Object.keys(tones)){
  const n=auto(sceneGroup,'Tone='+tone,'VERTICAL',192.6,100,tones[tone],'s6');padding(n,'s12');radius(n,'r12');border(n,'inverse',0.05);
  const heading=auto(n,'Heading','HORIZONTAL',168.6,22,null,'s8');heading.counterAxisAlignItems='CENTER';
  const icon=instance(heading,icons.heart,'Icon',{},18,18);tint(icon,'inverse');
  const category=text(heading,'Category','关系情感','bodyMedium','inverse');
  const headline=text(n,'Headline','看见彼此的相处方式','captionMedium','inverse',168.6);
  const description=text(n,'Description','协作、沟通与关系边界','micro','inverse',168.6,0.63);
  sceneItems.push({component:toComponent(n,'Tone='+tone,'Compact scenario entry, with swappable icon and editable copy.'),category,headline,description,icon});
}
const sceneSet=variantSet(sceneGroup,'Or-Ai / Scenario Card',sceneItems,208,100);
const sceneProps={category:property(sceneSet,sceneItems,'category','Category','TEXT','关系情感'),headline:property(sceneSet,sceneItems,'headline','Headline','TEXT','看见彼此的相处方式'),description:property(sceneSet,sceneItems,'description','Description','TEXT','协作、沟通与关系边界'),icon:property(sceneSet,sceneItems,'icon','Icon','INSTANCE_SWAP',icons.heart.id,'mainComponent')};
const miniItems=[];
const miniGroup=group('New Test · 最新上架');
for(const tone of ['Lavender','Teal','Periwinkle','Blush']){
  const n=auto(miniGroup,'Tone='+tone,'HORIZONTAL',240.75,128,'raised','s12');padding(n,'s12');radius(n,'r12');border(n,'border',0.45);n.counterAxisAlignItems='CENTER';
  const cover=auto(n,'Small cover','HORIZONTAL',52,84,tones[tone]);radius(cover,'r8');cover.clipsContent=true;
  const art=svg(cover,'Cover / '+tone,ART[tone],86,68);absolute(art,-15,8);
  const content=auto(n,'Content','VERTICAL',152.75,null,null,'s6');
  const title=text(content,'Title','好说话成本账单','bodyMedium','text',152.75);
  const details=text(content,'Details','边界观察 · 16 道题','micro','secondary',152.75);
  const price=text(content,'Price','¥ 9.9','price','brand');
  miniItems.push({component:toComponent(n,'Tone='+tone,'Compact new-release test card with editable title and price.'),title,details,price});
}
const miniSet=variantSet(miniGroup,'Or-Ai / New Test Card',miniItems,260,128);
const miniProps={title:property(miniSet,miniItems,'title','Title','TEXT','好说话成本账单'),details:property(miniSet,miniItems,'details','Details','TEXT','边界观察 · 16 道题'),price:property(miniSet,miniItems,'price','Price','TEXT','¥ 9.9')};
// All component and imported SVG descendants are part of the editability ledger.
for(const n of shelf.findAll(()=>true))created.add(n.id);
const family=(set,items,props)=>({id:set.id,variants:Object.fromEntries(items.map(i=>[i.component.name,i.component.id])),properties:props});
return {createdNodeIds:[shelf.id,...created],mutatedNodeIds:[page.id],shelfId:shelf.id,icons:Object.fromEntries(Object.entries(icons).map(([key,n])=>[key,n.id])),button:family(buttonSet,buttonItems,buttonProps),nav:family(navSet,navItems,navProps),chip:family(chipSet,chipItems,chipProps),product:family(productSet,productItems,productProps),scene:family(sceneSet,sceneItems,sceneProps),mini:family(miniSet,miniItems,miniProps),componentCount:shelf.findAllWithCriteria({types:['COMPONENT']}).length,componentSetCount:6,bounds:{width:shelf.width,height:shelf.height}};
