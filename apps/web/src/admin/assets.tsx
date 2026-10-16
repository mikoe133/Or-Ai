import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useSearchParams} from 'react-router-dom';
import {AdminAssetCreateSchema,AdminAssetPatchSchema} from '@orai/contracts/admin';
import {ClientError} from '../api/client.js';
import {adminApi,findPublishedProduct,type Asset,type Upload} from './api.js';
import {ProductVersionSelect} from './shared.js';
import {Failure,Loading,Pager,useAction} from '../business/shared.js';
export function Assets(){
  const[params,setParams]=useSearchParams(),client=useQueryClient(),action=useAction(),[version,setVersion]=useState(''),[kind,setKind]=useState<Asset['kind']>('cover'),[platform,setPlatform]=useState<Asset['platform']>('manual'),[variant,setVariant]=useState(''),[text,setText]=useState(''),[selected,setSelected]=useState<Asset|null>(null),[file,setFile]=useState<File|null>(null),[upload,setUpload]=useState<Upload|null>(null),[notice,setNotice]=useState('');
  const list=useQuery({queryKey:['private','admin','assets',params.toString()],queryFn:({signal})=>adminApi.assets(params.toString(),signal)});
  const media=kind==='cover'||kind==='video',pendingFile=media&&Boolean(file)&&upload?.status!=='available';
  const dirty=Boolean(selected)&&(variant!==selected!.variant||text!==(selected!.text??'')||Boolean(file)||Boolean(upload&&upload.id!==selected!.fileId));
  function changed(){void client.invalidateQueries({queryKey:['private','admin','assets']});}
  async function sendFile(){await action.run(async()=>{
    if(!file||!version)throw new ClientError('VALIDATION_ERROR','请选择商品版本和媒体文件。');
    if(file.size>(kind==='cover'?10:100)*1024*1024)throw new ClientError('VALIDATION_ERROR','文件超过当前页面的上传上限（图片 10 MiB、视频 100 MiB）。');
    let current=upload;
    if(!current){const checksum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(value=>value.toString(16).padStart(2,'0')).join('');
      current=await adminApi.prepare(action.intent('prepare',{productVersionId:version,kind,fileName:file.name,mimeType:file.type,byteSize:file.size,checksum}));setUpload(current);}
    else current=await adminApi.status(current.id);
    if(current.status==='pending'){current=await adminApi.upload(current.id,file);setUpload(current);}
    if(current.status==='uploaded')current=await adminApi.complete(current.id,action.intent('complete:'+current.id,{}));
    setUpload(current);return current;
  });}
  function choose(value:Asset){setSelected(value);setVersion(value.productVersionId);setKind(value.kind);setPlatform(value.platform);setVariant(value.variant);setText(value.text??'');setFile(null);setUpload(null);setNotice('');}
  return <><h2>素材管理</h2><p>封面、视频与文字分别保存。文件校验成功后仍需保存草稿、审核并标记就绪。只有明确采用的商品封面公开。</p>
    <section className="biz-card"><h3>{selected?'编辑素材':'新建素材'}</h3><form onSubmit={event=>{event.preventDefault();if(pendingFile)return;void action.run(()=>selected?adminApi.patchAsset(selected.id,AdminAssetPatchSchema.parse(action.intent('patch:'+selected.id,{variant,text:kind==='copy'||kind==='script'?text:null,...(upload?.status==='available'?{fileId:upload.id}:{}),expectedRevision:selected.revision}))):adminApi.createAsset(AdminAssetCreateSchema.parse(action.intent('create-asset',{productVersionId:version,platform,kind,variant,text:kind==='copy'||kind==='script'?text:null,fileId:upload?.status==='available'?upload.id:null}))),value=>{choose(value);changed();});}}>
      {!selected?<><ProductVersionSelect value={version} onChange={value=>{setVersion(value);setUpload(null);}}/><label>素材类别<select aria-label="素材类别" value={kind} onChange={event=>{setKind(event.target.value as Asset['kind']);setUpload(null);setFile(null);}}>{['cover','video','script','copy'].map(value=><option key={value} value={value}>{{cover:'封面',video:'视频',script:'脚本',copy:'文案'}[value]}</option>)}</select></label></>:<p>版本 {selected.productVersionId} · {selected.kind}</p>}
      <label>平台<select aria-label="平台" value={platform} disabled={Boolean(selected)} onChange={event=>setPlatform(event.target.value as Asset['platform'])}>{['manual','douyin','xiaohongshu'].map(value=><option key={value}>{value}</option>)}</select></label><label>变体名<input aria-label="变体名" value={variant} maxLength={40} required onChange={event=>setVariant(event.target.value)}/></label>
      {kind==='script'||kind==='copy'?<label>文字内容<textarea aria-label="文字内容" maxLength={20000} value={text} onChange={event=>setText(event.target.value)}/></label>:<>
        <label>媒体文件<input aria-label="媒体文件" key={kind+version+(selected?.id??'')} type="file" accept={kind==='cover'?'image/png,image/jpeg,image/webp':'video/mp4,video/webm'} onChange={event=>{setFile(event.target.files?.[0]??null);setUpload(null);}}/></label>
        <button type="button" disabled={action.busy||!file||!version} onClick={()=>void sendFile()}>上传并校验</button>
        {upload&&<><p role="status">{upload.status==='available'?'文件已校验，可关联素材。':'上传状态：'+upload.status}</p><div className="biz-row"><button type="button" disabled={action.busy} onClick={()=>void action.run(()=>adminApi.status(upload.id),setUpload)}>查询上传状态</button>{['failed','expired'].includes(upload.status)&&<button type="button" onClick={()=>{setUpload(null);setFile(null);}}>重新选择文件</button>}</div></>}
        {(upload?.downloadPath||selected?.downloadPath)&&<><p>{upload?.downloadPath?'新文件预览（尚未保存到素材）':'当前已保存媒体预览'}</p>{kind==='video'?<video key={upload?.downloadPath??selected?.downloadPath} controls preload="metadata" src={upload?.downloadPath??selected?.downloadPath??''}/>:<img className="biz-cover" alt="待审核封面预览" src={upload?.downloadPath??selected?.downloadPath??''}/>}</>}
        {pendingFile&&<p>新文件尚未校验，请先上传并校验后保存。</p>}</>}
      <button type="submit" disabled={action.busy||!version||pendingFile||media&&!selected&&upload?.status!=='available'}>{selected?'保存素材修改':'保存素材草稿'}</button>
    </form><button disabled={action.busy} onClick={()=>{setSelected(null);setFile(null);setUpload(null);setVariant('');setText('');setNotice('');}}>新建另一份素材</button>
      {selected&&<><p>素材状态：{selected.status}</p><p>修订 {selected.revision} · 文件 {selected.fileId??'无'}</p><button disabled={action.busy} onClick={()=>void action.run(()=>adminApi.asset(selected.id),value=>{choose(value);changed();})}>刷新素材与修订</button><small>刷新会替换尚未保存的表单与文件选择。</small>{dirty&&<p>素材有未保存修改，请先保存后审核或采用。</p>}<div className="biz-row">{(['review','ready','archive']as const).map(value=><button key={value} disabled={action.busy||dirty||(value==='review'?selected.status!=='draft':value==='ready'?selected.status!=='reviewed':selected.status==='archived')} onClick={()=>void action.run(()=>adminApi.assetAction(selected.id,value,action.intent(value+':'+selected.id,{expectedRevision:selected.revision})),value=>{setSelected(value);changed();})}>{{review:'审核素材',ready:'标记就绪',archive:'归档素材'}[value]}</button>)}
        {selected.kind==='cover'&&<button disabled={action.busy||dirty||selected.status!=='ready'} onClick={()=>void action.run(async()=>{
          const product=await findPublishedProduct(selected.productVersionId);
          if(!product)throw new ClientError('CONFLICT','此素材不属于当前在售版本，请从商品管理页确认发布状态。');
          const fresh=await adminApi.product(product.id);return adminApi.cover(product.id,action.intent('cover:'+product.id,{assetId:selected.id,expectedRevision:fresh.revision}));
        },()=>{setNotice('已采用为当前商品封面。');void client.invalidateQueries({queryKey:['public']});})}>采用为商品封面</button>}</div></>}{notice&&<p role="status">{notice}</p>}
    </section>
    <form className="biz-grid" onSubmit={event=>{event.preventDefault();const fields=new FormData(event.currentTarget);setParams(Object.fromEntries([...fields].map(([key,value])=>[key,String(value)]).filter(([,value])=>value)));}}><label>筛选类别<select aria-label="筛选类别" name="kind" defaultValue={params.get('kind')??''}><option value="">全部</option>{['cover','video','script','copy'].map(value=><option key={value}>{value}</option>)}</select></label><label>筛选平台<select aria-label="筛选平台" name="platform" defaultValue={params.get('platform')??''}><option value="">全部</option>{['manual','douyin','xiaohongshu'].map(value=><option key={value}>{value}</option>)}</select></label><label>筛选状态<select aria-label="筛选状态" name="status" defaultValue={params.get('status')??''}><option value="">全部</option>{['draft','reviewed','ready','archived'].map(value=><option key={value}>{value}</option>)}</select></label><button>筛选素材</button></form>
    {list.isPending?<Loading/>:list.isError?<Failure error={list.error} retry={()=>void list.refetch()}/>:<><div className="biz-grid">{list.data.items.map(value=><article className="biz-card" key={value.id}><h3>{value.kind} · {value.variant}</h3><p>{value.platform} · {value.status} · 修订 {value.revision}</p>{value.text&&<p>{value.text}</p>}<button disabled={action.busy} onClick={()=>choose(value)}>编辑素材</button></article>)}</div>{!list.data.total&&<p>没有匹配素材。</p>}<Pager {...list.data} onChange={page=>setParams({...Object.fromEntries(params),page:String(page)})}/></>}
    {Boolean(action.error)&&<Failure error={action.error} retry={changed}/>}</>;
}
