import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {accountApi} from '../auth/browser.js';
import {Page,Loading,Failure} from '../business/shared.js';
export function AdminApp(){
  const context=useQuery({queryKey:['account-context'],queryFn:()=>accountApi.context(),retry:false});
  return <Page title="运营后台">{context.isPending?<Loading/>:context.isError?<Failure error={context.error} retry={()=>void context.refetch()}/>:!context.data.account?<><p>需要管理员账户</p><p>{context.data.configured?'请先登录已验证的管理员邮箱。':'账户服务尚未配置，请先配置本地 Auth。'}</p><Link to="/auth/login">邮箱登录</Link></>:context.data.account.role!=='admin'||!context.data.account.emailVerified?<p role="alert">当前账户没有已验证的管理员权限。</p>:<p>管理接口已通过身份检查。</p>}</Page>;
}
