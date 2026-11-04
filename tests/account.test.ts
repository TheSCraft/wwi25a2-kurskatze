import { expect, test } from "vitest";
import { T0, get, post, json, register, setTime } from "./helpers";

test("Registrieren liefert Session, Konto und 0 Punkte", async () => {
  setTime(T0);
  const { res, body, session } = await register("Lisa");
  expect(res.status).toBe(200);
  expect(session).toMatch(/^[a-f0-9]{32}$/);
  expect(body.account).toBe(true);
  expect(body.me).toEqual({ name: "Lisa", points: 0 });
});

test("zu kurzes Passwort wird abgelehnt", async () => {
  setTime(T0);
  const res = await post({ action: "register", name: "Lisa", password: "kurz" });
  expect(res.status).toBe(400);
});

test("Spitzname ist ohne Groß-/Kleinschreibung eindeutig", async () => {
  setTime(T0);
  await register("Lisa");
  const { res } = await register("lisa");
  expect(res.status).toBe(409);
});

test("Login mit richtigem und falschem Passwort", async () => {
  setTime(T0);
  await register("Lisa", "geheim1234");
  const bad = await post({ action: "login", name: "Lisa", password: "falsch" });
  expect(bad.status).toBe(401);
  const good = await post({ action: "login", name: "lisa", password: "geheim1234" });
  expect(good.status).toBe(200);
  expect((await json(good)).session).toMatch(/^[a-f0-9]{32}$/);
});

test("nach 12 Fehlversuchen kommt 429", async () => {
  setTime(T0);
  await register("Lisa");
  for (let i = 0; i < 12; i++) {
    const res = await post({ action: "login", name: "Lisa", password: "falsch" });
    expect(res.status).toBe(401);
  }
  const blocked = await post({ action: "login", name: "Lisa", password: "falsch" });
  expect(blocked.status).toBe(429);
});

test("Umbenennen ändert den Namen und den Login-Schlüssel", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  const res = await post({ action: "rename", name: "Lisbeth" }, session);
  expect(res.status).toBe(200);
  expect((await json(res)).me.name).toBe("Lisbeth");
  const login = await post({ action: "login", name: "Lisbeth", password: "geheim1234" });
  expect(login.status).toBe(200);
});

test("Umbenennen auf einen vergebenen Namen ergibt 409", async () => {
  setTime(T0);
  await register("Lisa");
  const { session } = await register("Tom");
  const res = await post({ action: "rename", name: "Lisa" }, session);
  expect(res.status).toBe(409);
});

test("Logout macht die Session ungültig", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await post({ action: "logout" }, session);
  const body = (await json(await get(session)));
  expect(body.account).toBe(false);
});

test("Aktionen ohne Anmeldung ergeben 401", async () => {
  setTime(T0);
  const res = await post({ action: "food" });
  expect(res.status).toBe(401);
});

test("falscher Content-Type und Cross-Site-Anfragen werden abgelehnt", async () => {
  setTime(T0);
  const plain = await post({ action: "food" }, undefined, { "content-type": "text/plain" });
  expect(plain.status).toBe(403);
  const cross = await post({ action: "food" }, undefined, { "sec-fetch-site": "cross-site" });
  expect(cross.status).toBe(403);
});

const LOGIN_WINDOW = 5 * 60 * 1000;

async function wrongLogins(count: number) {
  const statuses: number[] = [];
  for (let i = 0; i < count; i++) {
    statuses.push((await post({ action: "login", name: "Lisa", password: "falsch" })).status);
  }
  return statuses;
}

test("nach Ablauf der fünf Minuten ist ein neuer Login-Versuch erlaubt", async () => {
  setTime(T0);
  await register("Lisa");
  expect(await wrongLogins(12)).toEqual(Array(12).fill(401));
  expect(await wrongLogins(1)).toEqual([429]);
  setTime(T0 + LOGIN_WINDOW - 1000);
  expect(await wrongLogins(1)).toEqual([429]);
  setTime(T0 + LOGIN_WINDOW + 1000);
  expect(await wrongLogins(1)).toEqual([401]);
});

test("ein erfolgreicher Login setzt den Fehlversuchszähler zurück", async () => {
  setTime(T0);
  await register("Lisa", "geheim1234");
  expect(await wrongLogins(11)).toEqual(Array(11).fill(401));
  // Der zwölfte Versuch zählt mit, ist aber richtig und löscht den Zähler.
  const good = await post({ action: "login", name: "Lisa", password: "geheim1234" });
  expect(good.status).toBe(200);
  expect(await wrongLogins(12)).toEqual(Array(12).fill(401));
  expect(await wrongLogins(1)).toEqual([429]);
}, 20_000);

test("nach dem Umbenennen gilt der alte Spitzname nicht mehr für den Login", async () => {
  setTime(T0);
  const { session } = await register("Lisa", "geheim1234");
  expect((await post({ action: "rename", name: "Lisbeth" }, session)).status).toBe(200);
  const old = await post({ action: "login", name: "Lisa", password: "geheim1234" });
  expect(old.status).toBe(401);
  const renamed = await post({ action: "login", name: "lisbeth", password: "geheim1234" });
  expect(renamed.status).toBe(200);
});

test("Umbenennen auf einen leeren oder zu langen Namen ergibt 400", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  expect((await post({ action: "rename", name: "   " }, session)).status).toBe(400);
  expect((await post({ action: "rename", name: "" }, session)).status).toBe(400);
  expect((await post({ action: "rename", name: "x".repeat(23) }, session)).status).toBe(400);
  expect((await post({ action: "rename", name: "x".repeat(22) }, session)).status).toBe(200);
});
