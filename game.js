// ========================================
// 定数定義
// ========================================
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = {
    I: '#00ffff', // シアン
    O: '#ffff00', // 黄色
    T: '#ff00ff', // マゼンタ
    S: '#00ff00', // 緑
    Z: '#ff0000', // 赤
    J: '#0000ff', // 青
    L: '#ff8800', // オレンジ
    GHOST: 'rgba(255, 255, 255, 0.2)' // ゴーストブロック
};

// テトリミノの形状定義（4x4グリッド）
const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    O: [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0]
    ],
    T: [
        [0, 0, 0, 0],
        [0, 1, 1, 1],
        [0, 0, 1, 0],
        [0, 0, 0, 0]
    ],
    S: [
        [0, 0, 0, 0],
        [0, 0, 1, 1],
        [0, 1, 1, 0],
        [0, 0, 0, 0]
    ],
    Z: [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 1],
        [0, 0, 0, 0]
    ],
    J: [
        [0, 0, 0, 0],
        [0, 1, 1, 1],
        [0, 0, 0, 1],
        [0, 0, 0, 0]
    ],
    L: [
        [0, 0, 0, 0],
        [0, 1, 1, 1],
        [0, 1, 0, 0],
        [0, 0, 0, 0]
    ]
};

const SHAPE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// スコアリング
const POINTS = {
    SINGLE: 100,
    DOUBLE: 300,
    TRIPLE: 500,
    TETRIS: 800,
    SOFT_DROP: 1,
    HARD_DROP: 2
};

// ========================================
// グローバル変数
// ========================================
let canvas, ctx, nextCanvas, nextCtx;
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let highScore = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let isPaused = false;
let isGameStarted = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let animationId = null;

// タッチ操作用の変数
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchStartTime = 0;
const SWIPE_THRESHOLD = 50; // スワイプと判定する最小距離（ピクセル）
const TAP_THRESHOLD = 200; // タップと判定する最大時間（ミリ秒）

// ========================================
// 初期化
// ========================================
function init() {
    // Canvas要素の取得
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('nextCanvas');
    nextCtx = nextCanvas.getContext('2d');
    
    // ハイスコアの読み込み
    loadHighScore();
    updateDisplay();
    
    // イベントリスナーの設定
    document.addEventListener('keydown', handleKeyPress);
    
    // タッチイベントリスナーの設定（ゲームエリア全体に適用）
    const gameArea = document.querySelector('.game-area');
    gameArea.addEventListener('touchstart', handleTouchStart, { passive: false });
    gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
    gameArea.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // ボードの初期化
    initBoard();
}

function initBoard() {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

function startGame() {
    if (isGameStarted && !gameOver) return;
    
    // ゲーム状態のリセット
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    isPaused = false;
    isGameStarted = true;
    dropInterval = 1000;
    
    // 画面の更新
    hideScreen('startScreen');
    hideScreen('gameOverScreen');
    updateDisplay();
    
    // 最初のピースを生成
    nextPiece = createPiece();
    spawnPiece();
    
    // ゲームループの開始
    lastTime = performance.now();
    gameLoop();
}

function gameLoop(time = 0) {
    if (gameOver || !isGameStarted) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    if (!isPaused) {
        dropCounter += deltaTime;
        
        if (dropCounter > dropInterval) {
            moveDown();
            dropCounter = 0;
        }
    }
    
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

// ========================================
// ピース管理
// ========================================
function createPiece() {
    const shapeName = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
    return {
        shape: SHAPES[shapeName],
        color: COLORS[shapeName],
        name: shapeName,
        x: Math.floor(COLS / 2) - 2,
        y: 0
    };
}

function spawnPiece() {
    currentPiece = nextPiece;
    nextPiece = createPiece();
    
    // スポーン位置で衝突チェック
    if (checkCollision(currentPiece.x, currentPiece.y, currentPiece.shape)) {
        endGame();
    }
    
    drawNext();
}

// ========================================
// 描画
// ========================================
function draw() {
    // ボードのクリア
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // グリッドの描画
    drawGrid();
    
    // 固定されたブロックの描画
    drawBoard();
    
    // ゴーストピースの描画
    if (currentPiece && !isPaused) {
        drawGhost();
    }
    
    // 現在のピースの描画
    if (currentPiece && !isPaused) {
        drawPiece(currentPiece, ctx);
    }
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.lineWidth = 1;
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }
}

function drawBoard() {
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                drawBlock(col, row, board[row][col], ctx);
            }
        }
    }
}

function drawPiece(piece, context) {
    const shape = piece.shape;
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                drawBlock(piece.x + col, piece.y + row, piece.color, context);
            }
        }
    }
}

function drawBlock(x, y, color, context) {
    const pixelX = x * BLOCK_SIZE;
    const pixelY = y * BLOCK_SIZE;
    
    // メインブロック
    context.fillStyle = color;
    context.fillRect(pixelX, pixelY, BLOCK_SIZE, BLOCK_SIZE);
    
    // ボーダー（3Dエフェクト）
    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    context.lineWidth = 2;
    context.strokeRect(pixelX + 1, pixelY + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
    
    // 内側のハイライト
    context.fillStyle = 'rgba(255, 255, 255, 0.2)';
    context.fillRect(pixelX + 2, pixelY + 2, BLOCK_SIZE - 4, 4);
    context.fillRect(pixelX + 2, pixelY + 2, 4, BLOCK_SIZE - 4);
    
    // 影
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.fillRect(pixelX + BLOCK_SIZE - 6, pixelY + 6, 4, BLOCK_SIZE - 6);
    context.fillRect(pixelX + 6, pixelY + BLOCK_SIZE - 6, BLOCK_SIZE - 6, 4);
}

function drawGhost() {
    const ghostY = getGhostPosition();
    const ghostPiece = { ...currentPiece, y: ghostY };
    
    const shape = ghostPiece.shape;
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const pixelX = (ghostPiece.x + col) * BLOCK_SIZE;
                const pixelY = (ghostPiece.y + row) * BLOCK_SIZE;
                
                ctx.strokeStyle = COLORS.GHOST;
                ctx.lineWidth = 2;
                ctx.strokeRect(pixelX + 2, pixelY + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
            }
        }
    }
}

function getGhostPosition() {
    let ghostY = currentPiece.y;
    while (!checkCollision(currentPiece.x, ghostY + 1, currentPiece.shape)) {
        ghostY++;
    }
    return ghostY;
}

function drawNext() {
    // ネクストキャンバスのクリア
    nextCtx.fillStyle = '#000000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (!nextPiece) return;
    
    // ネクストピースを中央に配置
    const offsetX = (nextCanvas.width / BLOCK_SIZE - 4) / 2;
    const offsetY = (nextCanvas.height / BLOCK_SIZE - 4) / 2;
    
    const shape = nextPiece.shape;
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const x = (offsetX + col) * BLOCK_SIZE;
                const y = (offsetY + row) * BLOCK_SIZE;
                
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                
                nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                nextCtx.lineWidth = 2;
                nextCtx.strokeRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            }
        }
    }
}

// ========================================
// 移動と回転
// ========================================
function moveLeft() {
    if (!currentPiece || isPaused || gameOver) return;
    if (!checkCollision(currentPiece.x - 1, currentPiece.y, currentPiece.shape)) {
        currentPiece.x--;
        draw();
    }
}

function moveRight() {
    if (!currentPiece || isPaused || gameOver) return;
    if (!checkCollision(currentPiece.x + 1, currentPiece.y, currentPiece.shape)) {
        currentPiece.x++;
        draw();
    }
}

function moveDown() {
    if (!currentPiece || isPaused || gameOver) return;
    if (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.shape)) {
        currentPiece.y++;
        score += POINTS.SOFT_DROP;
        updateDisplay();
    } else {
        lockPiece();
    }
}

function hardDrop() {
    if (!currentPiece || isPaused || gameOver) return;
    
    let dropDistance = 0;
    while (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.shape)) {
        currentPiece.y++;
        dropDistance++;
    }
    
    score += dropDistance * POINTS.HARD_DROP;
    updateDisplay();
    lockPiece();
}

function rotate() {
    if (!currentPiece || isPaused || gameOver) return;
    
    const rotated = rotateMatrix(currentPiece.shape);
    
    // 通常の回転を試す
    if (!checkCollision(currentPiece.x, currentPiece.y, rotated)) {
        currentPiece.shape = rotated;
        draw();
        return;
    }
    
    // 壁蹴り処理
    const kicks = [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: -2, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: -1 }
    ];
    
    for (const kick of kicks) {
        if (!checkCollision(currentPiece.x + kick.x, currentPiece.y + kick.y, rotated)) {
            currentPiece.x += kick.x;
            currentPiece.y += kick.y;
            currentPiece.shape = rotated;
            draw();
            return;
        }
    }
}

function rotateMatrix(matrix) {
    const N = matrix.length;
    const rotated = Array(N).fill(null).map(() => Array(N).fill(0));
    
    for (let row = 0; row < N; row++) {
        for (let col = 0; col < N; col++) {
            rotated[col][N - 1 - row] = matrix[row][col];
        }
    }
    
    return rotated;
}

// ========================================
// 衝突判定
// ========================================
function checkCollision(x, y, shape) {
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const newX = x + col;
                const newY = y + row;
                
                // 壁との衝突
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                // 他のブロックとの衝突
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// ========================================
// ピースの固定とライン消去
// ========================================
function lockPiece() {
    const shape = currentPiece.shape;
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const boardY = currentPiece.y + row;
                const boardX = currentPiece.x + col;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
    
    // ライン消去のチェック
    const linesCleared = clearLines();
    if (linesCleared > 0) {
        updateScore(linesCleared);
    }
    
    // 次のピースをスポーン
    spawnPiece();
}

function clearLines() {
    let linesCleared = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            // ラインを削除
            board.splice(row, 1);
            // 新しい空のラインを上に追加
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            row++; // 同じ行を再チェック
        }
    }
    
    return linesCleared;
}

function updateScore(linesCleared) {
    lines += linesCleared;
    
    // スコア計算
    let points = 0;
    switch (linesCleared) {
        case 1:
            points = POINTS.SINGLE;
            break;
        case 2:
            points = POINTS.DOUBLE;
            break;
        case 3:
            points = POINTS.TRIPLE;
            break;
        case 4:
            points = POINTS.TETRIS;
            break;
    }
    
    score += points * level;
    
    // レベルアップ（10ライン毎）
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel > level) {
        level = newLevel;
        dropInterval = Math.max(100, 1000 - (level - 1) * 50);
    }
    
    updateDisplay();
}

// ========================================
// UI更新
// ========================================
function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('highScore').textContent = highScore;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

// ========================================
// ゲームオーバー
// ========================================
function endGame() {
    gameOver = true;
    isGameStarted = false;
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // ハイスコアの更新
    if (score > highScore) {
        highScore = score;
        saveHighScore();
    }
    
    document.getElementById('finalScore').textContent = score;
    showScreen('gameOverScreen');
}

// ========================================
// 一時停止
// ========================================
function togglePause() {
    if (!isGameStarted || gameOver) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        showScreen('pauseScreen');
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    } else {
        hideScreen('pauseScreen');
        lastTime = performance.now();
        gameLoop();
    }
}

// ========================================
// ローカルストレージ
// ========================================
function saveHighScore() {
    localStorage.setItem('tetrisHighScore', highScore.toString());
}

function loadHighScore() {
    const saved = localStorage.getItem('tetrisHighScore');
    if (saved) {
        highScore = parseInt(saved, 10);
    }
}

// ========================================
// 画面表示制御
// ========================================
function showScreen(screenId) {
    document.getElementById(screenId).classList.remove('hidden');
}

function hideScreen(screenId) {
    document.getElementById(screenId).classList.add('hidden');
}

// ========================================
// キーボード操作
// ========================================
function handleKeyPress(e) {
    if (e.key === 'Enter') {
        if (!isGameStarted || gameOver) {
            startGame();
        }
        return;
    }
    
    if (!isGameStarted || gameOver) return;
    
    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            moveLeft();
            break;
        case 'ArrowRight':
            e.preventDefault();
            moveRight();
            break;
        case 'ArrowDown':
            e.preventDefault();
            moveDown();
            break;
        case 'ArrowUp':
            e.preventDefault();
            rotate();
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            break;
        case 'p':
        case 'P':
            e.preventDefault();
            togglePause();
            break;
    }
}

// ========================================
// タッチ操作
// ========================================
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
}

function handleTouchEnd(e) {
    e.preventDefault();
    
    const touchDuration = Date.now() - touchStartTime;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // タップ判定（短時間で小さい移動）
    if (touchDuration < TAP_THRESHOLD && absDeltaX < 30 && absDeltaY < 30) {
        handleTap();
        return;
    }
    
    // スワイプ判定
    if (absDeltaX > SWIPE_THRESHOLD || absDeltaY > SWIPE_THRESHOLD) {
        // 横方向のスワイプが優先
        if (absDeltaX > absDeltaY) {
            if (deltaX > 0) {
                // 右スワイプ
                moveRight();
            } else {
                // 左スワイプ
                moveLeft();
            }
        } else {
            // 縦方向のスワイプ
            if (deltaY > 0) {
                // 下スワイプ（ハードドロップ）
                hardDrop();
            }
        }
    }
    
    // リセット
    touchStartX = 0;
    touchStartY = 0;
    touchEndX = 0;
    touchEndY = 0;
}

function handleTap() {
    // ゲーム開始前またはゲームオーバー時はゲームを開始
    if (!isGameStarted || gameOver) {
        startGame();
        return;
    }
    
    // ゲーム中はブロックを回転
    if (isGameStarted && !gameOver && !isPaused) {
        rotate();
    }
}

// ========================================
// ページ読み込み時の初期化
// ========================================
window.addEventListener('load', init);