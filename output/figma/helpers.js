// Shared helpers for Figma MCP. Prepend the verified CONFIG before execution.
const page = await figma.getNodeByIdAsync(CONFIG.pageId);
if (!page || page.type !== 'PAGE') throw new Error('Expected homepage page');
await figma.setCurrentPageAsync(page);
await Promise.all(CONFIG.foundations.fonts.map(f => figma.loadFontAsync(f)));
const colorEntries = Object.entries(CONFIG.foundations.colors);
const metricEntries = Object.entries(CONFIG.foundations.metrics);
const styleEntries = Object.entries(CONFIG.foundations.textStyles);
const [colorValues, metricValues, styleValues] = await Promise.all([
  Promise.all(colorEntries.map(([, id]) => figma.variables.getVariableByIdAsync(id))),
  Promise.all(metricEntries.map(([, id]) => {
    const remote=id.match(/^VariableID:([a-f0-9]{40})\//);
    return remote ? figma.variables.importVariableByKeyAsync(remote[1]) : figma.variables.getVariableByIdAsync(id);
  })),
  Promise.all(styleEntries.map(([, id]) => figma.getStyleByIdAsync(id))),
]);
const COLORS = Object.fromEntries(colorEntries.map(([key], i) => [key, colorValues[i]]));
const METRICS = Object.fromEntries(metricEntries.map(([key], i) => [key, metricValues[i]]));
const STYLES = Object.fromEntries(styleEntries.map(([key], i) => [key, styleValues[i]]));
const primitiveColors=await Promise.all(colorValues.map(v=>{
  if(!v)throw new Error('Brand color missing');
  const value=Object.values(v.valuesByMode)[0];
  return value.type==='VARIABLE_ALIAS' ? figma.variables.getVariableByIdAsync(value.id) : Promise.resolve(v);
}));
const COLOR_CACHE=Object.fromEntries(colorEntries.map(([key],i)=>[key,Object.values(primitiveColors[i].valuesByMode)[0]]));
if(metricValues.some(v=>!v))throw new Error('A required layout variable is unavailable');
const created = new Set();
const mutated = new Set();
const track = n => { created.add(n.id); return n; };
function rgb(hex) {
  const h = hex.replace('#', '');
  return {r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};
}
function paint(key, opacity = 1) {
  const c=COLOR_CACHE[key];
  return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:c.r,g:c.g,b:c.b},opacity}, 'color', COLORS[key]);
}
function fill(n, key, opacity = 1) { n.fills = key ? [paint(key, opacity)] : []; }
function border(n, key = 'border', opacity = 0.5, weight = 1) {
  n.strokes=[paint(key,opacity)]; n.strokeWeight=weight; n.strokeAlign='INSIDE';
}
function metric(n, prop, key) { n.setBoundVariable(prop, METRICS[key]); }
function radius(n, key) {
  for (const prop of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius']) metric(n,prop,key);
}
function padding(n, vertical = 's16', horizontal = vertical) {
  metric(n,'paddingTop',vertical); metric(n,'paddingBottom',vertical);
  metric(n,'paddingLeft',horizontal); metric(n,'paddingRight',horizontal);
}
function auto(parent, name, direction='HORIZONTAL', width=null, height=null, color=null, gap=null) {
  const n=track(figma.createAutoLayout(direction)); n.name=name; n.fills=[];
  if (parent) parent.appendChild(n);
  n.resize(width || 100,height || 100);
  n.layoutSizingHorizontal=width===null?'HUG':'FIXED';
  n.layoutSizingVertical=height===null?'HUG':'FIXED';
  n.counterAxisAlignItems='MIN'; n.primaryAxisAlignItems='MIN';
  if (color) fill(n,color); if(gap)metric(n,'itemSpacing',gap); return n;
}
function text(parent, name, value, style='body', color='text', width=null, opacity=1) {
  const s=STYLES[style];
  if (!s || s.type!=='TEXT') throw new Error('Text style missing: '+style);
  const n=track(figma.createText());n.name=name;n.fontName=s.fontName;n.textStyleId=s.id;
  n.characters=value;n.fills=[paint(color,opacity)];parent.appendChild(n);
  if(width!==null){n.textAutoResize='HEIGHT';n.resize(width,Math.max(1,n.height));n.layoutSizingHorizontal='FIXED';}
  else{n.textAutoResize='WIDTH_AND_HEIGHT';n.layoutSizingHorizontal='HUG';}
  n.layoutSizingVertical='HUG';return n;
}
function stretch(n, horizontal=true, vertical=false) {
  if(horizontal)n.layoutSizingHorizontal='FILL';if(vertical)n.layoutSizingVertical='FILL';return n;
}
function spacer(parent, vertical=false) {
  const n=auto(parent,'Flexible space','HORIZONTAL',vertical?1:null,vertical?null:1);
  if(vertical)n.layoutSizingVertical='FILL';else n.layoutSizingHorizontal='FILL';return n;
}
function svg(parent, name, source, width, height) {
  const n=track(figma.createNodeFromSvg(source));n.name=name;parent.appendChild(n);n.resize(width,height);
  n.fills=[];n.clipsContent=false;for(const child of n.findAll(()=>true))created.add(child.id);return n;
}
function absolute(n,x,y) { n.layoutPositioning='ABSOLUTE';n.x=x;n.y=y;return n; }
function tint(n,color) {
  const all=[n,...('findAll' in n?n.findAll(()=>true):[])];
  for(const child of all){
    for(const prop of ['fills','strokes'])if(prop in child && Array.isArray(child[prop])){
      child[prop]=child[prop].map(p=>p.type==='SOLID'?figma.variables.setBoundVariableForPaint(p,'color',COLORS[color]):p);
    }
  }
  return n;
}
function expose(component, node, label, defaultValue, type='TEXT', reference='characters') {
  const key=component.addComponentProperty(label,type,defaultValue);
  node.componentPropertyReferences={...(node.componentPropertyReferences||{}),[reference]:key};return key;
}
function toComponent(n,name,description) {
  const c=track(figma.createComponentFromNode(n));c.name=name;c.description=description;created.delete(n.id);return c;
}
function instance(parent,component,name,properties={},width=null,height=null) {
  const n=track(component.createInstance());n.name=name;parent.appendChild(n);
  if(Object.keys(properties).length)n.setProperties(properties);
  if(width!==null||height!==null)n.resize(width===null?n.width:width,height===null?n.height:height);
  for(const child of n.findAll(()=>true))created.add(child.id);return n;
}
const iconPaths={
  search:'<circle cx="11" cy="11" r="7.5"/><path d="m16.5 16.5 4 4"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  bag:'<path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  bookmark:'<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.1.8-1.7 1.3-1.7 2.7M12 17h.01"/>',
  heart:'<path d="M20.8 4.6a5.3 5.3 0 0 0-7.5 0L12 5.9l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.9a5.3 5.3 0 0 0 0-7.5Z"/>',
  briefcase:'<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V4h8v3M3 12a20 20 0 0 0 18 0M10 12v3h4v-3"/>',
  sparkles:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4M18 4h4M3 18v4M1 20h4"/>',
  smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M8.5 8.5h.01M15.5 8.5h.01"/>',
  leaf:'<path d="M20 3c-8-1-16 2-16 9a6 6 0 0 0 12 0c0-4 2-7 4-9Z"/><path d="M3 21c4-7 8-10 13-13"/>',
  arrow:'<path d="M4 12h16M14 6l6 6-6 6"/>',
  arrowUp:'<path d="M7 17 17 7M7 7h10v10"/>',
  chevron:'<path d="m14 6-6 6 6 6"/>',
  plus:'<path d="M12 4v16M4 12h16"/>',
  moon:'<path d="M20.5 13.1A9 9 0 0 1 10.9 3.5a9 9 0 1 0 9.6 9.6Z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  headphones:'<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="12" width="4" height="9" rx="2"/><rect x="17" y="12" width="4" height="9" rx="2"/>',
  sliders:'<path d="M4 7h5M15 7h5M4 17h9M19 17h1"/><circle cx="12" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
function iconSVG(key,size=24){return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="#F6F4FA" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+iconPaths[key]+'</svg>';}
const logoSVG='<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g fill="none" stroke="#D9ACF1" stroke-width="2"><path d="M20 5c4 0 4 5 7 7s8 1 8 6-6 5-8 8-3 9-7 9-5-6-8-9-7-2-7-6 5-5 7-8 4-7 8-7Z"/><path d="m20 9 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z"/></g><circle cx="20" cy="20" r="3" fill="#D9ACF1"/></svg>';
const ART={
  Lavender:`<svg xmlns="http://www.w3.org/2000/svg" width="242" height="190" viewBox="0 0 242 190"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#EEE9FF"/><stop offset=".3" stop-color="#A9A2FF"/><stop offset=".52" stop-color="#6050C8"/><stop offset=".69" stop-color="#DAD6FF"/><stop offset="1" stop-color="#7569DA"/></linearGradient><linearGradient id="b" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#FBF8FF"/><stop offset=".3" stop-color="#BAB9EF"/><stop offset=".57" stop-color="#DDF3FF"/><stop offset=".75" stop-color="#8C73DD"/><stop offset="1" stop-color="#4A359A"/></linearGradient><radialGradient id="s"><stop stop-color="#FEFAFF"/><stop offset=".7" stop-color="#CEC9FA"/><stop offset="1" stop-color="#A3A0D9"/></radialGradient></defs><ellipse cx="132" cy="171" rx="85" ry="10" fill="#8679C6" opacity=".12"/><circle cx="176" cy="39" r="27" fill="url(#s)" stroke="#FFFFFF" stroke-opacity=".55"/><path d="M48 40C11 39 12 91 40 127c28 35 89 57 142 42 29-8 44-39 30-65-16-27-70-23-107-42-18-9-34-20-57-22Z" fill="url(#a)" stroke="#C3B5EC" stroke-width="1.2"/><path d="M42 54c-25 16 10 48 52 52 46 4 97 1 110 29-11-35-48-45-74-56-34-15-69-37-88-25Z" fill="url(#b)" stroke="#F7ECFF" stroke-opacity=".75"/><path d="M45 68c20 30 70 37 119 39 28 2 44 11 46 29-1-23-16-42-47-51-51-14-94-38-118-17Z" fill="url(#a)"/><path d="M28 63c3-27 25-25 55-12M47 85c40 33 103 22 139 38" fill="none" stroke="#FFFFFF" stroke-opacity=".68" stroke-width="2" stroke-linecap="round"/></svg>`,
  Teal:`<svg xmlns="http://www.w3.org/2000/svg" width="242" height="190" viewBox="0 0 242 190"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFFFFF"/><stop offset=".16" stop-color="#BCE7E3"/><stop offset=".35" stop-color="#438D8B"/><stop offset=".48" stop-color="#102F3F"/><stop offset=".56" stop-color="#F0FFF9"/><stop offset=".7" stop-color="#9ED0C8"/><stop offset="1" stop-color="#E1FFF6"/></linearGradient><linearGradient id="b" x1="0" y1="0" x2="1" y2=".6"><stop stop-color="#E5FFF8"/><stop offset=".4" stop-color="#539998"/><stop offset=".55" stop-color="#194957"/><stop offset=".7" stop-color="#BCE3D9"/><stop offset="1" stop-color="#F0FFF6"/></linearGradient></defs><ellipse cx="139" cy="166" rx="87" ry="9" fill="#387F7F" opacity=".12"/><path d="M32 17c-11 57 14 108 71 135 33 15 73 15 106 31-4-38-26-60-57-79C103 74 59 50 32 17Z" fill="url(#a)" stroke="#CAEBDF"/><path d="M34 25c25 38 67 51 109 77 33 20 58 42 64 70-5-38-34-60-74-77C81 73 52 47 34 25Z" fill="url(#b)"/><path d="M33 26c3 43 33 70 77 88 51 21 86 42 99 65" fill="none" stroke="#F6FFF9" stroke-width="2.5" stroke-linecap="round"/><path d="M42 35c19 26 46 42 75 54" fill="none" stroke="#E8FFF5" stroke-width="1.6" opacity=".9"/></svg>`,
  Periwinkle:`<svg xmlns="http://www.w3.org/2000/svg" width="242" height="190" viewBox="0 0 242 190"><defs><radialGradient id="a" cx=".3" cy=".3" r=".85"><stop stop-color="#F4F2FF"/><stop offset=".38" stop-color="#C3C7EF"/><stop offset=".7" stop-color="#8BA5E4"/><stop offset=".87" stop-color="#6A70C8"/><stop offset="1" stop-color="#CEE4FF"/></radialGradient><linearGradient id="b" x1=".2" y1="0" x2=".8" y2="1"><stop stop-color="#F3F5FF"/><stop offset=".4" stop-color="#A9B5E5"/><stop offset=".68" stop-color="#7577BE"/><stop offset="1" stop-color="#BFC4FC"/></linearGradient></defs><ellipse cx="125" cy="171" rx="83" ry="10" fill="#5965AD" opacity=".13"/><path d="M47 81c26-17 23-58 57-62 25-3 28 27 48 35 27 10 37 31 50 55 20 34 1 57-33 61-37 5-57-8-85-10-32-2-65-20-59-48 3-14 11-24 22-31Z" fill="url(#a)" stroke="#E9EEFF" stroke-width="1.2"/><path d="M48 85c44-21 34-51 60-63 20-8 32 28 57 38-50-24-35-2-56 16-15 14-39 17-61 9Z" fill="url(#b)"/><path d="M35 105c2-18 20-22 35-32 21-15 19-43 41-48" fill="none" stroke="#FFFFFF" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/><path d="M54 125c36 22 82 11 113-9" fill="none" stroke="#D7E7FF" stroke-opacity=".4" stroke-width="2"/></svg>`,
  Blush:`<svg xmlns="http://www.w3.org/2000/svg" width="242" height="190" viewBox="0 0 242 190"><defs><radialGradient id="a" cx=".28" cy=".23" r=".86"><stop stop-color="#FFF3FA"/><stop offset=".34" stop-color="#EED5E5"/><stop offset=".65" stop-color="#D9AFD3"/><stop offset="1" stop-color="#BDA2D9"/></radialGradient><linearGradient id="b" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#FBEDF7"/><stop offset=".4" stop-color="#CEACE0"/><stop offset=".64" stop-color="#B697D3"/><stop offset="1" stop-color="#EFE3FD"/></linearGradient></defs><ellipse cx="133" cy="172" rx="83" ry="9" fill="#A887AB" opacity=".12"/><path d="M31 103c-1-30 19-44 49-47 34-4 59 7 83-13 9-7 10-22 22-23 21-3 29 15 14 31-17 19-7 32-4 53 5 33-15 52-52 55-36 2-107-6-112-56Z" fill="url(#a)" stroke="#FFEDF7"/><path d="M78 163c-22-26-20-60 3-74 24-15 46-8 62 13 13 17 9 34 35 38-30 16-49 34-75 35-11 0-18-4-25-12Z" fill="url(#b)" stroke="#EEDCFB"/><path d="M90 92c21-9 38 0 47 14 13 20 4 30 35 37" fill="none" stroke="#F6EBFF" stroke-width="3" stroke-opacity=".72" stroke-linecap="round"/><path d="M45 78c18-17 42-11 66-12 39-1 54-26 66-35" fill="none" stroke="#FFF7FB" stroke-opacity=".5" stroke-width="2"/></svg>`,
};
