import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DemoProducts } from '../scripts/demo-fixtures';
import { ProductConfigurationSchema, type ProductConfiguration } from '@orai/contracts/admin';
import { ApiException } from '../src/common/http-errors';
import { scoreAnswers } from '../src/runtime/scoring';

const meta={productName:'配置驱动演示',versionNumber:3,isDemo:true};
const config=()=>structuredClone(DemoProducts[0]!.configurations[0]!);
const choices=(configuration:ProductConfiguration,optionId:string)=>configuration.questions.map(question=>({questionId:question.id,optionId}));
function errorCode(work:()=>unknown,code:string){assert.throws(work,(error:unknown)=>error instanceof ApiException&&error.code===code);}

test('minimum and maximum answers map to exact 0 and 100 with configured templates',()=>{
  const configuration=config(), low=scoreAnswers(configuration,choices(configuration,'rarely'),meta), high=scoreAnswers(configuration,choices(configuration,'often'),meta);
  assert.equal(low.totalScore,0);assert.equal(low.resultTypeId,'developing');assert.equal(high.totalScore,100);assert.equal(high.resultTypeId,'steady');
  assert.equal(high.explanation,configuration.report.templates[2]!.explanation);assert.equal(high.productName,meta.productName);assert.equal(high.versionNumber,3);
});

test('40 and 70 belong to the upper band and historical middle choices keep their own version',()=>{
  const old=config(), second=structuredClone(DemoProducts[0]!.configurations[1]!);
  assert.equal(scoreAnswers(old,choices(old,'sometimes'),meta).totalScore,50);
  const exact40=scoreAnswers(second,choices(second,'sometimes'),meta);assert.equal(exact40.totalScore,40);assert.equal(exact40.resultTypeId,'balanced');
  for(const question of old.questions) question.options[1]!.points=7;
  const exact70=scoreAnswers(old,choices(old,'sometimes'),meta);assert.equal(exact70.totalScore,70);assert.equal(exact70.resultTypeId,'steady');
});

test('per-question min/max normalization and question weights use applicable questions only',()=>{
  const configuration=config();configuration.dimensions=configuration.dimensions.slice(0,1);
  configuration.questions=configuration.questions.slice(0,2);
  for(const question of configuration.questions)question.dimensionId=configuration.dimensions[0]!.id;
  configuration.questions[0]!.options[0]!.points=2;configuration.questions[0]!.options[1]!.points=4;configuration.questions[0]!.options[2]!.points=8;
  configuration.questions[1]!.weight=3;
  const score=scoreAnswers(configuration,[{questionId:'question-1',optionId:'sometimes'},{questionId:'question-2',optionId:'often'}],meta);
  assert.equal(score.totalScore,83.33);assert.equal(score.dimensions[0]!.score,83.33);
  const withNa=scoreAnswers(configuration,[{questionId:'question-1',optionId:'na'},{questionId:'question-2',optionId:'often'}],meta);
  assert.equal(withNa.totalScore,100);assert.equal(withNa.dimensions[0]!.applicableAnswers,1);
});

test('dimension weights use unrounded dimension scores and answer ordering is irrelevant',()=>{
  const configuration=config();configuration.dimensions[0]!.weight=2;
  const answers=configuration.questions.map(question=>({questionId:question.id,optionId:question.dimensionId==='dimension-1'?'often':'rarely'}));
  const result=scoreAnswers(configuration,answers,meta);assert.equal(result.totalScore,66.67);
  assert.deepEqual(scoreAnswers(configuration,[...answers].reverse(),meta),result);
});

test('type selection compares exact unrounded scores even when the displayed score rounds up to the boundary',()=>{
  const configuration=config();configuration.dimensions=configuration.dimensions.slice(0,1);configuration.questions=configuration.questions.slice(0,1);
  configuration.questions[0]!.options[1]!.points=6;configuration.questions[0]!.options[2]!.points=9;
  configuration.bands[1]!.max=66.67;configuration.bands[2]!.min=66.67;
  const result=scoreAnswers(configuration,choices(configuration,'sometimes'),meta);
  assert.equal(result.totalScore,66.67);assert.equal(result.resultTypeId,'balanced');
});

test('all not-applicable or one insufficient dimension returns null and the configured missing result',()=>{
  const configuration=config();const all=scoreAnswers(configuration,choices(configuration,'na'),meta);
  assert.equal(all.totalScore,null);assert.equal(all.resultTypeId,configuration.report.insufficient.id);assert.ok(all.dimensions.every(value=>value.score===null&&value.applicableAnswers===0));
  const mixed=scoreAnswers(configuration,configuration.questions.map(question=>({questionId:question.id,optionId:question.dimensionId==='dimension-1'?'often':'na'})),meta);
  assert.equal(mixed.totalScore,null);assert.equal(mixed.dimensions[0]!.score,100);assert.equal(mixed.dimensions[1]!.score,null);
  assert.equal(mixed.dimensions[1]!.missingReason,configuration.dimensions[1]!.missingReason);
});

test('configured applicable-answer minimum can exceed one without treating the missing score as zero',()=>{
  const configuration=config();configuration.dimensions[0]!.minApplicableAnswers=2;
  const answers=configuration.questions.map(question=>({questionId:question.id,optionId:question.id==='question-1'||question.dimensionId==='dimension-2'?'often':'na'}));
  const result=scoreAnswers(configuration,answers,meta);assert.equal(result.totalScore,null);assert.equal(result.dimensions[0]!.requiredAnswers,2);assert.equal(result.dimensions[0]!.applicableAnswers,1);
});

test('incomplete, duplicate, extra or unknown answers and invalid configuration fail without a report',()=>{
  const configuration=config(), answers=choices(configuration,'often');
  errorCode(()=>scoreAnswers(configuration,answers.slice(1),meta),'ANSWERS_INCOMPLETE');
  errorCode(()=>scoreAnswers(configuration,[...answers,answers[0]!],meta),'VALIDATION_ERROR');
  errorCode(()=>scoreAnswers(configuration,[...answers,{questionId:'unknown',optionId:'often'}],meta),'VALIDATION_ERROR');
  errorCode(()=>scoreAnswers(configuration,answers.map((value,index)=>index===0?{...value,optionId:'unknown'}:value),meta),'VALIDATION_ERROR');
  configuration.questions[0]!.options[2]!.points=0;configuration.questions[0]!.options[1]!.points=0;
  errorCode(()=>scoreAnswers(configuration,answers,meta),'INVALID_CONFIGURATION');
});

test('all three demo configurations validate and a scientific-notation boundary remains exact',()=>{
  for(const product of DemoProducts)for(const configuration of product.configurations){
    ProductConfigurationSchema.parse(configuration);assert.equal(scoreAnswers(configuration,choices(configuration,'often'),meta).totalScore,100);
  }
  const configuration=config();configuration.bands[0]!.max=1e-7;configuration.bands[1]!.min=1e-7;
  assert.equal(scoreAnswers(configuration,choices(configuration,'rarely'),meta).resultTypeId,'developing');
});
