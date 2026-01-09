/**
 * Sign Language Guessing Game - Client Side Logic
 * 
 * Handles game state, Daily.co video, and real-time communication
 */

// =============================================================================
// Game State
// =============================================================================

const gameState = {
    socket: null,
    roomCode: null,
    userId: null,
    username: null,
    isActor: false,
    isHost: false,
    currentWord: null,
    gameStarted: false,
    dailyCall: null,  // Daily.co call frame instance
    videoUrl: null,   // Daily.co room URL
    players: {},
    timerInterval: null,
    timeRemaining: 60
};


// =============================================================================
// Initialization
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    initializeUIHandlers();
    generateUserId();
});

function generateUserId() {
    gameState.userId = 'user_' + Math.random().toString(36).substr(2, 9);
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

// =============================================================================
// Socket.IO Connection
// =============================================================================

function initializeSocket() {
    gameState.socket = io();

    // Connection events
    gameState.socket.on('connect', () => {
        console.log('Connected to server');
    });

    gameState.socket.on('error', (data) => {
        showNotification(data.message, 'error');
    });

    // Game events
    gameState.socket.on('game-state', handleGameState);
    gameState.socket.on('player-joined', handlePlayerJoined);
    gameState.socket.on('player-left', handlePlayerLeft);
    gameState.socket.on('player-ready-update', handleReadyUpdate);
    gameState.socket.on('game-started', handleGameStarted);
    gameState.socket.on('word-choices', handleWordChoices);
    gameState.socket.on('your-word', handleYourWord);
    gameState.socket.on('round-started', handleRoundStarted);
    gameState.socket.on('guess-made', handleGuessMade);
    gameState.socket.on('correct-guess', handleCorrectGuess);
    gameState.socket.on('hint', handleHint);
    gameState.socket.on('round-ended', handleRoundEnded);
    gameState.socket.on('next-round', handleNextRound);
    gameState.socket.on('game-over', handleGameOver);
    gameState.socket.on('chat-message', handleChatMessage);
}

// =============================================================================
// UI Handlers
// =============================================================================

function initializeUIHandlers() {
    // Lobby
    document.getElementById('createRoomBtn').addEventListener('click', createRoom);
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    
    // Waiting Room
    document.getElementById('copyCodeBtn').addEventListener('click', copyRoomCode);
    document.getElementById('readyBtn').addEventListener('click', toggleReady);
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('leaveLobbyBtn').addEventListener('click', leaveLobby);
    
    // Game
    document.getElementById('sendGuessBtn').addEventListener('click', sendGuess);
    document.getElementById('guessInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendGuess();
    });
    document.getElementById('toggleVideoBtn').addEventListener('click', toggleVideo);
    
    // Game Over
    document.getElementById('playAgainBtn').addEventListener('click', playAgain);
    document.getElementById('exitGameBtn').addEventListener('click', exitGame);
    
    // Room code formatting
    document.getElementById('roomCodeInput').addEventListener('input', formatRoomCodeInput);
}

function formatRoomCodeInput(e) {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 4) {
        value = value.slice(0, 4) + '-' + value.slice(4, 8);
    }
    e.target.value = value;
}

// =============================================================================
// Room Management
// =============================================================================

async function createRoom() {
    const username = document.getElementById('usernameCreate').value.trim();
    if (!username) {
        showNotification('Please enter your name', 'error');
        return;
    }

    gameState.username = username;
    gameState.roomCode = generateRoomCode();
    gameState.isHost = true;  // Creator is the host

    joinGameRoom();
}

async function joinRoom() {
    const username = document.getElementById('usernameJoin').value.trim();
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();

    if (!username) {
        showNotification('Please enter your name', 'error');
        return;
    }
    if (!roomCode || roomCode.length < 9) {
        showNotification('Please enter a valid room code', 'error');
        return;
    }

    gameState.username = username;
    gameState.roomCode = roomCode;
    gameState.isHost = false;  // Joiner is not the host

    joinGameRoom();
}

function joinGameRoom() {
    gameState.socket.emit('join-game', {
        roomCode: gameState.roomCode,
        userId: gameState.userId,
        username: gameState.username
    });

    showSection('waitingRoom');
    document.getElementById('displayRoomCode').textContent = gameState.roomCode;
    
    // Show/hide host-only controls
    const difficultySection = document.querySelector('.difficulty-select');
    const startBtn = document.getElementById('startGameBtn');
    
    if (gameState.isHost) {
        difficultySection.classList.remove('hidden');
    } else {
        difficultySection.classList.add('hidden');
        startBtn.classList.add('hidden');  // Non-hosts never see start button
    }
}

function copyRoomCode() {
    navigator.clipboard.writeText(gameState.roomCode);
    showNotification('Room code copied!', 'success');
}

function copyGameRoomCode() {
    const roomCode = document.getElementById('gameRoomCode').textContent;
    navigator.clipboard.writeText(roomCode);
    showNotification('Room code copied! Share it with friends to join mid-game!', 'success');
}

function toggleReady() {
    const btn = document.getElementById('readyBtn');
    const isReady = btn.classList.toggle('ready');
    btn.textContent = isReady ? 'Not Ready' : 'Ready!';
    
    gameState.socket.emit('player-ready', {
        roomCode: gameState.roomCode,
        userId: gameState.userId,
        isReady: isReady
    });
}

function startGame() {
    const difficulty = document.getElementById('difficultySelect').value;
    gameState.socket.emit('start-game', {
        roomCode: gameState.roomCode,
        difficulty: difficulty
    });
}

function leaveLobby() {
    gameState.socket.emit('leave-game', {
        roomCode: gameState.roomCode,
        userId: gameState.userId
    });
    
    cleanup();
    showSection('lobby');
}

// =============================================================================
// Daily.co Video Handling
// =============================================================================

function initializeDailyVideo(videoUrl) {
    if (!videoUrl) {
        console.error('No video URL provided');
        return;
    }
    
    // Don't initialize if already done
    if (gameState.videoUrl === videoUrl) {
        console.log('Daily.co already initialized');
        return;
    }
    
    gameState.videoUrl = videoUrl;
    const iframe = document.getElementById('daily-iframe');
    const loadingDiv = document.getElementById('video-loading');
    
    // Hide loading message
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
    
    // Show and set iframe src to Daily.co room URL
    if (iframe) {
        iframe.style.display = 'block';
        iframe.src = videoUrl;
        console.log('Daily.co video initialized:', videoUrl);
    }
}

function leaveDailyVideo() {
    const iframe = document.getElementById('daily-iframe');
    const loadingDiv = document.getElementById('video-loading');
    
    if (iframe) {
        iframe.src = '';
        iframe.style.display = 'none';
    }
    
    if (loadingDiv) {
        loadingDiv.style.display = 'block';
    }
    
    gameState.videoUrl = null;
    gameState.dailyCall = null;
}

function toggleVideo() {
    // With Daily.co, video controls are handled by their prebuilt UI
    showNotification('Use the Daily.co controls to toggle video', 'info');
}

function toggleAudio() {
    // Audio is disabled - video only mode
    showNotification('This is a video-only game - no audio', 'info');
}

// =============================================================================
// Game Event Handlers
// =============================================================================

function handleGameState(data) {
    gameState.players = {};
    
    for (const [id, player] of Object.entries(data.players)) {
        gameState.players[id] = {
            username: player.username,
            score: player.score,
            isReady: player.is_ready,
            isActor: data.current_actor === id
        };
    }
    
    updatePlayersList();
    updateLeaderboard(data.leaderboard);
    
    // Initialize Daily.co video if URL is provided
    if (data.video_url && !gameState.videoUrl) {
        initializeDailyVideo(data.video_url);
    }
    
    // Check if all players are ready and show start button for host
    if (gameState.isHost && !data.game_started) {
        const allReady = Object.values(gameState.players).every(p => p.isReady);
        const enoughPlayers = Object.keys(gameState.players).length >= 2;
        const startBtn = document.getElementById('startGameBtn');
        
        if (allReady && enoughPlayers) {
            startBtn.classList.remove('hidden');
            startBtn.disabled = false;
        } else {
            startBtn.classList.add('hidden');
            startBtn.disabled = true;
        }
    }
    
    // Check if this is a mid-game join
    if (data.is_mid_game_join && data.game_started && !data.game_ended) {
        console.log('Mid-game join detected, entering active game...');
        gameState.gameStarted = true;
        
        // Show game area instead of waiting room
        showSection('gameArea');
        document.getElementById('gameRoomCode').textContent = gameState.roomCode;
        document.getElementById('maxRounds').textContent = data.max_rounds;
        document.getElementById('currentRound').textContent = data.current_round || 1;
        
        // Set up actor UI
        if (data.current_actor) {
            gameState.isActor = data.current_actor === gameState.userId;
            updateActorUI(data.current_actor);
        }
        
        // Set up round info if available
        if (data.round_info) {
            const guessInput = document.getElementById('guessInput');
            const guessBtn = document.getElementById('sendGuessBtn');
            
            if (gameState.isActor) {
                guessInput.disabled = true;
                guessInput.placeholder = "You're acting this round!";
                guessBtn.disabled = true;
            } else {
                guessInput.disabled = false;
                guessInput.placeholder = `Guess the ${data.round_info.category} (${data.round_info.word_length} letters)`;
                guessBtn.disabled = false;
            }
            
            // Start timer with remaining time
            if (data.round_info.time_remaining > 0) {
                startTimer(data.round_info.time_remaining);
            }
        }
        
        addChatMessage('system', 'You joined the game in progress!');
    }
}

function handlePlayerJoined(data) {
    gameState.players[data.userId] = {
        username: data.username,
        score: 0,
        isReady: false,
        isActor: false
    };
    
    updatePlayersList();
    
    // Different message for mid-game join
    if (data.isMidGameJoin) {
        addChatMessage('system', `${data.username} joined the game in progress!`);
    } else {
        addChatMessage('system', `${data.username} joined the game`);
    }
    
    // With Daily.co, no need to manage participants grid
    if (gameState.gameStarted) {
        console.log('Player joined during game');
    }
}

function handlePlayerLeft(data) {
    const player = gameState.players[data.userId];
    if (player) {
        addChatMessage('system', `${player.username} left the game`);
        delete gameState.players[data.userId];
    }
    
    updatePlayersList();
    
    if (data.gameState && data.gameState.leaderboard) {
        updateLeaderboard(data.gameState.leaderboard);
    }
}

function handleReadyUpdate(data) {
    if (gameState.players[data.userId]) {
        gameState.players[data.userId].isReady = data.isReady;
    }
    
    updatePlayersList();
    
    // Show/hide start button for HOST ONLY when all players are ready
    if (gameState.isHost) {
        const startBtn = document.getElementById('startGameBtn');
        const playerCount = Object.keys(gameState.players).length;
        
        console.log('Ready update - Host:', gameState.isHost, 'All ready:', data.allReady, 'Players:', playerCount);
        
        if (data.allReady && playerCount >= 2) {
            console.log('Showing start button');
            startBtn.classList.remove('hidden');
            startBtn.disabled = false;
        } else {
            startBtn.disabled = true;
            // Keep button visible for host but disabled if not ready
            if (!data.allReady) {
                console.log('Hiding start button - not all ready');
                startBtn.classList.add('hidden');
            }
        }
    }
}

function handleGameStarted(data) {
    gameState.gameStarted = true;
    showSection('gameArea');
    
    document.getElementById('gameRoomCode').textContent = gameState.roomCode;
    document.getElementById('maxRounds').textContent = data.gameState.max_rounds;
    
    updateLeaderboard(data.gameState.leaderboard);
    
    // Check if we're the actor
    gameState.isActor = data.actorId === gameState.userId;
    updateActorUI(data.actorId);
}

function handleWordChoices(data) {
    if (!gameState.isActor) return;
    
    const container = document.getElementById('wordChoices');
    container.innerHTML = '';
    
    data.words.forEach(word => {
        const btn = document.createElement('button');
        btn.className = 'word-choice-btn';
        btn.innerHTML = `
            <span class="word">${word.word}</span>
            <span class="category">${word.category}</span>
        `;
        btn.addEventListener('click', () => selectWord(word));
        container.appendChild(btn);
    });
    
    document.getElementById('wordSelectionModal').classList.remove('hidden');
}

function selectWord(word) {
    gameState.socket.emit('select-word', {
        roomCode: gameState.roomCode,
        userId: gameState.userId,
        word: word
    });
    
    document.getElementById('wordSelectionModal').classList.add('hidden');
}

function handleYourWord(data) {
    if (!gameState.isActor) return;
    
    gameState.currentWord = data.word;
    document.getElementById('wordCategory').textContent = data.category;
    document.getElementById('wordToAct').textContent = data.word.toUpperCase();
    document.getElementById('wordDisplay').classList.remove('hidden');
}

function handleRoundStarted(data) {
    document.getElementById('currentRound').textContent = data.roundNumber;
    
    // Update actor display
    gameState.isActor = data.actorId === gameState.userId;
    updateActorUI(data.actorId);
    
    // Start timer
    startTimer(60);
    
    // Disable/enable guess input based on role
    const guessInput = document.getElementById('guessInput');
    const guessBtn = document.getElementById('sendGuessBtn');
    
    if (gameState.isActor) {
        guessInput.disabled = true;
        guessInput.placeholder = "You're acting this round!";
        guessBtn.disabled = true;
    } else {
        guessInput.disabled = false;
        guessInput.placeholder = `Guess the ${data.category} (${data.wordLength} letters)`;
        guessBtn.disabled = false;
    }
    
    addChatMessage('system', `Round ${data.roundNumber} started! Category: ${data.category}`);
}

function handleGuessMade(data) {
    addChatMessage(data.username, data.guess, false);
}

function handleCorrectGuess(data) {
    addChatMessage('correct', `🎉 ${data.username} guessed correctly! +${data.points} points`);
    updateLeaderboard(data.leaderboard);
}

function handleHint(data) {
    addChatMessage('hint', `💡 Hint: ${data.hint}`);
}

function handleRoundEnded(data) {
    stopTimer();
    
    // Show word reveal overlay
    document.getElementById('revealedWord').textContent = data.word.toUpperCase();
    
    const stats = document.getElementById('roundStats');
    const correctCount = data.summary.correct_guessers ? data.summary.correct_guessers.length : 0;
    stats.textContent = `${correctCount} player(s) guessed correctly`;
    
    if (data.gameEnded) {
        document.getElementById('nextRoundInfo').textContent = 'Game Over!';
    } else {
        document.getElementById('nextRoundInfo').textContent = 'Next round starting in 5 seconds...';
    }
    
    document.getElementById('wordRevealOverlay').classList.remove('hidden');
    document.getElementById('wordDisplay').classList.add('hidden');
    
    // Hide overlay after delay
    setTimeout(() => {
        document.getElementById('wordRevealOverlay').classList.add('hidden');
    }, 5000);
    
    updateLeaderboard(data.gameState.leaderboard);
}

function handleNextRound(data) {
    gameState.isActor = data.actorId === gameState.userId;
    updateActorUI(data.actorId);
    
    if (gameState.isActor) {
        handleWordChoices(data);
    }
}

function handleGameOver(data) {
    document.getElementById('wordRevealOverlay').classList.add('hidden');
    
    const winner = data.results.winner;
    const announcement = document.getElementById('winnerAnnouncement');
    announcement.innerHTML = `
        <div class="winner-trophy">🏆</div>
        <div class="winner-name">${winner ? winner.username : 'No winner'}</div>
        <div class="winner-score">${winner ? winner.score + ' points' : ''}</div>
    `;
    
    const leaderboard = document.getElementById('finalLeaderboard');
    leaderboard.innerHTML = data.results.leaderboard.map((p, i) => `
        <div class="final-rank ${i === 0 ? 'first' : ''}">
            <span class="rank">#${p.rank}</span>
            <span class="name">${p.username}</span>
            <span class="score">${p.score}</span>
        </div>
    `).join('');
    
    document.getElementById('gameOverOverlay').classList.remove('hidden');
}

function handleChatMessage(data) {
    addChatMessage(data.username, data.message);
}

// =============================================================================
// Game Actions
// =============================================================================

function sendGuess() {
    const input = document.getElementById('guessInput');
    const guess = input.value.trim();
    
    if (!guess || gameState.isActor) return;
    
    gameState.socket.emit('submit-guess', {
        roomCode: gameState.roomCode,
        userId: gameState.userId,
        guess: guess
    });
    
    input.value = '';
}

function requestHint() {
    // Hints are now automatic at 30s and 20s remaining
    showNotification('Hints appear automatically at 30s and 20s remaining', 'info');
}

function playAgain() {
    document.getElementById('gameOverOverlay').classList.add('hidden');
    gameState.gameStarted = false;
    showSection('waitingRoom');
}

function exitGame() {
    gameState.socket.emit('leave-game', {
        roomCode: gameState.roomCode,
        userId: gameState.userId
    });
    
    cleanup();
    showSection('lobby');
}

// =============================================================================
// UI Updates
// =============================================================================

function showSection(sectionId) {
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
}

function updatePlayersList() {
    const list = document.getElementById('playersList');
    list.innerHTML = '';
    
    Object.entries(gameState.players).forEach(([id, player]) => {
        const li = document.createElement('li');
        li.className = player.isReady ? 'ready' : '';
        li.innerHTML = `
            <span class="player-name">${player.username}</span>
            <span class="player-status">${player.isReady ? '✅' : '⏳'}</span>
            ${id === gameState.userId ? '<span class="you-badge">(You)</span>' : ''}
        `;
        list.appendChild(li);
    });
    
    document.getElementById('playerCount').textContent = Object.keys(gameState.players).length;
}

function updateLeaderboard(leaderboard) {
    const list = document.getElementById('leaderboard');
    list.innerHTML = '';
    
    leaderboard.forEach((player, i) => {
        const li = document.createElement('li');
        li.className = player.user_id === gameState.userId ? 'you' : '';
        li.innerHTML = `
            <span class="rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1)}</span>
            <span class="name">${player.username}</span>
            <span class="score">${player.score}</span>
        `;
        list.appendChild(li);
    });
}

function updateActorUI(actorId) {
    const actor = gameState.players[actorId];
    
    // Update who's the actor in player state
    Object.entries(gameState.players).forEach(([id, player]) => {
        player.isActor = id === actorId;
    });
    
    // With Daily.co, all video is handled in the iframe
    // We just need to update game state
    console.log('Actor updated:', actor ? actor.username : 'Unknown');
}

function addChatMessage(sender, message, isGuess = true) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    
    if (sender === 'system') {
        div.className = 'chat-message system';
        div.innerHTML = `<span class="message">${message}</span>`;
    } else if (sender === 'correct') {
        div.className = 'chat-message correct';
        div.innerHTML = `<span class="message">${message}</span>`;
    } else if (sender === 'hint') {
        div.className = 'chat-message hint';
        div.innerHTML = `<span class="message">${message}</span>`;
    } else {
        div.className = 'chat-message';
        div.innerHTML = `
            <span class="sender">${sender}:</span>
            <span class="message">${message}</span>
        `;
    }
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showNotification(message, type = 'info') {
    // Simple notification
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// =============================================================================
// Timer
// =============================================================================

function startTimer(seconds) {
    // Clear any existing timer first
    stopTimer();
    
    gameState.timeRemaining = seconds;
    gameState.timerMaxSeconds = seconds; // Store max for percentage calculation
    gameState.hintsShown = 0;  // Reset hints shown for this round
    
    const timerBar = document.getElementById('timerBar');
    const timerText = document.getElementById('timerText');
    
    timerBar.style.width = '100%';
    timerBar.classList.remove('warning');
    timerText.textContent = seconds;
    
    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        
        if (gameState.timeRemaining < 0) {
            stopTimer();
            return;
        }
        
        timerText.textContent = gameState.timeRemaining;
        timerBar.style.width = (gameState.timeRemaining / gameState.timerMaxSeconds * 100) + '%';
        
        // Automatic hints: first at 30s remaining, second at 20s remaining
        if (gameState.timeRemaining === 30 && gameState.hintsShown < 1) {
            gameState.hintsShown = 1;
            gameState.socket.emit('request-hint', {
                roomCode: gameState.roomCode,
                hintNumber: 1
            });
        } else if (gameState.timeRemaining === 20 && gameState.hintsShown < 2) {
            gameState.hintsShown = 2;
            gameState.socket.emit('request-hint', {
                roomCode: gameState.roomCode,
                hintNumber: 2
            });
        }
        
        if (gameState.timeRemaining <= 10) {
            timerBar.classList.add('warning');
        }
        
        if (gameState.timeRemaining <= 0) {
            stopTimer();
            gameState.socket.emit('time-up', {
                roomCode: gameState.roomCode
            });
        }
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    document.getElementById('timerBar').classList.remove('warning');
}

// =============================================================================
// Cleanup
// =============================================================================
// Connection Health Check
// =============================================================================

let connectionCheckInterval = null;

function startConnectionHealthCheck() {
    // Clear any existing interval
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
    }
    
    // Check connections every 5 seconds
    connectionCheckInterval = setInterval(() => {
        if (!gameState.roomCode || Object.keys(gameState.players).length <= 1) return;
        
        console.log('Checking connection health...');
        
        Object.keys(gameState.players).forEach(playerId => {
            if (playerId === gameState.userId) return;
            
            const pc = gameState.peerConnections[playerId];
            
            // If no connection exists or connection failed, try to reconnect
            if (!pc || pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
                console.log(`Reconnecting to ${playerId} (state: ${pc ? pc.connectionState : 'none'})`);
                delete gameState.peerConnections[playerId];
                initiateConnection(playerId);
            }
        });
        
        // Update participants grid to refresh video states
        if (gameState.gameStarted) {
            updateParticipantsGrid();
        }
    }, 5000);
}

// =============================================================================

function cleanup() {
    stopTimer();
    
    // Leave Daily.co room
    leaveDailyVideo();
    
    // Reset state
    gameState.players = {};
    gameState.roomCode = null;
    gameState.gameStarted = false;
    gameState.isActor = false;
    gameState.isHost = false;
    gameState.currentWord = null;
    
    // Hide overlays
    document.getElementById('wordRevealOverlay').classList.add('hidden');
    document.getElementById('gameOverOverlay').classList.add('hidden');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (gameState.roomCode) {
        gameState.socket.emit('leave-game', {
            roomCode: gameState.roomCode,
            userId: gameState.userId
        });
    }
    cleanup();
});
