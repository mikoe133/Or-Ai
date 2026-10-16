import {CatalogQuerySchema,type ReportContentDto} from '@orai/contracts';
export function catalogSearch(params:URLSearchParams){return CatalogQuerySchema.parse(Object.fromEntries(params));}
export function changeCatalogSearch(params:URLSearchParams,fields:Record<string,string>){
  const next=new URLSearchParams(params);for(const[key,value]of Object.entries(fields)){if(value)next.set(key,value);else next.delete(key);}
  if(!('page'in fields))next.set('page','1');return next;
}
export function shareSummary(report:ReportContentDto){
  return {productName:report.productName,resultLabel:report.resultLabel,totalScore:report.totalScore,
    versionNumber:report.versionNumber,isDemo:report.isDemo,disclaimer:report.disclaimer};
}
