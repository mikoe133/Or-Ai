import {
  useCallback,
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

export function PrivacyRoot({ children }: { children: ReactNode }) {
  const epoch = useSyncExternalStore(subscribePrivacy, privacyEpoch),
    client = useQueryClient(),
    location = useLocation();
  const privateRoute =
    /^\/(?:apps|reports|attempts|admin|account|redeem)(?:\/|$)/.test(
      location.pathname,
    );
  const [checking, setChecking] = useState(privateRoute),
    [failed, setFailed] = useState(false),
    previous = useRef<string | undefined>(undefined),
    pending = useRef(false);
  const verify = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setChecking(true);
    setFailed(false);
    try {
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
      if (previous.current !== undefined && previous.current !== fingerprint)
        await identityChanged(client);
      else if (previous.current !== undefined)
        await client.refetchQueries({
          predicate: (query) => query.queryKey[0] === "private",
          type: "active",
        });
      previous.current = fingerprint;
    } catch {
      setFailed(true);
    } finally {
      pending.current = false;
      setChecking(false);
    }
  }, [client]);
  useEffect(() => {
    previous.current = undefined;
  }, [epoch]);
  useEffect(() => {
    const close = connectPrivacy(client);
    const focus = () => {
      void verify();
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") setChecking(true);
      else focus();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("pageshow", focus);
    document.addEventListener("visibilitychange", hidden);
    void verify();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") focus();
    }, 30000);
    return () => {
      close();
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      window.removeEventListener("pageshow", focus);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [client, verify]);
  const masked = privateRoute && (checking || failed);
  return (
    <>
      {masked && (
        <div className="biz-private-check">
          <p role={failed ? "alert" : "status"}>
            {failed
              ? "暂时无法确认访问状态，请检查网络后重试。"
              : "正在确认访问状态…"}
          </p>
          {failed && (
            <button onClick={() => void verify()}>重试访问检查</button>
          )}
          <Link to="/">返回商城</Link>
        </div>
      )}
      <div
        key={privateRoute ? epoch : 'public'}
        style={masked ? { visibility: "hidden" } : undefined}
        aria-hidden={masked || undefined}
      >
        {children}
      </div>
    </>
  );
}
