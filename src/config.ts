import { Config } from "./types";

// Konfiguration für Swiss-Maker
const config: Config = {
  teamId: "testing-codes",   // Team-ID aus der Lichess-URL
  schedule: {
    timezone: "Europe/Berlin", // lokale Zeitzone (für 16:00 Uhr in Deutschland)
    daily: [
      {
        hour: 16,   // Stunde des Starts
        minute: 0,  // Minute des Starts
      },
    ],
  },
  tournament: {
    clock: {
      limit: 180,   // 180 Sekunden = 3 Minuten
      increment: 0, // kein Inkrement
    },
    rounds: 11,          // feste Rundenzahl: 11
    rated: true,         // gewertet
    variant: "standard", // Normales Schach
    name: "Daily 3+0 Swiss (11 Runden)",
    description: "Tägliches 3+0 Standard-Schachturnier mit 11 Runden im Team Testing Codes.",
  },
};

export default config;
