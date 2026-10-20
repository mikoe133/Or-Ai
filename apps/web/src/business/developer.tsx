import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FlowShell } from '../store/flow-shell';
import { Icon } from '../store/icons';

export default function DeveloperPage() {
  useEffect(() => { document.title = '开发者中心 · MeetMyWorld'; }, []);
  return <FlowShell live section="developer">
    <section className="flow-card flow-developer-placeholder" aria-labelledby="developer-title">
      <Icon name="code" size={40} />
      <span className="flow-tag">即将开放</span>
      <h1 id="developer-title" className="flow-section-title">开发者中心</h1>
      <p className="flow-muted">开发者功能正在建设中，敬请期待。</p>
      <Link to="/" className="store-button store-button-primary">返回应用商城</Link>
    </section>
  </FlowShell>;
}
