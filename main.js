class Board {
  constructor() {
    this.cells = this.createInitialBoard();
    this.rows = 9;
    this.columns = 9;
  }

  createInitialBoard() {
    let board = [];
    for (let i = 0; i < 9; i++) {
      let row = [];
      for (let j = 0; j < 9; j++) {
        row.push(Math.floor(Math.random() * 9) + 1);
      }
      board.push(row);
    }
    return board;
  }

  removeNumber(row, column) {
    this.cells[row][column] = null;
  }

  hasAvailableMoves() {
    return this.cells.some(row => row.some(cell => cell != null));
  }
}

class Player {
  constructor() {
    this.score = 0;
  }

  play(board, position) {
    if (board.cells[position.row][position.column] != null) {
      this.score += board.cells[position.row][position.column];
      board.removeNumber(position.row, position.column);
      return true;
    }
    return false;
  }
}

// A játék kezdetén létrehozzuk a tábla és a játékosok objektumait.
const board = new Board();
const humanPlayer = new Player();
const computerPlayer = new Player();

// A játékmenetet a következő függvény kezeli.
function playGame() {
  let activeRow = 4; // A középső sor indexe (0-tól indexelve).

  // A játékot addig folytatjuk, amíg van elérhető lépés.
  while (board.hasAvailableMoves()) {
    // Emberi játékos lép.
    let humanMove = { row: activeRow, column: /* itt kérjük be a felhasználótól a választást */ };
    if (humanPlayer.play(board, humanMove)) {
      activeRow = humanMove.column;
    } else {
      break;
    }

    // Számítógép lép.
    let computerMove = { row: activeRow, column: /* itt generáljuk a számítógép választását */ };
    if (computerPlayer.play(board, computerMove)) {
      activeRow = computerMove.column;
    } else {
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