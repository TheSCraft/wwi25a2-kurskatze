import { expect, test } from "vitest";
import { T0, get, post, register, setTime } from "./helpers";

function expectPrivate(res: Response) {
  expect(res.headers.get("cache-control")).toBe("private, no-store");
  expect(res.headers.get("vary")).toBe("X-Byte-Session");
}

test("GET-Antworten sind privat und nach Session getrennt", async () => {
  setTime(T0);
  const res = await get();
  expect(res.status).toBe(200);
  expectPrivate(res);
});

test("POST-Antworten tragen dieselben Header, auch bei Fehlern", async () => {
  setTime(T0);
  const { res: ok } = await register("Lisa");
  expect(ok.status).toBe(200);
  expectPrivate(ok);

  const unauthorized = await post({ action: "food" });
  expect(unauthorized.status).toBe(401);
  expectPrivate(unauthorized);

  const invalid = await post({ action: 42 });
  expect(invalid.status).toBe(400);
  expectPrivate(invalid);

  const forbidden = await post({ action: "food" }, undefined, { "content-type": "text/plain" });
  expect(forbidden.status).toBe(403);
  expectPrivate(forbidden);
});
