import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AuthFlowError } from './core.js';
import { accountApi, browserAuth, callbackCapture } from './browser.js';
import { clearPrivateQueries, identityChanged } from '../api/privacy.js';
import { AccountLibrary } from '../business/library.js';

const control = 'w-full rounded border bg-white px-3 py-2';
const button = 'rounded border bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50';
const safeMessage = (error: unknown) => error instanceof AuthFlowError ? error.message : '操作失败，请稍后重试。';
function Unavailable() {
  return <p role="status">{browserAuth.configurationError?.message ?? '账户服务尚未配置。配置完成后可使用邮箱账户，兑换码功能可独立使用。'}</p>;
}
function AuthLinks() {
  return <nav className="flex flex-wrap gap-4" aria-label="账户导航">
    <Link to="/auth/login">邮箱登录</Link><Link to="/auth/register">注册</Link><Link to="/auth/forgot">找回密码</Link><Link to="/account">账户状态</Link>
  </nav>;
}
function useIdentityChange() {
  const client = useQueryClient();
  return async (commit=true) => { if(commit)await identityChanged(client);else await clearPrivateQueries(client); };
}

export function AuthForm({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  const navigate = useNavigate(), changed = useIdentityChange(), auth = browserAuth.auth;
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false), [cooldown, setCooldown] = useState(auth?.mailCooldownSeconds ?? 0);
  const title = { login: '邮箱登录', register: '注册邮箱账户', forgot: '找回密码' }[mode];
  useEffect(() => { const timer = window.setInterval(() => setCooldown(auth?.mailCooldownSeconds ?? 0), 1000); return () => window.clearInterval(timer); }, [auth]);
  async function run(resend = false) {
    if (!auth || busy) return;
    setBusy(true); setMessage(''); setFailed(false);
    try {
      if (resend) { await auth.resendVerification(email); setMessage('如果邮箱需要验证，验证邮件将发送到该地址。请检查收件箱与垃圾邮件。'); }
      else if (mode === 'login') { await changed(false); await auth.login(email, password); await changed(); navigate('/account', { replace: true }); }
      else if (mode === 'register') {
        if (password !== confirmation) throw new AuthFlowError('INVALID_INPUT', '两次密码不一致。');
        await auth.register(email, password); setMessage('如果该邮箱可以注册，验证邮件将发送到该地址。请在当前浏览器打开邮件链接。');
      } else { await auth.forgotPassword(email); setMessage('如果该邮箱可以找回密码，重置邮件将发送到该地址。请在当前浏览器打开邮件链接。'); }
    } catch (error) { setFailed(true); setMessage(safeMessage(error)); }
    finally { setBusy(false); setPassword(''); setConfirmation(''); setCooldown(auth.mailCooldownSeconds); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void run(); }
  return <section className="max-w-lg space-y-5">
    <h1 className="text-2xl font-semibold">{title}</h1>
    <p>邮箱账户用于保存已绑定商品，方便换设备访问。登录后，本机未绑定商品仍需主动确认绑定。</p>
    {!auth ? <Unavailable /> : <>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block space-y-1"><span>邮箱</span><input className={control} type="email" name="email" autoComplete="email" required maxLength={254} value={email} disabled={busy} onChange={event => setEmail(event.target.value)} /></label>
        {mode !== 'forgot' && <label className="block space-y-1"><span>密码</span><input className={control} type="password" name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} /></label>}
        {mode === 'register' && <label className="block space-y-1"><span>再次输入密码</span><input className={control} type="password" name="confirmation" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} /></label>}
        <button className={button} disabled={busy || mode !== 'login' && cooldown > 0}>{busy ? '处理中…' : mode !== 'login' && cooldown > 0 ? `${cooldown} 秒后可再发送` : title}</button>
      </form>
      {mode === 'login' && <button className={button} type="button" disabled={busy || !email || cooldown > 0} onClick={() => void run(true)}>{cooldown > 0 ? `${cooldown} 秒后可再发送` : '重发邮箱验证邮件'}</button>}
      {message && <p role={failed ? 'alert' : 'status'} className={failed ? 'text-red-700' : ''}>{message}</p>}
    </>}
    <AuthLinks />
  </section>;
}

export function AuthCallbackPage({ recovery = false }: { recovery?: boolean }) {
  const navigate = useNavigate(), changed = useIdentityChange(), auth = browserAuth.auth;
  const [ready, setReady] = useState(false), [message, setMessage] = useState('正在验证邮件链接…');
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    let mounted = true;
    async function verify() {
      if (!auth) return;
      try {
        if (callbackCapture.error) throw callbackCapture.error;
        if (!callbackCapture.callback) throw new AuthFlowError('CALLBACK_INVALID', '验证链接已失效，请重新申请。');
        const result = await auth.callback(callbackCapture.callback);
        if (!mounted) { if (window.location.pathname !== '/auth/reset') auth.discardRecovery(); return; }
        if (result.kind === 'verified') { await changed(); navigate('/account', { replace: true }); }
        else { setReady(true); setMessage('链接已验证，请在十分钟内设置新密码。离开或刷新此页后需重新申请。'); }
      } catch (error) { if (mounted) setMessage(safeMessage(error)); }
    }
    void verify(); return () => {
      mounted = false;
      window.setTimeout(() => { if (window.location.pathname !== '/auth/reset') auth?.discardRecovery(); }, 0);
    };
  }, [auth]);
  useEffect(() => {
    if (!recovery || !ready) return;
    const timer = window.setInterval(() => { if (!auth?.hasRecovery) { setReady(false); setPassword(''); setConfirmation(''); setMessage('重置授权已过期，请重新申请。'); } }, 1000);
    return () => window.clearInterval(timer);
  }, [auth, ready, recovery]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!auth || busy) return;
    setBusy(true);
    try {
      if (password !== confirmation) throw new AuthFlowError('INVALID_INPUT', '两次密码不一致。');
      await changed(false); await auth.resetPassword(password); await changed(); navigate('/account', { replace: true });
    } catch (error) { setMessage(safeMessage(error)); setReady(auth.hasRecovery); }
    finally { setBusy(false); setPassword(''); setConfirmation(''); }
  }
  return <section className="max-w-lg space-y-5">
    <h1 className="text-2xl font-semibold">{recovery ? '重置密码' : '验证邮箱'}</h1>
    {!auth ? <Unavailable /> : <p role="status">{message}</p>}
    {recovery && ready && <form className="space-y-4" onSubmit={event => void submit(event)}>
      <label className="block space-y-1"><span>新密码</span><input className={control} type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label className="block space-y-1"><span>再次输入新密码</span><input className={control} type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
      <button className={button} disabled={busy}>{busy ? '更新中…' : '更新密码'}</button>
    </form>}
    <AuthLinks />
  </section>;
}

export function AccountPage() {
  const changed = useIdentityChange(), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const context = useQuery({ queryKey: ['account-context'], queryFn: () => accountApi.context(), retry: false });
  async function logout() {
    if (busy) return; setBusy(true); setMessage('');
    try {
      await changed(false); browserAuth.auth?.discardRecovery(); const result = await accountApi.logout(); await changed();
      setMessage(result.providerRevoked === false ? '本站已退出。认证服务未确认退出，其他设备的登录状态不受此操作保证。' : '已退出本站账户。');
    } catch (error) { setMessage(safeMessage(error)); }
    finally { setBusy(false); void context.refetch(); }
  }
  return <section className="max-w-lg space-y-5">
    <h1 className="text-2xl font-semibold">账户状态</h1>
    {context.isPending ? <p role="status">正在读取账户…</p> : context.isError ? <><p role="alert">{safeMessage(context.error)}</p><button className={button} onClick={() => void context.refetch()}>重试</button></>
      : context.data.account ? <><p>{context.data.account.emailVerified ? '已登录，邮箱已验证。商品绑定需要逐项主动确认。' : '已登录，邮箱尚未验证。请通过邮件验证后绑定商品。'}</p><button className={button} disabled={busy} onClick={() => void logout()}>{busy ? '退出中…' : '退出账户'}</button></>
      : <p role="status">{context.data.configured ? '当前未登录。' : '账户服务尚未配置。'}</p>}
    {message && <p role="status">{message}</p>}
    <AuthLinks />
    <AccountLibrary />
  </section>;
}
