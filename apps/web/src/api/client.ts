import {ApiErrorSchema} from '@orai/contracts';
import {AnonymousSessionContextSchema} from '@orai/contracts/private';

export interface Schema<T> {safeParse(value:unknown):{success:true;data:T}|{success:false}}
export class ClientError extends Error {
  constructor(readonly code:string,message:string,readonly status=0,readonly retryAfterSeconds=0){super(message);}
}
interface Options {method?:'GET'|'POST'|'PUT'|'PATCH'|'DELETE';body?:unknown;signal?:AbortSignal;binary?:boolean;timeoutMs?:number;responseType?:'blob'}
export const EmptySchema:Schema<undefined>={safeParse:value=>value===undefined?{success:true,data:undefined}:{success:false}};

export class ApiClient {
  private csrfToken='';private csrfPending?:Promise<string>;
  constructor(private readonly fetcher:typeof fetch=(input,init)=>fetch(input,init),private readonly epoch:()=>number=()=>0){}
  private csrf(){
    if(this.csrfToken)return Promise.resolve(this.csrfToken);
    return this.csrfPending??=this.request('/api/session/context',AnonymousSessionContextSchema)
      .then(value=>this.csrfToken=value.csrfToken).finally(()=>{this.csrfPending=undefined;});
  }
  forgetCsrf(){this.csrfToken='';}
  async request<T>(path:string,schema:Schema<T>,options:Options={}):Promise<T>{
    if(!/^\/api\/[a-zA-Z0-9/_?=&%+,.:-]+$/.test(path)||path.includes('..'))throw new ClientError('VALIDATION_ERROR','请求地址不正确。');
    const method=options.method??'GET',mutation=method!=='GET',epoch=this.epoch();
    const privateRequest=mutation||!/^\/api\/(?:products|categories|tags)(?:[/?]|$)/.test(path);
    if(options.binary&&!(options.body instanceof Blob))throw new ClientError('VALIDATION_ERROR','请选择需要上传的文件。');
    let csrf=mutation?await this.csrf():'';
    for(let attempt=0;attempt<2;attempt++){
      if(privateRequest&&epoch!==this.epoch())throw new ClientError('SESSION_CHANGED','访问身份已改变，请重新确认当前状态。');
      let response:Response;
      try{
        const timeout=AbortSignal.timeout(options.timeoutMs??15000);
        response=await this.fetcher(path,{method,credentials:'same-origin',cache:'no-store',signal:options.signal?AbortSignal.any([options.signal,timeout]):timeout,
          headers:mutation?{'Content-Type':options.binary?'application/octet-stream':'application/json','X-CSRF-Token':csrf}:undefined,
          body:mutation?(options.binary?options.body as Blob:JSON.stringify(options.body??{})):undefined});
      }catch{
        if(options.signal?.aborted)throw new ClientError('REQUEST_CANCELLED','请求已取消。');
        throw new ClientError('NETWORK_ERROR','连接失败，请检查网络后重试；操作状态需重新确认。');
      }
      if(privateRequest&&epoch!==this.epoch())throw new ClientError('SESSION_CHANGED','访问身份已改变，请重新确认当前状态。');
      let value:unknown;
      try{value=response.status===204?undefined:response.ok&&options.responseType==='blob'?await response.blob():await response.json();}
      catch{throw new ClientError(response.ok?'INVALID_RESPONSE':'SERVICE_UNAVAILABLE','服务响应异常，请稍后重试。',response.status);}
      if(privateRequest&&epoch!==this.epoch())throw new ClientError('SESSION_CHANGED','访问身份已改变，请重新确认当前状态。');
      if(!response.ok){
        const parsed=ApiErrorSchema.safeParse(value);
        if(!parsed.success)throw new ClientError('SERVICE_UNAVAILABLE','服务暂时不可用，请稍后重试。',response.status);
        const error=parsed.data.error;
        if(mutation&&error.code==='CSRF_INVALID'&&attempt===0){this.csrfToken='';csrf=await this.csrf();continue;}
        const retry=Number(response.headers.get('retry-after'));
        throw new ClientError(error.code,response.status>=500?'服务暂时不可用，请稍后重试。':error.message,response.status,Number.isFinite(retry)&&retry>0?Math.min(Math.ceil(retry),86400):0);
      }
      const result=schema.safeParse(value);
      if(!result.success)throw new ClientError('INVALID_RESPONSE','返回内容格式不正确，请刷新后重试。');
      return result.data;
    }
    throw new ClientError('CSRF_INVALID','页面授权已过期，请刷新后重试。',403);
  }
  blob(path:string,signal?:AbortSignal){return this.request(path,{safeParse:value=>value instanceof Blob?{success:true,data:value}:{success:false}},{responseType:'blob',signal});}
}
