import { ProductionPlanDocumentSchema,ProductionPlanModuleSchema,ProjectCanvasLayoutDocumentSchema,emptyProductImplementationPlan,
  type ProductionPlanDocument,type ProjectCanvasLayoutDocument } from '@orai/contracts/admin';
import type { ProjectWorkspaceData } from './project-api.js';
import { ClientError } from '../api/client.js';

export type PlanningDomain=ProductionPlanDocument['modules'][number]['domain'];
export type CanvasPositions=Record<string,{x:number;y:number}>;
const purposes={assessment:['assessment_design','report_writing'],copy:['copywriting'],cover:['cover_design'],video:['video_production'],experience:['scene_design','report_presentation']} as const;
export function isPlanningSaveUncertain(error:unknown){
  return error instanceof ClientError && (error.status===0 || error.status>=500 || error.status===408);
}
export function planningRuntimeKey(runtime:ProductionPlanDocument['modules'][number]['target']['runtime']){
  return runtime?JSON.stringify([runtime.renderer.key,runtime.renderer.version,runtime.reportRenderer.key,runtime.reportRenderer.version,
    runtime.inputSchema,runtime.engine,runtime.reportSchema]):'';
}
export function emptyProjectPlan(profileId:string,title:string):ProductionPlanDocument{
  return {schemaVersion:2,title,creativeProfileRevisionId:profileId,selection:{basis:'manual',rationale:'管理员手动规划：'+title,evidenceKeys:[]},
    freshnessWindowHours:72,evidence:[],modules:[],retention:'platform_originals_and_exact_methods',productPlan:emptyProductImplementationPlan()};
}
export function addPlanningModule(plan:ProductionPlanDocument,input:{title:string;domain:PlanningDomain;required:boolean;upstream?:string;moduleKey:string}){
  if(plan.modules.length>=40)throw new Error('每份计划最多 40 个模块。');
  if(input.upstream&&!plan.modules.some(m=>m.moduleKey===input.upstream))throw new Error('上游模块不在当前计划中。');
  const native=['assessment','copy'].includes(input.domain),kind=input.domain==='cover'?'image':input.domain==='video'?'video':input.domain==='experience'?'scene_bundle':input.domain,
    template=plan.modules.find(m=>m.domain===input.domain),module=ProductionPlanModuleSchema.parse({
      moduleKey:input.moduleKey,title:input.title,domain:input.domain,required:input.required,purpose:'制作'+input.title,
      dependsOn:input.upstream?[input.upstream]:[],target:template?structuredClone(template.target):{form:input.domain==='experience'?'3d':'web',runtime:null},
      methodPurposes:[...purposes[input.domain]],methodRetention:'manifest_instructions_and_references',
      outputs:template?template.outputs.map(output=>({...structuredClone(output),files:output.files.map(file=>({...file,sourceUrl:null}))})):input.domain==='assessment'?
        ['assessment','report'].map(outputKind=>({outputKey:outputKind,label:outputKind==='report'?'报告':'题目',required:true,kind:outputKind,
          original:{storage:'platform',representation:'structured'},files:[]})):[{outputKey:'main',label:input.title,required:true,kind,
        original:{storage:'platform',representation:native?'structured':'file'},files:native?[]:[{fileKey:'source',purpose:'original',label:'交付原件',required:true,
          mimeTypes:input.domain==='cover'?['image/png','image/jpeg','image/webp']:input.domain==='video'?['video/mp4','video/webm']:['application/zip','model/gltf-binary'],sourceUrl:null}]}],
    });
  return ProductionPlanDocumentSchema.parse({...plan,modules:[...plan.modules,module]});
}
export function editPlanningDependency(plan:ProductionPlanDocument,source:string,target:string,previous?:{source:string;target:string},remove=false){
  if(!plan.modules.some(m=>m.moduleKey===source)||!plan.modules.some(m=>m.moduleKey===target))throw new Error('只能连接当前计划中的交付模块。');
  if(source===target)throw new Error('模块不能依赖自身。');
  if(previous&&!plan.modules.some(m=>m.moduleKey===previous.target&&m.dependsOn.includes(previous.source)))throw new Error('待调整的依赖已不存在。');
  if(!remove&&plan.modules.find(m=>m.moduleKey===target)!.dependsOn.includes(source)&&!(previous?.source===source&&previous.target===target))throw new Error('这两个模块已有相同依赖。');
  const modules=plan.modules.map(m=>({...m,dependsOn:m.dependsOn.filter(key=>!(remove&&m.moduleKey===target&&key===source)&&!(previous&&m.moduleKey===previous.target&&key===previous.source))}));
  if(!remove)modules.find(m=>m.moduleKey===target)!.dependsOn.push(source);
  const parsed=ProductionPlanDocumentSchema.safeParse({...plan,modules});
  if(!parsed.success)throw new Error(parsed.error.issues[0]?.message??'依赖关系不正确。');return parsed.data;
}
export function planningWorkspace(base:ProjectWorkspaceData,document:ProductionPlanDocument,profile:ProjectWorkspaceData['profile']):ProjectWorkspaceData{
  const original=base.plan,byKey=new Map(original?.modules.map(m=>[m.moduleKey,m]));
  return {...base,profile:base.profile??profile,plan:{id:original?.id??'draft-plan',productId:base.productId,scope:base.scope,revision:original?.revision??0,
    creativeProfileRevisionId:document.creativeProfileRevisionId,creativeProfileDigest:original?.creativeProfileDigest??profile?.digest??'',
    plan:document,digest:original?.digest??'',status:'planning_only',createdAt:original?.createdAt??base.observedAt,
    modules:document.modules.map(definition=>{
      const previous=byKey.get(definition.moduleKey);return {...previous,id:previous?.id??'draft:'+definition.moduleKey,
        moduleId:previous?.moduleId??'draft:'+definition.moduleKey,moduleKey:definition.moduleKey,digest:previous?.digest??'',definition,
        dependencyIds:definition.dependsOn.map(key=>byKey.get(key)?.moduleId??'draft:'+key)};
    })}};
}
export function positionsFromLayout(layout:ProjectCanvasLayoutDocument|null|undefined):CanvasPositions{
  return Object.fromEntries(layout?.positions.map(({nodeKey,x,y})=>[nodeKey,{x,y}])??[]);
}
export function layoutForPlan(positions:CanvasPositions,plan:ProductionPlanDocument):ProjectCanvasLayoutDocument{
  const allowed=new Set(['plan',...plan.modules.map(m=>'module:'+m.moduleKey)]);
  return ProjectCanvasLayoutDocumentSchema.parse({schemaVersion:1,positions:Object.entries(positions).filter(([key])=>allowed.has(key))
    .sort(([a],[b])=>a.localeCompare(b)).map(([nodeKey,value])=>({nodeKey,...value}))});
}
