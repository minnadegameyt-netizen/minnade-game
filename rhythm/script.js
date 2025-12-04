import * as twitch from '../../twitch.js';

const CHAR_COUNT = 5;
const NOTES_SPEED_H = 6;
const NOTES_SPEED_V = 8;
const GAME_ROUNDS = 5; // ★ ラウンド数を5に設定

// --- タイミング調整用の設定値 ---
const TIMING_OFFSET_MS = -80;
const AI_CITIZEN_TIMING_ERROR_MS = 0;
const AI_IMPOSTER_TIMING_ERROR_MS = 150;

const GAME_DURATION_SEC = 25;
const GLOBAL_BPM = 110;

const IMAGES = {
    stand: 'img/stand.webp', up: 'img/pose_up.webp', down: 'img/pose_down.webp',
    left: 'img/pose_left.webp', right: 'img/pose_right.webp', fail: 'img/fail.webp',
    run: 'img/run.webp', eat: 'img/eat.webp', sing: 'img/sing.webp',
    samurai: 'img/samurai.webp', type: 'img/type.webp', clap: 'img/clap.webp',
    happy: 'img/face_happy.webp', angry: 'img/face_angry.webp', shock: 'img/face_shock.webp', sleep: 'img/face_sleep.webp',
    win: 'img/win.webp', cry: 'img/cry.webp'
};

const AUDIO = {
    beat: {
        kick: new Audio('bgm/kick.mp3'), snare: new Audio('bgm/snare.mp3'),
        hat: new Audio('bgm/hat.mp3'), clap: new Audio('bgm/clap.mp3'),
        crash: new Audio('bgm/crash.mp3'), tom: new Audio('bgm/tom.mp3'), ride: new Audio('bgm/ride.mp3')
    },
    se: { select: new Audio('bgm/select.mp3'), count: new Audio('bgm/count.mp3'), start: new Audio('bgm/start.mp3'), hit: new Audio('bgm/hit.mp3'), miss: new Audio('bgm/miss.mp3'), win: new Audio('bgm/win.mp3'), lose: new Audio('bgm/lose.mp3') }
};

Object.values(AUDIO.beat).forEach(a => a.volume = 0.5);
Object.values(AUDIO.se).forEach(a => a.volume = 0.6);

function playSe(name) { if(AUDIO.se[name]) AUDIO.se[name].cloneNode().play().catch(()=>{}); }
function playBeatSound(name) { if(AUDIO.beat[name]) AUDIO.beat[name].cloneNode().play().catch(()=>{}); }

// ゲーム定義
const ALL_GAMES = [
    { id: 'dance', name: 'ダンスバトル', desc: '矢印に合わせてキーを押せ！', key: '矢印キー', preview: 'up', mechanic: 'scroll_h', func: startDanceGame },
    { id: 'samurai', name: '侍 (真剣白刃取り)', desc: '「！」が出たらすぐ斬れ！', key: '右キー', preview: 'samurai', mechanic: 'reflex', func: startSamuraiGame },
    { id: 'sync', name: 'シンクロポーズ', desc: 'カウントに合わせてポーズ！', key: '矢印キー', preview: 'up', mechanic: 'memory', func: startSyncGame },
    { id: 'simon', name: 'サイモン (記憶)', desc: 'リズムに合わせて入力せよ！', key: '矢印キー', preview: 'type', mechanic: 'memory_seq', func: startSimonGame },
    { id: 'flag', name: '旗揚げ', desc: '指示に合わせて動け！', key: '矢印キー', preview: 'up', mechanic: 'reflex', func: startFlagGame },
    { id: 'golf', name: '居合切り', desc: '赤ゾーンでスペース！', key: 'SPACE', preview: 'run', mechanic: 'timing', func: startGolfGame },
    { id: 'math', name: '算数ドリル', desc: '答えの数だけ連打！', key: 'SPACE連打', preview: 'eat', mechanic: 'count', func: startMathGame },
    { id: 'chorus', name: 'コーラス', desc: 'バーの間、長押し！', key: '上キー長押し', preview: 'sing', mechanic: 'hold', func: startChorusGame },
    { id: 'eating', name: '早食い競争', desc: 'とにかく連打して食べろ！', key: 'SPACE連打', preview: 'eat', mechanic: 'mash', duration: 10, func: startEatingGame },
    { id: 'daruma', name: 'だるまさんが転んだ', desc: '赤信号で止まれ！', key: '右キー長押し', preview: 'run', mechanic: 'stop', func: startDarumaGame },
];

// --- グローバル状態管理 ---
let gameState = {
    mode: 'solo', // 'solo' or 'streamer'
    playMode: 'ai', // soloモード内でのプレイヤーの役割
    platform: 'youtube', // 'youtube' or 'twitch'
    imposterIndex: -1,
    round: 1,
    selectedGames: [],
    currentModeId: '',
    isGameActive: false,
    isVoting: false,
    voteTimeLimit: 60,
    notes: [],
    noteSpeedH: 5,
    syncTarget: null
};
let characters = [], remainingChars = [0,1,2,3,4];
let gameTimer = null, gameInterval = null, rhythmInterval = null, aiInterval = null, idleInterval = null;
let samuraiState = { waiting: false, signalTime: 0 };
let chorusHolding = false;
let simonSeq = [], simonInputIndex = 0, simonInputActive = false;
let flagTarget = null;
let golfCursorPos = 0, golfDir = 1, golfActive = false;
let mathAnswer = 0, mathCount = 0, mathInputActive = false;
let voteCounts = Array(CHAR_COUNT).fill(0);

// --- YouTube API用 ---
let YOUTUBE_API_KEY = "";
let TARGET_VIDEO_ID = "";
let liveChatId = null;
let nextPageToken = null;
let youtubeInterval = null;

const COMMON_RHYTHM = ['kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat'];

// --- コメント処理 ---
function handleComment(comment) {
    if (!gameState.isVoting) return;
    const match = comment.match(/([1-5])/);
    if (match) {
        const vote = parseInt(match[1]) - 1;
        // 投票画面に表示されているキャラクターへの投票のみ受け付ける
        if (remainingChars.includes(vote)) {
            voteCounts[vote]++;
            updateVoteDisplay(voteCounts);
        }
    }
}

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    if (mode === 'streamer') {
        gameState.mode = 'streamer';
        document.getElementById('streamer-setup-modal').classList.remove('hidden');
        initStreamerSetup();
    } else {
        gameState.mode = 'solo';
        document.getElementById('solo-setup-screen').classList.remove('hidden');
        initSoloSetupUI();
    }
    setupInput();
});

// --- Solo (個人) モード用セットアップ ---
function initSoloSetupUI() {
    const c = document.getElementById('char-selector');
    for(let i=0; i<5; i++) {
        const d = document.createElement('div'); d.className = `setup-char color-${i+1}`;
        d.innerHTML = `<img src="${IMAGES.stand}"><span>${i+1}</span>`;
        d.onclick = () => selectChar(i); c.appendChild(d);
    }
    const m = document.getElementById('mode-list');
    const r = document.createElement('button'); r.className = 'mode-btn'; r.innerHTML = '★ ランダム3戦'; r.onclick = () => selectGame('random', r); m.appendChild(r);
    ALL_GAMES.forEach(g => {
        const b = document.createElement('button'); b.className = 'mode-btn'; b.textContent = g.name; b.onclick = () => selectGame(g.id, b); m.appendChild(b);
    });
    document.getElementById('start-btn').onclick = startSoloSession;
}

// キャラとゲームモードの両方が選択されているかチェックし、スタートボタンの状態を更新する関数
function checkStartButtonState() {
    const startBtn = document.getElementById('start-btn');
    if (!startBtn) return;
    
    const charIsSelected = gameState.imposterIndex !== -1;
    const gameIsSelected = gameState.selectedGames.length > 0;

    startBtn.disabled = !(charIsSelected && gameIsSelected);
}

function selectChar(i) {
    playSe('select');
    gameState.imposterIndex = i;
    gameState.playMode = 'streamer'; // 'streamer'はプレイヤーが操作するという意味で使われている
    document.querySelectorAll('.setup-char').forEach(e => e.classList.remove('selected'));
    document.querySelectorAll('.setup-char')[i].classList.add('selected');
    checkStartButtonState(); // スタートボタンの状態をチェック
}

function selectGame(id, el) {
    playSe('select');
    gameState.selectedGames = id === 'random' ? [...ALL_GAMES].sort(() => 0.5 - Math.random()).slice(0, 3) : [ALL_GAMES.find(g => g.id === id)];
    document.querySelectorAll('.mode-btn').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    checkStartButtonState(); // スタートボタンの状態をチェック
}

// --- Streamer (配信) モード用セットアップ ---
function initStreamerSetup() {
    document.querySelectorAll('#platform-select .mode-btn, #vote-time-select .mode-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.parentElement.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    document.getElementById('streamer-start-btn').onclick = onStreamerSetupDone;
}

async function onStreamerSetupDone() {
    gameState.platform = document.querySelector('#platform-select .selected').dataset.val;
    gameState.voteTimeLimit = parseInt(document.querySelector('#vote-time-select .selected').dataset.val);

    if (gameState.platform === 'youtube') {
        YOUTUBE_API_KEY = sessionStorage.getItem('youtube_api_key');
        TARGET_VIDEO_ID = sessionStorage.getItem('youtube_target_video_id');
        if (!YOUTUBE_API_KEY || !TARGET_VIDEO_ID) {
            alert("YouTube配信設定がトップページでされていません。"); return;
        }
        const connected = await fetchLiveChatId();
        if (!connected) return;
    } else if (gameState.platform === 'twitch') {
        const channel = sessionStorage.getItem('twitch_channel_id');
        if (!channel) {
            alert("Twitchチャンネル名がトップページで設定されていません。"); return;
        }
        try {
            await twitch.connectTwitch(channel, handleComment);
        } catch(e) {
            alert('Twitchへの接続に失敗しました: ' + e); return;
        }
    }
    
    // ★★★ 接続成功後、説明画面を表示 ★★★
    document.getElementById('streamer-setup-modal').classList.add('hidden');
    showExplanationScreen();
}

// ★★★ ゲーム説明画面の表示ロジックを追加 ★★★
function showExplanationScreen() {
    const screen = document.getElementById('explanation-screen');
    const startBtn = document.getElementById('explanation-start-btn');
    
    screen.classList.remove('hidden');
    
    startBtn.onclick = () => {
        playSe('select');
        screen.classList.add('hidden');
        startStreamerSession(); // 説明が終わったらセッション開始
    };
}


// --- 入力処理 ---
function setupInput() {
    document.addEventListener('keydown', e => {
        const soloSetupScreen = document.getElementById('solo-setup-screen');
        if(soloSetupScreen && !soloSetupScreen.classList.contains('hidden')) {
            if(e.key >= '1' && e.key <= '5') selectChar(parseInt(e.key)-1);
            if(e.key === '0') {
                playSe('select');
                gameState.playMode = 'ai';
                gameState.imposterIndex = Math.floor(Math.random()*5);
                gameState.selectedGames = [...ALL_GAMES].sort(()=>0.5-Math.random()).slice(0,3);
                startSoloSession();
            }
        }
        
        const streamerSetupModal = document.getElementById('streamer-setup-modal');
        if (streamerSetupModal && !streamerSetupModal.classList.contains('hidden')) {
            if (e.key >= '1' && e.key <= '5') {
                gameState.imposterIndex = parseInt(e.key) - 1;
                const statusEl = document.getElementById('imposter-select-status');
                if (statusEl) {
                    statusEl.textContent = `${e.key}番 をインポスターに設定しました`;
                    statusEl.style.color = '#00d2d3';
                    statusEl.style.fontWeight = 'bold';
                }
                playSe('select');
            }
        }

        if(gameState.isGameActive) {
            const c = characters.find(c=>c.isPlayer);
            if(c) {
                if(e.key === '6') playPose(c, 'happy');
                if(e.key === '7') playPose(c, 'angry');
                if(e.key === '8') playPose(c, 'shock');
                if(e.key === '9') playPose(c, 'sleep');

                if(gameState.currentModeId === 'chorus' && e.key === 'ArrowUp') chorusHolding = true;
                processAction(gameState.currentModeId, c, e.key, true);
            }
        }
    });
    document.addEventListener('keyup', e => {
        if(gameState.isGameActive) {
            const c = characters.find(c=>c.isPlayer);
            if(c) {
                if(gameState.currentModeId === 'daruma' && e.key === 'ArrowRight') playPose(c, 'stand');
                if(gameState.currentModeId === 'chorus' && e.key === 'ArrowUp') chorusHolding = false;
            }
        }
    });
}

// --- セッション開始 ---
function startSoloSession() {
    playSe('select');

    // 観戦モード（0キー）の場合
    if (gameState.playMode === 'ai' && gameState.imposterIndex !== -1 && gameState.selectedGames.length > 0) {
        document.getElementById('solo-setup-screen').classList.add('hidden');
        startRound();
        return;
    }
    
    // 通常プレイ時のバリデーション
    if (gameState.imposterIndex === -1) {
        alert('キャラクターを選択してください。');
        return;
    }
    if (gameState.selectedGames.length === 0) {
        alert('ゲームモードを選択してください。');
        return;
    }

    document.getElementById('solo-setup-screen').classList.add('hidden');
    startRound();
}

function startStreamerSession() {
    // 配信者が事前に選択していなければランダムで決定
    if (gameState.imposterIndex === -1) {
        gameState.imposterIndex = Math.floor(Math.random() * CHAR_COUNT);
    }
    
    // ★★★ ラウンド数を5に固定 ★★★
    gameState.selectedGames = [...ALL_GAMES].sort(() => 0.5 - Math.random()).slice(0, GAME_ROUNDS);
    gameState.round = 1;
    remainingChars = [0, 1, 2, 3, 4];
    startRound();
}

// --- ラウンド進行 ---
function startRound() {
    // ★★★ 配信モードの終了条件を5ラウンド後に変更 ★★★
    if (gameState.mode === 'streamer' && gameState.round > GAME_ROUNDS) {
        finishStreamerGame();
        return;
    }
    if (gameState.mode === 'solo' && (gameState.round > gameState.selectedGames.length || (gameState.playMode !== 'ai' && remainingChars.length <= 2))) {
        const win = !remainingChars.includes(gameState.imposterIndex);
        showResult(win, win ? "人狼を追放しました！" : "人狼の勝利...");
        return;
    }

    const game = gameState.selectedGames[gameState.round - 1];
    gameState.currentModeId = game.id;

    resetUIForNewGame(game);
    
    // ★★★ ラウンド表示を更新 ★★★
    const roundDisplay = document.getElementById('round-display');
    if (roundDisplay) {
        if(gameState.mode === 'streamer') {
            roundDisplay.textContent = `ROUND ${gameState.round} / ${GAME_ROUNDS}`;
        } else {
             roundDisplay.textContent = `ROUND ${gameState.round}`;
        }
    }


    showReadyScreen(game, () => {
        document.getElementById('ready-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        initCharacters();
        gameState.isGameActive = true;

        startRhythmEngine((step) => { if(game.id === 'dance') onDanceBeat(step); });
        startIdleAI();
        game.func();
        startGameTimer();
    });
}

function finishRound() {
    gameState.isGameActive = false;
    cleanupIntervals();

    if (gameState.mode === 'streamer') {
        gameState.round++;
        setTimeout(startRound, 2000);
    } else {
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('vote-screen').classList.remove('hidden');
        setupVoteScreen();
    }
}

// --- 配信モード専用フロー ---
function finishStreamerGame() {
    cleanupIntervals();
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('vote-screen').classList.remove('hidden');
    startStreamerVotePhase();
}

function startStreamerVotePhase() {
    gameState.isVoting = true;
    document.getElementById('streamer-vote-info').classList.remove('hidden');
    const voteList = document.getElementById('vote-list');
    voteList.innerHTML = '';
    const voteCards = [];
    remainingChars.forEach(id => {
        const card = document.createElement('div');
        card.className = `vote-card color-${id + 1}`;
        card.innerHTML = `<img src="${IMAGES.stand}" style="height:80px;"><div style="font-weight:bold; font-size:1.5em;">${id + 1}</div><div class="vote-bar" id="vote-bar-${id}" style="position:absolute; bottom:0; left:0; width:100%; height:0%; background:rgba(255,255,255,0.3); transition: height 0.5s;"></div>`;
        voteList.appendChild(card);
        voteCards.push(card);
    });

    voteCounts = Array(CHAR_COUNT).fill(0);
    updateVoteDisplay(voteCounts); // UIをリセット

    if (gameState.platform === 'youtube') startYouTubePolling();

    let t = gameState.voteTimeLimit;
    document.getElementById('vote-time').textContent = t;
    const timer = setInterval(() => {
        t--;
        document.getElementById('vote-time').textContent = t;
        if (t <= 0) {
            clearInterval(timer);
            stopYouTubePolling();
            twitch.disconnectTwitch();
            gameState.isVoting = false;

            const totalVotes = voteCounts.reduce((a, b) => a + b, 0);
            let votedIndex = -1; // 誰も投票しなかった場合のデフォルト値
            if (totalVotes > 0) {
                const maxVotes = Math.max(...voteCounts);
                votedIndex = voteCounts.indexOf(maxVotes);
            }
            
            handleVote(votedIndex);
        }
    }, 1000);
}

function updateVoteDisplay(counts) {
    const total = counts.reduce((a, b) => a + b, 0);
    document.getElementById('total-vote-count').textContent = total;
    if (total === 0) {
        // 全員のバーを0にする
        counts.forEach((count, id) => {
            const bar = document.getElementById(`vote-bar-${id}`);
            if (bar) bar.style.height = '0%';
        });
        return;
    }

    counts.forEach((count, id) => {
        const bar = document.getElementById(`vote-bar-${id}`);
        if (bar) {
            bar.style.height = `${(count / total) * 100}%`;
        }
    });
}

// --- YouTube ポーリング ---
async function fetchLiveChatId() {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${TARGET_VIDEO_ID}&key=${YOUTUBE_API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.items && data.items.length > 0 && data.items[0].liveStreamingDetails) {
            liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId;
            return true;
        } else {
            alert("動画が見つからないか、ライブ配信ではありません。Video IDを確認してください。");
            return false;
        }
    } catch (e) {
        alert("YouTube APIの接続に失敗しました。APIキーが正しいか確認してください。");
        return false;
    }
}
function startYouTubePolling() { if(liveChatId) { pollChat(); youtubeInterval = setInterval(pollChat, 5000); } }
function stopYouTubePolling() { if (youtubeInterval) clearInterval(youtubeInterval); youtubeInterval = null; }
async function pollChat() {
    if (!liveChatId) return;
    let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet&key=${YOUTUBE_API_KEY}`;
    if (nextPageToken) url += `&pageToken=${nextPageToken}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.nextPageToken) nextPageToken = data.nextPageToken;
        if (data.items) {
            data.items.forEach(item => handleComment(item.snippet.displayMessage));
        }
    } catch (e) { console.error("Chat polling error:", e); }
}

// --- ここから不足していた関数群 ---

function showReadyScreen(game, cb) {
    const s = document.getElementById('ready-screen'); s.classList.remove('hidden');
    document.getElementById('ready-title').textContent = game.name;
    document.getElementById('ready-desc').textContent = game.desc;
    document.getElementById('preview-img').src = IMAGES[game.preview]||IMAGES.stand;
    document.getElementById('preview-key').textContent = game.key;
    let c = 3; document.getElementById('ready-count').textContent = c; playSe('count');
    const i = setInterval(() => { c--; if(c>0) { document.getElementById('ready-count').textContent = c; playSe('count'); } else { clearInterval(i); document.getElementById('ready-count').textContent = "スタート!"; playSe('start'); setTimeout(cb, 500); } }, 1000);
}

function startGameTimer() {
    const currentGame = ALL_GAMES.find(g => g.id === gameState.currentModeId);
    let t = (currentGame && currentGame.duration) ? currentGame.duration : GAME_DURATION_SEC;
    document.getElementById('game-timer').textContent = t;
    if(gameTimer) clearInterval(gameTimer);
    gameTimer = setInterval(() => {
        t--; document.getElementById('game-timer').textContent = t;
        if(t<=5 && t>0) { document.querySelector('.timer-container').classList.add('timer-warning'); playSe('count'); }
        if(t<=0) { clearInterval(gameTimer); finishRound(); }
    }, 1000);
}

function startRhythmEngine(onBeat) {
    if(rhythmInterval) clearInterval(rhythmInterval);
    const pattern = COMMON_RHYTHM;
    let step = 0;
    const stepDuration = (60000 / GLOBAL_BPM) / 2;
    const play = () => {
        if(pattern[step]) playBeatSound(pattern[step]);
        const bg = document.getElementById('stage-bg');
        if (bg) {
            bg.classList.remove('pulse-active'); void bg.offsetWidth; bg.classList.add('pulse-active');
        }
        if(onBeat) onBeat(step);
        step = (step + 1) % pattern.length;
    };
    play();
    rhythmInterval = setInterval(play, stepDuration);
}

function startIdleAI() {
    if(idleInterval) clearInterval(idleInterval);
    idleInterval = setInterval(() => {
        characters.forEach(c => {
            if(!c.isPlayer) {
                if(Math.random() < 0.1) {
                    const emotions = ['happy', 'angry', 'shock', 'sleep'];
                    const emo = emotions[Math.floor(Math.random() * emotions.length)];
                    playPose(c, emo);
                }
            }
        });
    }, 2000);
}

function cleanupIntervals() {
    if(gameInterval) { clearInterval(gameInterval); gameInterval = null; }
    if(rhythmInterval) { clearInterval(rhythmInterval); rhythmInterval = null; }
    if(gameTimer) { clearInterval(gameTimer); gameTimer = null; }
    if(aiInterval) { clearInterval(aiInterval); aiInterval = null; }
    if(idleInterval) { clearInterval(idleInterval); idleInterval = null; }
    stopYouTubePolling();
    // Twitchは最後に切断
}

function resetUIForNewGame(game) {
    ['daruma-signal','samurai-signal','sync-command','horizontal-bar','vertical-field','simon-display','flag-display','golf-display','math-display'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    if(game.mechanic === 'scroll_h') document.getElementById('horizontal-bar').classList.remove('hidden');
    if(game.mechanic === 'hold') document.getElementById('vertical-field').classList.remove('hidden');
    if(game.id === 'daruma') document.getElementById('daruma-signal').classList.remove('hidden');
    if(game.id === 'samurai') document.getElementById('samurai-signal').classList.add('hidden');
    if(game.id === 'sync') document.getElementById('sync-command').classList.remove('hidden');
    if(game.id === 'simon') document.getElementById('simon-display').classList.remove('hidden');
    if(game.id === 'flag') document.getElementById('flag-display').classList.remove('hidden');
    if(game.id === 'golf') document.getElementById('golf-display').classList.remove('hidden');
    if(game.id === 'math') document.getElementById('math-display').classList.remove('hidden');

    document.getElementById('game-title').textContent = game.name;
    document.getElementById('key-guide').textContent = `操作：${game.key}`;
}

function initCharacters() {
    const c = document.getElementById('char-container'); c.innerHTML = ''; characters = [];
    const charIndexes = (gameState.mode === 'streamer' || gameState.playMode === 'ai') ? [0,1,2,3,4] : remainingChars;

    charIndexes.forEach(i => {
        const d = document.createElement('div'); d.className = `char-box color-${i+1}`;
        d.innerHTML = `<div class="burger-stack"></div><div class="char-hud"><div class="judgement"></div></div><div class="char-num">${i+1}</div><img src="${IMAGES.stand}" id="char-img-${i}" class="char-img"><div class="spotlight"></div>`;
        c.appendChild(d);
        characters.push({
            id:i,
            element:document.getElementById(`char-img-${i}`),
            hud:d.querySelector('.judgement'),
            burgerStack:d.querySelector('.burger-stack'),
            burgerCount:0,
            isImposter: i === gameState.imposterIndex,
            isPlayer: (i === gameState.imposterIndex && gameState.mode === 'streamer') || (i === gameState.imposterIndex && gameState.mode === 'solo' && gameState.playMode === 'streamer'),
            aiParams: {
                baseSpeed: Math.random() * 80 + 120,
                burstiness: Math.random() * 0.5 + 0.1
            }
        });
    });
}

function createNote(type, mechanic, length = 100) {
    const note = document.createElement('div');
    note.className = 'note';

    if (mechanic === 'scroll_h') {
        note.classList.add('horizontal', type);
        note.textContent = getArrowSymbol(type);
        const container = document.getElementById('notes-container-h');
        const startX = document.getElementById('horizontal-bar').offsetWidth;
        note.style.left = startX + 'px';
        container.appendChild(note);
        gameState.notes.push({ el: note, x: startX, y: 0, type: type, mech: 'h', hit: false });
        
        const pureTravelTimeMs = (60000 / GLOBAL_BPM) * 4;

        characters.forEach(c => {
            if (c.isPlayer) return;

            let timingError = 0;
            let action = type;

            if (c.isImposter) {
                timingError = (Math.random() * (AI_IMPOSTER_TIMING_ERROR_MS * 2)) - AI_IMPOSTER_TIMING_ERROR_MS;
                if (Math.random() < 0.4) {
                    const allMoves = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
                    action = allMoves[Math.floor(Math.random() * allMoves.length)];
                }
            } else {
                timingError = (Math.random() * (AI_CITIZEN_TIMING_ERROR_MS * 2)) - AI_CITIZEN_TIMING_ERROR_MS;
            }
            
            const finalDelay = pureTravelTimeMs + timingError;

            setTimeout(() => {
                if(c.element) playPose(c, action);
            }, finalDelay > 0 ? finalDelay : 0);
        });

    } else if (mechanic === 'hold') {
        note.classList.add('long-note');
        note.style.height = length + 'px';
        note.style.top = (-length - 50) + 'px';
        const container = document.getElementById('notes-container-v');
        container.appendChild(note);
        gameState.notes.push({ el: note, y: -length - 50, height: length, mech: 'hold', hit: false });
    }
}

function getArrowSymbol(k) { const s={'ArrowUp':'↑','ArrowDown':'↓','ArrowLeft':'←','ArrowRight':'→'}; return s[k]||'?'; }

function gameLoop() {
    if(!gameState.isGameActive) return;

    if(gameState.currentModeId === 'golf' && golfActive) {
        golfCursorPos += 1.5 * golfDir;
        if(golfCursorPos > 95) golfDir = -1;
        if(golfCursorPos < 0) golfDir = 1;
        const cursor = document.querySelector('.golf-cursor');
        if(cursor) cursor.style.left = golfCursorPos + '%';
        characters.forEach(c => {
            if(!c.isPlayer && !c.golfCooldown) {
                const dist = Math.abs(golfCursorPos - 50);
                if(dist < 10) {
                    const shouldSwing = c.isImposter ? (Math.random() > 0.4) : (Math.random() > 0.05);
                    if(shouldSwing) {
                        playPose(c, 'samurai');
                        c.golfCooldown = true;
                        setTimeout(() => { c.golfCooldown = false; }, 1000);
                    }
                }
            }
        });
    }

    if(gameState.currentModeId === 'samurai' && samuraiState.waiting) {
        if(Date.now() > samuraiState.signalTime) {
            samuraiState.waiting = false;
            const s = document.getElementById('samurai-signal');
            if(s) s.classList.remove('hidden');
            characters.forEach(c => { if(!c.isPlayer) { const react = c.isImposter ? (Math.random()*500 + 100) : (Math.random()*200 + 50); setTimeout(() => playPose(c, 'samurai'), react); } });
            setTimeout(() => { if(s) s.classList.add('hidden'); scheduleSamurai(); }, 1500);
        }
    }

    if(gameState.currentModeId === 'chorus') {
        const myChar = characters.find(c=>c.isPlayer);
        const targetLine = document.querySelector('.sing-target-line');
        if (targetLine) {
            const targetY = targetLine.offsetTop;
            if(myChar) {
                let isOverlapping = false;
                gameState.notes.forEach(n => {
                    const nBottom = n.y + n.height;
                    if(n.y < targetY && nBottom > targetY) isOverlapping = true;
                });
                if(isOverlapping && chorusHolding) playPose(myChar, 'sing');
                else if(!chorusHolding) playPose(myChar, 'stand');
            }
            characters.forEach(c => {
                if(!c.isPlayer) {
                    let shouldSing = false;
                    gameState.notes.forEach(n => {
                        const nBottom = n.y + n.height;
                        if(n.y < targetY && nBottom > targetY) shouldSing = true;
                    });
                    if(shouldSing) {
                        let success = c.isImposter ? (Math.random() > 0.5) : (Math.random() > 0.02);
                        if (success) playPose(c, 'sing'); else playPose(c, 'stand');
                    } else {
                        playPose(c, 'stand');
                    }
                }
            });
        }
    }

    gameState.notes.forEach((note, index) => {
        if(note.mech === 'h') {
            if(note.hit) return;
            note.x -= gameState.noteSpeedH; note.el.style.left = note.x + 'px';
            if(note.x < -100) { note.el.remove(); gameState.notes.splice(index, 1); }
        } else if (note.mech === 'hold') {
            note.y += NOTES_SPEED_V; note.el.style.top = note.y + 'px';
            if(note.y > window.innerHeight) { note.el.remove(); gameState.notes.splice(index, 1); }
        }
    });
    requestAnimationFrame(gameLoop);
}

function startDanceGame() {
    gameState.notes = [];
    const container = document.getElementById('notes-container-h');
    if (container) container.innerHTML = '';
    const bar = document.getElementById('horizontal-bar');
    const targetZone = document.getElementById('target-zone-h');
    if (!bar || !targetZone) return;
    const barWidth = bar.offsetWidth;
    const targetPos = targetZone.offsetLeft;
    const distance = barWidth - targetPos;
    const travelTimeMs = ((60000 / GLOBAL_BPM) * 4) + TIMING_OFFSET_MS;
    const frames = travelTimeMs / (1000/60);
    gameState.noteSpeedH = distance / frames;
    gameLoop();
}

function onDanceBeat(step) {
    if(step === 2 || step === 6) {
        const types = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
        const randomType = types[Math.floor(Math.random()*types.length)];
        setTimeout(() => { createNote(randomType, 'scroll_h'); }, 150);
    }
}

function startSamuraiGame() { scheduleSamurai(); gameLoop(); }
function scheduleSamurai() { samuraiState.waiting = true; samuraiState.signalTime = Date.now() + Math.random() * 3000 + 1000; }

function startSyncGame() {
    gameInterval = setInterval(() => {
        const poses = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        const target = poses[Math.floor(Math.random()*poses.length)];
        const icon = document.querySelector('.sync-icon');
        const countdown = document.querySelector('.sync-countdown');
        icon.textContent = getArrowSymbol(target); icon.style.opacity = '1'; countdown.textContent = "";
        setTimeout(() => { countdown.textContent = "3"; }, 500);
        setTimeout(() => { countdown.textContent = "2"; }, 1500);
        setTimeout(() => { countdown.textContent = "1"; }, 2500);
        setTimeout(() => {
            countdown.textContent = "ポーズ!"; icon.style.opacity = '0.5';
            characters.forEach(c => { if(!c.isPlayer) { const success = c.isImposter ? (Math.random()>0.4) : (Math.random()>0.05); const k = success ? target : 'fail'; setTimeout(() => playPose(c, k), Math.random()*100); } });
            gameState.syncTarget = target;
        }, 3500);
        setTimeout(() => { gameState.syncTarget = null; countdown.textContent = ""; }, 4500);
    }, 5000);
}

function startSimonGame() {
    const display = document.querySelector('.simon-sequence');
    const msg = document.querySelector('.simon-msg');
    if (gameInterval) clearInterval(gameInterval);
    simonSeq = [];
    for(let i = 0; i < 4; i++) { simonSeq.push(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'][Math.floor(Math.random()*4)]); }
    display.textContent = simonSeq.map(getArrowSymbol).join("  ");
    msg.textContent = "覚えろ！";
    simonInputIndex = 0;
    simonInputActive = false;
    setTimeout(() => {
        display.textContent = "????";
        msg.textContent = "準備...";
        let seqIndex = 0;
        const runSequence = () => {
            if(seqIndex >= 4) { msg.textContent = "終了！"; return; }
            let beat = 0;
            const beatInterval = setInterval(() => {
                beat++;
                if(beat <= 3) {
                    msg.textContent = (4 - beat).toString();
                } else {
                    clearInterval(beatInterval);
                    msg.textContent = (seqIndex + 1) + "つ目！"; playSe('start');
                    simonInputActive = true;
                    characters.forEach(c => {
                        if(!c.isPlayer) {
                            let keyToPress = simonSeq[seqIndex];
                            if(c.isImposter && Math.random() > 0.7) keyToPress = 'fail';
                            setTimeout(() => { playPose(c, keyToPress); }, Math.random() * 200);
                        }
                    });
                    seqIndex++;
                    if(seqIndex < 4) {
                        setTimeout(runSequence, 1500);
                    } else {
                        setTimeout(() => { msg.textContent = "終了！"; }, 1500);
                    }
                }
            }, 1000);
        };
        runSequence();
    }, 3000);
}

function startFlagGame() {
    const display = document.querySelector('.flag-text');
    const loop = () => {
        const cmds = [{t:'右あげて', k:'ArrowRight'}, {t:'左あげて', k:'ArrowLeft'}];
        const cmd = cmds[Math.floor(Math.random()*cmds.length)];
        flagTarget = cmd.k;
        display.textContent = cmd.t;
        let beat = 0;
        const beatInterval = setInterval(() => {
            beat++;
            if(beat <= 3) { display.textContent = (4 - beat).toString(); }
            else {
                clearInterval(beatInterval);
                display.textContent = "はい！"; playSe('start');
                characters.forEach(c => {
                    if(!c.isPlayer) {
                        const success = c.isImposter ? (Math.random()>0.5) : (Math.random()>0.02);
                        setTimeout(() => playPose(c, success ? cmd.k : 'fail'), Math.random() * 200);
                    }
                });
            }
        }, 500);
    };
    loop();
    gameInterval = setInterval(loop, 4000);
}

function startGolfGame() {
    golfCursorPos = 0; golfDir = 1; golfActive = true;
    characters.forEach(c => c.golfShot = false);
    document.querySelector('.golf-msg').textContent = "赤でスペース！";
    gameLoop();
}

// script.js の startMathGame 関数をまるごと置き換えてください

function startMathGame() {
    const prob = document.querySelector('.math-problem');
    const eq = document.querySelector('.math-equals');

    const loop = () => {
        // ① 状態リセット
        mathInputActive = false; // カウントダウン中は入力を無効化
        characters.forEach(c => {
            c.burgerCount = 0;
            if (c.burgerStack) c.burgerStack.innerHTML = '';
        });

        // ② 問題作成
        const a = Math.floor(Math.random() * 4) + 1;
        const b = Math.floor(Math.random() * 4) + 1;
        mathAnswer = a + b;
        mathCount = 0;
        prob.textContent = `${a} + ${b}`;
        eq.textContent = "= ?"; // 答えを非表示に

        // ③ カウントダウン開始
        let beat = 0;
        const beatInterval = setInterval(() => {
            beat++;
            if (beat <= 3) {
                eq.textContent = (4 - beat).toString(); // 3, 2, 1 と表示
                // playSe('count'); // カウント音を削除
            } else {
                // ④ スタート
                clearInterval(beatInterval);
                playSe('start');
                eq.textContent = "GO!"; // GO!の表示はそのまま
                mathInputActive = true; // ここで入力受付を開始

                // AIの連打開始
                characters.forEach(c => {
                    if (!c.isPlayer) {
                        let targetCount = mathAnswer;
                        if (c.isImposter && Math.random() > 0.4) {
                            targetCount += (Math.random() > 0.5 ? 1 : -1);
                            if (targetCount < 0) targetCount = 0;
                        }
                        for (let i = 0; i < targetCount; i++) {
                            const delay = (i * 180) + 100 + (Math.random() * 50);
                            setTimeout(() => {
                                if (!gameState.isGameActive) return;
                                playPose(c, 'eat');
                                addBurgerVisual(c);
                            }, delay);
                        }
                    }
                });
                // GO!の後に答えを表示する処理を削除
            }
        }, 1000);
    };

    loop();
    gameInterval = setInterval(loop, 8000);
}

function startChorusGame() {
    gameState.notes = [];
    const container = document.getElementById('notes-container-v');
    if(container) container.innerHTML = '';
    gameInterval = setInterval(() => { createNote('sing', 'hold', Math.random()*200 + 100); }, 3000);
    gameLoop();
}

function startEatingGame() {
    if(aiInterval) clearInterval(aiInterval);
    characters.forEach(c => {
        if (c.isPlayer) return;
        const aiLoop = () => {
            const isSabo = c.isImposter && Math.random() < 0.15;
            if (!isSabo) {
                if(c.element) c.element.src = IMAGES.eat;
                addBurgerVisual(c);
                setTimeout(() => {
                    if (c.element) c.element.src = IMAGES.stand;
                }, c.aiParams.baseSpeed / 2);
            }
            const nextActionDelay = c.aiParams.baseSpeed + (Math.random() - 0.5) * (c.aiParams.baseSpeed * c.aiParams.burstiness);
            if (gameState.isGameActive) {
                c.aiTimeout = setTimeout(aiLoop, nextActionDelay);
            }
        };
        aiLoop();
    });
}

function startDarumaGame() {
    let isSafe = true;
    const updateSignal = () => {
        const sc = document.querySelector('.signal-circle');
        const st = document.querySelector('.signal-text');
        if(isSafe) { sc.style.background = '#00b894'; st.textContent = "進め"; st.style.color = '#00b894'; }
        else { sc.style.background = '#d63031'; st.textContent = "止まれ"; st.style.color = '#d63031'; playSe('miss'); }
    };
    updateSignal();
    gameInterval = setInterval(() => { isSafe = !isSafe; updateSignal(); }, 3000);
    aiInterval = setInterval(() => {
        characters.forEach(c => {
            if (!c.isPlayer) {
                if (isSafe) {
                    if (Math.random() > (c.isImposter ? 0.3 : 0.1)) playPose(c, 'run');
                } else {
                    if (c.isImposter && Math.random() < 0.05) playPose(c, 'fail');
                    else playPose(c, 'stand');
                }
            }
        });
    }, 150);
}

function processAction(mode, char, key, isPlayer=false) {
    let action = null;
    if(['6','7','8','9'].includes(key)) return;

    if(mode === 'dance') {
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) {
            action = key;
            const t = gameState.notes.find(n => !n.hit && n.mech==='h' && n.x < 150 && n.x > 10);
            if(t && t.type===key) { t.hit = true; hitNoteVisual(t); }
        }
    } else if(mode === 'samurai') {
        if(key === 'ArrowRight') {
            action = 'samurai';
            const s = document.getElementById('samurai-signal');
            if(!s.classList.contains('hidden')) { s.classList.add('hidden'); scheduleSamurai(); } else { playPose(char, 'fail'); return; }
        }
    } else if(mode === 'sync') {
        if(gameState.syncTarget) { if(key === gameState.syncTarget) action = key; else action = 'fail'; }
    } else if(mode === 'simon') {
        if(simonInputActive) action = key;
    } else if(mode === 'flag') {
        if(flagTarget) { if(key === flagTarget) action = key; else action = 'fail'; }
    } else if(mode === 'golf') {
        if(key === ' ') action = 'samurai';
    } else if(mode === 'math') {
        if(key === ' ' && mathInputActive) {
            action = 'eat';
            mathCount++;
            addBurgerVisual(char); // プレイヤーのハンバーガーを追加
        }
    } else if(mode === 'eating') {
        if(key === ' ') { action = 'eat'; addBurgerVisual(char); }
    } else if(mode === 'daruma') {
        if(key === 'ArrowRight') action = 'run';
    }

    if(action && mode !== 'chorus') playPose(char, action);
}

function hitNoteVisual(n) {
    n.el.style.transform = 'scale(2)'; n.el.style.opacity = '0';
    const z = document.getElementById('target-zone-h');
    if(z) { z.style.transform = 'translateY(-50%) scale(1.3)'; z.style.borderColor = '#fff'; setTimeout(()=>{z.style.transform='translateY(-50%) scale(1)';z.style.borderColor='#ff7675';n.el.remove();},150); }
}

function playPose(c, t) {
    let k = t;
    if(t==='ArrowUp')k='up'; if(t==='ArrowDown')k='down'; if(t==='ArrowLeft')k='left'; if(t==='ArrowRight')k='right';
    if(c.element) {
        if (c.poseTimeout) clearTimeout(c.poseTimeout);
        c.element.src = IMAGES[k]||IMAGES.stand;
        if(!['fail','cry','win','run'].includes(k) && gameState.currentModeId !== 'chorus' && gameState.currentModeId !== 'eating') {
            c.poseTimeout = setTimeout(()=>{ c.element.src = IMAGES.stand; c.poseTimeout = null; }, 800);
        }
    }
}

function addBurgerVisual(c) {
    if(!c.burgerStack) return;
    c.burgerCount++;
    const LIMIT = 25;
    const col = Math.floor((c.burgerCount - 1) / LIMIT);
    const row = (c.burgerCount - 1) % LIMIT;
    if (col > 2) return;
    const w = document.createElement('div');
    w.className = 'burger-wrapper';
    w.style.bottom = (row * 12) + 'px';
    if (col === 0) w.style.left = '50%';
    else if (col === 1) w.style.left = '25%';
    else w.style.left = '75%';
    w.style.transform = `translateX(-50%) rotate(${(Math.random()-0.5)*20}deg)`;
    w.innerHTML = '<div class="burger-content">🍔</div>';
    c.burgerStack.appendChild(w);
}

function setupVoteScreen() {
    const l = document.getElementById('vote-list'); l.innerHTML = '';
    let t = 15; document.getElementById('vote-time').textContent = t;
    const i = setInterval(() => { t--; document.getElementById('vote-time').textContent = t; if(t<=0) { clearInterval(i); handleVote(remainingChars[0]); } }, 1000);
    remainingChars.forEach(id => {
        const b = document.createElement('div'); b.className = `vote-card color-${id+1}`;
        b.innerHTML = `<img src="${IMAGES.stand}" style="height:80px;"><div style="font-weight:bold; font-size:1.5em;">${id+1}</div>`;
        b.onclick = () => { clearInterval(i); handleVote(id); }; l.appendChild(b);
    });
}

function handleVote(id) {
    playSe('select');
    // idが-1（投票なし）の場合も考慮
    const isCorrect = (id !== -1 && id === gameState.imposterIndex);

    if (gameState.mode === 'streamer') {
        if(id === -1) {
             showResult(false, `投票がありませんでした... 人狼は ${gameState.imposterIndex + 1}番でした。`);
        } else if (isCorrect) {
             showResult(true, `正解！人狼は ${id + 1}番でした！`);
        } else {
             showResult(false, `不正解... 人狼は ${gameState.imposterIndex + 1}番でした。`);
        }
    } else {
        if (isCorrect) {
            showResult(true, "人狼を見事追放しました！");
        } else {
            remainingChars = remainingChars.filter(i => i !== id);
            if (remainingChars.length <= 2) {
                showResult(false, "人狼を見つけられませんでした...");
            } else {
                playSe('miss');
                alert(`不正解！ ${id + 1}番は市民でした。`);
                gameState.round++;
                startRound();
            }
        }
    }
}

function showResult(win, msg) {
    playSe(win?'win':'lose');
    document.getElementById('vote-screen').classList.add('hidden');
    const resultScreen = document.getElementById('result-screen');
    resultScreen.classList.remove('hidden');
    const title = document.getElementById('result-title');
    title.textContent = win ? "勝利！" : "敗北...";
    title.style.color = win ? "#00cec9" : "#ff7675";
    document.getElementById('result-msg').textContent = msg;
}