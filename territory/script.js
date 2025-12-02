// ★Twitchモジュールをインポート
import * as twitch from '../twitch.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 設定 ---
    const GRID_SIZE = 16; 
    const DISPLAY_SIZE = 600; 
    const CELL_SIZE = DISPLAY_SIZE / GRID_SIZE; 
    const DEMO_BOT_INTERVAL = 800;
    
    // --- 色定義 ---
    const COLORS = {
        0: '#2d3748', 1: '#e53e3e', 2: '#4299e1', 3: '#48bb78', 4: '#ecc94b', 
        9: '#805ad5' 
    };

    const NUMBER_COLOR_ON_PAINTED = '#dfe6e9';
    const NUMBER_COLOR_ON_EMPTY = '#dfe6e9';

    // --- ゲーム状態 ---
    let mapData = []; 
    let gameMode = 'demo'; 
    let isGameRunning = false;
    let gameDuration = 300;
    let timeRemaining = 300;
    let maxPlayers = 4;
    let useEvents = true;
    
    // --- プレイヤー管理 ---
    const players = {}; 
    const playerSlots = [null, null, null, null, null]; 
    let entryCount = 0; 
    let streamerIdentifier = null;

    // --- API用 ---
    let platform = 'youtube'; // ★追加
    let TWITCH_CHANNEL_ID = ""; // ★追加
    let YOUTUBE_API_KEY = "", TARGET_VIDEO_ID = "", liveChatId = null, nextPageToken = null;
    let intervals = [];

    // --- 音声 ---
    const sfx = {
        count: new Audio('bgm/count.mp3'),
        start: new Audio('bgm/start.mp3'),
        paint: new Audio('bgm/paint.mp3'),
        join: new Audio('bgm/join.mp3'),
        finish: new Audio('bgm/finish.mp3'),
        item: new Audio('bgm/item.mp3')
    };
    function playSe(name) {
        if(sfx[name]) { sfx[name].currentTime = 0; sfx[name].play().catch(()=>{}); }
    }

    // --- DOM要素 ---
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const chatList = document.getElementById('chat-list');
    
    // --- 高解像度ディスプレイ対応 ---
    function setupCanvasHiDPI() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = DISPLAY_SIZE * dpr;
        canvas.height = DISPLAY_SIZE * dpr;
        canvas.style.width = `${DISPLAY_SIZE}px`;
        canvas.style.height = `${DISPLAY_SIZE}px`;
        ctx.scale(dpr, dpr);
    }

    // --- 初期化 ---
    function init() {
        setupCanvasHiDPI();
        const urlParams = new URLSearchParams(window.location.search);
        const initialMode = urlParams.get('mode');
        if (initialMode === 'stream') {
            setMode('stream');
        } else {
            setMode('demo');
        }

        document.getElementById('mode-demo').addEventListener('click', () => setMode('demo'));
        document.getElementById('mode-stream').addEventListener('click', () => setMode('stream'));
        
        // ★プラットフォーム選択
        const platformGroup = document.getElementById('platform-group');
        if(platformGroup) {
            platformGroup.addEventListener('click', (e) => {
                if(e.target.tagName === 'BUTTON') {
                    platformGroup.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                    e.target.classList.add('selected');
                    platform = e.target.dataset.val;
                }
            });
        }
        
        document.getElementById('player-2').addEventListener('click', () => setPlayerCount(2));
        document.getElementById('player-4').addEventListener('click', () => setPlayerCount(4));

        document.getElementById('event-on').addEventListener('click', () => {
            useEvents = true;
            document.getElementById('event-on').classList.add('selected');
            document.getElementById('event-off').classList.remove('selected');
        });
        document.getElementById('event-off').addEventListener('click', () => {
            useEvents = false;
            document.getElementById('event-off').classList.add('selected');
            document.getElementById('event-on').classList.remove('selected');
        });

        document.getElementById('time-180').addEventListener('click', () => setTime(180));
        document.getElementById('time-300').addEventListener('click', () => setTime(300));
        document.getElementById('time-600').addEventListener('click', () => setTime(600));
        
        document.getElementById('next-btn').addEventListener('click', onNextStep);
        document.getElementById('back-to-setup').addEventListener('click', () => {
            document.getElementById('entry-modal').classList.add('hidden');
            document.getElementById('setup-modal').classList.remove('hidden');
            intervals.forEach(clearInterval);
            intervals = [];
            // ★戻る時にTwitch切断
            if(platform === 'twitch') twitch.disconnectTwitch();
        });
        document.getElementById('start-game-btn').addEventListener('click', startGame);

        // リロードボタン（結果画面）
        const reloadBtn = document.getElementById('reload-btn');
        if(reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                if(platform === 'twitch') twitch.disconnectTwitch();
                location.reload();
            });
        }

        canvas.addEventListener('mousedown', onCanvasClick);
        canvas.addEventListener('contextmenu', e => { e.preventDefault(); onCanvasClick(e); });

        resetGame();
        render(); 
    }

    // --- キック機能 ---
    window.kickPlayer = function(slotNum) {
        if (slotNum === 1 && streamerIdentifier) {
            alert('配信者はキックできません。');
            return;
        }

        const name = playerSlots[slotNum];
        if (!name) return;
        for (let id in players) {
            if (players[id] === slotNum) { delete players[id]; break; }
        }
        playerSlots[slotNum] = null;
        entryCount--;
        updateSlotDisplay(slotNum, null);
        document.getElementById('start-game-btn').disabled = true;
        document.getElementById('start-game-btn').classList.remove('pulse-anim');
        playSe('count'); 
    };

    function setMode(mode) {
        gameMode = mode;
        document.querySelectorAll('#mode-demo, #mode-stream').forEach(b => b.classList.remove('selected'));
        document.getElementById(`mode-${mode}`).classList.add('selected');
        document.getElementById('mode-desc').textContent = mode === 'demo' ? "AI同士が戦う様子を観戦します。" : "YouTubeのコメントで視聴者が参加します。";

        const streamerIdSetting = document.getElementById('streamer-id-setting');
        const platformSetting = document.getElementById('platform-setting'); // ★
        
        if (streamerIdSetting) streamerIdSetting.style.display = (mode === 'stream') ? 'block' : 'none';
        if (platformSetting) platformSetting.style.display = (mode === 'stream') ? 'block' : 'none';
    }

    function setPlayerCount(n) {
        maxPlayers = n;
        document.querySelectorAll('#player-2, #player-4').forEach(b => b.classList.remove('selected'));
        document.getElementById(`player-${n}`).classList.add('selected');
    }

    function setTime(sec) {
        gameDuration = sec;
        document.querySelectorAll('#time-180, #time-300, #time-600').forEach(b => b.classList.remove('selected'));
        document.getElementById(`time-${sec}`).classList.add('selected');
    }

    async function onNextStep() {
        if (gameMode === 'stream') {
            const streamerIdInput = document.getElementById('streamer-id-input');
            let input = streamerIdInput ? streamerIdInput.value.trim() : null;
            if (input && input.startsWith('@')) {
                input = input.substring(1);
            }
            streamerIdentifier = input;
        } else {
            streamerIdentifier = null;
        }

        if (gameMode === 'demo') {
            document.getElementById('setup-modal').classList.add('hidden');
            startGame();
        } else {
            // ★配信接続チェック
            if (platform === 'youtube') {
                YOUTUBE_API_KEY = sessionStorage.getItem('youtube_api_key');
                TARGET_VIDEO_ID = sessionStorage.getItem('youtube_target_video_id');
                if (!YOUTUBE_API_KEY || !TARGET_VIDEO_ID) {
                    alert("配信設定がありません。");
                    return;
                }
                document.getElementById('setup-modal').classList.add('hidden');
                document.getElementById('entry-modal').classList.remove('hidden');
                initEntryScreen();
                startYouTubeConnection();

            } else if (platform === 'twitch') {
                TWITCH_CHANNEL_ID = sessionStorage.getItem('twitch_channel_id');
                if (!TWITCH_CHANNEL_ID) {
                    alert('Twitchチャンネル名が設定されていません。'); return;
                }
                try {
                    await twitch.connectTwitch(TWITCH_CHANNEL_ID, handleTwitchMessage);
                    document.getElementById('setup-modal').classList.add('hidden');
                    document.getElementById('entry-modal').classList.remove('hidden');
                    initEntryScreen();
                } catch(e) {
                    alert('Twitchへの接続に失敗しました: ' + e);
                }
            }
        }
    }

    function initEntryScreen() {
        entryCount = 0;
        for(let key in players) delete players[key];
        for(let i=1; i<=4; i++) {
            playerSlots[i] = null;
            updateSlotDisplay(i, null);
        }

        if (gameMode === 'stream' && streamerIdentifier) {
            const streamerTempName = "配信者 (待機中)";
            playerSlots[1] = streamerTempName;
            players['STREAMER_PLACEHOLDER'] = 1;
            updateSlotDisplay(1, streamerTempName);
            entryCount++;
        }

        document.getElementById('slot-3').style.display = (maxPlayers >= 3) ? 'flex' : 'none';
        document.getElementById('slot-4').style.display = (maxPlayers >= 4) ? 'flex' : 'none';
        document.getElementById('start-game-btn').disabled = true;
    }

    function updateSlotDisplay(num, name) {
        const slotEl = document.getElementById(`slot-${num}`);
        const nameEl = slotEl.querySelector('.slot-name');
        const btnEl = slotEl.querySelector('.kick-btn');
        if (name) {
            nameEl.textContent = name;
            slotEl.className = `entry-slot filled slot-anim`;
            slotEl.style.borderColor = COLORS[num];
            slotEl.style.color = COLORS[num];
            btnEl.style.display = 'block';
        } else {
            nameEl.textContent = `Player ${num} (待機中...)`;
            slotEl.className = `entry-slot empty`;
            slotEl.style.borderColor = '#4a5568';
            slotEl.style.color = '#718096';
            btnEl.style.display = 'none';
        }
    }

    function startGame() {
        document.getElementById('entry-modal').classList.add('hidden');
        document.getElementById('setup-modal').classList.add('hidden');
        resetGameMap();
        
        const overlay = document.getElementById('countdown-overlay');
        const text = document.getElementById('countdown-text');
        overlay.classList.remove('hidden');
        
        let count = 3;
        text.textContent = count;
        playSe('count');

        const cdInterval = setInterval(() => {
            count--;
            if(count > 0) {
                text.textContent = count;
                playSe('count');
            } else {
                clearInterval(cdInterval);
                text.textContent = "START!";
                playSe('start');
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    startRealGame();
                }, 1000);
            }
        }, 1000);
    }

    function startRealGame() {
        isGameRunning = true;
        timeRemaining = gameDuration;
        
        const timerId = setInterval(() => {
            timeRemaining--;
            const m = Math.floor(timeRemaining / 60);
            const s = timeRemaining % 60;
            document.getElementById('time-display').textContent = `${m}:${s.toString().padStart(2, '0')}`;
            if (timeRemaining <= 0) endGame();
        }, 1000);
        intervals.push(timerId);

        if (useEvents) {
            spawnItem();
            spawnItem();
            spawnItem();
            const itemInterval = setInterval(spawnItem, 8000);
            intervals.push(itemInterval);
        }

        render();
        if (gameMode === 'demo') {
            startDemoBot();
        }
    }

    function spawnItem() {
        const emptyCells = [];
        for(let y=0; y<GRID_SIZE; y++) {
            for(let x=0; x<GRID_SIZE; x++) {
                if(mapData[y][x] === 0) emptyCells.push({x,y});
            }
        }
        if(emptyCells.length > 0) {
            const pos = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            mapData[pos.y][pos.x] = 9;
            render();
        }
    }

    function resetGame() {
        resetGameMap();
        for(let key in players) delete players[key];
        for(let i=1; i<=4; i++) playerSlots[i] = null;
        updateHeaderNames();
        if(chatList) chatList.innerHTML = '';
    }
    
    function resetGameMap() {
        mapData = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            let row = new Array(GRID_SIZE).fill(0);
            mapData.push(row);
        }

        mapData[0][0] = 1;
        mapData[GRID_SIZE - 1][GRID_SIZE - 1] = 2; 

        if (maxPlayers === 4) {
            mapData[0][GRID_SIZE - 1] = 3;
            mapData[GRID_SIZE - 1][0] = 4;
            document.querySelector('.p3-box').style.display = 'block';
            document.querySelector('.p4-box').style.display = 'block';
        } else {
            document.querySelector('.p3-box').style.display = 'none';
            document.querySelector('.p4-box').style.display = 'none';
        }
        
        updateScore();
        updateHeaderNames();
    }

    function updateHeaderNames() {
        for(let i=1; i<=4; i++) {
            const name = playerSlots[i] || `Player ${i}`;
            document.getElementById(`name-${i}`).textContent = name;
            document.getElementById(`score-${i}`).textContent = "1";
        }
    }

    function endGame() {
        isGameRunning = false;
        intervals.forEach(clearInterval);
        playSe('finish');
        
        // ★終了時に切断
        if(platform === 'twitch') twitch.disconnectTwitch();
        
        const scores = [];
        for(let i=1; i<=maxPlayers; i++) {
            scores.push({ id: i, score: parseInt(document.getElementById(`score-${i}`).textContent), name: document.getElementById(`name-${i}`).textContent });
        }
        scores.sort((a,b) => b.score - a.score);
        
        document.getElementById('winner-name').textContent = scores[0].name;
        document.getElementById('winner-name').style.color = COLORS[scores[0].id];

        const listEl = document.getElementById('ranking-list');
        listEl.innerHTML = '';
        scores.forEach((p, index) => {
            const div = document.createElement('div');
            div.className = 'rank-item';
            
            const winnerScore = scores[0].score > 0 ? scores[0].score : 1;
            const barWidth = (p.score / winnerScore) * 100;

            div.innerHTML = `
                <div class="rank-info">
                    <span class="rank-num">${index + 1}.</span>
                    <span class="rank-name" style="color:${COLORS[p.id]}">${p.name}</span>
                </div>
                <div class="rank-bar-wrapper">
                    <div class="rank-bar" style="width: ${barWidth}%; background-color:${COLORS[p.id]}"></div>
                </div>
                <span class="rank-score">${p.score}</span>
            `;
            listEl.appendChild(div);
        });
        document.getElementById('result-modal').classList.remove('hidden');
    }

    // ★共通処理：コメント解析とゲーム反映
    function processComment(msg, authorName, authorId) {
        if (!authorId) authorId = authorName;

        // 配信者自動参加ロジック
        if (streamerIdentifier && players['STREAMER_PLACEHOLDER']) {
            const isStreamerById = authorId === streamerIdentifier;
            const isStreamerByName = authorName.toLowerCase() === streamerIdentifier.toLowerCase();
            
            if (isStreamerById || (!(streamerIdentifier.startsWith('UC') || streamerIdentifier.startsWith('UG')) && isStreamerByName)) {
                delete players['STREAMER_PLACEHOLDER'];
                players[authorId] = 1;
                playerSlots[1] = authorName;
                if (!isGameRunning) {
                    updateSlotDisplay(1, authorName);
                }
                updateHeaderNames();
            }
        } 
        else if (players[authorId] === 1 && playerSlots[1] !== authorName) {
            playerSlots[1] = authorName;
            if (!isGameRunning) {
                updateSlotDisplay(1, authorName);
            }
            updateHeaderNames();
        }

        // 参加コマンド
        if (msg.includes('参加') || msg.includes('join') || msg.includes('ノ')) {
            if (players[authorId]) return; 
            const entryModal = document.getElementById('entry-modal');
            if (gameMode !== 'demo' && entryModal.classList.contains('hidden')) return; 

            const startSlot = streamerIdentifier ? 2 : 1;
            for (let i = startSlot; i <= maxPlayers; i++) {
                if (playerSlots[i] === null) {
                    playerSlots[i] = authorName;
                    players[authorId] = i; 
                    updateSlotDisplay(i, authorName);
                    updateHeaderNames();
                    addChatLog(authorName, `エントリー完了！ (P${i})`, i);
                    playSe('join');
                    entryCount++;
                    if (entryCount >= maxPlayers) {
                        document.getElementById('start-game-btn').disabled = false;
                        document.getElementById('start-game-btn').classList.add('pulse-anim');
                    }
                    return;
                }
            }
            return;
        }

        // ゲーム中の操作
        if (!isGameRunning) return;
        const playerNum = players[authorId];
        if (!playerNum) return; 

        const normalizeMsg = msg.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
        const match = normalizeMsg.match(/(\d+)/);
        
        if (match) {
            const cellNum = parseInt(match[1], 10);
            const index = cellNum - 1;
            const x = index % GRID_SIZE;
            const y = Math.floor(index / GRID_SIZE);
            
            if (tryPaint(x, y, playerNum)) {
                addChatLog(authorName, `エリア${cellNum} を獲得！`, playerNum);
                playSe('paint');
            }
        }
    }

    // ★Twitch用メッセージハンドラ
    function handleTwitchMessage(message, authorName) {
        // authorIdとしてもauthorNameを使用（Twitchは名前がユニーク）
        processComment(message, authorName, authorName);
    }

    function tryPaint(x, y, teamId) {
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
        if (mapData[y][x] === teamId) return false;

        const isItem = (mapData[y][x] === 9);

        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        let canPaint = false;
        for (let d of dirs) {
            const nx = x + d[0], ny = y + d[1];
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                if (mapData[ny][nx] === teamId) canPaint = true;
            }
        }

        if (canPaint) {
            mapData[y][x] = teamId;
            
            if (isItem) {
                triggerItemEffect(x, y, teamId);
            }

            render();
            updateScore();
            return true;
        }
        return false;
    }

    function triggerItemEffect(cx, cy, teamId) {
        playSe('item');
        addChatLog("System", "アイテム発動！", teamId);

        const type = Math.random() < 0.5 ? 'bomb' : 'cross';

        if (type === 'bomb') {
            for(let dy=-1; dy<=1; dy++) {
                for(let dx=-1; dx<=1; dx++) {
                    paintForce(cx+dx, cy+dy, teamId);
                }
            }
        } else {
            for(let i=-2; i<=2; i++) {
                paintForce(cx+i, cy, teamId);
                paintForce(cx, cy+i, teamId);
            }
        }
    }

    function paintForce(x, y, teamId) {
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
        if (mapData[y][x] === 9) return; 
        mapData[y][x] = teamId;
    }

    function updateScore() {
        const counts = [0, 0, 0, 0, 0];
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const val = mapData[y][x];
                if (val >= 1 && val <= 4) counts[val]++;
            }
        }
        for(let i=1; i<=4; i++) {
            const el = document.getElementById(`score-${i}`);
            if(el) el.textContent = counts[i];
        }
    }

    function render() {
        ctx.clearRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const val = mapData[y][x];
                const px = x * CELL_SIZE;
                const py = y * CELL_SIZE;
                
                // 1. 背景色の描画
                ctx.fillStyle = COLORS[val] || COLORS[0];
                if (val === 9) {
                    ctx.fillStyle = COLORS[9];
                }
                ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

                // 2. 枠線の描画
                ctx.strokeStyle = '#1a202c';
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
                
                // 3. 数字・記号の描画
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                if (val === 9) { // アイテムマスの「？」
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 20px "Noto Sans JP", sans-serif';
                    ctx.fillText('?', px + CELL_SIZE/2, py + CELL_SIZE/2 + 1);
                } else { // 通常マスの数字
                    ctx.fillStyle = (val === 0) ? NUMBER_COLOR_ON_EMPTY : NUMBER_COLOR_ON_PAINTED;
                    ctx.font = 'bold 12px "Noto Sans JP", sans-serif';
                    ctx.fillText((y * GRID_SIZE) + x + 1, px + CELL_SIZE/2, py + CELL_SIZE/2 + 1);
                }
            }
        }
    }

    function addChatLog(name, msg, teamId) {
        if(!chatList) return;
        const li = document.createElement('li');
        const color = (teamId > 0 && COLORS[teamId]) ? COLORS[teamId] : '#a0aec0';
        li.innerHTML = `<span class="chat-author" style="color:${color}">${name}</span>: ${msg}`;
        chatList.prepend(li);
        if (chatList.children.length > 30) chatList.lastChild.remove();
    }

    async function startYouTubeConnection() {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${TARGET_VIDEO_ID}&key=${YOUTUBE_API_KEY}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId;
                pollYouTubeChat();
            } else {
                alert("エラー: ライブ配信が見つかりません。");
                location.reload();
            }
        } catch (e) { console.error(e); }
    }

    async function pollYouTubeChat() {
        if (!liveChatId) return;

        let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${YOUTUBE_API_KEY}`;
        if (nextPageToken) url += `&pageToken=${nextPageToken}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.nextPageToken) nextPageToken = data.nextPageToken;
            
            if (data.items) {
                data.items.forEach(item => {
                    processComment(item.snippet.displayMessage, item.authorDetails.displayName, item.authorDetails.channelId);
                });
            }
            const interval = Math.max(data.pollingIntervalMillis || 5000, 3000);
            intervals.push(setTimeout(pollYouTubeChat, interval));
        } catch (e) {
            intervals.push(setTimeout(pollYouTubeChat, 10000));
        }
    }

    function startDemoBot() {
        const bots = [];
        const names = ["Taro", "Jiro", "Hanako", "Sato", "Suzuki", "Tanaka", "Yamada", "Cat", "Dog", "Bird"];
        
        for(let i=0; i<maxPlayers; i++) {
            const name = names[i] + (i+1);
            bots.push({ id: `bot-${i}`, name: name });
            processComment(`参加`, name, `bot-${i}`);
        }

        intervals.push(setInterval(() => {
            if(!isGameRunning) return;
            
            const bot = bots[Math.floor(Math.random() * bots.length)];
            const playerNum = players[bot.id];
            
            if (playerNum) {
                const validMove = findValidMove(playerNum);
                if (validMove) {
                    const cellNum = (validMove.y * GRID_SIZE) + validMove.x + 1;
                    processComment(`${cellNum}`, bot.name, bot.id);
                }
            }
        }, DEMO_BOT_INTERVAL));
    }

    function findValidMove(teamId) {
        const candidates = [];
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (mapData[y][x] === teamId) {
                    for (let d of dirs) {
                        const nx = x + d[0], ny = y + d[1];
                        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                            if (mapData[ny][nx] !== teamId) {
                                if (mapData[ny][nx] === 9) {
                                    candidates.push({x: nx, y: ny});
                                    candidates.push({x: nx, y: ny}); 
                                }
                                candidates.push({x: nx, y: ny});
                            }
                        }
                    }
                }
            }
        }
        return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
    }

    function onCanvasClick(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width / (window.devicePixelRatio || 1);
        const scaleY = canvas.height / rect.height / (window.devicePixelRatio || 1);
        
        const x = Math.floor(((e.clientX - rect.left) * scaleX) / CELL_SIZE);
        const y = Math.floor(((e.clientY - rect.top) * scaleY) / CELL_SIZE);
        
        processComment("参加", "You", "user-self");
        processComment(`${ (y*GRID_SIZE)+x+1 }`, "You", "user-self");
    }

    init();
});