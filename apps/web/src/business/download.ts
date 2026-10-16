import type {ReportContentDto} from '@orai/contracts';
import {shareSummary} from './model.js';
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function downloadSummary(report:ReportContentDto){
  const value=shareSummary(report),canvas=document.createElement('canvas');canvas.width=1200;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  const lines:{text:string;size:number;y:number}[]=[];let y=110;
  function text(value:string,size:number){
    ctx!.font=`${size}px sans-serif`;let line='';
    const append=()=>{lines.push({text:line,size,y});y+=size*1.5;line='';};
    for(const char of value){if(char==='\n'){append();continue;}if(line&&ctx!.measureText(line+char).width>1000)append();line+=char;}
    if(line)append();y+=25;
  }
  text(value.productName,44);text(value.resultLabel,52);text(value.totalScore===null?'信息不足':`${value.totalScore} / 100`,64);text(`版本 ${value.versionNumber}${value.isDemo?' · 演示报告':''}`,26);text(value.disclaimer,22);text('MeetMyWorld · 多了解自己一点',24);
  // Measure all text before resizing: assigning the canvas height clears its
  // drawing context, so fonts and colours are set again when drawing.
  canvas.height=Math.max(900,Math.ceil(y+60));ctx.fillStyle='#f3edfb';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#342646';
  for(const line of lines){ctx.font=`${line.size}px sans-serif`;ctx.fillText(line.text,100,line.y);}
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Export failed')),'image/png'));downloadBlob(blob,'meetmyworld-summary.png');
}
