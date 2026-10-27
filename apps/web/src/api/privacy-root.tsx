import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { accountApi } from "../auth/browser.js";
import { consumer } from "./consumer.js";
import {
  connectPrivacy,
  identityChanged,
  privacyEpoch,
  subscribePrivacy,
} from "./privacy.js";
import "./privacy-root.css";
import { AccessVerification, refreshOnAccessCheck, type AccessCheckState } from "./access-verification.js";

type AccessSnapshot = {
  fingerprint: string;
  account: Awaited<ReturnType<typeof accountApi.context>> | undefined;
};

export function PrivacyRoot({ children }: { children: ReactNode }) {
  const epoch = useSyncExternalStore(subscribePrivacy, privacyEpoch),
    client = useQueryClient(),
    location = useLocation();
  const privateRoute =
    /^\/(?:apps|reports|attempts|admin|account|redeem)(?:\/|$)/.test(
      location.pathname,
    );
  const [state, setState] = useState<AccessCheckState>({ checking: privateRoute, failed: false, verifiedEpoch: -1 });
  const verification = useRef<AccessVerification<AccessSnapshot> | null>(null);
  const previousPrivateRoute = useRef(privateRoute);
  useEffect(() => {
    const guard = new AccessVerification<AccessSnapshot>({
      epoch: privacyEpoch,
      read: async () => {
        const [account, anonymous] = await Promise.allSettled([
          accountApi.context(),
          consumer.session(),
        ]);
        if (anonymous.status === "rejected") throw new Error("Unavailable");
        if (
          account.status === "rejected" &&
          /^\/(?:admin|account)(?:\/|$)/.test(window.location.pathname)
        )
          throw new Error("Unavailable");
        const user =
          account.status === "fulfilled" ? account.value.account : null;
        const fingerprint = JSON.stringify([
          user?.id,
          user?.role,
          user?.emailVerified,
          anonymous.value.authenticated,
          anonymous.value.sessionExpiresAt,
        ]);
        return { fingerprint, account: account.status === "fulfilled" ? account.value : undefined };
      },
      fingerprint: snapshot => snapshot.fingerprint,
      identityChanged: () => identityChanged(client),
      accept: snapshot => {
        if (snapshot.account) client.setQueryData(["account-context"], snapshot.account);
      },
      refresh: () => {
        void client.refetchQueries({ predicate: query => refreshOnAccessCheck(query.queryKey), type: "active" }).catch(() => undefined);
      },
      state: next => setState(previous => previous.checking === next.checking && previous.failed === next.failed &&
        previous.verifiedEpoch === next.verifiedEpoch ? previous : next),
    });
    verification.current = guard;
    const close = connectPrivacy(client);
    const focus = () => {
      if (document.visibilityState === "visible") void guard.verify();
    };
    const pageshow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        guard.suspend();
        void guard.resume();
      } else focus();
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") guard.suspend();
      else void guard.resume();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("pageshow", pageshow);
    document.addEventListener("visibilitychange", hidden);
    if (document.visibilityState === "hidden") guard.suspend();
    else void guard.verify(true);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") focus();
    }, 30000);
    return () => {
      close();
      guard.dispose();
      if (verification.current === guard) verification.current = null;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      window.removeEventListener("pageshow", pageshow);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [client]);
  useEffect(() => {
    const entered = privateRoute && !previousPrivateRoute.current;
    previousPrivateRoute.current = privateRoute;
    if (privateRoute && (entered || !verification.current?.isCurrent())) void verification.current?.verify(true);
  }, [epoch, privateRoute]);
  const { checking, failed } = state;
  const masked = privateRoute && (checking || failed || state.verifiedEpoch !== epoch);
  return (
    <>
      {masked && (
        <div className="biz-private-check access-screen">
          <Link className="access-brand" to="/"><img src="/assets/store/homepage-meetmyworld-symbol.svg" alt="" width="30" height="30"/><span>meetmyworld</span></Link>
          <section className="access-panel" aria-label="访问确认">
          <span className="access-caption">个人空间</span>
          <h1>{failed ? "暂时无法打开个人空间" : "确认你的访问权限"}</h1>
          <p role={failed ? "alert" : "status"}>
            {failed
              ? "暂时无法确认访问状态，请检查网络后重试。"
              : "正在确认访问状态…"}
          </p>
          <div className="access-actions">{failed && (
            <button onClick={() => void verification.current?.verify(true)}>重试访问检查</button>
          )}
          <Link to="/">返回商城</Link>
          </div>
          </section>
        </div>
      )}
      <div
        key={privateRoute ? epoch : 'public'}
        style={masked ? { visibility: "hidden" } : undefined}
        aria-hidden={masked || undefined}
        inert={masked || undefined}
      >
        {children}
      </div>
    </>
  );
}
