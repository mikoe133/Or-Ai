import {forwardRef,useCallback} from 'react';
import {Link as RouterLink,useNavigate as useRouterNavigate,useLocation,type LinkProps,type NavigateFunction,type NavigateOptions,type To} from 'react-router-dom';
const destination=(to:To,preview:boolean):To=>{
  if(!preview)return to;
  if(typeof to==='string')return to.startsWith('/')&&!to.startsWith('//')&&!to.startsWith('/preview')?'/preview'+(to==='/'?'':to):to;
  return {...to,pathname:typeof to.pathname==='string'&&to.pathname.startsWith('/')&&!to.pathname.startsWith('/preview')?'/preview'+to.pathname:to.pathname};
};
export const Link=forwardRef<HTMLAnchorElement,LinkProps>(function PreviewLink({to,...props},ref){const preview=useLocation().pathname.startsWith('/preview');return <RouterLink {...props} ref={ref} to={destination(to,preview)}/>;});
export function useNavigate():NavigateFunction{const navigate=useRouterNavigate(),preview=useLocation().pathname.startsWith('/preview');return useCallback((to:To|number,options?:NavigateOptions)=>typeof to==='number'?navigate(to):navigate(destination(to,preview),options),[navigate,preview]) as NavigateFunction;}
