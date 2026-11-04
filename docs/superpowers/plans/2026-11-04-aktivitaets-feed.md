# Aktivitäts-Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Im Katzenzimmer zeigt eine Karte „Letzte Ereignisse“ Beitritte, Portionen der Futterrunde, die Wiederbelebung und Bytes Tod.

**Architecture:** Neue Tabelle `events` (eindeutiger `key`, `INSERT OR IGNORE`), Einträge entstehen im selben atomaren D1-Batch wie die eigentliche Änderung (Registrieren, Portion füttern, Wiederbelebung). Der Tod wird beim nächsten `state()`-Abruf nachgetragen. `state()` liefert die letzten 10 Ereignisse als `events`, eine neue React-Karte zeigt sie.

**Tech Stack:** Next 16 / vinext, React 19, Cloudflare D1 + Drizzle (nur Schema/Migration), Vitest mit `@cloudflare/vitest-plugin`.

**Spec:** `docs/superpowers/specs/2026-11-04-aktivitaets-feed-design.md`

## Global Constraints

- Node `>=22.13.0` ist nötig. Auf dem Entwicklerrechner läuft Node 20, deshalb jedes Kommando mit `export PATH=/private/tmp/claude-501/-Users-jonas-Documents-Claude-Kurskatze-wwi25a2-kurskatze/7a4d57cf-a6ec-475f-a9c7-82677e75832e/scratchpad/node22/node_modules/node/bin:$PATH` vorstellen.
- Es werden keine neuen Pakete installiert. `package.json` und `pnpm-lock.yaml` bleiben unverändert.
- Die sechs normalen Aktionen erscheinen **nicht** im Feed. Spielregeln und `lib/cat-rules.ts` bleiben unverändert.
- Ereignistypen genau: `joined`, `revive_portion`, `revived`, `died`. Schlüssel genau: `joined:<player>`, `revive_portion:<runde>:<player>`, `revived:<runde>`, `died:<runde>` (`<runde>` = `cat.food_expires` der betroffenen Runde). Immer `INSERT OR IGNORE`.
- Feed: letzte 10 Ereignisse, neueste zuerst (`ORDER BY e.at DESC, e.id DESC LIMIT 10`), Name per `LEFT JOIN players`, öffentlich (auch abgemeldet).
- Texte genau: „<Name> ist dem Kurs beigetreten“, „<Name> hat eine Portion in den Napf gelegt“, „Byte ist wieder da“, „Byte ist gestorben“, Rückfall „Jemand“, leer: „Noch nichts passiert. Hier erscheinen Beitritte und Wiederbelebungen.“
- CSS in neuer Datei `styles/activity.css`, in `app/globals.css` als **letzte** Zeile importiert.
- Migration nicht von Hand schreiben, sondern `npx drizzle-kit generate` (Journal und Snapshot müssen stimmen).
- Commits nur auf dem Branch `aktivitaets-feed`, nie pushen. Commit-Trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Nicht anfassen: `scripts/`, `vendor/`, `worker/`, `examples/`, `components/ui/`, bestehende Migrationen `drizzle/0000`–`0004`, `components/stickerbox.tsx`, `lib/sticker-*.ts`, `lib/meow-sound.ts`.
- Lint muss bei 0 Fehlern bleiben (die `no-img-element`-Warnungen sind bekannt). `npx tsc --noEmit -p .` muss 0 Zeilen ausgeben.

## File Structure

```
db/schema.ts                         + Tabelle events
drizzle/0005_*.sql (+ meta)          generiert
tests/setup.ts                       events leeren, Migrationscheck auf events
tests/events.test.ts                 Tests für Schreiben und API
tests/format-time.test.ts            relativeTime
lib/cat-types.ts                     + FeedEvent, Data.events
lib/server/state.ts                  died-Eintrag + events-Abfrage
lib/server/actions/account.ts        joined im Registrierungs-Batch
lib/server/actions/revive.ts         revive_portion + revived
lib/format-time.ts                   relativeTime
components/cat/ActivityCard.tsx      Karte
styles/activity.css                  Stil, als letzte importiert
app/globals.css                      + @import
app/page.tsx                         Karte unter ScoreCard einbinden
README.md                            Migration auf bestehende DB einspielen
```

---

### Task 1: Tabelle, Migration, `died`-Eintrag und `events` in der API

**Files:**
- Modify: `db/schema.ts`, `tests/setup.ts`, `lib/cat-types.ts`, `lib/server/state.ts`, `docs/superpowers/specs/2026-11-04-aktivitaets-feed-design.md`
- Create: `drizzle/0005_*.sql` (generiert), `tests/events.test.ts`

**Interfaces:**
- Produces: Tabelle `events(id integer pk autoincrement, key text unique not null, type text not null, player text, at integer not null)`; `lib/cat-types.ts` exportiert `FeedEvent = {id:number; type:"joined"|"revive_portion"|"revived"|"died"; at:number; name:string|null}` und `Data.events: FeedEvent[]`; `state()` liefert `events: FeedEvent[]` (neueste zuerst, max. 10).

- [ ] **Step 1: Failing tests schreiben (`tests/events.test.ts`)**

```ts
import { expect, test } from "vitest";
import { T0, get, json, register, setTime } from "./helpers";

const LIFETIME = 72 * 60 * 60 * 1000;

test("GET liefert events, auch ohne Anmeldung, anfangs leer", async () => {
  setTime(T0);
  const body = await json(await get());
  expect(body.events).toEqual([]);
});

test("solange Byte lebt, gibt es keinen died-Eintrag", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  const body = await json(await get(session));
  expect(body.events.filter((e: { type: string }) => e.type === "died")).toEqual([]);
});

test("Byte ist gestorben: genau ein died-Eintrag mit der Todeszeit, auch bei gleichzeitigen Abrufen", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  const round = (await json(await get(session))).foodExpires as number;
  setTime(T0 + LIFETIME); // länger als die Startfrist, Byte ist tot
  await Promise.all([get(session), get(session), get(session)]);
  const body = await json(await get(session));
  const died = body.events.filter((e: { type: string }) => e.type === "died");
  expect(died).toHaveLength(1);
  expect(died[0].at).toBe(round);
  expect(died[0].name).toBeNull();
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/events.test.ts`
Expected: FAIL (`body.events` ist `undefined`, `toEqual([])` schlägt fehl).

- [ ] **Step 3: Schema ergänzen (`db/schema.ts`)**

Import-Zeile ändern zu `import {index,integer,sqliteTable,text} from "drizzle-orm/sqlite-core";` und am Dateiende anhängen:

```ts

export const events=sqliteTable("events",{id:integer("id").primaryKey({autoIncrement:true}),key:text("key").notNull().unique(),type:text("type").notNull(),player:text("player"),at:integer("at").notNull()},(t)=>[index("events_at_idx").on(t.at,t.id)]);
```

- [ ] **Step 4: Migration generieren**

Run: `npx drizzle-kit generate`
Expected: neue Datei `drizzle/0005_<name>.sql` plus Änderungen an `drizzle/meta/_journal.json` und ein neuer `drizzle/meta/0005_snapshot.json`. Inhalt der SQL-Datei prüfen: `CREATE TABLE \`events\`` mit den fünf Spalten, `CREATE UNIQUE INDEX` auf `key`, `CREATE INDEX events_at_idx`. Fragt `drizzle-kit` interaktiv etwas, abbrechen und melden.

- [ ] **Step 5: `tests/setup.ts` anpassen**

Zwei Änderungen: Der Migrationscheck prüft jetzt auf die neueste Tabelle, und `events` wird geleert.

```ts
// alt:
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cat'")
// neu:
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'")
```

```ts
// alt:
    ["cooldowns", "sessions", "accounts", "players", "cat", "login_attempts"].map((t) =>
// neu:
    ["cooldowns", "sessions", "accounts", "players", "cat", "login_attempts", "events"].map((t) =>
```

- [ ] **Step 6: Typen ergänzen (`lib/cat-types.ts`)**

Nach der Zeile `export type Entry=...` einfügen:

```ts
export type FeedEvent={id:number;type:"joined"|"revive_portion"|"revived"|"died";at:number;name:string|null};
```

und in `Data` am Anfang `events:FeedEvent[];` ergänzen (also `export type Data={events:FeedEvent[];playerCount:number;...`).

- [ ] **Step 7: `state()` erweitern (`lib/server/state.ts`)**

Drei exakte Ersetzungen in der langen Zeile `const [c,r,p,t,rev,team]=await db().batch([...])`:

1. Anfang: `const [c,r,p,t,rev,team]=await db().batch([sql("SELECT food_expires AS food,` wird zu
   `const [,c,r,p,t,rev,team,ev]=await db().batch([sql("INSERT OR IGNORE INTO events(key,type,player,at) SELECT 'died:'||food_expires,'died',NULL,food_expires FROM cat WHERE id=1 AND food_expires<=?",now),sql("SELECT food_expires AS food,`
2. Ende des Batches: `sql("SELECT count(*) AS total FROM accounts WHERE password IS NOT NULL")])` wird zu
   `sql("SELECT count(*) AS total FROM accounts WHERE password IS NOT NULL"),sql("SELECT e.id AS id,e.type AS type,e.at AS at,p.name AS name FROM events e LEFT JOIN players p ON p.id=e.player ORDER BY e.at DESC,e.id DESC LIMIT 10")])`
3. Im `return {`: `return {playerCount:` wird zu `return {events:ev.results,playerCount:`.

Alles andere in dieser Datei bleibt wortgleich.

- [ ] **Step 8: Tests laufen lassen**

Run: `npm test`
Expected: alle Tests PASS (die drei neuen und die bisherigen 42). Bricht ein bestehender Test, weil er den State exakt vergleicht, den Test minimal anpassen (nur `events` ergänzen) und im Bericht nennen.

- [ ] **Step 9: Spec an die Umsetzung anpassen**

In `docs/superpowers/specs/2026-11-04-aktivitaets-feed-design.md` im Abschnitt „API“ den Teil `je {type, at, name}` ändern zu `je {id, type, at, name}` (`id` dient als Listen-Schlüssel in React).

- [ ] **Step 10: Prüfungen und Commit**

Run: `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler).

```bash
git add db/schema.ts drizzle tests/setup.ts tests/events.test.ts lib/cat-types.ts lib/server/state.ts docs/superpowers/specs/2026-11-04-aktivitaets-feed-design.md
git commit -m "Tabelle events, died-Eintrag beim Abruf und events in der API"
```

---

### Task 2: `joined`, `revive_portion` und `revived` im selben Batch schreiben

**Files:**
- Modify: `lib/server/actions/account.ts`, `lib/server/actions/revive.ts`, `tests/events.test.ts`

**Interfaces:**
- Consumes: Tabelle `events` und `state().events` aus Task 1, `tests/helpers.ts` (`T0`, `setTime`, `get`, `post`, `json`, `register`).

- [ ] **Step 1: Failing tests anhängen (`tests/events.test.ts`)**

Den Import oben ersetzen durch `import { T0, get, post, json, register, setTime } from "./helpers";` und am Dateiende anhängen:

```ts
type Ev = { type: string; at: number; name: string | null };
const types = (events: Ev[]) => events.map((e) => e.type);

async function deadWith(...names: string[]) {
  setTime(T0);
  const sessions: string[] = [];
  for (const name of names) sessions.push((await register(name)).session);
  await get(sessions[0]);
  setTime(T0 + LIFETIME);
  const state = await json(await get(sessions[0]));
  return { sessions, round: state.foodExpires as number };
}

test("Registrieren schreibt genau einen joined-Eintrag", async () => {
  setTime(T0);
  const { body } = await register("Lisa");
  expect(body.events).toMatchObject([{ type: "joined", at: T0, name: "Lisa" }]);
});

test("eine fehlgeschlagene Registrierung schreibt keinen Eintrag", async () => {
  setTime(T0);
  await register("Lisa");
  const dup = await register("lisa");
  expect(dup.res.status).toBe(409);
  const body = await json(await get());
  expect(types(body.events)).toEqual(["joined"]);
});

test("abgemeldete Besucher sehen die Ereignisse ebenfalls", async () => {
  setTime(T0);
  await register("Lisa");
  const body = await json(await get());
  expect(body.account).toBe(false);
  expect(types(body.events)).toEqual(["joined"]);
});

test("eine Portion schreibt revive_portion, die zweite desselben Kontos keinen weiteren Eintrag", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  const first = await json(await post({ action: "revive", round }, sessions[0]));
  expect(types(first.events)).toEqual(["revive_portion", "died", "joined", "joined"]);
  expect(first.events[0]).toMatchObject({ type: "revive_portion", at: T0 + LIFETIME, name: "Lisa" });
  const again = await post({ action: "revive", round }, sessions[0]);
  expect(again.status).toBe(409);
  const body = await json(await get(sessions[0]));
  expect(types(body.events)).toEqual(["revive_portion", "died", "joined", "joined"]);
});

test("die letzte Portion schreibt revived", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  await post({ action: "revive", round }, sessions[0]);
  const last = await json(await post({ action: "revive", round }, sessions[1]));
  expect(types(last.events)).toEqual(["revived", "revive_portion", "revive_portion", "died", "joined", "joined"]);
  expect(last.events[0]).toMatchObject({ type: "revived", at: T0 + LIFETIME, name: null });
  expect(last.events[1].name).toBe("Tom");
  expect(last.events[2].name).toBe("Lisa");
});

test("wer nicht zur Runde gehört, schreibt keinen revive_portion", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  const late = await register("Nina"); // erst nach dem Verhungern registriert
  const res = await post({ action: "revive", round }, late.session);
  expect(res.status).toBe(409);
  const body = await json(await get(sessions[0]));
  expect(types(body.events).filter((t) => t === "revive_portion")).toEqual([]);
});

test("Reihenfolge neueste zuerst, höchstens 10 Einträge", async () => {
  let last: Ev[] = [];
  for (let i = 0; i < 12; i++) {
    setTime(T0 + i * 1000);
    last = (await register(`Spieler${i}`)).body.events;
  }
  expect(last).toHaveLength(10);
  expect(last[0].name).toBe("Spieler11");
  expect(last[9].name).toBe("Spieler2");
}, 30_000);

test("nach dem Umbenennen erscheint der neue Name", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await post({ action: "rename", name: "Lisbeth" }, session);
  const body = await json(await get(session));
  expect(body.events[0]).toMatchObject({ type: "joined", name: "Lisbeth" });
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschläge prüfen**

Run: `npx vitest run tests/events.test.ts`
Expected: die neuen Tests FAIL (kein `joined`/`revive_portion`/`revived` geschrieben); die drei Tests aus Task 1 bleiben PASS.

- [ ] **Step 3: `joined` im Registrierungs-Batch (`lib/server/actions/account.ts`)**

In der Zeile mit `await db().batch([sql("INSERT INTO accounts(player,key,password,joined)...` den Batch-Inhalt nach dem Eintrag `sql("INSERT INTO players(id,name,points,last) VALUES(?,?,0,0)",id,name)` um eine Anweisung erweitern. Also wird aus

`...,sql("INSERT INTO players(id,name,points,last) VALUES(?,?,0,0)",id,name),sql("INSERT INTO sessions VALUES(?,?,?)",sessionHash,id,now+month)])`

dies:

`...,sql("INSERT INTO players(id,name,points,last) VALUES(?,?,0,0)",id,name),sql("INSERT OR IGNORE INTO events(key,type,player,at) VALUES(?,?,?,?)","joined:"+id,"joined",id,now),sql("INSERT INTO sessions VALUES(?,?,?)",sessionHash,id,now+month)])`

Alles andere bleibt wortgleich (auch das `try/catch` mit dem `UNIQUE`-Fall; der Batch ist eine Transaktion, bei einem Fehler entsteht kein Ereignis).

- [ ] **Step 4: `revive_portion` und `revived` (`lib/server/actions/revive.ts`)**

Am Ende des bestehenden `db().batch([vote, catUpdate])` zwei Anweisungen **hinter** die zwei vorhandenen setzen (nicht davor: die `changes()>0`-Bedingung der zweiten Anweisung bezieht sich auf die erste). Die Batch-Liste wird also

```ts
  const [vote]=await db().batch([
   /* 1. Anweisung (UPDATE accounts SET fed_round ...) wortgleich */,
   /* 2. Anweisung (UPDATE cat SET food_expires ...) wortgleich */,
   sql("INSERT OR IGNORE INTO events(key,type,player,at) SELECT 'revive_portion:'||?||':'||?,'revive_portion',?,? WHERE EXISTS(SELECT 1 FROM accounts WHERE player=? AND fed_round=?)",round,who.player,who.player,now,who.player,round),
   sql("INSERT OR IGNORE INTO events(key,type,player,at) SELECT 'revived:'||?,'revived',NULL,? FROM cat WHERE id=1 AND food_expires=?",round,now,now+foodLifetime)]);
```

Die beiden vorhandenen Anweisungen und alles danach (`const data=await state(who);` usw.) bleiben unverändert; `foodLifetime` ist bereits importiert.

- [ ] **Step 5: Tests laufen lassen**

Run: `npm test`
Expected: alle Tests PASS (bisherige und `tests/events.test.ts`). Schlägt die Reihenfolge-Erwartung bei gleichen `at` fehl, zuerst die Ursache klären (Einfüge-Reihenfolge im Batch, `ORDER BY ... e.id DESC`), nicht die Erwartung aufweichen.

- [ ] **Step 6: Prüfungen und Commit**

Run: `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler).

```bash
git add lib/server/actions/account.ts lib/server/actions/revive.ts tests/events.test.ts
git commit -m "Ereignisse joined, revive_portion und revived im selben Batch schreiben"
```

---

### Task 3: Karte im Katzenzimmer, relative Zeit, README und lokale Datenbank

**Files:**
- Create: `lib/format-time.ts`, `components/cat/ActivityCard.tsx`, `styles/activity.css`, `tests/format-time.test.ts`
- Modify: `app/globals.css`, `app/page.tsx`, `README.md`

**Interfaces:**
- Consumes: `FeedEvent` und `Data.events` (Task 1).
- Produces: `relativeTime(at:number, now:number): string`; `<ActivityCard events={FeedEvent[]} now={number}/>`.

- [ ] **Step 1: Failing test schreiben (`tests/format-time.test.ts`)**

```ts
import { expect, test } from "vitest";
import { relativeTime } from "../lib/format-time";

const S = 1000;
const MIN = 60 * S;
const H = 60 * MIN;
const D = 24 * H;
const NOW = 1_800_000_000_000;

test("relativeTime: Grenzen und Einzahl/Mehrzahl", () => {
  expect(relativeTime(NOW - 59 * S, NOW)).toBe("gerade eben");
  expect(relativeTime(NOW - 60 * S, NOW)).toBe("vor 1 Min.");
  expect(relativeTime(NOW - 59 * MIN, NOW)).toBe("vor 59 Min.");
  expect(relativeTime(NOW - 60 * MIN, NOW)).toBe("vor 1 Std.");
  expect(relativeTime(NOW - 23 * H, NOW)).toBe("vor 23 Std.");
  expect(relativeTime(NOW - 24 * H, NOW)).toBe("vor 1 Tag");
  expect(relativeTime(NOW - 48 * H, NOW)).toBe("vor 2 Tagen");
  expect(relativeTime(NOW - 10 * D, NOW)).toBe("vor 10 Tagen");
});

test("relativeTime: Zeitpunkt in der Zukunft gilt als gerade eben", () => {
  expect(relativeTime(NOW + 5 * S, NOW)).toBe("gerade eben");
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/format-time.test.ts`
Expected: FAIL (Modul `lib/format-time` existiert nicht).

- [ ] **Step 3: `lib/format-time.ts` anlegen**

```ts
export function relativeTime(at: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 60) return "gerade eben";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "vor 1 Tag" : `vor ${days} Tagen`;
}
```

- [ ] **Step 4: Test laufen lassen**

Run: `npx vitest run tests/format-time.test.ts`
Expected: PASS.

- [ ] **Step 5: Komponente `components/cat/ActivityCard.tsx` anlegen**

```tsx
import {History} from "lucide-react";
import type {FeedEvent} from "../../lib/cat-types";
import {relativeTime} from "../../lib/format-time";

type Props={events:FeedEvent[];now:number};

function describe(e:FeedEvent){
 const name=e.name||"Jemand";
 switch(e.type){
  case "joined":return name+" ist dem Kurs beigetreten";
  case "revive_portion":return name+" hat eine Portion in den Napf gelegt";
  case "revived":return "Byte ist wieder da";
  case "died":return "Byte ist gestorben";
 }
}

export function ActivityCard({events,now}:Props){
 return <section className="card activity"><small><History size={14}/> AKTIVITÄT</small><h2>Letzte Ereignisse</h2>{events.length?<ol aria-label="Letzte Ereignisse">{events.map(e=><li key={e.id}><span>{describe(e)}</span><time>{relativeTime(e.at,now)}</time></li>)}</ol>:<p>Noch nichts passiert. Hier erscheinen Beitritte und Wiederbelebungen.</p>}</section>;
}
```

Falls `History` im installierten `lucide-react` nicht existiert, ein anderes vorhandenes Icon wählen (zum Beispiel `Clock`) und im Bericht nennen.

- [ ] **Step 6: Stil `styles/activity.css` anlegen und importieren**

```css
/* Karte „Letzte Ereignisse“ im Katzenzimmer. */
.activity ol {
  padding:0;
  margin:0;
  list-style:none
}

.activity li {
  display:flex;
  gap:12px;
  justify-content:space-between;
  padding:10px 0;
  border-bottom:1px dashed #aaa;
  font-size:14px
}

.activity li:last-child {
  border-bottom:0
}

.activity time {
  color:#827253;
  font-size:12px;
  white-space:nowrap
}

.activity p {
  margin:0;
  color:#5a564d;
  font-size:14px
}
```

In `app/globals.css` als **letzte** Zeile ergänzen: `@import "../styles/activity.css";`

- [ ] **Step 7: In `app/page.tsx` einbinden**

Import ergänzen (neben den anderen `components/cat`-Imports): `import {ActivityCard} from "../components/cat/ActivityCard";`

In der Zeile mit `<aside><StatusCard .../>` und der folgenden Zeile mit `<ScoreCard .../></aside></div>` die Karte hinter `ScoreCard` einfügen. Also wird aus

`<ScoreCard points={data?.me?.points||0} onBoard={()=>navigate("Rangliste")}/></aside></div>:null}`

dies:

`<ScoreCard points={data?.me?.points||0} onBoard={()=>navigate("Rangliste")}/>
<ActivityCard events={data?.events||[]} now={now}/></aside></div>:null}`

- [ ] **Step 8: README ergänzen**

Im Abschnitt „Datenbank einrichten“ nach der Schleife einen Absatz ergänzen (deutsch, kurz): Die Schleife über alle `drizzle/000*.sql` ist nur für eine **leere** Datenbank. Für eine **bestehende** lokale Datenbank wird nach einem Update nur die neue Migration eingespielt, zum Beispiel `sed 's/--> statement-breakpoint//' drizzle/0005_<name>.sql | sqlite3 <.sqlite-Datei>` (den echten Dateinamen aus `ls drizzle` einsetzen). Ohne die Migration antwortet `GET /api/cat` mit 500 und `no such table: events`.

- [ ] **Step 9: Lokale Entwicklungsdatenbank migrieren**

Der laufende Dev-Server nutzt `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite` (nicht `metadata.sqlite`). Ohne die neue Tabelle antwortet `/api/cat` mit 500. Es handelt sich um eine rein additive Schemaänderung (neue Tabelle), vorhandene Daten bleiben unberührt. Vorher prüfen, dass `events` fehlt, dann die neue Migrationsdatei (nur `0005_*.sql`) mit dem Befehl aus Step 8 einspielen:

Run: `sqlite3 <db> ".tables"` (vorher und nachher) und `curl -s http://127.0.0.1:5173/api/cat | head -c 400`
Expected: nachher enthält die Antwort `"events":[...]` (Dev-Server nicht neu starten; er lädt per HMR nach). Liefert der Server weiter 500 aus einem anderen Grund, Ursache im Bericht nennen.

- [ ] **Step 10: Prüfungen**

Run: `npm test` (alle PASS), `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler, keine neue Warnung außer den bekannten), `npm run build` (erfolgreich).

- [ ] **Step 11: Commit**

```bash
git add lib/format-time.ts components/cat/ActivityCard.tsx styles/activity.css tests/format-time.test.ts app/globals.css app/page.tsx README.md
git commit -m "Karte Letzte Ereignisse im Katzenzimmer mit relativer Zeit"
```
