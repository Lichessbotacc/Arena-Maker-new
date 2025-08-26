import { Config } from "./types";

// Konfiguration für das Swiss-Maker Skript
const config: Config = {
  teamId: "testing-codes",          // Team-Name aus Lichess-URL
  schedule: {
    // Jeden Tag um 16:00 Uhr (Europe/Berlin Zeitzone)
    timezone: "Europe/Berlin",
    daily: [
      {
        hour: 16,
        minute: 0,
      },
    ],
  },
  tournament: {
    clock: {
      limit: 180,     // 3 Minuten = 180 Sekunden
      increment: 0,   // 0 Sekunden Inkrement
    },
    minutes: 120,     // Turnierdauer: 120 Minuten (2 Stunden)
    rounds: 0,        // 0 = automatische Runden nach Dauer
    rated: true,      // Bewertetes Turnier
    variant: "standard", // Schach-Variante (standard = Normalschach)
    name: "Daily 3+0 Swiss",  // Name des Turniers
    description: "Tägliches 3+0 Turnier der Testing Codes Gruppe.",
  },
};

export default config;
