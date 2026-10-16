import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from './preview-router';
import { FlowShell } from './flow-shell';
import { Icon } from './icons';
import { RedemptionArt, RedemptionIcon, RedemptionTipIcon } from './redemption-art';
import './redemption.css';

const exampleCode = 'DEMO-XXXX-XXXX';
const cover = '/assets/store/featured-lavender.png';

function Progress({ success, started = false }: { success: boolean; started?: boolean }) {
  const current = started ? 2 : success ? 1 : 0;
  return <ol className="redemption-progress" aria-label="测评领取进度">{['输入兑换码', '兑换成功', '开始测评'].map((label, index) =>
    <li key={label} className={`${index === current ? 'is-current' : ''}${index < current ? ' is-complete' : ''}`} aria-current={index === current ? 'step' : undefined}>
      <span className="redemption-step-number">{index < current ? <><RedemptionIcon kind="step-check" size={26} /><span className="sr-only">已完成</span></> : index + 1}</span><span>{label}</span>
    </li>)}</ol>;
}

function ProductMeta() {
  return <ul className="redemption-product-meta" aria-label="测评信息"><li><Icon name="file" size={19} />16 道题</li><li><Icon name="clock" size={19} />约 3 分钟</li><li><RedemptionIcon kind="chart" size={19} />5 个维度</li></ul>;
}

function ProductSummary({ unlocked = false }: { unlocked?: boolean }) {
  return <div className={`redemption-product${unlocked ? ' redemption-product-unlocked' : ''}`}>
    <img className="redemption-product-cover" src={cover} alt="伴侣协作体检，淡紫色玻璃插图" width="1161" height="1355" />
    <div className="redemption-product-copy"><div className="redemption-product-heading"><h2>伴侣协作体检</h2>{unlocked && <span className="redemption-unlocked"><RedemptionIcon kind="check" size={18} />已解锁</span>}</div><ProductMeta /></div>
  </div>;
}

function Tips({ success, showHelp }: { success: boolean; showHelp: (topic: 'code' | 'contact') => void }) {
  const rows = success ? ['按第一反应作答', '约 3 分钟完成', '完成后查看报告']
    : ['在购买平台完成购买', '在订单中查看兑换码', '复制后粘贴到这里'];
  return <aside className={`redemption-tips${success ? ' redemption-tips-success' : ''}`} aria-labelledby="redemption-tips-title">
    <h2 id="redemption-tips-title">{success ? '开始前的小提示' : '如何获取兑换码'}</h2>
    {!success && <RedemptionArt kind="ticket" />}
    <ol className="redemption-tip-list">{rows.map((label, index) => <li key={label}><span className="redemption-tip-icon"><RedemptionTipIcon success={success} index={index} /></span><span>{label}</span></li>)}</ol>
    {success ? <RedemptionArt kind="orb" /> : <div className="redemption-help"><button type="button" onClick={() => showHelp('code')}><Icon name="help" size={21} />兑换码在哪里？</button><button type="button" onClick={() => showHelp('contact')}><Icon name="headphones" size={21} />联系客服</button></div>}
  </aside>;
}

export default function RedemptionPage({ success = false }: { success?: boolean }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [help, setHelp] = useState<'code' | 'contact' | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${success ? '兑换成功' : '兑换测评'} · MeetMyWorld`;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => { document.title = 'MeetMyWorld · 发现有趣的自己'; };
  }, [success]);

  async function pasteCode() {
    try {
      const value = await navigator.clipboard.readText();
      setCode(value.trim().slice(0, 96));
      setError('');
      setNotice(value.trim().length > 96 ? '内容较长，请检查是否复制了完整、正确的兑换码。' : '兑换码已粘贴，请确认后兑换。');
    } catch {
      setNotice('请在输入框中按 Ctrl / ⌘ + V 粘贴兑换码。');
    }
    input.current?.focus();
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    if (!code.trim()) { setError('请先输入兑换码。'); input.current?.focus(); return; }
    if (code.trim().toUpperCase() !== exampleCode) {
      setError(`当前为设计预览，请输入示例码 ${exampleCode} 体验流程。真实兑换码请妥善保留。`);
      input.current?.focus();
      return;
    }
    setCode('');
    navigate('/redeem/success');
  }

  return <FlowShell>
    <Link className="redemption-back" to="/products/partner"><Icon name="chevron" size={22} /><span>返回商品详情</span></Link>
    <div className="redemption-heading"><h1 ref={heading} tabIndex={-1}>{success ? '兑换成功' : '兑换测评'}</h1><p>{success ? '测评已解锁' : '输入兑换码，领取你的测评'}</p></div>
    <Progress success={success} />
    <div className={`redemption-columns${success ? ' redemption-columns-success' : ''}`}>
      {success ? <section className="redemption-card redemption-success-card" aria-label="兑换成功信息">
        <div className="redemption-success-message"><RedemptionArt kind="medal" /><div><h2>兑换成功</h2><p>可以开始探索了</p></div></div>
        <ProductSummary unlocked />
        <div className="redemption-success-actions"><Link className="store-button store-button-primary redemption-action" to="/assessment/partner">开始测评</Link><Link className="store-button store-button-secondary redemption-action" to="/">返回商城</Link></div>
      </section> : <section className="redemption-card redemption-form-card" aria-label="兑换测评">
        <ProductSummary />
        <form className="redemption-form" onSubmit={submit} noValidate>
          <label htmlFor="redemption-code">兑换码</label>
          <div className={`redemption-input-wrap${error ? ' has-error' : ''}`}><input ref={input} id="redemption-code" name="redemption-code" value={code} placeholder={exampleCode} maxLength={96} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={error ? 'redemption-error redemption-hint' : 'redemption-hint'} onChange={event => { setCode(event.target.value); setError(''); setNotice(''); }} /><button type="button" className="redemption-paste" onClick={() => void pasteCode()}><RedemptionIcon kind="clipboard" size={23} /><span>粘贴</span></button></div>
          <p id="redemption-hint" className="redemption-input-hint">在购买平台获取兑换码后，回到这里兑换</p>
          <div className="redemption-input-feedback" aria-live="polite">{error && <p id="redemption-error" role="alert">{error}</p>}{notice && <p>{notice}</p>}</div>
          <button type="submit" className="store-button store-button-primary redemption-action">确认兑换</button>
          <p className="redemption-guest"><RedemptionIcon kind="info" /><span>无需登录，也能兑换与查看报告</span></p>
        </form>
      </section>}
      <Tips success={success} showHelp={setHelp} />
    </div>
    {success && <div className="redemption-sync"><RedemptionIcon kind="info" /><span>登录后可同步到我的空间</span><Link to="/auth/login">登录 / 注册</Link></div>}
    <Dialog.Root open={help !== null} onOpenChange={open => { if (!open) setHelp(null); }}><Dialog.Portal><Dialog.Overlay className="store-dialog-overlay" /><Dialog.Content className="store-dialog"><Dialog.Close className="store-dialog-close" aria-label="关闭帮助">×</Dialog.Close><div className="store-dialog-body"><span className="store-preview-label">meetmyworld</span><Dialog.Title>{help === 'code' ? '兑换码在哪里？' : '联系客服'}</Dialog.Title><Dialog.Description>{help === 'code' ? '在购买平台的订单详情或交付消息中查看完整兑换码。当前页面为设计预览，可以输入 DEMO-XXXX-XXXX 体验兑换流程；请保留真实兑换码。' : '如需订单或兑换码帮助，请在原购买平台的订单详情中联系商家。'}</Dialog.Description><Dialog.Close className="store-button store-button-primary">知道了</Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </FlowShell>;
}
