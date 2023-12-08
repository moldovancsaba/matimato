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

  hasAvailableMoves(row, column) {
    // Ellenőrizze, hogy vannak-e elérhető lépések az adott sorban vagy oszlopban.
    return this.cells[row].some(cell => cell != null) || this.cells.some(r => r[column] != null);
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

// Emberi játékos lépésének kezelése
function handleHumanMove(row, column) {
  if (!humanPlayer.play(board, { row, column })) {
    console.log("Nem sikerült lépni. Próbáld újra!");
    return;
  }

  // Frissítse a táblát, majd ellenőrizze, hogy van-e lépés a számítógép számára.
  updateBoard();
  if (!board.hasAvailableMoves(column, row)) {
    endGame();
    return;
  }

  // Számítógép lépése
  handleComputerMove(column);
}

// Számítógép lépésének kezelése
function handleComputerMove(column) {
  // Egyszerű AI a példa kedvéért: válasszon egy véletlenszerű számot az aktív oszlopból.
  let availableRows = [];
  for (let i = 0; i < board.rows; i++) {
    if (board.cells[i][column] != null) {
      availableRows.push(i);
    }
  }

  if (availableRows.length === 0) {
    endGame();
    return;
  }

  let randomRowIndex = availableRows[Math.floor(Math.random() * availableRows.length)];
  computerPlayer.play(board, { row: randomRowIndex, column });
  updateBoard();
}

function updateBoard() {
  // Itt frissíti a táblát a DOM-ban, például újrarajzolja a táblát a board.cells alapján.
}

function endGame() {
  // Játék vége logika: kiírja a győztest és leállítja a játékot.
  if (humanPlayer.score > computerPlayer.score) {
    console.log("Az emberi játékos nyert!");
  } else if (humanPlayer.score < computerPlayer.score) {
    console.log("A számítógép nyert!");
  } else {
    console.log("Döntetlen!");
  }
}

// Példa a játék indítására, ha szükséges.
// updateBoard(); // Inicializálja és frissíti a táblát a kezdő állapotban.
// A felhasználói interakciókat (pl. cellákra kattintás) itt lehet kezelni.