//------------------------------
// firebase-logic.js
//------------------------------
// CODE STARTS HERE
//------------------------------




import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Function to save game statistics to Firebase
function saveGameStats(playerName, playerScore, aiScore) {
    const gameId = generateGameId();
    const timestamp = new Date().toISOString();
    const gameResult = {
        playerName: playerName,
        playerScore: playerScore,
        aiScore: aiScore,
        timestamp: timestamp
    };

    const db = getDatabase();
    set(ref(db, 'games/' + gameId), gameResult);
}

// Generate a unique Game ID
function generateGameId() {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    return datePart + randomPart;
}

// Export the function for use in other modules
export { saveGameStats };




//------------------------------
// END OF CODE
//------------------------------
// CREATED BY MOLDOVAN
//------------------------------
// CODE WRITTEN BY GPT
//------------------------------