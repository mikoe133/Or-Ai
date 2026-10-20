import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ClientError } from "../api/client.js";
import { MutationIntent } from "../api/intent.js";
import { AuthFlowError } from "../auth/core.js";
import { FlowShell, type FlowSection } from "../store/flow-shell";
import "./business.css";

export function Page({
  title,
  children,
  section = "store",
  embedded = false,
}: {
  title: string;
  children: ReactNode;
  section?: FlowSection;
  embedded?: boolean;
}) {
  const content = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = title + " · MeetMyWorld";
    if (section === "admin") content.current?.scrollTo(0, 0);
    else if (embedded) content.current?.closest("main")?.scrollTo(0, 0);
    else window.scrollTo(0, 0);
  }, [title, pathname, section, embedded]);
  const view = (
    <section
      ref={content}
      className={`biz-view${embedded ? " biz-workspace-view" : ""}`}
      aria-label={section === "admin" ? title : undefined}
      tabIndex={section === "admin" ? 0 : undefined}
    >
      <h1 tabIndex={-1}>{title}</h1>
      {children}
    </section>
  );
  return embedded ? view : (
    <FlowShell long={section !== "admin"} live section={section}>
      {view}
    </FlowShell>
  );
}
export const Loading = ({ label = "正在读取…" }: { label?: string }) => (
  <p className="ux-loading" role="status"><span className="ux-loading-indicator" aria-hidden="true" />{label}</p>
);
export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const deadline =
      Date.now() +
      (error instanceof ClientError ? error.retryAfterSeconds * 1000 : 0);
    setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const timer = setInterval(
      () =>
        setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [error]);
  const message =
    error instanceof ClientError || error instanceof AuthFlowError
      ? error.message
      : "操作未完成，请检查输入或重新读取。";
  return (
    <div className="biz-error">
      <p role="alert">
        {message}
        {remaining > 0 ? `（${remaining} 秒后再试）` : ""}
      </p>
      {retry && (
        <button type="button" disabled={remaining > 0} onClick={retry}>
          重新读取
        </button>
      )}
      <div className="biz-row">
        <Link to="/redeem">使用兑换码恢复</Link>
        <Link to="/apps">返回我的应用</Link>
      </div>
    </div>
  );
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [cooldown, setCooldown] = useState(0);
  const locked = useRef(false),
    intents = useRef(new Map<string, MutationIntent>());
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  function intent<T extends object>(key: string, fields: T) {
    let value = intents.current.get(key);
    if (!value) {
      value = new MutationIntent();
      intents.current.set(key, value);
    }
    return value.for(fields);
  }
  async function run<T>(
    work: () => Promise<T>,
    success?: (value: T) => void | Promise<void>,
  ) {
    if (locked.current || cooldown > 0) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const value = await work();
      await success?.(value);
      return value;
    } catch (value) {
      setError(value);
      if (value instanceof ClientError) setCooldown(value.retryAfterSeconds);
      return undefined;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    busy: busy || cooldown > 0,
    error,
    run,
    intent,
    resetError: () => setError(null),
  };
}
export const Demo = ({ show = true }: { show?: boolean }) =>
  show ? (
    <p className="biz-demo">演示商品与测试数据 · 不代表正式测评或真实销售</p>
  ) : null;
export function Pager({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav className="biz-row" aria-label="分页">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>
        上一页
      </button>
      <span>
        第 {page} 页 · 共 {total} 条
      </span>
      <button
        disabled={page * pageSize >= total}
        onClick={() => onChange(page + 1)}
      >
        下一页
      </button>
    </nav>
  );
}
