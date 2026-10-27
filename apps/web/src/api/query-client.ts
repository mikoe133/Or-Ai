import { QueryClient } from "@tanstack/react-query";

export function createAppQueryClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  client.setQueryDefaults(["private"], { gcTime: 0, staleTime: 0 });
  client.setQueryDefaults(["private", "feedback"], { gcTime: 60000, staleTime: Infinity });
  client.setQueryDefaults(["public"], { staleTime: 30000 });
  // Short, memory-only caches avoid empty frames when returning to a read-only list.
  for (const family of ["overview", "audit", "products", "content-products", "assets", "orders", "skills", "categories", "tags"])
    client.setQueryDefaults(["private", "admin", family], { gcTime: 60000, staleTime: 15000 });
  return client;
}
