import type { QueryClient } from "@tanstack/react-query";
let epoch = 0;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;
export const privacyEpoch = () => epoch;
export const subscribePrivacy = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export async function clearPrivateQueries(client: QueryClient) {
  const predicate = (query: { queryKey: readonly unknown[] }) =>
    ["private", "account-context"].includes(String(query.queryKey[0]));
  await client.cancelQueries({ predicate });
  client.removeQueries({ predicate });
}
export async function identityChanged(client: QueryClient, broadcast = true) {
  await clearPrivateQueries(client);
  epoch++;
  for (const listener of listeners) listener();
  if (broadcast) channel?.postMessage("identity-changed");
}
export function connectPrivacy(client: QueryClient) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined")
    return () => {};
  channel = new BroadcastChannel("meetmyworld:identity:v1");
  channel.onmessage = (event) => {
    if (event.data === "identity-changed") void identityChanged(client, false);
  };
  return () => {
    channel?.close();
    channel = undefined;
  };
}
