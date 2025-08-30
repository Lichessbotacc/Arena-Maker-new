import fetch from "node-fetch";
import { URLSearchParams } from "url";

export const config = {
  server: "https://lichess.org",
  team: "testing-codes",
  oauthToken: process.env.OAUTH_TOKEN!,
  daysInAdvance: 1, // wie viele Tage im Voraus Arenen erstellen
  dryRun: false,
  arena: {
    name: () => "Hourly Ultrabullet",
    description: (nextLink: string) => `Next: ${nextLink}`,
    clockTime: 0.25, // 15 Sekunden Ultrabullet
    clockIncrement: 0,
    minutes: 90, // Länge 2 Stunden
    rated: true,
    variant: "standard",
    intervalHours: 2, // alle 2 Stunden eine Arena
  },
};

async function createArena(startDate: Date, nextLink: string) {
  const body = new URLSearchParams({
    name: config.arena.name(),
    description: config.arena.description(nextLink),
    clockTime: config.arena.clockTime.toString(),
    clockIncrement: config.arena.clockIncrement.toString(),
    minutes: config.arena.minutes.toString(),
    rated: config.arena.rated ? "true" : "false",
    variant: config.arena.variant,
    startDate: startDate.toISOString(),
    teamId: config.team,
  });

  const res = await fetch(`${config.server}/api/
