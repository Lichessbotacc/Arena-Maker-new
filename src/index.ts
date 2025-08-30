// src/index.ts
import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "testing-codes",
  oauthToken: process.env.OAUTH_TOKEN!, // muss gesetzt sein
  daysInAdvance: 1,                     // wie viele Tage im Voraus
  dryRun: false,
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25,        // 15 Sekunden = 0.25 Minuten
    clockIncrement: 0,
    minutes: 120,           // Turnierlänge: 2h
    rated: true,
    variant: "standard",
    intervalHours: 2,       // alle 2 Stunden
  },
};

function assertEnv() {
  if (!config.oauthToken) {
    throw new Error("OAUTH_TOKEN fehlt. Setze die Umgebungsvariable OAUTH_TOKEN.");
  }
}

/**
 * Liefert den nächsten geraden UTC-Stunden-Slot strikt in der Zukunft:
 * ..., 20:00, 22:00, 00:00, 02:00, ...
 */
function nextEvenUtcHour(from: Date): Date {
  const d = new Date(from);
  // nächstes gerades Stundengitter > jetzt
  const h = d.getUTCHours();
  const nextEven = Math.floor(h / 2) * 2 + 2; // immer strikt später
  d.setUTCHours(nextEven, 0, 0, 0);           // JS rollt den Tag automatisch weiter
  return d;
}

async function createArena(startDate: Date, nextLink: string) {
  // *** WICHTIG: Millisekunden! Nicht durch 1000 teilen. ***
  const startDateMs = startDate.getTime();

  const body = new URLSearchParams({
    name: config.arena.name(),
    description: config.arena.description(nextLink),
    clockTime: String(config.arena.clockTime),
    clockIncrement: String(config.arena.clockIncrement),
    minutes: String(config.arena.minutes),
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    startDate: String(startDateMs),   // <-- ms
    teamId: config.team,
  });

  console.log(
    `Creating arena starting at: ${startDate.toISOString()} (ms=${startDateMs})`
  );

  if (config.dryRun) {
    console.log("DRY RUN Arena:", Object.fromEntries(body));
    return "dry-run";
  }

  const res = await fetch(`${config.server}/api/tournament/arena`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.oauthToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Arena creation failed:", res.status, errText);
    return null;
  }

  const url = res.headers.get("Location");
  console.log("Arena created:", url);
  return url;
}

async function main() {
  assertEnv();

  const now = new Date();
  const firstStart = nextEvenUtcHour(now); // z.B. jetzt 21:50Z -> 22:00Z

  const arenasPerDay = Math.floor(24 / config.arena.intervalHours); // 12
  const totalArenas = arenasPerDay * config.daysInAdvance;

  console.log(`Creating ${totalArenas} arenas`);

  let prevUrl: string | null = null;

  for (let i = 0; i < totalArenas; i++) {
    const startDate = new Date(
      firstStart.getTime() + i * config.arena.intervalHours * 60 * 60 * 1000
    );

    // falls aus irgendeinem Grund der Slot nicht in der Zukunft liegt (z.B. Clock drift),
    // einfach zum nächsten 2h-Slot springen
    if (startDate.getTime() <= Date.now()) {
      startDate.setTime(startDate.getTime() + config.arena.intervalHours * 60 * 60 * 1000);
    }

    const arenaUrl = await createArena(startDate, prevUrl ?? "tba");
    if (arenaUrl) prevUrl = arenaUrl;
  }
}

main().catch((err) => console.error(err));
