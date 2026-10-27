import type { ProjectWorkspaceData,ProjectModule } from './project-api.js';
export const projectDomains={assessment:'题目与报告',cover:'封面图片',copy:'引流文案',experience:'交互体验',video:'宣传视频'};
export const projectPurposes:Record<string,string>={assessment_design:'题目设计',report_writing:'报告写作',cover_design:'封面设计',copywriting:'文案创作',
  video_production:'视频制作',scene_design:'场景设计',report_presentation:'报告呈现'};
export const projectStates:Record<string,string>={waiting_input:'等待输入',producing:'外部制作中',uploading:'上传中',validation_failed:'校验未通过',failed:'制作失败',
  saved_draft:'已校验保存',cancelled:'已取消',needs_recheck:'需要复查',pending_review:'待人工审核',returned:'退回修改',retained:'已审核留存',
  saved_record:'已有保存记录',missing_originals:'原件未齐',draft:'部分稿',submitted:'待人工审核',planning_draft:'未保存模块'};
export const shortId=(value:string)=>value.slice(0,8);
export const fileSize=(bytes:number)=>bytes<1024?bytes+' B':bytes<1024*1024?(bytes/1024).toFixed(1)+' KiB':(bytes/1024/1024).toFixed(1)+' MiB';
export function moduleSummary(data:ProjectWorkspaceData,module:ProjectModule){
  const record=data.records.find(r=>r.planModuleId===module.id),methods=data.methods.filter(m=>m.planModuleId===module.id),missing:string[]=[];
  const used=record?methods.filter(m=>record.methods.some(f=>f.snapshotId===m.id)):methods;
  for(const purpose of module.definition.methodPurposes)if(!used.some(m=>m.purpose===purpose))missing.push('缺少'+projectPurposes[purpose]);
  for(const slot of module.definition.outputs.filter(o=>o.required)){
    const outputs=record?.outputs.filter(o=>o.outputKey===slot.outputKey)??[];
    if(slot.original.representation==='structured'?!outputs.some(o=>o.contentRevisionId):
      slot.files.some(f=>f.required&&f.purpose==='original'&&!outputs.some(o=>o.fileKey===f.fileKey&&o.purpose==='original'&&o.file)))missing.push('缺少'+slot.label+'原件');
  }
  const run=data.run?.modules.find(m=>m.planModuleId===module.id),returned=data.review?.returns.find(r=>r.planModuleId===module.id);
  const state=module.id.startsWith('draft:')?'planning_draft':run?.state??(data.review&&record?(data.review.status==='returned'?(returned?'returned':'saved_record'):
    data.review.status==='draft'?'saved_record':data.review.status==='submitted'?'pending_review':'retained'):
    record?(missing.length?'missing_originals':'saved_record'):'waiting_input');
  const warning=['failed','validation_failed','needs_recheck','returned','missing_originals'].includes(state);
  return {record,methods,state,label:projectStates[state]??state,warning,missing,reason:returned?.reason??run?.reason??null};
}
export function visibleProjectModules(modules:ProjectModule[],focusId:string|null,search:string){
  const text=search.trim().toLowerCase(),matches=modules.filter(m=>(m.definition.title+' '+m.moduleKey+' '+projectDomains[m.definition.domain]).toLowerCase().includes(text));
  if(!focusId)return matches;
  const focus=modules.find(m=>m.id===focusId);if(!focus)return matches;
  const related=modules.filter(m=>focus.definition.dependsOn.includes(m.moduleKey)||m.definition.dependsOn.includes(focus.moduleKey)).slice(0,4);
  const ids=new Set([focus.id,...related.map(m=>m.id)]);return matches.filter(m=>ids.has(m.id));
}
export function projectLayout(modules:ProjectModule[]){
  const ranks=new Map<string,number>(),all=new Map(modules.map(m=>[m.moduleKey,m]));
  const rank=(m:ProjectModule):number=>{
    const known=ranks.get(m.moduleKey);if(known!==undefined)return known;
    const value=Math.max(0,...m.definition.dependsOn.flatMap(key=>all.has(key)?[rank(all.get(key)!)+1]:[]));ranks.set(m.moduleKey,value);return value;
  };
  const layers=new Map<number,ProjectModule[]>();
  for(const module of modules){const depth=rank(module);layers.set(depth,[...layers.get(depth)??[],module]);}
  const positions:Record<string,{x:number;y:number}>={};let column=0;
  for(const [,layer] of [...layers].sort(([a],[b])=>a-b)){
    layer.forEach((module,index)=>{positions[module.id]={x:310+(column+Math.floor(index/6))*340,y:70+(index%6)*220};});
    column+=Math.ceil(layer.length/6);
  }
  return positions;
}
