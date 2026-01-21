import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handleLocalApi } from "./localApi";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let localRes: Response | null = null;
  try {
    localRes = await handleLocalApi({ method, url, data });
  } catch (error) {
    console.error("Local API failed, falling back to server:", error);
    localRes = null;
  }
  if (localRes) {
    await throwIfResNotOk(localRes);
    return localRes;
  }

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    let localRes: Response | null = null;
    try {
      localRes = await handleLocalApi({ method: "GET", url });
    } catch (error) {
      console.error("Local API failed, falling back to server:", error);
      localRes = null;
    }
    const res =
      localRes ??
      (await fetch(url, {
        credentials: "include",
      }));

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
