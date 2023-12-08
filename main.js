// A játéktér mezőinek inicializálása
const gameBoard = [];
for (let row = 0; row < 5; row++) {
  gameBoard[row] = [];
  for (let col = 0; col < 5; col++) {
    gameBoard[row][col] = null;
  }
}

// A játékos nevét elmentjük a Firebase adatbázisba
const playerName = "John Doe";

firebase.database().ref("players").push({
  name: playerName
});

// A játékmenet
function playGame() {
  // A játékos mehet
  console.log("A játékos mehet.");

  // A játékos egy számot helyez a táblára
  const playerInput = prompt("Adj meg egy számot (1-9): ");
  let playerNumber = parseInt(playerInput);

  // A játék ellenőrzi, hogy a játékos által elhelyezett szám megfelel-e a játékszabályoknak
  if (playerNumber > 0 && playerNumber < 10) {
    // A szám megfelel a játékszabályoknak

    // A játékosnak további lehetősége van, hogy játsszon
    console.log("A szám megfelel a játékszabályoknak.");
    playGame();
  } else {
    // A szám nem felel meg a játékszabályoknak

    // A játékos veszít
    console.log("A szám nem felel meg a játékszabályoknak. A játékos veszít.");
  }
}

// A játék kezdete
window.onload = playGame;
