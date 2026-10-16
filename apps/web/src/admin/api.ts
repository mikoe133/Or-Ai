import {IdSchema,PageSchema} from '@orai/contracts';
import {AdminAuditSchema,AdminCategorySchema,AdminCsvResultSchema,AdminFileSchema,AdminManagedAssetSchema,AdminOrderDetailSchema,AdminOrderSchema,AdminOverviewSchema,AdminProductInputSchema,AdminProductSchema,AdminProductStateResponseSchema,AdminSecretDeliverySchema,AdminTagSchema,AdminVersionPreviewSchema,AdminVersionSchema} from '@orai/contracts/admin';
import {api} from '../api/consumer.js';
import {ClientError,type Schema} from '../api/client.js';
const id=(value:string)=>IdSchema.parse(value).toLowerCase();
export function parseEditor<T>(schema:Schema<T>,text:string):T{
  let value:unknown;try{value=JSON.parse(text);}catch{throw new ClientError('VALIDATION_ERROR','JSON 格式不正确，请检查引号与逗号。');}
  const parsed=schema.safeParse(value);if(!parsed.success)throw new ClientError('VALIDATION_ERROR','字段未通过校验，请核对字段名称、内容与数据类型。');return parsed.data;
}
export const productMetadata=(value:unknown)=>AdminProductInputSchema.strip().parse(value);
export const adminApi={
  overview:(signal?:AbortSignal)=>api.request('/api/admin/overview',AdminOverviewSchema,{signal}),
  audit:(page=1,signal?:AbortSignal)=>api.request('/api/admin/audit?page='+page,PageSchema(AdminAuditSchema),{signal}),
  categories:(signal?:AbortSignal)=>api.request('/api/admin/categories?pageSize=50',PageSchema(AdminCategorySchema),{signal}),
  tags:(signal?:AbortSignal)=>api.request('/api/admin/tags?pageSize=50',PageSchema(AdminTagSchema),{signal}),
  products:(query='',signal?:AbortSignal)=>api.request('/api/admin/products'+(query?'?'+query:''),PageSchema(AdminProductSchema),{signal}),
  product:(productId:string,signal?:AbortSignal)=>api.request('/api/admin/products/'+id(productId),AdminProductSchema,{signal}),
  createProduct:(body:unknown)=>api.request('/api/admin/products',AdminProductSchema,{method:'POST',body}),
  patchProduct:(productId:string,body:unknown)=>api.request('/api/admin/products/'+id(productId),AdminProductSchema,{method:'PATCH',body}),
  versions:(productId:string,page=1,signal?:AbortSignal)=>api.request('/api/admin/products/'+id(productId)+'/versions?page='+page,PageSchema(AdminVersionSchema),{signal}),
  preview:(productId:string,versionId:string)=>api.request('/api/admin/products/'+id(productId)+'/versions/'+id(versionId)+'/preview',AdminVersionPreviewSchema),
  importVersion:(productId:string,body:unknown)=>api.request('/api/admin/products/'+id(productId)+'/versions',AdminVersionSchema,{method:'POST',body}),
  replaceVersion:(productId:string,versionId:string,body:unknown)=>api.request('/api/admin/products/'+id(productId)+'/versions/'+id(versionId),AdminVersionSchema,{method:'PUT',body}),
  versionAction:(productId:string,versionId:string,action:'review'|'publish',body:unknown)=>api.request('/api/admin/products/'+id(productId)+'/versions/'+id(versionId)+'/'+action,AdminVersionSchema,{method:'POST',body}),
  archiveProduct:(productId:string,body:unknown)=>api.request('/api/admin/products/'+id(productId)+'/archive',AdminProductStateResponseSchema,{method:'POST',body}),
  cover:(productId:string,body:unknown)=>api.request('/api/admin/products/'+id(productId)+'/cover',AdminProductSchema,{method:'POST',body}),
  orders:(query='',signal?:AbortSignal)=>api.request('/api/admin/orders'+(query?'?'+query:''),PageSchema(AdminOrderSchema),{signal}),
  order:(orderId:string,signal?:AbortSignal)=>api.request('/api/admin/orders/'+id(orderId),AdminOrderDetailSchema,{signal}),
  createOrder:(body:unknown)=>api.request('/api/admin/orders',AdminOrderSchema,{method:'POST',body}),
  csv:(body:unknown)=>api.request('/api/admin/orders/import',AdminCsvResultSchema,{method:'POST',body,timeoutMs:60000}),
  issue:(orderId:string,body:unknown)=>api.request('/api/admin/orders/'+id(orderId)+'/issue',AdminSecretDeliverySchema,{method:'POST',body}),
  replaceCode:(codeId:string,body:unknown)=>api.request('/api/admin/codes/'+id(codeId)+'/replace',AdminSecretDeliverySchema,{method:'POST',body}),
  refund:(orderId:string,body:unknown)=>api.request('/api/admin/orders/'+id(orderId)+'/refund',AdminOrderSchema,{method:'POST',body}),
  assets:(query='',signal?:AbortSignal)=>api.request('/api/admin/assets'+(query?'?'+query:''),PageSchema(AdminManagedAssetSchema),{signal}),
  asset:(assetId:string)=>api.request('/api/admin/assets/'+id(assetId),AdminManagedAssetSchema),
  createAsset:(body:unknown)=>api.request('/api/admin/assets',AdminManagedAssetSchema,{method:'POST',body}),
  patchAsset:(assetId:string,body:unknown)=>api.request('/api/admin/assets/'+id(assetId),AdminManagedAssetSchema,{method:'PATCH',body}),
  assetAction:(assetId:string,action:'review'|'ready'|'archive',body:unknown)=>api.request('/api/admin/assets/'+id(assetId)+'/'+action,AdminManagedAssetSchema,{method:'POST',body}),
  prepare:(body:unknown)=>api.request('/api/admin/uploads',AdminFileSchema,{method:'POST',body}),
  status:(fileId:string)=>api.request('/api/admin/uploads/'+id(fileId),AdminFileSchema),
  upload:(fileId:string,body:Blob)=>api.request('/api/admin/uploads/'+id(fileId)+'/content',AdminFileSchema,{method:'PUT',body,binary:true,timeoutMs:125000}),
  complete:(fileId:string,body:unknown)=>api.request('/api/admin/uploads/'+id(fileId)+'/complete',AdminFileSchema,{method:'POST',body}),
};
export type AdminProduct=Awaited<ReturnType<typeof adminApi.product>>;
export type Asset=Awaited<ReturnType<typeof adminApi.createAsset>>;
export type Upload=Awaited<ReturnType<typeof adminApi.prepare>>;
export async function findPublishedProduct(versionId:string,read:(page:number)=>Promise<{items:AdminProduct[];page:number;pageSize:number;total:number}>=page=>adminApi.products(new URLSearchParams({status:'published',pageSize:'50',page:String(page)}).toString())){
  for(let page=1;;page++){
    const result=await read(page),product=result.items.find(value=>value.currentVersionId===versionId);
    if(product)return product;
    if(page*result.pageSize>=result.total)return undefined;
  }
}
