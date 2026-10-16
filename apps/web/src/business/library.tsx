import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {BindEntitlementRequestSchema,RedemptionRequestSchema,type EntitlementDto} from '@orai/contracts/private';
import {consumer} from '../api/consumer.js';
import {ClientError} from '../api/client.js';
import {identityChanged} from '../api/privacy.js';
import {accountApi} from '../auth/browser.js';
import {Page,Loading,Failure,Demo,Pager,useAction} from './shared.js';

export function RedemptionPage(){
  const [code,setCode]=useState(''),action=useAction(),client=useQueryClient(),navigate=useNavigate();
  return <Page title="领取或恢复商品" section="apps"><p>粘贴购买平台交付的完整兑换码。未绑定商品可换设备恢复，恢复不会增加报告次数。</p><p>这里使用真实测试接口；设计示例码不能兑换。</p>
    <form onSubmit={event=>{event.preventDefault();void action.run(async()=>{
      const parsed=RedemptionRequestSchema.safeParse(action.intent('redeem',{code}));if(!parsed.success)throw new ClientError('VALIDATION_ERROR','请粘贴完整兑换码，检查是否缺少字符。');
      return consumer.redeem(parsed.data);
    },async value=>{setCode('');await identityChanged(client);navigate('/apps',{replace:true,state:{redeemedId:value.entitlement.id}});});}}>
      <label>兑换码<input aria-label="兑换码" type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} value={code} minLength={32} maxLength={96} required disabled={action.busy} onChange={event=>setCode(event.target.value)}/></label><button type="submit" disabled={action.busy}>{action.busy?'请稍候…':'领取或恢复'}</button>
    </form>{Boolean(action.error)&&<Failure error={action.error}/>}<p>已绑定商品请登录原账户查看，不会被恢复为匿名商品。</p><Link to="/auth/login">邮箱登录</Link><Link to="/apps">查看我的应用</Link></Page>;
}

const statusText={active:'有效',expired:'已过期',revoked:'已撤权'};
const reportText={absent:'尚未生成',available:'可查看',expired:'已过期',deleted:'已删除'};
export function LibraryPage({reports=false}:{reports?:boolean}){
  const [params,setParams]=useSearchParams(),client=useQueryClient(),navigate=useNavigate(),action=useAction();
  const source=params.get('source')==='account'?'account':'anonymous',page=Math.min(10000,Math.max(1,Number(params.get('page'))||1));
  const account=useQuery({queryKey:['account-context'],queryFn:()=>accountApi.context(),retry:false});
  const session=useQuery({queryKey:['private','anonymous-context'],queryFn:({signal})=>consumer.session(signal),retry:false});
  const allowed=source==='anonymous'?Boolean(session.data?.authenticated):Boolean(account.data?.account?.emailVerified);
  const entitlements=useQuery({queryKey:['private','entitlements',source,page],queryFn:({signal})=>consumer.entitlements(source,page,signal),enabled:allowed&&!(reports&&source==='account')});
  const accountReports=useQuery({queryKey:['private','account-reports',page],queryFn:({signal})=>consumer.accountReports(page,signal),enabled:allowed&&reports&&source==='account'});
  const change=(fields:Record<string,string>)=>setParams({...Object.fromEntries(params),...fields});
  function open(value:EntitlementDto){void action.run(()=>consumer.start(action.intent('start:'+value.id,{entitlementId:value.id})),questions=>{client.setQueryData(['private','attempt',questions.attemptId],questions);navigate('/attempts/'+questions.attemptId);});}
  const result=reports&&source==='account'?accountReports:entitlements;
  return <Page title={reports?'我的报告':'我的应用'} section={reports?'reports':'apps'}>
    <div className="biz-row"><button aria-pressed={source==='anonymous'} onClick={()=>change({source:'anonymous',page:'1'})}>本机未绑定商品</button><button aria-pressed={source==='account'} onClick={()=>change({source:'account',page:'1'})}>账户已绑定商品</button><Link to="/redeem">领取或恢复</Link><Link to="/account">账户与绑定</Link></div>
    <p>{source==='anonymous'?'这里仅显示本机兑换码会话中的未绑定商品。':'这里仅显示主动绑定到当前邮箱账户的商品。'}两份列表独立显示。</p>
    {source==='anonymous'&&session.isError?<Failure error={session.error} retry={()=>void session.refetch()}/>:source==='account'&&account.isError?<Failure error={account.error} retry={()=>void account.refetch()}/>:!allowed?<>
      {(source==='anonymous'?session.isPending:account.isPending)?<Loading/>:<p role="status">{source==='anonymous'?'当前没有本机商品，请使用兑换码领取或恢复。':account.data?.account?'请先验证邮箱，再查看账户商品。':account.data?.configured?'请先登录账户。':'邮箱账户尚未配置，可继续本机兑换。'}</p>}
    </>:result.isPending?<Loading/>:result.isError?<Failure error={result.error} retry={()=>void result.refetch()}/>:<>
      <div className="biz-grid">{reports&&source==='account'?accountReports.data?.items.map(value=><article className="biz-card" key={value.id}><h2>{value.productName}</h2><Demo show={value.isDemo}/><p>版本 {value.versionNumber} · 报告{reportText[value.reportState]} · 权益{statusText[value.entitlementStatus]}</p>{value.reportState==='available'&&value.entitlementStatus==='active'&&<Link to={'/reports/'+value.id+'?source=account'}>查看报告</Link>}</article>)
        :entitlements.data?.items.filter(value=>!reports||value.reportId!==null).map(value=><article className="biz-card" key={value.id}><h2>{value.productName}</h2><Demo show={value.isDemo}/><p>版本 {value.versionNumber} · 权益{statusText[value.status]} · 已用 {value.reportsConsumed}/{value.reportsAllowed} 份报告</p><p>访问截至 {new Date(value.accessExpiresAt).toLocaleString('zh-CN')}</p><p>报告：{reportText[value.reportState]}</p>
          {value.reportId&&value.reportState==='available'&&value.status==='active'?<Link to={'/reports/'+value.reportId+'?source='+source}>查看报告</Link>:!reports&&<button disabled={action.busy||value.status!=='active'||value.reportsConsumed>=value.reportsAllowed} onClick={()=>open(value)}>{value.attemptId?'继续作答':'开始测试'}</button>}
        </article>)}</div>
      {result.data?.items.length===0&&<p role="status">这里暂时没有内容。</p>}{reports&&source==='anonymous'&&<p className="biz-note">本页按应用分页，列出其中已生成的报告；过期、撤权、删除状态以服务端为准。</p>}
      {result.data&&<Pager {...result.data} onChange={next=>change({page:String(next)})}/>}</>}
    {Boolean(action.error)&&<Failure error={action.error}/>}<div className="biz-row">{source==='anonymous'&&session.data?.authenticated&&<button disabled={action.busy} onClick={()=>void action.run(()=>consumer.logout(),async()=>{await identityChanged(client);})}>退出本机兑换会话</button>}<Link to={reports?'/apps':'/reports'}>{reports?'查看我的应用':'查看我的报告'}</Link></div>
  </Page>;
}

export function AccountLibrary(){
  const context=useQuery({queryKey:['account-context'],queryFn:()=>accountApi.context(),retry:false}),[code,setCode]=useState(''),[confirmed,setConfirmed]=useState(false),action=useAction(),client=useQueryClient(),navigate=useNavigate();
  if(!context.data?.account)return <div className="biz-view"><Link to="/apps">查看本机未绑定商品</Link></div>;
  return <section className="biz-view"><h2>我的商品与报告</h2><nav className="biz-row"><Link to="/apps?source=account">账户已绑定商品</Link><Link to="/reports?source=account">账户报告</Link><Link to="/apps?source=anonymous">本机未绑定商品</Link>{context.data.account.role==='admin'&&context.data.account.emailVerified&&<Link to="/admin">运营后台</Link>}</nav>
    <p>登录不会自动合并本机商品。绑定后，商品与报告只能由当前账户访问，原兑换码不能再用于匿名恢复。</p>
    <form onSubmit={event=>{event.preventDefault();void action.run(async()=>{const parsed=BindEntitlementRequestSchema.safeParse(action.intent('bind',{code,confirmed}));if(!parsed.success)throw new ClientError('VALIDATION_ERROR','请填写完整兑换码，并确认绑定。');return consumer.bind(parsed.data);},async()=>{setCode('');setConfirmed(false);await identityChanged(client);navigate('/apps?source=account');});}}>
      <label>要绑定的兑换码<input aria-label="要绑定的兑换码" type="password" autoComplete="off" value={code} maxLength={96} minLength={32} required disabled={action.busy||!context.data.account.emailVerified} onChange={event=>setCode(event.target.value)}/></label>
      <label className="biz-option"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>我确认将此商品绑定到当前账户</label><button type="submit" disabled={action.busy||!confirmed||!context.data.account.emailVerified}>确认绑定</button>
    </form>{Boolean(action.error)&&<Failure error={action.error}/>}</section>;
}
