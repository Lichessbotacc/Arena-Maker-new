import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "AggressiveBot",              // Team-ID aus der URL
  oauthToken: process.env.OAUTH_TOKEN!, // dein Token (in GitHub Actions gesetzt)
  daysInAdvance: 1,                     // wie viele Tage im Voraus
  dryRun: false,                        // true = nur simulieren, false = wirklich erstellen
  swiss: {
    name: () => "Hourly Ultrabullet Swiss",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25,       // Minuten pro Spieler (0.25 = 15 Sekunden)
    clockIncrement: 0,
    nbRounds: 5,          // Number of rounds in Swiss tournament
    rated: true,
    variant: "standard",
    intervalHours: 1,      // alle 1 Stunde
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

async function createSwiss(startDate: Date, nextLink: string) {
   // Start date in YYYY-MM-DD (add 0 days to make it today)
   const date = new Date(startDate);
   date.setDate(date.getDate() + 0);

  const body = new URLSearchParams({
    name: config.swiss.name(),
    description: config.swiss.description(nextLink),
    "clock.limit": String(config.swiss.clockTime * 60), // Convert minutes to seconds
    "clock.increment": String(config.swiss.clockIncrement),
    nbRounds: String(config.swiss.nbRounds),
    rated: config.swiss.rated ? "true" : "false",
    variant: config.swiss.variant,
    startsAt: date.toISOString(),
  });

  console.log(`Creating Swiss tournament on ${date.toISOString()} UTC for team ${config.team}`);

  if (config.dryRun) {
    console.log("DRY RUN Swiss:", Object.fromEntries(body));
    return "dry-run";
  }

  console.log("Making API request to:", `${config.server}/api/swiss/new/${config.team}`);
  console.log("Request body:", Object.fromEntries(body));

  const res = await fetch(
    `${config.server}/api/swiss/new/${config.team}`,
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
    console.error("Swiss tournament creation failed:", res.status, errText);
    return null;
  }

  const data = await res.json();
  console.log("Response body:", data);
  const url = data.id ? `${config.server}/swiss/${data.id}` : res.headers.get("Location");
  console.log("Swiss tournament created:", url);
  return url;
}

async function main() {
  assertEnv();

  const now = new Date();
  const firstStart = nextEvenUtcHour(now);

  const swissPerDay = Math.floor(24 / config.swiss.intervalHours);
  const totalSwiss = swissPerDay * config.daysInAdvance;

  console.log(`Creating ${totalSwiss} Swiss tournaments for team ${config.team}`);

  let prevUrl: string | null = null;

  for (let i = 0; i < totalSwiss; i++) {
    // Add delay to avoid rate limiting
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 60000));

    const startDate = new Date(
      firstStart.getTime() + i * config.swiss.intervalHours * 60 * 60 * 1000
    );

    const swissUrl = await createSwiss(startDate, prevUrl ?? "tba");
    if (swissUrl) prevUrl = swissUrl;
  }
}

main().catch((err) => console.error(err));
