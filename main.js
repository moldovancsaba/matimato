class Board {
  constructor() {
      this.rows = 9;
      this.columns = 9;
      this.cells = this.createInitialBoard();
  }

  createInitialBoard() {
      let board = Array.from({ length: 9 }, (_, index) => 
          Array.from({ length: 9 }, (_, cellIndex) => (index + cellIndex) % 9 + 1)
      );

      // Keverés a sorok és oszlopok között
      for (let i = 0; i < 9; i++) {
          let row = Math.floor(Math.random() * 9);
          let col = Math.floor(Math.random() * 9);
          [board[i], board[row]] = [board[row], board[i]]; // Sorok cseréje
          for (let j = 0; j < 9; j++) {
              [board[j][i], board[j][col]] = [board[j][col], board[j][i]]; // Oszlopok cseréje
          }
      }

      return board;
  }

  removeNumber(row, column) {
      this.cells[row][column] = null;
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
              cell.classList.add('active');
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
}

// Inicializálja a táblát a kezdő állapotban.
document.addEventListener('DOMContentLoaded', (event) => {
    createBoard(board);
});
