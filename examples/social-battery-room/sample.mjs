import {readFileSync} from 'node:fs';
export const sample=JSON.parse(readFileSync(new URL('./public.json',import.meta.url),'utf8'));
export const profile={schemaVersion:1,title:'社交电量小屋 · 本地试点',audience:'想理解自己社交恢复节奏的成年人',situation:'回看最近一周的日常相处与休息',
  emotionalGoal:'需要休息也可以被接纳，不必为了相处一直透支自己',understandingGoal:'看见独处恢复与边界表达中的具体习惯',takeaway:'带走一句能说出口的边界表达',
  perspective:'self',experienceForm:'web',pace:'慢一点，一次只看一题',world:'一间有窗光的灰紫色小屋',language:'温柔、具体，不把人贴成某种性格',
  visual:'纸本手记、暖白底、灰紫家具、等距插画与细线条',sound:'默认安静，不使用音频',
  reportPlan:{schemaVersion:1,title:'给此刻的你，一页理解',narrative:'以同一小屋意象，用标准结果结构呈现线索、观察维度与一个小行动',presentation:'standard',
    sections:[{sectionId:'observations',title:'此刻的线索',purpose:'解释回答所呈现的习惯，不评判好坏'},{sectionId:'dimensions',title:'观察维度',purpose:'明确独处恢复与边界表达的信息'},{sectionId:'next',title:'一个小行动',purpose:'给出可尝试的表达'}]},
  channels:['manual'],deliverables:['assessment','cover','video','copy']};
export const configuration={schemaVersion:1,engine:'dimensions_v1',locale:'zh-CN',
  dimensions:[{id:'recovery',label:'独处恢复'},{id:'boundaries',label:'边界表达'}].map(value=>({...value,weight:1,minApplicableAnswers:2,missingReason:'这一维度的适用回答还不够，先留白也没关系。'})),
  questions:sample.questions.map(question=>({...question,required:true,weight:1,options:sample.options.map((option,index)=>({...option,points:option.notApplicable?null:index}))})),
  bands:[{resultTypeId:'pause',min:0,max:50},{resultTypeId:'space',min:50,max:100}],
  resultTypes:[{id:'pause',label:'把节奏还给自己',summary:'从一件小事开始，为休息留一点余地。'},{id:'space',label:'为自己留了空间',summary:'看见已有的恢复习惯，继续温柔地照顾边界。'}],
  report:{missingDimensionPolicy:'null',disclaimer:'本地试点内容，未经量表或商业验收；仅供娱乐与自我观察，不构成心理诊断、关系判断或重要决策依据。',
    templates:[{resultTypeId:'pause',explanation:'最近一周，你在主动休息或表达边界时，可能还没有那么多可以使用的空间。这不是对性格的判断，也不意味着你做得不够好。先选一个愿意尝试的小动作，不必一下子改变所有相处方式。',suggestion:'下次收到邀约时，先给自己十秒看看状态。需要休息时，试着说：「我很在意这次相处，不过我今天想先休息，我们换个时间好吗？」'},
      {resultTypeId:'space',explanation:'从最近一周的回答看，你已经会在一些时刻主动休息，也尝试把自己的需要说出来。这份记录只描述这段时间的习惯，不代表你应当一直保持某种状态。需要安静的时候，仍可以给自己留一点空间。',suggestion:'回想最近一次让你恢复的小事，把它留给下一次疲惫的自己。也可以告诉在意的人：「我需要一点独处时间，休息好了再来认真听你说。」'}],
    insufficient:{id:'insufficient',label:'这一页，先留白',explanation:'适用的回答还不够，暂时无法形成完整观察。你可以保留这份空白，不需要为了得到结果勉强选择。',suggestion:'选一个更接近日常的一周，再回来看看自己的节奏。'}},
  retention:{firstRedemptionDays:30,entitlementDays:90,rawAnswerDays:30,reportDays:90},statisticsMinimum:20};
export const copy={kind:'copy',blocks:[{blockId:'hook',role:'hook',text:'需要独处，不等于不在意。'},{blockId:'body',role:'body',text:'走进一间安静的小屋，用六个小问题，看看最近一周的恢复与边界。没有标准答案，只有更了解自己的一个机会。'},{blockId:'cta',role:'cta',text:'给自己几分钟，把相处的节奏还给自己。'}]};
