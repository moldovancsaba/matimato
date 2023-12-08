import firebase from './firebase.js';

function startGame() {
  // A játék kezdete

  // A játékos nevét elmentjük a Firebase adatbázisba
  const playerName = "John Doe";

  firebase.database().ref("players").push({
    name: playerName
  });
}

function endGame() {
  // A játék vége
}

function playGame() {
  // A játék menete
}

window.onload = startGame;
