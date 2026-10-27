import {KeySchema} from '@orai/contracts';
import {ProjectMethodCustomizationSchema,type ContentLocator} from '@orai/contracts/admin';
import type {MethodCandidate} from './project-methods-api.js';
export type MethodParameter={key:string;type:'text'|'number'|'boolean';value:string};
export function methodCustomization(rows:MethodParameter[],instructions:string){
 const parameters:Record<string,string|number|boolean>={};
 if(rows.length>40)throw new Error('商品参数最多 40 项。');
 for(const row of [...rows].sort((a,b)=>a.key.localeCompare(b.key))){
  if(!KeySchema.safeParse(row.key).success)throw new Error('参数名需用小写字母开头，可含数字和短横线，最多 64 字符。');
  if(Object.hasOwn(parameters,row.key))throw new Error('参数名不能重复。');
  if(row.type==='number'){if(!row.value.trim()||!Number.isFinite(Number(row.value)))throw new Error('数字参数需要有限数值。');parameters[row.key]=Number(row.value);}
  else if(row.type==='boolean'){if(!['true','false'].includes(row.value))throw new Error('开关参数请选择 true 或 false。');parameters[row.key]=row.value==='true';}
  else{if(row.value.length>1000)throw new Error('每项文字参数最多 1000 字。');parameters[row.key]=row.value;}
 }
 if(instructions.trim().length>8000)throw new Error('补充说明最多 8000 字。');
 return ProjectMethodCustomizationSchema.parse({parameters,instructions});
}
export function methodParameters(values:Record<string,string|number|boolean>):MethodParameter[]{return Object.entries(values).map(([key,value])=>({key,type:typeof value==='number'?'number':typeof value==='boolean'?'boolean':'text',value:String(value)}));}
export function effectiveMethod(candidate:MethodCandidate,rows:MethodParameter[],instructions:string){const custom=methodCustomization(rows,instructions);return [candidate.version.manifest.instructions,
 Object.keys(custom.parameters).length?'\n商品参数（JSON 数据）\n'+JSON.stringify(custom.parameters,null,2):'',custom.instructions?'\n本商品补充方法\n'+custom.instructions:''].filter(Boolean).join('\n');}
export const methodInputKey=(input:{revisionId:string;locator:ContentLocator})=>input.revisionId+':'+(input.locator.kind==='question'?'question:'+input.locator.questionId:input.locator.kind==='block'?'block:'+input.locator.blockId:input.locator.kind==='scene'?'scene:'+input.locator.sceneId:'whole');
