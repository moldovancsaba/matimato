function saveGameStats() {
    const gameId = generateGameId();
    const gameResult = generateGameResult();

    firebase.database().ref('games/' + gameId).set({
        result: gameResult,
        timestamp: new Date().toISOString()
    });
}

function generateGameId() {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const randomPart = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
    return datePart + randomPart;
}

function generateGameResult() {
    const winner = humanPlayer.score > computerPlayer.score ? 1 : 2;
    const humanScore = String(humanPlayer.score).padStart(3, '0');
    const computerScore = String(computerPlayer.score).padStart(3, '0');
    return `${winner}${humanScore}${computerScore}`;
}