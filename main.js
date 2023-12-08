// A játék kezdetén létrehozzuk a tábla és a játékosok objektumait.
const board = new Board();
const humanPlayer = new HumanPlayer();
const computerPlayer = new ComputerPlayer();

// A játékmenetet a következő függvény kezeli.
function playGame() {
  // A játék kezdetén a tábla minden mezőjére 1-től 9-ig számokat helyezünk.
  for (let i = 0; i < board.rows; i++) {
    for (let j = 0; j < board.columns; j++) {
      board.cells[i][j] = i + j + 1;
    }
  }

  // A játékosok kezdőpontjait beállítjuk.
  humanPlayer.row = 4;
  humanPlayer.column = 4;
  computerPlayer.row = 4;
  computerPlayer.column = 4;

  // A játékot addig folytatjuk, amíg valamelyik játékos nyer.
  while (true) {
    // A játékos lép.
    humanPlayer.play(board);

    // Ha a játékos nem tud lépni, akkor a játék véget ér.
    if (!humanPlayer.canPlay(board)) {
      break;
    }

    // A számítógép lép.
    computerPlayer.play(board);

    // Ha a számítógép nem tud lépni, akkor a játék véget ér.
    if (!computerPlayer.canPlay(board)) {
      break;
    }
  }

  // A játék végét kiírjuk a konzolra.
  if (humanPlayer.score > computerPlayer.score) {
    console.log("Az emberi játékos nyert!");
  } else if (humanPlayer.score < computerPlayer.score) {
    console.log("A számítógép nyert!");
  } else {
    console.log("Döntetlen!");
  }
}

// A játék elindítása.
playGame();
