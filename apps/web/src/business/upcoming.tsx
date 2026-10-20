import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FlowShell } from '../store/flow-shell';
import { Icon, type IconName } from '../store/icons';

const sections = {
  together: {
    title: '共同探索／双人报告',
    description: '和重要的人一起探索，发现彼此的生活倾向。',
    icon: 'users',
  },
  collaboration: {
    title: '品牌、IP 联名或定制',
    description: '一起创造有趣的品牌合作、IP 联名与定制体验。',
    icon: 'partnership',
  },
} satisfies Record<string, { title: string; description: string; icon: IconName }>;

export default function UpcomingPage({ section }: { section: keyof typeof sections }) {
  const { title, description, icon } = sections[section];
  useEffect(() => { document.title = `${title} · MeetMyWorld`; }, [title]);
  return <FlowShell live section={section}>
    <section className="flow-card flow-upcoming-placeholder" aria-labelledby="upcoming-title">
      <Icon name={icon} size={40} />
      <span className="flow-tag">即将开放</span>
      <h1 id="upcoming-title" className="flow-section-title">{title}</h1>
      <p className="flow-muted">{description}</p>
      <p className="flow-muted">该板块正在建设中，敬请期待。</p>
      <Link to="/" className="store-button store-button-primary">返回应用商城</Link>
    </section>
  </FlowShell>;
}
