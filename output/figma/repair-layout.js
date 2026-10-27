const root=await figma.getNodeByIdAsync(CONFIG.wrapperId);
const all=page.findAll(()=>true);
function ancestorFamily(n){
  let p=n;
  while(p&&p.type!=='PAGE'){
    if(p.type==='COMPONENT'&&p.parent?.type==='COMPONENT_SET')return p.parent.name;
    p=p.parent;
  }
  return '';
}
function insideInstance(n){let p=n.parent;while(p&&p.type!=='PAGE'){if(p.type==='INSTANCE')return true;p=p.parent;}return false;}
const specs={
  'Or-Ai / Homepage Components':{pad:['s32'],gap:'s32'},
  'Icons':{gap:'s12'},
  'Button · 按钮':{gap:'s12'},
  'Navigation · 我的空间':{gap:'s12'},
  'Filter · 场景筛选':{gap:'s12'},
  'Featured Test · 主推测试':{gap:'s12'},
  'Scenario · 场景入口':{gap:'s12'},
  'New Test · 最新上架':{gap:'s12'},
  'Header':{pad:['s16','s24'],gap:'s16'},
  'Brand':{gap:'s12'},
  'Search':{pad:['s8','s12'],gap:'s8',radius:'rFull'},
  'Keyboard shortcut':{pad:['s2','s6'],radius:'r8'},
  'Welcome capsule':{pad:['s8','s12'],gap:'s10',radius:'rFull'},
  'Guest avatar':{radius:'rFull'},
  'Greeting':{gap:'s2'},
  'Intro text':{gap:'s4'},
  'Workspace':{gap:'s16'},
  'Personal navigation':{gap:'s8'},
  'Redeem entry':{gap:'s12'},
  'Categories and quick actions':{gap:'s12'},
  'Scenario filters':{gap:'s8'},
  'Featured tests':{gap:'s16'},
  '按场景发现':{gap:'s12'},
  '按场景发现 heading':{gap:'s8'},
  '查看全部':{gap:'s6'},
  'Scenarios':{gap:'s12'},
  '最新上架':{gap:'s12'},
  '最新上架 heading':{gap:'s8'},
  '最新优先':{gap:'s6'},
  'New releases':{gap:'s16'},
  'Footer':{gap:'s12'},
};
const familySpecs={
  'Or-Ai / Button':{pad:['s6','s16'],gap:'s8',radius:'rFull'},
  'Or-Ai / Nav Item':{pad:['s8','s12'],gap:'s12',radius:'r12'},
  'Or-Ai / Filter Chip':{pad:['s6','s12'],radius:'rFull'},
  'Or-Ai / Featured Test Card':{pad:['s16'],radius:'r16'},
  'Or-Ai / Scenario Card':{pad:['s12'],gap:'s6',radius:'r12'},
  'Or-Ai / New Test Card':{pad:['s12'],gap:'s12',radius:'r12'},
};
function apply(n,spec){if(!spec)return;if(spec.pad)padding(n,...spec.pad);if(spec.gap)metric(n,'itemSpacing',spec.gap);if(spec.radius)radius(n,spec.radius);mutated.add(n.id);}
for(const n of all){
  if(n.type==='COMPONENT'){apply(n,familySpecs[ancestorFamily(n)]);}
  if(n.type==='FRAME'&&!insideInstance(n)){
    apply(n,specs[n.name]);
    const family=ancestorFamily(n);
    if(n.name==='Content')apply(n,{gap:family==='Or-Ai / Featured Test Card'?'s4':'s6'});
    if(n.name==='View test')apply(n,{pad:['s4','s12'],gap:'s8',radius:'rFull'});
    if(n.name==='Heading'&&family==='Or-Ai / Scenario Card')apply(n,{gap:'s8'});
    if(n.name==='Small cover')apply(n,{radius:'r8'});
    if(['Explore rail','Utilities rail'].includes(n.name)){metric(n,'paddingBottom','s24');mutated.add(n.id);}
    if(n.width===36&&n.height===36&&n.children.some(c=>c.type==='INSTANCE'))apply(n,{radius:'rFull'});
  }
}
// Preserve binding metadata and write the resolved RGB cache for translucent paints.
const idToColor=Object.fromEntries(Object.entries(COLORS).map(([key,v])=>[v.id,COLOR_CACHE[key]]));
for(const n of [root,...all]){
  for(const field of ['fills','strokes'])if(field in n&&Array.isArray(n[field])){
    let changed=false;
    const paints=n[field].map(p=>{
      const value=p.type==='SOLID'&&p.boundVariables?.color&&idToColor[p.boundVariables.color.id];
      if(!value)return p;changed=true;return {...p,color:{r:value.r,g:value.g,b:value.b}};
    });
    if(changed){n[field]=paints;mutated.add(n.id);}
  }
}
// Keep the supporting component families spaced on the canvas after padding reflows.
for(const [id,step,height]of [['5:122',160,36],['5:143',240,44],['5:152',120,32],['5:236',260,300],['5:284',208,100],['5:340',260,128]]){
  const set=await figma.getNodeByIdAsync(id);set.children.forEach((c,i)=>{c.x=16+i*step;c.y=16;mutated.add(c.id);});set.resize(set.children.length*step+16,height+32);mutated.add(set.id);
}
const nodes=root.findAll(()=>true);
const checks=nodes.filter(n=>n.type==='FRAME'&&['Header','Search','Featured tests','Scenarios','New releases'].includes(n.name));
return {createdNodeIds:[],mutatedNodeIds:[...mutated],resolvedMetrics:Object.fromEntries(Object.entries(METRICS).map(([key,v])=>[key,{id:v.id,name:v.name,value:Object.values(v.valuesByMode)[0]}])),geometry:checks.map(n=>({id:n.id,name:n.name,itemSpacing:n.itemSpacing,padding:[n.paddingTop,n.paddingRight,n.paddingBottom,n.paddingLeft],cornerRadius:n.cornerRadius,children:n.children.filter(c=>c.type==='INSTANCE').map(c=>({id:c.id,name:c.name,width:c.width,height:c.height}))})),mainPanelFill:(await figma.getNodeByIdAsync('6:118')).fills,descendantCount:nodes.length};
