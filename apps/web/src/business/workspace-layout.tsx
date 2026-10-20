import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FlowShell, type FlowSection } from '../store/flow-shell';
import { Loading } from './shared';

export default function WorkspaceLayout() {
  const { pathname, search } = useLocation();
  const section: FlowSection = pathname === '/apps' ? 'apps'
    : pathname === '/reports' ? 'reports' : pathname === '/help' ? 'help' : 'store';
  useEffect(() => { document.getElementById('flow-content')?.scrollTo(0, 0); }, [pathname, search]);
  return <FlowShell live greeting variant={section === 'store' ? 'catalog' : 'workspace'} section={section}>
    <Suspense fallback={<Loading label="正在加载内容…" />}>
      <div key={pathname + search} className="workspace-view"><Outlet /></div>
    </Suspense>
  </FlowShell>;
}
