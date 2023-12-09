class Board {
  constructor() {
    this.rows = 9;
    this.columns = 9;
    this.cells = this.createInitialBoard();
  }

  createInitialBoard() {
    let board = new Array(this.rows).fill(null).map(() => new Array(this.columns).fill(0));
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.columns; j++) {
        let num = (i * 3 + Math.floor(i / 3) + j) % 9 + 1;
        board[i][j] = num;
      }
    }
    return board;
  }

  placeNumber(num, board) {
    for (let i = 0; i < 9; i++) {
      let j = Math.floor(Math.random() * 9);
      let row = (num - 1 + i) % 9;
      while (board[row][j] !== 0) {
        j = (j + 1) % 9;
      }
      board[row][j] = num;
    }
  }

  hasAvailableMoves(row, column) {
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

const board = new Board();
const humanPlayer = new Player();
const computerPlayer = new Player();
let activeRow = 4; // Kezdés a középső sorral

function createBoard(board) {
  const boardElement = document.getElementById('board');
  boardElement.innerHTML = '';
  for (let i = 0; i < board.rows; i++) {
    for (let j = 0; j < board.columns; j++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (i === activeRow) {
        cell.classList.add('active'); // Az aktív sor kiemelése
      }
      const cellContent = document.createElement('div');
      cellContent.className = 'cell-content';
      cellContent.textContent = board.cells[i][j];
      cell.appendChild(cellContent);

      if (i === activeRow && board.cells[i][j] != null) {
        cell.onclick = () => handleCellClick(i, j);
      }
      boardElement.appendChild(cell);
    }
  }
}

function handleCellClick(row, column) {
  handleHumanMove(row, column);
}

function handleHumanMove(row, column) {
  if (row !== activeRow) {
    console.log("Nem a megengedett sorból választottál. Próbáld újra!");
    return;
  }
  if (humanPlayer.play(board, { row, column })) {
    activeRow = column; // Frissíti az aktív sort a kiválasztott oszlop alapján
    updateBoard();
    if (!board.hasAvailableMoves(column, row)) {
      endGame();
      return;
    }
    handleComputerMove(column);
  } else {
    console.log("Nem sikerült lépni. Próbáld újra!");
  }
}

function handleComputerMove(column) {
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
  activeRow = randomRowIndex; // Frissíti az aktív sort a számítógép választása alapján
  updateBoard();
}

function updateBoard() {
  createBoard(board);
}

function endGame() {
  if (humanPlayer.score > computerPlayer.score) {
    console.log("Az emberi játékos nyert!");
  } else if (humanPlayer.score < computerPlayer.score) {
    console.log("A számítógép nyert!");
  } else {
    console.log("Döntetlen!");
  }

  // Statisztika mentése
  saveGameStats();
}

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

// Inicializálja a táblát a kezdő állapotban.
document.addEventListener('DOMContentLoaded', (event) => {
  createBoard(board);
});