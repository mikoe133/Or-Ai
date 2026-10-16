import { useState } from 'react';
import { Link, useNavigate } from './preview-router';
import { FlowShell } from './flow-shell';
import { Icon } from './icons';
import { products, readFavorites, saveFavorites } from './catalog';
import { DesignFragment, ProductCard, useFlowPage } from './primitives';
import { DimensionIcon, dimensions, InfoSymbol, RadarChart, WideHero } from './flow-visuals';
import './product-detail.css';

const source = '/assets/flow/product-detail-wide-hero-content.svg';
const purchaseSteps = [
  { name: '平台购买', lines: ['在购买平台', '获得兑换权益'] },
  { name: '获取兑换码', lines: ['完成购买后', '获取兑换码'] },
  { name: '输入兑换码', lines: ['在本页面输入', '兑换码领取测评'] },
  { name: '完成测评', lines: ['兑换成功后', '即可开始测评'] },
];

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const heading = useFlowPage('伴侣协作体检');
  const [favorites, setFavorites] = useState(readFavorites);
  const [notice, setNotice] = useState('');
  function favorite() {
    const exists = favorites.includes('partner');
    const next = exists ? favorites.filter(id => id !== 'partner') : [...favorites, 'partner'];
    setFavorites(next);
    setNotice(`${exists ? '已取消收藏' : '已收藏'}伴侣协作体检${saveFavorites(next) ? '' : '；浏览器无法保存，收藏仅在本页有效'}`);
  }
  return <FlowShell long>
    <div className="product-navigation"><nav aria-label="商品位置">应用商城 / 关系情感 / 伴侣协作体检</nav><div><Link className="flow-text-link" to="/"><Icon name="chevron" />返回商城</Link><button className="flow-text-link product-favorite" type="button" aria-pressed={favorites.includes('partner')} onClick={favorite}><Icon name="bookmark" /><span>{favorites.includes('partner') ? '已收藏' : '收藏测评'}</span></button></div></div>
    <WideHero>
      <span className="flow-tag product-category">关系情感</span>
      <h1 ref={heading} tabIndex={-1} className="flow-heading">伴侣协作体检</h1>
      <h2>你找的是队友，还是第二份工作？</h2>
      <p>从日常分工、承诺与沟通中，<br />看见你们的协作方式。</p>
      <span className="product-availability"><InfoSymbol size={15} />演示商品 · 暂不开放购买</span>
    </WideHero>
    <section className="flow-card product-purchase" aria-label="商品信息与兑换">
      <ul className="product-meta"><li><Icon name="file" size={23} />16 道题</li><li><Icon name="clock" size={23} />约 3 分钟</li><li><DesignFragment source={source} id="Metadata · 5 个维度" viewBox="319 47 23 23" size={23} />5 个维度</li></ul>
      <div className="product-price"><span>参考价</span><strong>¥ 9.9</strong></div>
      <div className="product-purchase-actions"><div><Link className="store-button store-button-primary" to="/redeem">输入兑换码</Link><a className="store-button store-button-secondary" href="#purchase-instructions">查看购买说明</a></div><p>无需登录，也能兑换与查看报告</p></div>
    </section>
    <section className="product-about" aria-labelledby="product-about-title"><h2 id="product-about-title" className="flow-section-title">测评介绍</h2><p className="flow-subtitle">围绕共同生活中的具体场景，整理你眼中的关系协作倾向。</p><h3>你将了解什么</h3><div className="product-dimensions">{dimensions.map((dimension, index) => <article className="flow-card" key={dimension.name}><DimensionIcon index={index} /><h4>{dimension.name}</h4><p>{dimension.description[0]}<br />{dimension.description[1]}</p></article>)}</div></section>
    <section className="product-sample" aria-labelledby="product-sample-title"><div className="product-section-heading"><h2 id="product-sample-title" className="flow-section-title">报告样例</h2><span className="flow-tag">示意</span><p>样例数据，不代表真实测评结果</p></div><div className="flow-card product-sample-card"><div className="product-sample-copy"><h3>协作型队友</h3><p>你们在大多数生活场景中能够相互配合，愿意沟通、一起承担责任。适当关注边界与独处需求，会让关系更加轻松和长久。</p><blockquote><span aria-hidden="true">“</span><p>好的关系，是两个人都能更自在。<br />让付出被看见，让分工被说清。</p></blockquote></div><RadarChart scores={[84, 76, 82, 72, 80]} /></div></section>
    <section className="product-instructions" id="purchase-instructions" aria-labelledby="purchase-instructions-title"><h2 id="purchase-instructions-title" className="flow-section-title">购买与兑换说明</h2><ol>{purchaseSteps.map((step, index) => <li className="flow-card" key={step.name}><span className="product-step-number">{index + 1}</span><DesignFragment source={source} id={`Step ${index + 1} · ${step.name}`} viewBox={`${index * ((1011 - 60) / 4 + 20) + 48} 70 27 27`} size={27} /><div><h3>{step.name}</h3><p>{step.lines[0]}<br />{step.lines[1]}</p></div>{index < 3 && <span className="product-step-arrow"><Icon name="arrow" size={18} /></span>}</li>)}</ol><div className="flow-note product-instructions-note"><InfoSymbol /><div><p>在购买平台获得兑换码后，回到这里领取测评。</p><small>当前为演示商品，正式价格与购买入口以后续上线为准。</small></div><span>使用期限以兑换权益为准</span></div></section>
    <section className="product-related" aria-labelledby="product-related-title"><div className="product-section-heading"><h2 id="product-related-title" className="flow-section-title">你可能也感兴趣</h2><Link className="flow-text-link" to="/">查看全部<Icon name="arrow" size={18} /></Link></div><div className="product-related-grid">{products.filter(product => ['work', 'expectation', 'social'].includes(product.id)).map(product => <ProductCard key={product.id} product={product} horizontal onOpen={product => navigate(`/?product=${product.id}`)} />)}</div></section>
    <div className="flow-note"><InfoSymbol /><p>趣味自测，仅供娱乐与自我观察。</p><Link to="/help">使用帮助</Link></div>
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
  </FlowShell>;
}
