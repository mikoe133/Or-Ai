import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {adminApi} from './api.js';
import {Failure,Loading} from '../business/shared.js';
export function ProductVersionSelect({value,onChange}:{value:string;onChange:(value:string)=>void}){
  const[search,setSearch]=useState('');const products=useQuery({queryKey:['private','admin','product-options',search],queryFn:({signal})=>adminApi.products(new URLSearchParams({query:search,status:'published',pageSize:'50'}).toString(),signal)});
  return <><label>搜索交付商品<input aria-label="搜索交付商品" maxLength={100} value={search} onChange={event=>setSearch(event.target.value)}/></label>{products.isPending?<Loading/>:products.isError?<Failure error={products.error} retry={()=>void products.refetch()}/>:<label>商品版本<select aria-label="商品版本" required value={value} onChange={event=>onChange(event.target.value)}><option value="">请选择已发布商品</option>{products.data.items.filter(product=>product.currentVersionId).map(product=><option key={product.id} value={product.currentVersionId!}>{product.name}</option>)}</select></label>}<small>每次最多显示 50 款匹配商品，可搜索缩小范围；订单与素材固定引用所选版本。</small></>;
}
