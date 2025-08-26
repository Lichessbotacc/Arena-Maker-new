import fetch from "node-fetch";
import { URLSearchParams } from "url";
import eachDayOfInterval from "date-fns/eachDayOfInterval";
import dateAdd from "date-fns/add";
import dateSet from "date-fns/set";
import dateIsAfter from "date-fns/isAfter";
import dateIsEqual from "date-fns/isEqual";
import { config } from "./config";

const candidates = eachDayOfInterval({
  start: new Date(),
  end: dateAdd(new Date(), { days: config.daysInAdvance }),
})
  .flatMap(day =>
    config.dailyTournaments.map(blueprint => ({
      ...blueprint,
      startsAt: dateSet(day, {
        hours: parseInt(blueprint.time.split(":")[0]),
        minutes: parseInt(blueprint.time.split(":")[1]),
      }),
    }))
  )
  .filter(c => dateIsAfter(c.startsAt, new Date()));

const looksLike = (existing: any, candidate: any) =>
  dateIsEqual(new Date(existing.startsAt), candidate.startsAt) &&
  existing.clock.limit / 60 == candidate.clock[0] &&
  existing.clock.increment == candidate.clock[1];

async function getLatestTournaments(nb: number) {
  const response = await fetch(
    `${config.server}/api/team/${config.team}/swiss?max=${nb}`
  );
  const body = await response.text();
  return body
    .split("\n")
    .filter(line => line)
    .map(line => JSON.parse(line));
}

async function createSwiss(tour: any): Promise<string | null> {
  const body = new URLSearchParams();
  for (const k of Object.keys(tour)) body.append(k, tour[k]);

  const response = await fetch(
    `${config.server}/api/swiss/new/${config.team}`,
    {
      method: "POST",
      body,
      headers: { Authorization: `Bearer ${config.oauthToken}` },
    }
  );

  if (response.status != 200) {
    const error = await response.text();
    console.error("Swiss creation failed:", response.status, error);
    return null;
  }
  const data = await response.json();
  return data.id || null;
}

async function updateSwissDescription(swissId: string, newDesc: string) {
  const body = new URLSearchParams({ description: newDesc });
  const response = await fetch(`${config.server}/api/swiss/${swissId}/edit`, {
    method: "POST",
    body,
    headers: { Authorization: `Bearer ${config.oauthToken}` },
  });

  if (response.status != 200) {
    const error = await response.text();
    console.error("Update error:", response.status, error);
  } else {
    console.log(`Swiss ${swissId} updated with next link`);
  }
}

async function createArena(startDate: Date, swissId: string) {
  const body = new URLSearchParams({
    name: "Daily Testing-Codes Arena",
    clockTime: "3",
    clockIncrement: "0",
    minutes: "120",
    startDate: Math.floor(startDate.getTime() / 1000).toString(),
    description: `Arena vor dem Swiss!\n\nNächstes Swiss: https://lichess.org/swiss/${swissId}`,
    rated: "true",
    variant: "standard",
  });

  const response = await fetch(
    `${config.server}/api/tournament?team=${config.team}`,
    {
      method: "POST",
      body,
      headers: { Authorization: `Bearer ${config.oauthToken}` },
    }
  );

  if (response.status != 200) {
    const error = await response.text();
    console.error("Arena creation failed:", response.status, error);
  } else {
    const data = await response.json();
    console.log(`Arena created: https://lichess.org/tournament/${data.id}`);
  }
}

async function main() {
  const existing = await getLatestTournaments(200);
  console.log(`Found ${existing.length} tournaments`);

  const missing = candidates.filter(c => !existing.some(e => looksLike(e, c)));

  let lastSwissId: string | null = null;

  for (let i = 0; i < missing.length; i++) {
    const m = missing[i];

    const swissPost: any = {
      name: m.name(),
      description: m.description().replace("{{nextLink}}", "—"),
      "clock.limit": (m.clock[0] * 60).toString(),
      "clock.increment": m.clock[1].toString(),
      nbRounds: m.rounds.toString(),
      rated: m.rated.toString(),
      variant: m.variant,
      startsAt: m.startsAt.getTime().toString(),
    };

    if (!config.dryRun) {
      const swissId = await createSwiss(swissPost);

      if (swissId) {
        console.log(`Swiss created: https://lichess.org/swiss/${swissId}`);

        // falls es ein vorheriges Swiss gab → Beschreibung aktualisieren
        if (lastSwissId) {
          await updateSwissDescription(
            lastSwissId,
            `Tägliches Teamturnier!\n\nNächstes Turnier: https://lichess.org/swiss/${swissId}`
          );
        }

        // Arena 2h vorher mit Link auf dieses Swiss
        const arenaStart = new Date(m.startsAt.getTime() - 2 * 60 * 60 * 1000);
        await createArena(arenaStart, swissId);

        lastSwissId = swissId;
      }
    }
  }
}

main();
