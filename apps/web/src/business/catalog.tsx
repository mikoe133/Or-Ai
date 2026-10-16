import {useEffect,useRef} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {KeySchema} from '@orai/contracts';
import {api,consumer} from '../api/consumer.js';
import {MutationIntent} from '../api/intent.js';
import {catalogSearch,changeCatalogSearch} from './model.js';
import {Page,Loading,Failure,Demo,Pager} from './shared.js';

export function CatalogPage(){
  const [params,setParams]=useSearchParams();let invalid:unknown=null;
  try{catalogSearch(params);}catch(error){invalid=error;}
  const search=params.toString();
  const result=useQuery({queryKey:['public','catalog',search],queryFn:({signal})=>consumer.catalog(search,signal),enabled:!invalid});
  const categories=useQuery({queryKey:['public','categories'],queryFn:({signal})=>consumer.categories(signal)});
  const tags=useQuery({queryKey:['public','tags'],queryFn:({signal})=>consumer.tags(signal)});
  return <Page title="发现有趣的自己"><p>从一个问题开始，看看你的生活倾向。</p><nav className="biz-row"><Link to="/apps">我的应用</Link><Link to="/reports">我的报告</Link><Link to="/account">账户与绑定</Link><Link to="/redeem">输入兑换码</Link></nav>
    <form key={search} onSubmit={event=>{event.preventDefault();const fields=new FormData(event.currentTarget);const next=changeCatalogSearch(params,{
      q:String(fields.get('q')??'').trim(),category:String(fields.get('category')??''),sort:String(fields.get('sort')??'latest'),tags:fields.getAll('tags').map(String).join(','),
      minPriceFen:fields.get('minPrice')?String(Math.round(Number(fields.get('minPrice'))*100)):'',maxPriceFen:fields.get('maxPrice')?String(Math.round(Number(fields.get('maxPrice'))*100)):'',
      minDurationMinutes:String(fields.get('minDurationMinutes')??''),maxDurationMinutes:String(fields.get('maxDurationMinutes')??''),experienceType:String(fields.get('experienceType')??''),pageSize:String(fields.get('pageSize')??20)});setParams(next);}}>
      <div className="biz-grid"><label>搜索测试<input name="q" type="search" maxLength={100} defaultValue={params.get('q')??''}/></label><label>商品分类<select name="category" defaultValue={params.get('category')??''}><option value="">全部</option>{categories.data?.map(value=><option key={value.id} value={value.slug}>{value.name}</option>)}</select></label><label>排序<select name="sort" defaultValue={params.get('sort')??'latest'}><option value="latest">最新优先</option><option value="recommended">推荐优先</option></select></label></div>
      <details><summary>更多筛选</summary><div className="biz-grid"><label>最低价格（元）<input name="minPrice" type="number" min="0" max="100000" step=".01" defaultValue={params.has('minPriceFen')?Number(params.get('minPriceFen'))/100:''}/></label><label>最高价格（元）<input name="maxPrice" type="number" min="0" max="100000" step=".01" defaultValue={params.has('maxPriceFen')?Number(params.get('maxPriceFen'))/100:''}/></label><label>最短时长（分钟）<input name="minDurationMinutes" type="number" min="1" max="120" defaultValue={params.get('minDurationMinutes')??''}/></label><label>最长时长（分钟）<input name="maxDurationMinutes" type="number" min="1" max="120" defaultValue={params.get('maxDurationMinutes')??''}/></label><label>结果形式<select name="experienceType" defaultValue={params.get('experienceType')??''}><option value="">全部</option><option value="score">分数观察</option><option value="tendency">倾向观察</option></select></label><label>每页数量<select name="pageSize" defaultValue={params.get('pageSize')??'20'}>{[1,10,20,50].map(value=><option key={value}>{value}</option>)}</select></label></div><fieldset><legend>标签（同时满足）</legend>{tags.data?.map(value=><label key={value.id} className="biz-option"><input name="tags" type="checkbox" value={value.slug} defaultChecked={(params.get('tags')??'').split(',').includes(value.slug)}/>{value.name}</label>)}</fieldset></details><div className="biz-row"><button type="submit">应用筛选</button><button type="button" onClick={()=>setParams({})}>重置筛选</button></div>
    </form>
    {(categories.isError||tags.isError)&&<Failure error={categories.error??tags.error} retry={()=>{void categories.refetch();void tags.refetch();}}/>}
    {invalid?<Failure error={invalid} retry={()=>setParams({})}/>:result.isPending?<Loading/>:result.isError?<Failure error={result.error} retry={()=>void result.refetch()}/>:<>
      <p role="status">共 {result.data.total} 个商品</p><div className="biz-grid">{result.data.items.map(product=><article key={product.id} className="biz-card">
        {product.coverUrl?<img src={product.coverUrl} alt={product.name+'的封面'} loading="lazy"/>:<p className="biz-note">封面待补</p>}
        <h2><Link to={'/products/'+product.slug}>{product.name}</Link></h2><Demo show={product.isDemo}/><p>{product.hook}</p><p>{product.questionCount} 道题 · 约 {product.durationMinutes} 分钟 · ¥ {(product.price.amountFen/100).toFixed(2)}{product.price.isTestPrice?'（测试价格）':''}</p><p>{product.summary}</p><Link className="biz-button" to={'/products/'+product.slug}>查看详情</Link></article>)}</div>
      {!result.data.items.length&&<p role="status">没有符合条件的商品，请调整筛选。</p>}<Pager {...result.data} onChange={page=>setParams(changeCatalogSearch(params,{page:String(page)}))}/>
    </>}
  </Page>;
}

export function ProductPage(){
  const {slug=''}=useParams(),[params]=useSearchParams(),intent=useRef(new MutationIntent()),observed=useRef('');
  const result=useQuery({queryKey:['public','product',slug],queryFn:({signal})=>consumer.product(slug,signal)});
  useEffect(()=>{if(!result.data||observed.current===result.data.versionId)return;observed.current=result.data.versionId;
    const campaign=params.get('campaign'),body=intent.current.for({kind:'view',productVersionId:result.data.versionId,...(KeySchema.safeParse(campaign).success?{campaignCode:campaign}: {})});
    void api.request('/api/events',{safeParse:value=>value&&typeof value==='object'&&'accepted'in value&&value.accepted===true?{success:true,data:true}:{success:false}},{method:'POST',body}).catch(()=>undefined);
  },[result.data,params]);
  return <Page title={result.data?.name??'商品详情'}>{result.isPending?<Loading/>:result.isError?<Failure error={result.error} retry={()=>void result.refetch()}/>:<>
    <Demo show={result.data.isDemo}/>{result.data.coverUrl&&<img className="biz-cover" src={result.data.coverUrl} alt="商品封面"/>}<p>{result.data.hook}</p><p>{result.data.description}</p><p>{result.data.questionCount} 道题 · 约 {result.data.durationMinutes} 分钟 · 版本 {result.data.versionNumber} · ¥ {(result.data.price.amountFen/100).toFixed(2)}</p>
    <section className="biz-card"><h2>{result.data.publicSample.label}</h2><p>{result.data.publicSample.summary}</p>{result.data.publicSample.dimensions.map((value,index)=><p key={index}>{value.label}：{value.score===null?'信息不足':value.score}</p>)}<p>{result.data.publicSample.suggestion}</p><small>这是公开样例，与个人报告分开。</small></section>
    <p>{result.data.purchaseNotice}</p>{result.data.purchaseUrl?<a className="biz-button" href={result.data.purchaseUrl} target="_blank" rel="noopener noreferrer">前往购买平台</a>:<p>当前未提供购买链接。</p>}<p>{result.data.redemptionNotice}</p><Link className="biz-button" to="/redeem">已有兑换码，领取或恢复</Link><Link to="/">返回商城</Link>
  </>}</Page>;
}
