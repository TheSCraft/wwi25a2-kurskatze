import { vi } from "vitest";
import { GET, POST } from "../app/api/cat/route";

export const T0 = 1_800_000_000_000;

export function setTime(ms: number) {
  vi.setSystemTime(ms);
}

export function get(session?: string) {
  return GET(
    new Request("http://test/api/cat", {
      headers: session ? { "x-byte-session": session } : {},
    }),
  );
}

export function post(body: object, session?: string, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://test/api/cat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(session ? { "x-byte-session": session } : {}),
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

export async function register(name: string, password = "geheim1234") {
  const res = await post({ action: "register", name, password });
  const body = (await res.json()) as any;
  return { res, body, session: body.session as string };
}

export function act(session: string, action: string) {
  return post({ action }, session);
}
