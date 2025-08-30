import fetch from "node-fetch";
import { URLSearchParams } from "url";
import eachDayOfInterval from "date-fns/eachDayOfInterval";
import dateAdd from "date-fns/add";
import dateSet from "date-fns/set";
import { config } from "./config";

// === ARENA CANDIDATES (alle 2h) ===
const arenaCandidates = eachDayOfInterval({
  start: new Date(),
  end: dateAdd(new Date(), { days: config.daysInAdvance }),
})
  .flatMap((day) =>
    Array.from({ length: 12 }, (_, i) => {
      const startsAt = dateSet(day, { hours: i * 2, minutes: 0 });
      return {
        startsAt,
        name: () => "Daily Arena",
        description: () =>
          "Tägliche Arena!\n\nNächstes Arena-Turnier: {{nextLink}}",
        clock: [3, 0],
        minutes: 120,
        rated: true,
        variant: "standard",
      };
    })
  )
  .filter((c) => c.startsAt.getTime() > Date.now());

async function createArena(tour: any): Promise<any> {
  const body = new URLSearchParams();
  body.append("name", tour.name(tour));
  body.append("minutes", String(tour.minutes));
  body.append("clockTime", String(tour.clock[0]));
  body.append("clockIncrement", String(tour.clock[1]));
  body.append("rated", String(tour.rated));
  body.append("variant", tour.variant);
  body.append("startDate", String(tour.startsAt.getTime()));
  body.append("description", tour.description);

  const response = await fetch(
    `${config.server}/api/team/${config.team}/arena/new`,
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
    const created = await response.json();
    console.log(
      "Arena created:",
      `https://lichess.org/tournament/${created.id}`
    );
    return created;
  }
  await new Promise((r) => setTimeout(r, 1500));
}

// === MAIN ===
async function main() {
  console.log(`Creating ${arenaCandidates.length} Arena tournaments`);

  for (let i = 0; i < arenaCandidates.length; i++) {
    const arena = arenaCandidates[i];
    const nextArena = arenaCandidates[i + 1];
    const desc = arena
      .description(arena)
      .replace(
        "{{nextLink}}",
        nextArena
          ? `https://lichess.org/tournament/${nextArena.startsAt.getTime()}`
          : "kommt bald"
      );

    if (!config.dryRun) {
      await createArena({
        ...arena,
        description: desc,
      });
    }
  }
}

main();
