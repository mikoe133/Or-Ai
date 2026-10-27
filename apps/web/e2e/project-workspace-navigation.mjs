import assert from 'node:assert/strict';
import {expect} from 'playwright/test';
import {join} from 'node:path';

export async function projectWorkspaceNavigation({page,base,productId,retainedId,returnedId,output}){
  const url=base+'/admin/content/'+productId+'?tab=project&review='+retainedId;
  await page.setViewportSize({width:1440,height:1000});await page.goto(url);
  const response=await page.context().request.get(base+'/api/admin/products/'+productId+'/project-workspace?reviewId='+retainedId);
  assert.equal(response.status(),200);const data=await response.json(),copy=data.plan.modules.find(m=>m.definition.domain==='copy'),cover=data.plan.modules.find(m=>m.definition.domain==='cover'),assessment=data.plan.modules.find(m=>m.definition.domain==='assessment'),
    method=data.methods.find(m=>m.planModuleId===copy.id),record=data.records.find(r=>r.planModuleId===copy.id),detail=page.locator('.pw-inspector');
  const node=key=>page.locator('.react-flow__node[data-id="'+key+'"]');
  await page.locator('.pw-directory-module').filter({hasText:copy.definition.title}).click();await detail.getByRole('button',{name:/⌘ 文案创作/}).click();
  await expect(node('method:'+method.id)).toHaveClass(/selected/);await detail.getByRole('button',{name:/▤ copy/}).click();await expect(node('output:'+record.outputs[0].id)).toHaveClass(/selected/);
  await page.getByRole('button',{name:'聚焦模块',exact:true}).click();await page.locator('.pw-directory-module').filter({hasText:cover.definition.title}).click();await expect(node('module:'+cover.id)).toHaveClass(/selected/);
  await page.getByLabel('查找项目模块',{exact:true}).fill(copy.moduleKey);await page.locator('.pw-directory-module').filter({hasText:copy.definition.title}).click();await expect(node('module:'+copy.id)).toHaveClass(/selected/);
  await detail.getByRole('button',{name:'← '+assessment.definition.title,exact:true}).click();await expect(page.getByLabel('查找项目模块',{exact:true})).toHaveValue('');await expect(node('module:'+assessment.id)).toHaveClass(/selected/);
  const primary=page.getByRole('button',{name:'检查与审核',exact:true});await primary.hover();const colors=await primary.evaluate(n=>{const s=getComputedStyle(n);return {foreground:s.color,background:s.backgroundColor};});
  const luminance=value=>{const [r,g,b]=value.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;},
    a=luminance(colors.foreground),b=luminance(colors.background),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  assert.ok(contrast>=4.5,'Primary action hover text must remain readable: '+JSON.stringify({contrast,...colors}));
  await page.getByRole('button',{name:'完整总览',exact:true}).click();await page.locator('.pw-directory-module').filter({hasText:copy.definition.title}).click();await detail.getByRole('button',{name:/⌘ 文案创作/}).click();
  await expect(node('method:'+method.id)).toHaveClass(/selected/);await expect(node('method:'+method.id)).toBeInViewport();
  await page.screenshot({path:join(output,'desktop-linked-method.png'),animations:'disabled'});
  await page.setViewportSize({width:390,height:844});await page.goto(url);await page.getByRole('button',{name:'目录列表',exact:true}).click();
  await page.locator('.pw-folder-files').getByRole('button',{name:/文案创作/}).click();await expect(page.getByRole('dialog',{name:'项目详情',exact:true})).toBeVisible();
  await page.screenshot({path:join(output,'mobile-final-detail.png'),animations:'disabled'});await page.keyboard.press('Escape');
  await page.setViewportSize({width:1440,height:1000});await page.goto(url);await page.getByRole('button',{name:'检查与审核',exact:true}).click();
  await expect(detail.getByText('此修订已留存，可从目录取回固定内容与原件。',{exact:true})).toBeVisible();await page.getByRole('button',{name:'检查与审核',exact:true}).hover();
  await page.screenshot({path:join(output,'desktop-retained-review.png'),animations:'disabled'});
  await page.locator('.pw-directory-module').filter({hasText:copy.definition.title}).click();await expect(node('module:'+copy.id)).toHaveClass(/selected/);await expect(node('module:'+copy.id)).toBeInViewport();
  await page.screenshot({path:join(output,'desktop-final-project.png'),animations:'disabled'});
  if(returnedId){await page.goto(base+'/admin/content/'+productId+'?tab=project&review='+returnedId);await page.locator('.pw-directory-module').filter({hasText:copy.definition.title}).click();
    await detail.getByRole('button',{name:/▤ 结构化内容/}).click();await expect(detail.getByText('有时想聊很多，有时只想安静待一会。',{exact:true})).toBeVisible();
    await page.screenshot({path:join(output,'desktop-historical-output.png'),animations:'disabled'});}
  return {checks:['selecting methods, outputs and filtered dependencies reveals the correct selected graph node and follows focus without losing the target',
    'primary review action retains readable hover contrast'],screens:['desktop-linked-method.png','mobile-final-detail.png','desktop-retained-review.png','desktop-final-project.png',...(returnedId?['desktop-historical-output.png']:[])],contrast};
}
