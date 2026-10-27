import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const navigation = [
  {
    to: "/admin",
    title: "概览与审计",
    icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  },
  {
    to: "/admin/products",
    title: "商品与版本",
    icon: "M4 7h16v14H4z M8 7V3h8v4 M4 12h16",
  },
  {
    to: "/admin/content",
    title: "内容工作台",
    icon: "M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5",
  },
  {
    to: "/admin/assets",
    title: "素材与文件",
    icon: "M3 5h18v15H3z M3 16l5-6 5 5 3-3 5 5 M16 8h.01",
  },
  {
    to: "/admin/skills",
    title: "skill 库",
    icon: "M5 3h14v18H5z M9 7h6 M9 11h6 M9 15h3",
  },
  {
    to: "/admin/machine",
    title: "Codex 连接",
    icon: "M8 3v5 M16 3v5 M5 8h14v4a7 7 0 0 1-14 0z M12 19v3",
  },
  {
    to: "/admin/orders",
    title: "订单与售后",
    icon: "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h3",
  },
];

export function AdminShell({
  children,
  authorized,
  accountPresent,
}: {
  children: ReactNode;
  authorized: boolean;
  accountPresent: boolean;
}) {
  const location = useLocation(),
    main = useRef<HTMLElement>(null),
    sidebar = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const current =
    navigation.find(
      (item) =>
        item.to !== "/admin" &&
        (location.pathname === item.to ||
          location.pathname.startsWith(item.to + "/")),
    ) ?? navigation[0]!;
  useEffect(() => {
    document.title = current.title + " · MeetMyWorld 运营后台";
    main.current?.scrollTo(0, 0);
    setMenuOpen(false);
  }, [location.pathname, current.title]);
  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 820px)");
    const closeOnDesktop = () => {
      if (!viewport.matches) setMenuOpen(false);
    };
    viewport.addEventListener("change", closeOnDesktop);
    return () => viewport.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const node = sidebar.current;
    const focusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ) ?? [],
      ).filter((element) => element.getClientRects().length);
    focusable()[0]?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        trigger.current?.focus();
      }
      if (event.key !== "Tab") return;
      const items = focusable(),
        first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [menuOpen]);
  return (
    <div
      className={
        "admin-shell flow-admin-page" + (menuOpen ? " admin-menu-open" : "")
      }
    >
      <a className="admin-skip" href="#admin-workspace">
        跳到后台内容
      </a>
      {menuOpen && (
        <button
          className="admin-nav-scrim"
          type="button"
          aria-label="关闭后台导航"
          tabIndex={-1}
          onClick={() => {
            setMenuOpen(false);
            trigger.current?.focus();
          }}
        />
      )}
      <aside
        className="admin-sidebar"
        id="admin-sidebar"
        ref={sidebar}
        aria-label="运营工作空间"
      >
        <div className="admin-brand-row">
          <Link
            className="admin-brand"
            to="/admin"
            aria-label="MeetMyWorld 运营后台"
          >
            <img
              src="/assets/store/homepage-meetmyworld-symbol.svg"
              width="28"
              height="28"
              alt=""
            />
            <span>
              meetmyworld<small>运营后台</small>
            </span>
          </Link>
          <button
            className="admin-nav-close"
            type="button"
            aria-label="收起后台导航"
            onClick={() => {
              setMenuOpen(false);
              trigger.current?.focus();
            }}
          >
            ×
          </button>
        </div>
        <div className="admin-nav-label">
          工作空间<span>01</span>
        </div>
        <nav className="admin-navigation" aria-label="后台导航">
          {navigation.map((item) => {
            const content = (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={item.icon} />
                </svg>
                <span>{item.title}</span>
              </>
            );
            return authorized ? (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
                className="admin-nav-item"
                onClick={() => setMenuOpen(false)}
              >
                {content}
              </NavLink>
            ) : (
              <span
                key={item.to}
                className="admin-nav-item admin-nav-locked"
                aria-disabled="true"
              >
                {content}
              </span>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <Link className="admin-account" to="/account">
            <span className="admin-avatar">M</span>
            <span>
              {authorized
                ? "管理员"
                : accountPresent
                  ? "账户未授权"
                  : "尚未登录"}
              <small>{authorized ? "邮箱已验证" : "后台访问需验证身份"}</small>
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
          <Link className="admin-return" to="/">
            ← 返回商城
          </Link>
          <div className="admin-edition">MEETMYWORLD / OPERATIONS</div>
        </div>
      </aside>
      <header className="admin-topbar">
        <div className="admin-breadcrumb">
          <button
            ref={trigger}
            className="admin-menu-toggle"
            type="button"
            aria-label="展开后台导航"
            aria-expanded={menuOpen}
            aria-controls="admin-sidebar"
            onClick={() => setMenuOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/admin">运营后台</Link>
          <span>/</span>
          <strong>{authorized ? current.title : "访问验证"}</strong>
        </div>
        <div className="admin-topbar-account">
          <span className="admin-status-dot" />
          {authorized
            ? "已验证的管理员"
            : accountPresent
              ? "等待授权"
              : "未登录"}
          <Link to="/account" className="admin-avatar" aria-label="账户设置">
            M
          </Link>
        </div>
      </header>
      <section
        ref={main}
        id="admin-workspace"
        className="admin-main biz-view"
        aria-label="运营后台"
        tabIndex={0}
      >
        <h1 className="admin-sr-only">运营后台</h1>
        <div className="admin-page-body">{children}</div>
        <footer className="admin-workspace-footer">
          <span>meetmyworld</span>
          <span>内容与工作，都有迹可循。</span>
        </footer>
      </section>
    </div>
  );
}
