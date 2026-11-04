import { env } from "cloudflare:workers";
import { beforeEach, vi } from "vitest";

const migrations = import.meta.glob("../drizzle/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

async function migrate() {
  const db = env.DB!;
  const exists = await db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='actions'")
    .first();
  if (exists) return;
  const files = Object.keys(migrations).sort();
  for (const file of files) {
    const statements = migrations[file]
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) await db.prepare(statement).run();
  }
}

beforeEach(async () => {
  await migrate();
  const db = env.DB!;
  await db.batch(
    ["cooldowns", "sessions", "accounts", "players", "cat", "login_attempts", "events", "actions"].map((t) =>
      db.prepare(`DELETE FROM ${t}`),
    ),
  );
  vi.useFakeTimers({ toFake: ["Date"] });
});
