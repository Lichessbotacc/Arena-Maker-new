import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "aggressivebot",              // Team-ID aus der URL
  oauthToken: process.env.OAUTH_TOKEN!, // dein Token (in GitHub Actions gesetzt)
  daysInAdvance: 1,                     // wie viele Tage im Voraus
  dryRun: false,                        // true = nur simulieren, false = wirklich erstellen
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25,       // Minuten pro Spieler (0.25 = 15 Sekunden)
    clockIncrement: 0,
    minutes: 60,          // Turnierdauer (1h)
    rated: true,
    variant: "standard",
    intervalHours: 2,      // alle 2 Stunden
  },
};

function assertEnv() {
  console.log("Debug: OAUTH_TOKEN is set:", !!process.env.OAUTH_TOKEN);
  console.log("Debug: OAUTH_TOKEN length:", process.env.OAUTH_TOKEN ? process.env.OAUTH_TOKEN.length : 0);
  if (!config.oauthToken) {
    throw new Error("OAUTH_TOKEN fehlt. Setze die Umgebungsvariable OAUTH_TOKEN.");
  }
}

/**
 * Liefert nächste gerade UTC-Stunde: 00:00, 02:00, 04:00 ...
 */
function nextEvenUtcHour(from: Date): Date {
  const d = new Date(from);
  const h = d.getUTCHours();
  const nextEven = Math.floor(h / 2) * 2 + 2;
  d.setUTCHours(nextEven, 0, 0, 0);
  return d;
}

async function createArena(startDate: Date, nextLink: string) {
   // Start date in YYYY-MM-DD (add 2 days to make it future)
   const date = new Date(startDate);
   date.setDate(date.getDate() + 2);
   const dateStr = date.toISOString().slice(0, 10);
   const timeStr = date.toISOString().slice(11, 16);

  const body = new URLSearchParams({
    name: config.arena.name(),
    description: config.arena.description(nextLink),
    clockTime: String(config.arena.clockTime), // in Minuten
    clockIncrement: String(config.arena.clockIncrement),
    minutes: String(config.arena.minutes),
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    teamId: config.team,
  });

  console.log(`Creating arena on ${date.toISOString()} UTC`);

  if (config.dryRun) {
    console.log("DRY RUN Arena:", Object.fromEntries(body));
    return "dry-run";
  }

  console.log("Making API request to:", `${config.server}/api/tournament`);
  console.log("Request body:", Object.fromEntries(body));

  const res = await fetch(
    `${config.server}/api/tournament`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.oauthToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    }
  );

  console.log("Response status:", res.status);
  console.log("Response headers:", Object.fromEntries(res.headers.entries()));

  if (!res.ok) {
    const errText = await res.text();
    console.error("Arena creation failed:", res.status, errText);
    return null;
  }

  const data = await res.json();
  console.log("Response body:", data);
  const url = data.id ? `${config.server}/tournament/${data.id}` : res.headers.get("Location");
  console.log("Arena created:", url);
  return url;
}

async function main() {
  assertEnv();

  const now = new Date();
  const firstStart = nextEvenUtcHour(now);

  const arenasPerDay = Math.floor(24 / config.arena.intervalHours);
  const totalArenas = arenasPerDay * config.daysInAdvance;

  console.log(`Creating ${totalArenas} arenas for team ${config.team}`);

  let prevUrl: string | null = null;

  for (let i = 0; i < totalArenas; i++) {
    // Add delay to avoid rate limiting
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 10000));

    const startDate = new Date(
      firstStart.getTime() + i * config.arena.intervalHours * 60 * 60 * 1000
    );

    const arenaUrl = await createArena(startDate, prevUrl ?? "tba");
    if (arenaUrl) prevUrl = arenaUrl;
  }
}

main().catch((err) => console.error(err));
