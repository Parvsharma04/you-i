async function playFullGame(gameName) {
  console.log(`Starting ${gameName} game...`);

  const API_URL = 'http://localhost:8081';

  // Device IDs
  const device1 = `device1-${gameName}`;
  const device2 = `device2-${gameName}`;

  // 1. Create Session (Player 1)
  let res = await fetch(`${API_URL}/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': device1 },
    body: JSON.stringify({ category: 'fun', questionCount: 5 })
  });
  if (!res.ok) throw new Error(`Create session failed: ${await res.text()}`);
  const session1 = await res.json();
  const sessionId = session1.sessionId;
  const player1Id = session1.playerId;
  const code = session1.code;
  console.log(`[${gameName}] Player 1 created session ${sessionId} with code ${code}`);

  // 2. Join Session (Player 2)
  res = await fetch(`${API_URL}/session/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': device2 },
    body: JSON.stringify({ code })
  });
  if (!res.ok) throw new Error(`Join session failed: ${await res.text()}`);
  const session2 = await res.json();
  const player2Id = session2.playerId;
  console.log(`[${gameName}] Player 2 joined with player id ${player2Id}`);

  // 3. Get Questions
  res = await fetch(`${API_URL}/question/${sessionId}`, {
    method: 'GET',
    headers: { 'x-device-id': device1, 'x-player-id': player1Id }
  });
  if (!res.ok) throw new Error(`Get questions failed: ${await res.text()}`);
  const questions = await res.json();
  console.log(`[${gameName}] Fetched ${questions.length} questions`);

  // 4. Submit Answers
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    // Player 1 answers
    res = await fetch(`${API_URL}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-id': device1, 'x-player-id': player1Id },
      body: JSON.stringify({ sessionId, questionId: q.id, answer: 'p1_ans' })
    });
    if (!res.ok) throw new Error(`Player 1 answer failed: ${await res.text()}`);
    
    // Player 2 answers
    res = await fetch(`${API_URL}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-id': device2, 'x-player-id': player2Id },
      body: JSON.stringify({ sessionId, questionId: q.id, answer: 'p2_ans' })
    });
    if (!res.ok) throw new Error(`Player 2 answer failed: ${await res.text()}`);
  }
  console.log(`[${gameName}] Both players submitted answers`);

  // 5. Generate Results (Player 1 initiates)
  res = await fetch(`${API_URL}/result/generate/${sessionId}`, {
    method: 'POST',
    headers: { 'x-device-id': device1, 'x-player-id': player1Id }
  });
  if (!res.ok) throw new Error(`Generate results failed: ${await res.text()}`);
  console.log(`[${gameName}] Generating results...`);

  // 6. Get Results (Poll)
  let attempts = 0;
  while (attempts < 10) {
    res = await fetch(`${API_URL}/result/${sessionId}`, {
      method: 'GET',
      headers: { 'x-device-id': device2, 'x-player-id': player2Id }
    });
    if (!res.ok) throw new Error(`Get results failed: ${await res.text()}`);
    const result = await res.json();
    if (result.status === 'ready') {
      console.log(`[${gameName}] Result ready! Score: ${result.data.score}`);
      break;
    }
    attempts++;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  if (attempts >= 10) throw new Error(`[${gameName}] Results did not become ready`);
  console.log(`[${gameName}] Game complete!\n`);
}

async function run() {
  try {
    await playFullGame('Web');
    await playFullGame('Mobile');
    console.log('All tests passed!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();