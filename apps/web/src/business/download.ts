import type {ReportContentDto} from '@orai/contracts';
import {shareSummary} from './model.js';
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function downloadSummary(report:ReportContentDto){
  const value=shareSummary(report),canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  ctx.fillStyle='#f3edfb';ctx.fillRect(0,0,1200,900);ctx.fillStyle='#342646';let y=110;
  function text(value:string,size:number,maxLines:number){ctx!.font=`${size}px sans-serif`;const lines:string[]=[];let line='';for(const char of value){if(ctx!.measureText(line+char).width>1000){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);for(const row of lines.slice(0,maxLines)){ctx!.fillText(row,100,y);y+=size*1.5;}y+=25;}
  text(value.productName,44,3);text(value.resultLabel,52,3);text(value.totalScore===null?'信息不足':`${value.totalScore} / 100`,64,1);text(`版本 ${value.versionNumber}${value.isDemo?' · 演示报告':''}`,26,1);text(value.disclaimer,22,3);text('MeetMyWorld · 多了解自己一点',24,1);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Export failed')),'image/png'));downloadBlob(blob,'meetmyworld-summary.png');
}
