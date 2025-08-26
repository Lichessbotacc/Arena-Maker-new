async function createTournament(tour: any): Promise<any> {
  const body = new URLSearchParams();
  for (const k of Object.keys(tour)) body.append(k, tour[k]);

  const response = await fetch(`${config.server}/api/swiss/new/${config.team}`, {
    method: 'POST',
    body,
    headers: { Authorization: `Bearer ${config.oauthToken}` },
  });

  if (response.status != 200) {
    const error = await response.text();
    console.error(response.status, error);
    return null;
  }

  const data = await response.json(); // enthält Turnier-Infos inkl. ID
  const tournamentId = data.id;
  console.log("Created tournament:", tournamentId);

  // Beschreibung mit Link zum nächsten Turnier
  const description = tour.description.replace(
    '{{nextLink}}',
    `https://lichess.org/swiss/${tournamentId}`
  );

  await fetch(`${config.server}/api/swiss/${tournamentId}/edit`, {
    method: 'POST',
    body: new URLSearchParams({ description }),
    headers: { Authorization: `Bearer ${config.oauthToken}` },
  });

  await new Promise(r => setTimeout(r, 1500));
}
