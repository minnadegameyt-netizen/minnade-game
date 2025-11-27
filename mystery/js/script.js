let currentScenarioIndex = 0;
const ONION_URL = "cage404.onion"; 
let refreshCount = 0;
let currentPageId = "";
let timerInterval;
let isRefreshCleared = false;
let isSolving = false;
let currentDevTab = 'Elements';
let currentDay = 1;
let isHackHintVisible = false;
let audioCtx;
let morseCodeTimerId = null;

const AUDIO_FILES = {
    click: new Audio('audio/se_click.mp3'),
    chat: new Audio('audio/se_chat.mp3'),
    error: new Audio('audio/se_error.mp3'),
    success: new Audio('audio/se_success.mp3'),
    glitch: new Audio('audio/se_glitch.mp3'),
    knock: new Audio('audio/se_knock.mp3'),
    alert: new Audio('audio/se_alert.mp3'),
    bgm_drone: new Audio('audio/bgm_drone.mp3'),
    dialog_spawn: new Audio('audio/se_dialog_spawn.mp3'),
};
AUDIO_FILES.bgm_drone.loop = true;
AUDIO_FILES.bgm_drone.volume = 0.5;

function playMorseCodeSOS() {
    // AudioContextを初期化（ブラウザで音を扱うための準備）
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // モールス信号の各ユニットの長さを定義（秒）
    const dot = 0.12;
    const dash = dot * 3;
    const gap = dot;        // 音と音の間隔
    const letterGap = dot * 3; // 文字と文字の間隔

    // 再生開始時間を取得
    let time = audioCtx.currentTime + 0.1; // 0.1秒後から再生開始

    // 指定した時間と長さでビープ音を鳴らすヘルパー関数
    function playBeep(startTime, duration) {
        const oscillator = audioCtx.createOscillator(); // 音源（波形）を生成
        const gainNode = audioCtx.createGain();         // 音量を制御

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination); // スピーカーに接続

        oscillator.type = 'sine'; // サイン波（ビープ音らしい音）
        oscillator.frequency.setValueAtTime(600, startTime); // 周波数 (音の高さ)

        // 音を「ブツッ」と鳴らすための音量調整（エンベロープ）
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(1, startTime + 0.01); // 瞬時に音量を上げる
        gainNode.gain.setValueAtTime(1, startTime + duration - 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // 瞬時に音量を下げる

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    // --- SOS信号の再生スケジュールを組む ---
    // S (・ ・ ・)
    playBeep(time, dot);
    time += dot + gap;
    playBeep(time, dot);
    time += dot + gap;
    playBeep(time, dot);
    time += letterGap; // 「S」と「O」の間の少し長い間隔

    // O (－ － －)
    playBeep(time, dash);
    time += dash + gap;
    playBeep(time, dash);
    time += dash + gap;
    playBeep(time, dash);
    time += letterGap; // 「O」と「S」の間の少し長い間隔

    // S (・ ・ ・)
    playBeep(time, dot);
    time += dot + gap;
    playBeep(time, dot);
    time += dot + gap;
    playBeep(time, dot);
}

function playSE(key) { if (AUDIO_FILES[key]) { AUDIO_FILES[key].currentTime = 0; AUDIO_FILES[key].play().catch(()=>{}); } }
function playBGM(key, action='play') { if (AUDIO_FILES[key]) { if(action==='play') AUDIO_FILES[key].play().catch(()=>{}); else AUDIO_FILES[key].pause(); } }

// script.js

// ▼▼▼ 読み込む素材リスト（自分のファイル構成に合わせて確認してください） ▼▼▼
const ASSETS_TO_LOAD = [
    // 画像
    'assets/puzzle_noise.jpg',
    'assets/evidence_view.jpg',
    
    // 動画 (特に重要)
    'assets/cam_dark.mp4',
    'assets/cam_light.mp4',
    'assets/jumpscare.mp4',

    // 音声 (AUDIO_FILESで定義しているもの)
    'audio/se_click.mp3',
    'audio/se_chat.mp3',
    'audio/se_error.mp3',
    'audio/se_success.mp3',
    'audio/se_glitch.mp3',
    'audio/se_knock.mp3',
    'audio/se_alert.mp3',
    'audio/bgm_drone.mp3',
    'audio/se_dialog_spawn.mp3' 
];

document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');
    const titleScreen = document.getElementById('title-screen');

    // --- プリロード関数 ---
    const preloadAsset = (path) => {
        return new Promise((resolve) => {
            let asset;
            const ext = path.split('.').pop().toLowerCase();

            if (['jpg', 'png', 'gif'].includes(ext)) {
                asset = new Image();
                asset.onload = () => resolve();
                asset.onerror = () => resolve(); // エラーでも止まらないようにする
                asset.src = path;
            } else if (['mp3', 'wav'].includes(ext)) {
                asset = new Audio();
                asset.oncanplaythrough = () => resolve();
                asset.onerror = () => resolve();
                asset.src = path;
                asset.load(); // 読み込み開始
            } else if (['mp4', 'webm'].includes(ext)) {
                asset = document.createElement('video');
                asset.onloadeddata = () => resolve();
                asset.onerror = () => resolve();
                asset.src = path;
                asset.preload = 'auto'; // 重要
            } else {
                resolve(); // 未対応形式はスルー
            }
        });
    };

    // --- 読み込み実行 ---
    let loadedCount = 0;
    const totalAssets = ASSETS_TO_LOAD.length;

    // 全ファイルを並列で読み込むが、進捗バーのために個別にカウントする
    const promises = ASSETS_TO_LOAD.map(async (path) => {
        await preloadAsset(path);
        loadedCount++;
        // 進捗バー更新
        const percent = Math.floor((loadedCount / totalAssets) * 100);
        loadingBar.style.width = `${percent}%`;
        loadingText.textContent = `LOADING... ${percent}%`;
    });

    // 全て読み終わったら
    await Promise.all(promises);

    // 少し待ってからタイトル表示（演出）
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            titleScreen.style.display = 'flex'; // タイトルを表示
            
            // ▼▼▼ ここに元のDOMContentLoadedの中身を移動 ▼▼▼
            
            // セーブデータ確認
            if (localStorage.getItem('mb_save_id')) {
                document.getElementById('btn-game-continue').classList.remove('hidden');
            }

            // タイトル画面ボタン
            document.getElementById('btn-game-start').addEventListener('click', () => startGame('new'));
            document.getElementById('btn-game-continue').addEventListener('click', () => startGame('load'));
            document.getElementById('btn-game-exit').addEventListener('click', () => window.location.href = "../index.html");
            
            // ゲーム内UIボタン
            document.getElementById('btn-refresh').addEventListener('click', handleRefresh);
            document.getElementById('btn-devtools').addEventListener('click', toggleDevTools);
            document.getElementById('btn-devtools-close').addEventListener('click', toggleDevTools);
            document.getElementById('btn-back').addEventListener('click', () => {}); 
            
            // DevToolsタブ切り替え
            document.querySelectorAll('.dt-tab').forEach(tab => {
                tab.addEventListener('click', (e) => { switchDevTab(e.target.textContent); playSE('click'); });
            });

            // クリック音
            document.body.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') playSE('click');
                AUDIO_FILES.click.volume = 1.0;
            });

            // Enterキー入力サポート
            document.body.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (document.activeElement.id === 'url-input' && !document.activeElement.readOnly) handleUrlInput(document.activeElement.value);
                    else if (document.activeElement.id && document.activeElement.id.startsWith('input-')) {
                        checkAnswer(document.activeElement.id.replace('input-', ''));
                        playSE('click');
                    }
                }
            });

            // リザルト画面・ゲームオーバー画面のボタン設定
            const btnResultTitle = document.getElementById('btn-result-title');
            if(btnResultTitle) btnResultTitle.addEventListener('click', () => { localStorage.clear(); location.reload(); });
            
            const btnResultHome = document.getElementById('btn-result-home');
            if(btnResultHome) btnResultHome.addEventListener('click', () => window.location.href = "../index.html");

            // 隠しボタン (Day 5へ)
            const btnSecret = document.getElementById('btn-secret-console');
            if(btnSecret) {
                btnSecret.addEventListener('click', () => {
                    playSE('click');
                    document.getElementById('result-overlay').classList.add('hidden');
                    playScenario('setup_d5'); // ★修正済みの setup_d5
                });
            }

            // ゲームオーバー用ボタン
            const btnRetry = document.getElementById('btn-retry');
            if(btnRetry) btnRetry.addEventListener('click', () => { localStorage.clear(); location.reload(); });
            const btnHome = document.getElementById('btn-home');
            if(btnHome) btnHome.addEventListener('click', () => window.location.href = "../index.html");

            // ▲▲▲ 移動ここまで ▲▲▲

        }, 500);
    }, 500);
});

let pendingGameMode = ''; 

function startGame(mode) {
    const titleScreen = document.getElementById('title-screen');
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    const tutorialBtn = document.getElementById('btn-tutorial-ok');
    
    playSE('click');
    titleScreen.style.opacity = '0';
    titleScreen.style.transition = 'opacity 0.5s';
    
    setTimeout(() => {
        titleScreen.style.display = 'none';
        tutorialOverlay.classList.remove('hidden');
        setTimeout(() => tutorialOverlay.classList.add('active'), 50);
        pendingGameMode = mode;
        tutorialBtn.removeEventListener('click', confirmTutorial);
        tutorialBtn.addEventListener('click', confirmTutorial);
    }, 500);
}

function confirmTutorial() {
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    playSE('click'); 
    playSE('success'); 

    tutorialOverlay.classList.remove('active');
    setTimeout(() => {
        tutorialOverlay.classList.add('hidden');
        initializeGame(pendingGameMode);
    }, 500);
}

function initializeGame(mode) {

    const chatWindow = document.querySelector('.chat-window');
    if (chatWindow) chatWindow.classList.remove('hidden');

    const browserWindow = document.getElementById('browser-window');
    if (browserWindow) browserWindow.style.borderRight = '';

    if (mode === 'load') {
        const saveId = localStorage.getItem('mb_save_id');
        const saveDay = localStorage.getItem('mb_save_day');
        if (saveId) {
            currentDay = parseInt(saveDay) || 1;
            updateDayIndicator();

            if (currentDay >= 3) {
                // 見た目を即座にTorモードに変更
                document.getElementById('browser-window').classList.add('tor-mode');
                document.getElementById('tor-icon').classList.remove('hidden');
                
                // URLバーを入力可能にする（Day 3開始時に必要）
                const urlInput = document.getElementById('url-input');
                urlInput.readOnly = false;
                urlInput.placeholder = "Paste .onion URL here...";

                // BGMを再生
                playBGM('bgm_drone', 'play');
            }

            switchMode('novel');
            playScenario(saveId);
            return;
        }
    }
    localStorage.clear();
    currentDay = 1;
    updateDayIndicator();
    switchMode('novel');
    playScenario('intro');
}

function updateDayIndicator() {
    const el = document.getElementById('day-indicator');
    
    // Dayごとの時間設定
    let timeString = "02:59 AM"; // デフォルト

    switch(currentDay) {
        case 1: timeString = "02:59 AM"; break; // 開始直前
        case 2: timeString = "03:05 AM"; break; // 侵入成功、調査中
        case 3: timeString = "03:33 AM"; break; // 深夜、怪奇現象
        case 4: timeString = "03:59 AM"; break; // 夜明け前、焦り
        case 5: timeString = "--:-- --"; break; // システム外
    }

    el.textContent = `Day ${currentDay} - ${timeString}`;
    el.classList.remove('hidden');
    el.style.color = '#00ff41';
    el.style.borderColor = '#00ff41';
}

function endDay(nextDayId) {
    currentDay++;
    localStorage.setItem('mb_save_id', nextDayId);
    localStorage.setItem('mb_save_day', currentDay);

    const transition = document.getElementById('day-transition');
    document.getElementById('day-title').textContent = `Day ${currentDay - 1} Clear`;
    transition.classList.remove('hidden');
    
    playSE('success');

    setTimeout(() => {
        transition.classList.add('hidden');
        updateDayIndicator();
        playScenario(nextDayId);
    }, 3000);
}

function switchMode(mode) {
    document.body.classList.remove('mode-novel', 'mode-game', 'mode-fullscreen');
    document.body.classList.remove('mode-novel', 'mode-game');
    document.body.classList.add(`mode-${mode}`);
    const novelBox = document.getElementById('novel-box');
    novelBox.style.display = (mode === 'novel') ? 'flex' : 'none';
}

async function playScenario(scenarioId) {
    const scene = SCENARIO.find(s => s.id === scenarioId);
    const chatWindow = document.querySelector('.chat-window');
    
    if (!scene) return;

    // --- グリッチ演出の制御 ---
    // シーンに 'glitch: true' があれば、グリッチクラスを追加
    if (scene.glitch && chatWindow) {
        chatWindow.classList.add('glitch-mode');
    } 
    // そうでなければ、グリッチクラスを（もしあれば）削除
    else if (chatWindow) {
        chatWindow.classList.remove('glitch-mode');
    }

    if (scene.mode) switchMode(scene.mode);

    if (scene.type === 'novel') {
        // 全画面モードの時は背景をブラーさせない
        if (scene.mode !== 'fullscreen') {
            document.body.classList.add('mode-novel');
        }
        await playNovel(scene.text);
        document.body.classList.remove('mode-novel'); // 終わったら必ず消す
        if (scene.next) playScenario(scene.next);
    } else if (scene.type === 'chat') {
        for (const msg of scene.messages) {
            await new Promise(r => setTimeout(r, 800));
            playSE('chat');
            addChatMessage(msg.name, msg.text, msg.type || 'normal');
        }
        if (scene.next) playScenario(scene.next);
    } else if (scene.type === 'action') {
        if (scene.action === 'loadPage') loadPageContent(scene.pageId);
        if (scene.action === 'enableTorMode') enableTorMode();
        if (scene.action === 'startTimer') startCountdown(scene.seconds || 30); 
        if (scene.action === 'endDay') endDay(scene.nextDay);
        if (scene.action === 'showAlertSpam') await showAlertSpam();
        if (scene.action === 'showResultScreen') showResultScreen(); // Day 4 Clear
        if (scene.action === 'showResetButton') document.getElementById('gameover-overlay').classList.remove('hidden'); // Game Over
        
        // アクションの後に次のシナリオがある場合、グリッチを継続するかチェック
        if (scene.next) {
            const nextScene = SCENARIO.find(s => s.id === scene.next);
            // 次のシーンに 'glitch' プロパティがなければ、グリッチを止める
            if (nextScene && !nextScene.glitch && chatWindow) {
                chatWindow.classList.remove('glitch-mode');
            }
            playScenario(scene.next);
        } else if (chatWindow) {
            // 次のシナリオがなければグリッチを止める
            chatWindow.classList.remove('glitch-mode');
        }
    }
}

async function showAlertSpam() {
    playSE('alert');
    document.body.classList.add('danger-mode');

    const spamDuration = 3000; // 3秒間スパム
    const intervalTime = 200;  // 200msごとに新しいアラート
    let alertsCreated = 0;
    const maxAlerts = spamDuration / intervalTime;

    return new Promise(resolve => {
        const spamInterval = setInterval(() => {
            if (alertsCreated >= maxAlerts) {
                clearInterval(spamInterval);
                document.body.classList.remove('danger-mode');
                resolve();
                return;
            }

            const alertBox = document.createElement('div');
            alertBox.textContent = '!! WARNING: TRACE DETECTED !!';
            alertBox.style.position = 'fixed';
            alertBox.style.zIndex = '9999';
            alertBox.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            alertBox.style.color = 'white';
            alertBox.style.padding = '20px';
            alertBox.style.border = '2px solid white';
            alertBox.style.borderRadius = '5px';
            alertBox.style.fontFamily = "'Share Tech Mono', monospace";
            alertBox.style.fontSize = '1.5em';
            alertBox.style.top = `${Math.random() * 80}vh`;
            alertBox.style.left = `${Math.random() * 80}vw`;
            alertBox.style.transition = 'opacity 0.5s';
            alertBox.style.opacity = '1';

            document.body.appendChild(alertBox);

            setTimeout(() => {
                alertBox.style.opacity = '0';
                setTimeout(() => alertBox.remove(), 500);
            }, 1000);
            
            alertsCreated++;
            playSE('alert');
        }, intervalTime);
    });
}

async function handleUrlInput(value) {
    if (isSolving) return;
    const inputVal = value.trim();
    if (inputVal === ONION_URL) {
        isSolving = true;
        playScenario('load_d3_api');
        setTimeout(() => { isSolving = false; }, 1000);
    } else {
        const urlInput = document.getElementById('url-input');
        urlInput.style.color = 'red';
        setTimeout(() => { urlInput.style.color = ''; }, 500);
    }
}

function enableTorMode() {
    playSE('glitch');
    const browser = document.getElementById('browser-window');
    const input = document.getElementById('url-input');
    const icon = document.getElementById('tor-icon');
    const overlay = document.getElementById('glitch-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('hidden'), 200);

    browser.style.opacity = '0.5';
    setTimeout(() => {
        browser.classList.add('tor-mode');
        browser.style.opacity = '1';
        icon.classList.remove('hidden');
        input.readOnly = false;
        input.value = "";
        input.placeholder = "Paste .onion URL here...";
        input.focus();
        playBGM('bgm_drone', 'play');
    }, 1000);
}

// --- タイマー機能 ---

function startCountdown(seconds) {
    let timeLeft = seconds;
    let timerElement;

    // 現在のページIDを見て、どこにタイマーを表示するか決める
    if (currentPageId === 'd2_error') {
        timerElement = document.getElementById('cmd-timer');
    } 
    // ▼▼▼ このブロックを追加 ▼▼▼
    else if (currentPageId === 'p_final') {
        timerElement = document.getElementById('final-timer');
    } 
    // ▲▲▲ 追加ここまで ▲▲▲
    else {
        timerElement = document.getElementById('day-indicator');
        if (timerElement) {
            timerElement.style.color = '#ff3333';
            timerElement.style.borderColor = '#ff3333';
        }
    }

    if (!timerElement) {
        console.error("Timer element not found!");
        return; 
    }
    
    // 隠れている場合は表示する
    if (timerElement.classList.contains('hidden')) {
        timerElement.classList.remove('hidden');
    }

    const updateTimerDisplay = () => {
        if (currentPageId === 'd2_error') {
            timerElement.textContent = timeLeft;
        } 
        // ▼▼▼ このブロックを追加 ▼▼▼
        else if (currentPageId === 'p_final') {
            timerElement.textContent = timeLeft; // シンプルに数字だけ出す
        } 
        // ▲▲▲ 追加ここまで ▲▲▲
        else {
            timerElement.textContent = `TRACE: ${timeLeft}s`;
        }
    };
    
    updateTimerDisplay(); // 初回表示

    if (timerInterval) clearInterval(timerInterval); // 既存のタイマーをクリア

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            playSE('error');
            
            // タイムオーバー時の処理
            const pageArea = document.getElementById('page-area');
            if (pageArea) {
                // 最後のページ専用のゲームオーバー表示
                if (currentPageId === 'p_final') {
                    pageArea.innerHTML = `
                        <div class="site-center" style="animation: none;">
                            <h1 style="color:red; font-size:5em; font-family:'Share Tech Mono';">LOCKDOWN</h1>
                            <p style="color:red;">SYSTEM SEALED PERMANENTLY.</p>
                        </div>`;
                } else {
                    pageArea.innerHTML = `<div class="site-center"><h1 style="color:red; font-size:4em;">TRACE COMPLETE</h1><p style="color:red;">YOU HAVE BEEN FOUND.</p></div>`;
                }
            }
            document.body.classList.add('danger-mode');

            setTimeout(() => {
                const resetOverlay = document.getElementById('gameover-overlay');
                if (resetOverlay) {
                    resetOverlay.classList.remove('hidden');
                } else {
                    alert("GAME OVER - Time's up!");
                    localStorage.clear();
                    location.reload();
                }
            }, 3000);
        }
    }, 1000); 
}

// --- リザルト画面表示 (Day 4 Clear) ---
function showResultScreen() {
    const overlay = document.getElementById('result-overlay');
    overlay.classList.remove('hidden');
    playSE('success');
    // タイマー停止
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById('day-indicator').classList.add('hidden');
}

// --- ページ描画 (Game Content) ---
function loadPageContent(pageId) {
    if (morseCodeTimerId) { // ★名前を変更
        clearTimeout(morseCodeTimerId); // ★clearInterval から clearTimeout に変更
        morseCodeTimerId = null; // ★名前を変更
    }
    currentPageId = pageId;
    const pageArea = document.getElementById('page-area');
    const urlDisplay = document.getElementById('url-input');
    pageArea.innerHTML = '';
    
    if (!document.getElementById('devtools-panel').classList.contains('hidden')) updateDevToolsContent();

    // === DAY 1 ===
    if (pageId === 'd1_404') {
        urlDisplay.value = 'http://unknown-server.com/entry/';
        pageArea.innerHTML = `<div class="site-center"><h1 style="font-size:3em; color:#333;">404 Not Found</h1><p style="color:#aaa;">The requested URL was not found on this server.</p></div>`;
    }
    else if (pageId === 'd1_files') {
        urlDisplay.value = 'http://unknown-server.com/pub/';
        pageArea.innerHTML = `
            <div class="site-center" style="text-align:left; font-family:monospace; margin-left:20%;">
                <h2 style="border-bottom:1px solid #555; padding-bottom:10px;">Index of /pub</h2>
                <ul style="list-style:none; padding:0; line-height:1.8; cursor:pointer;">
                    <li>📁 <span style="color:#569cd6;">../</span> (Parent Directory)</li>
                    <li onclick="document.getElementById('input-d1_files').value='open readme.txt'; checkAnswer('d1_files');">
                        📄 <span style="color:#ce9178; text-decoration:underline;">readme.txt</span> (0.4KB)
                    </li>
                    <li onclick="document.getElementById('input-d1_files').value='open welcome.msg'; checkAnswer('d1_files');">
                        📄 <span style="color:#ce9178; text-decoration:underline;">welcome.msg</span> (1.2KB)
                    </li>
                </ul>
                <div style="margin-top:30px; border-top:1px solid #333; padding-top:20px;">
                    <p style="color:#aaa;">> usage: open [filename]</p>
                    <div class="input-group" style="text-align:left;">
                        <span style="color:#00ff41;">user@guest:~/pub $</span>
                        <input type="text" id="input-d1_files" placeholder="command..." style="width:200px; text-align:left;" autocomplete="off">
                        <button onclick="checkAnswer('d1_files')">Enter</button>
                    </div>
                    <div id="file-viewer" style="margin-top:20px; color:#ddd; white-space:pre-wrap; display:none; border:1px dashed #555; padding:10px;"></div>
                </div>
            </div>`;
    }
    else if (pageId === 'd1_script') {
        urlDisplay.value = 'http://unknown-server.com/auth/check.js';
        playSE('error');
        pageArea.innerHTML = `
            <div class="site-center">
                <h2>Security Check</h2>
                <div style="background:#1e1e1e; padding:20px; border-radius:5px; text-align:left; font-family:monospace; display:inline-block; border:1px solid #444;">
                    <div style="color:#6a9955;">// User Verification</div>
                    <div style="color:#569cd6;">var</div> <span style="color:#9cdcfe;">age</span> = <span style="color:#b5cea8;" id="code-age">15</span>;<br>
                    <div style="color:#c586c0;">if</div> (<span style="color:#9cdcfe;">age</span> < <span style="color:#b5cea8;">18</span>) { <span style="color:#dcdcaa;">block</span>(); }
                </div>
                <p style="color:red; margin-top:15px;">ACCESS BLOCKED: Underage</p>
                <div class="input-group">
                    <input type="text" id="input-d1_script" placeholder="e.g. age = 20" autocomplete="off">
                    <button onclick="checkAnswer('d1_script')">Run</button>
                </div>
            </div>`;
    }
    else if (pageId === 'd1_ghost') {
        playSE('glitch');
        urlDisplay.value = 'http://unknown-server.com/???/';
        pageArea.innerHTML = `
            <div style="
                background-color: #cc0000; width: 100%; min-height: 100%;
                padding: 40px; box-sizing: border-box;
                font-family: 'Courier New', monospace; font-weight: bold;
                color: #cc0000; user-select: text;
                position: absolute; top: 0; left: 0;
            ">
                <style>
                    ::selection { background: #000; color: #fff; text-shadow: none; }
                    ::-moz-selection { background: #000; color: #fff; text-shadow: none; }
                    .visible-area { color: #000; margin-top: 50px; }
                    .visible-area p { color: #ffcccc; }
                </style>
                <div style="font-size: 1.5em; line-height: 2em; word-break: break-all;">
                    WARNING WARNING WARNING<br><br>
                    0x4F %& ## @! 1101 ... /// [[ == ++ !!!<br><br>
                    0x99 h %% $$ e (( )) l ... p ??<br><br>
                    ERROR 404 ... SYSTEM HALTED<br>
                    FATAL EXCEPTION<br>
                    ................
                </div>
                <div class="visible-area">
                    <p style="font-weight: normal;">> Mouse drag to see the truth...</p>
                    <div class="input-group">
                        <input type="text" id="input-d1_ghost" placeholder="Answer?" autocomplete="off">
                        <button onclick="checkAnswer('d1_ghost')">Enter</button>
                    </div>
                </div>
            </div>`;
    }
    else if (pageId === 'd1_entry') {
        urlDisplay.value = 'http://unknown-server.com/login/';
        pageArea.innerHTML = `<div class="site-center"><h1 style="font-size:3em;">DARKNESS</h1><p>Login Required.</p><div class="input-group"><input type="text" id="input-d1_entry" placeholder="Password?" autocomplete="off"><button onclick="checkAnswer('d1_entry')">Enter</button></div></div>`;
    }
    else if (pageId === 'd1_port') {
        urlDisplay.value = 'http://unknown-server.com/status/';
        pageArea.innerHTML = `
            <div class="site-center">
                <h2 style="color:red; border:2px solid red; display:inline-block; padding:10px;">SERVICE UNAVAILABLE</h2>
                <p>Standard ports (80, 443) are closed.</p>
                <div id="port-scan-result" style="font-family:monospace; text-align:left; background:#000; color:#00ff41; padding:15px; width:80%; margin:20px auto; border:1px solid #333; height:150px; overflow-y:auto; display:none;"></div>
                <div class="input-group">
                    <p style="color:#aaa;">> Check active connections</p>
                    <input type="text" id="input-d1_port" placeholder="Command (Hint: netstat)" autocomplete="off">
                    <button onclick="checkAnswer('d1_port')">Exec</button>
                </div>
            </div>`;
    }
    // === DAY 2 ===
    else if (pageId === 'd2_sql') {
        urlDisplay.value = 'http://unknown-server.com/db/search';
        pageArea.innerHTML = `
            <div class="site-center">
                <h2>Member Search</h2>
                <div class="input-group">
                    <input type="text" id="input-d2_sql" placeholder="Name" style="width:300px;" autocomplete="off">
                    <button onclick="checkAnswer('d2_sql')">Search</button>
                </div>
                <div id="sql-result" style="margin-top:20px; font-family:monospace; text-align:left; background:#111; padding:10px; height:150px; overflow-y:auto; border:1px solid #333; display:none;">
                    <p style="color:#aaa;">No results found.</p>
                </div>
            </div>`;
    }
else if (pageId === 'd2_dom') {
        urlDisplay.value = 'http://unknown-server.com/files/hidden';
        
        // グローバル変数をリセット（初期状態ではKEYが出ない）
        window.keySpawnEnabled = false; 

        pageArea.innerHTML = `
            <div class="site-center">
                <h2>FIREWALL DETECTED</h2>
                <p style="color:#aaa;">
                    Find the 
                    <!-- ▼▼▼ ここを変更：クリック可能な隠しボタンにする ▼▼▼ -->
                    <span id="btn-spawn-key" 
                          style="color:#ff3333; font-weight:bold; cursor:pointer; border-bottom:1px dashed #ff3333;"
                          onclick="enableKeySpawn()">
                        RED KEY
                    </span>
                    <!-- ▲▲▲ -->
                    in the data stream.
                </p>
                
                <div id="matrix-box" class="matrix-container">
                    <!-- Matrix Rain -->
                </div>

                <div class="input-group">
                    <p style="color:#aaa;">// Access Key</p>
                    <input type="text" id="input-d2_dom" placeholder="Searching..." readonly autocomplete="off">
                    <button onclick="checkAnswer('d2_dom')">Enter</button>
                </div>
            </div>`;
        
        setTimeout(startMatrixRain, 100);
    }
    else if (pageId === 'd2_diary') {
        urlDisplay.value = 'http://unknown-server.com/private/diary/';
        pageArea.innerHTML = `
            <div class="site-center" style="text-align:left; font-family:monospace; margin-left:15%;">
                <h2 style="color:#ce9178;">/private/diary/</h2>
                <div style="border:1px solid #333; padding:10px; margin-bottom:10px;">
                    <ul style="list-style:none; padding:0; cursor:pointer; line-height:2.0;">
                        <li onclick="document.getElementById('input-d2_diary').value='open 2023_10_20_MyNewFriend.txt'; checkAnswer('d2_diary');">📄 <span style="text-decoration:underline;">2023_10_20_MyNewFriend.txt</span></li>
                        <li onclick="document.getElementById('input-d2_diary').value='open 2023_10_30_SomeoneIsWatching.txt'; checkAnswer('d2_diary');">📄 <span style="text-decoration:underline;">2023_10_30_SomeoneIsWatching.txt</span></li>
                        <li onclick="document.getElementById('input-d2_diary').value='open 2023_11_01_TheDoorbell.txt'; checkAnswer('d2_diary');">📄 <span style="text-decoration:underline;">2023_11_01_TheDoorbell.txt</span></li>
                        <li onclick="document.getElementById('input-d2_diary').value='open 2023_11_07_WhereAmI.txt'; checkAnswer('d2_diary');">📄 <span style="text-decoration:underline;">2023_11_07_WhereAmI.txt</span></li>
                        <li onclick="document.getElementById('input-d2_diary').value='open data_log_corrupted.bin'; checkAnswer('d2_diary');">📄 <span style="text-decoration:underline; color: #ff5555;">data_log_corrupted.bin</span></li>
                    </ul>
                </div>
                <div id="diary-content" style="background:#111; color:#ddd; padding:15px; border:1px dashed #555; min-height:100px; display:none; white-space:pre-wrap; margin-bottom:20px;"></div>
                <div class="input-group">
                    <p style="color:#aaa;">> Please enter the password found in the diary.</p>
                    <input type="text" id="input-d2_diary" placeholder="Command or Password" autocomplete="off">
                    <button onclick="checkAnswer('d2_diary')">Enter</button>
                </div>
            </div>`;
    }
else if (pageId === 'd2_noise') {
        urlDisplay.value = 'http://unknown-server.com/noise/';
        // パスワード用のレイヤーと、手前の画像を重ねる
        pageArea.innerHTML = `
            <div class="site-center">
                <h2>Image Analysis</h2>
                <div style="position:relative; width:400px; max-width:90%; height:400px; margin:0 auto; border:1px solid #555; overflow:hidden; background:#000;">
                    
                    <!-- 奥にあるパスワード -->
                    <div id="hidden-pass" style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; justify-content:center; align-items:center; 
                        font-size:3em; font-weight:bold; color:#333; opacity:0; transition:opacity 2s;">
                        REVERSE
                    </div>

                    <!-- 手前の画像 -->
                    <img id="target-image" src="assets/puzzle_noise.jpg" 
                        style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; transition: all 1s;" 
                        alt="Corrupted Data">
                </div>
                
                <p style="color:#aaa; margin-top:15px;">
                    Visual data encrypted.<br>
                    Analyze the raw data stream.
                </p>
                <div class="input-group">
                    <input type="text" id="input-d2_noise" placeholder="Password?"autocomplete="off">
                    <button onclick="checkAnswer('d2_noise')">Execute</button>
                </div>
            </div>`;
    }
    else if (pageId === 'd2_error') {
        pageArea.innerHTML = `
            <div class="cmd-window">
                <!-- 中央に表示するタイマーを追加 -->
                <div id="cmd-timer" class="cmd-timer-overlay"></div>

                <div class="cmd-header">
                    <span>C:\\Windows\\System32\\cmd.exe - tracker.exe</span>
                    <!-- ヘッダー内のタイマーは削除 -->
                    <div class="cmd-buttons"><span>_</span><span>❐</span><span>X</span></div>
                </div>
                <div class="cmd-log" id="cmd-log-area">
                    <p>Microsoft Windows [Version 10.0.19042.1165]</p>
                    <p>(c) Microsoft Corporation. All rights reserved.</p>
                    <p>&nbsp;</p>
                    <p>Executing security override...</p>
                    <p style="color:red;">WARNING: Counter-trace initiated. 'tracker.exe' is active.</p>
                    <p style="color:red;">Estimated time until system lockdown: 30 seconds.</p>
                    <p>&nbsp;</p>
                </div>
<div class="cmd-input-line">
    <span>C:\\Users\\Player></span>
    <input type="text" id="input-d2_error" autocomplete="off" autofocus onfocus="this.select()">
    <span class="cmd-cursor"></span>
</div>
            </div>`;
        // inputに自動でフォーカスを当てる
        setTimeout(() => {
            const inputEl = document.getElementById('input-d2_error');
            if(inputEl) inputEl.focus();
        }, 100);
    }
    // === DAY 2: 新規選択肢ダイアログ (NEW!) ===
    else if (pageId === 'd2_help_dialog') {
        playSE('glitch');
        pageArea.innerHTML = `
            <div class="reset-overlay" style="opacity: 1; animation: none; display: flex; position: absolute; background: #000;">
                
                <!-- 背景用のコンテナ -->
                <div class="help-bg-text"></div>

                <!-- 元々のダイアログボックス (z-indexを追加して手前に) -->
                <div class="reset-content" style="border: 1px solid #500; padding: 40px; background: rgba(10,0,0,0.9); animation: pulseRed 2s infinite; z-index: 10;">
                    <h2 style="color: #ff3333; font-size: 1.5em; line-height: 1.4; font-family: 'Courier New', monospace; text-shadow: 0 0 10px red;">
                        助けて助けて助けて助けて助けて<br>
                        助けて助けて助けて助けて助けて<br>
                        助けて助けて助けて
                    </h2>
                    <p style="color: #999; margin: 30px 0;">画面の奥から声が聞こえる...</p>
                    <div class="reset-buttons" style="flex-direction: column; gap: 20px;">
                        <button class="reset-btn" style="background: #500; color: #fff;" onmouseover="this.style.background='#900'" onmouseout="this.style.background='#500'" 
                                onclick="revealUrlAndProceed()">
                            助けて助けて助けて (声の主を探す)
                        </button>
                        <button class="reset-btn home" onclick="playScenario('end_day2_giveup');">
                            これ以上は危険だ (接続を切る)
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 背景に「助けて」を大量生成する処理
        const bgContainer = document.querySelector('.help-bg-text');
        if (bgContainer) {
            for (let i = 0; i < 200; i++) {
                const span = document.createElement('span');
                span.textContent = '助けて';
                // スタイルをランダムにしてカオスにする
                span.style.fontSize = `${Math.random() * 2 + 1}em`; // 1em ~ 3em
                span.style.opacity = Math.random() * 0.3 + 0.1; // 0.1 ~ 0.4
                span.style.transform = `rotate(${Math.random() * 40 - 20}deg)`; // -20deg ~ 20deg
                bgContainer.appendChild(span);
            }
        }
}

    // === DAY 3 (動画対応) ===
    else if (pageId === 'd3_api') {
        pageArea.innerHTML = `
            <div class="site-center">
                <h2>Request Interceptor</h2>
                <p style="color:#aaa;">Target: /api/v1/camera/access</p>
                <textarea id="input-d3_api" style="width:300px; height:100px; background:#111; color:#00ff41; border:1px solid #555; padding:10px; font-family:monospace;" autocomplete="off">
{
  "user": "guest_1024",
  "role": "visitor",
  "token": "null"
}
</textarea>
                <br>
                <button onclick="checkAnswer('d3_api')" style="margin-top:10px; padding:10px 30px; background:#333; color:#fff; border:none; cursor:pointer;">SEND REQUEST</button>
            </div>`;
    }
    else if (pageId === 'd3_dark') {
        pageArea.innerHTML = `
            <div class="site-center" style="color:#ddd;">
                <h2 style="color:red;">LIVE FEED</h2>
                <div class="surveillance-cam">
                    <div class="cam-overlay" style="position:absolute; top:10px; left:10px; z-index:10;">
                        <span class="blink">● REC</span> [CAM_04]
                    </div>
                    <!-- 動画: 最初は暗い動画 -->
                    <video id="video-feed" class="cam-video" autoplay loop muted playsinline>
                        <source src="assets/cam_dark.mp4" type="video/mp4">
                    </video>
                </div>
                <div class="input-group">
                    <input type="text" id="input-d3_dark" placeholder="Command..." autocomplete="off">
                    <button onclick="checkAnswer('d3_dark')">Send</button>
                </div>
                <p class="error-msg" id="msg-d3_dark"></p>
            </div>`;
    }
    // Day 3: ホラー演出（Jumpscare）
    else if (pageId === 'd3_scare') {
        playSE('alert');
        playSE('glitch');
        document.body.classList.add('danger-mode'); 

        if (AUDIO_FILES.alert) {
            AUDIO_FILES.alert.loop = true; // ループをONにする
            AUDIO_FILES.alert.currentTime = 0;
            AUDIO_FILES.alert.play().catch(()=>{});
        }
        
        // タイマーIDを保持するための変数を宣言
        let escapeTimerId;

        pageArea.innerHTML = `
            <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:black; z-index:100; display:flex; flex-direction:column; justify-content:center; align-items:center; overflow:hidden;">
                <video class="cam-video" autoplay style="width:100%; height:100%; object-fit:cover;">
                    <source src="assets/jumpscare.mp4" type="video/mp4">
                </video>
                <h1 style="position:absolute; color:red; font-size:4em; font-family:'Share Tech Mono'; text-shadow:2px 2px 0 #000;">I SEE YOU</h1>

                <!-- 警告バナー (最初は画面外) -->
                <div id="escape-banner" class="escape-banner">
                    !!! 警告: 接続を強制解除します。逃げろ！ !!!
                </div>

                <!-- 新しい脱出ボタン (最初は非表示で無効) -->
                <div id="escape-button-container" class="escape-button-container hidden">
                    <button id="btn-escape-d3" class="btn-escape-d3" disabled>
                        強制シャットダウン (<span id="countdown-d3">15</span>)
                    </button>
                </div>
            </div>`;

        // クリック成功時の処理を関数として定義
        window.succeedEscape = () => {
            clearInterval(escapeTimerId); // タイマーを止める

            if (AUDIO_FILES.alert) {
                AUDIO_FILES.alert.pause();
                AUDIO_FILES.alert.currentTime = 0;
                AUDIO_FILES.alert.loop = false; // 重要: 他のシーンのためにFalseに戻す
            }

            playSE('success');
            document.body.classList.remove('danger-mode');
            playScenario('novel_d3_end');
        };
        
        // 6秒後に脱出シークエンスを開始
        setTimeout(() => {
            const banner = document.getElementById('escape-banner');
            const buttonContainer = document.getElementById('escape-button-container');
            const button = document.getElementById('btn-escape-d3');
            const countdownSpan = document.getElementById('countdown-d3');
            
            if (!banner || !buttonContainer || !button || !countdownSpan) return;

            // バナーとボタンを表示
            banner.classList.add('visible');
            buttonContainer.classList.remove('hidden');
            playSE('alert');
            
            let timeLeft = 15;

            // カウントダウン開始
            escapeTimerId = setInterval(() => {
                timeLeft--;
                countdownSpan.textContent = timeLeft;

                // 残り5秒でボタンを有効化
                if (timeLeft === 5) {
                    button.disabled = false;
                    button.classList.add('enabled');
                    button.setAttribute('onclick', 'succeedEscape()');
                }

                // 時間切れでゲームオーバー
                if (timeLeft <= 0) {
                    clearInterval(escapeTimerId);

                    if (AUDIO_FILES.alert) {
                        AUDIO_FILES.alert.pause();
                        AUDIO_FILES.alert.loop = false; 
                    }

                    button.disabled = true;
                    button.classList.remove('enabled');
                    button.textContent = "TOO LATE...";
                    playSE('error');
                    // 1秒後にゲームオーバーシナリオへ
                    setTimeout(() => playScenario('end_d3_timeout'), 1000);
                }
            }, 1000);

        }, 6000); // ジャンプスケアから6秒後に開始
        // ▲▲▲ ここまで ▲▲▲
    }

    // === DAY 4 ===
else if (pageId === 'd4_sound') {
        // ページ表示から1秒後に再生ループを開始
        setTimeout(() => {
            const sosDuration = 3300; // SOS信号の再生時間（約3.3秒）
            const desiredGap = 3000;  // 再生後の無音時間（3秒）

            function repeatSOS() {
                playMorseCodeSOS(); // SOS信号を再生
                
                // 再生時間 + 無音時間 の後に、再びこの関数を呼び出す
                morseCodeTimerId = setTimeout(repeatSOS, sosDuration + desiredGap);
            }
            
            repeatSOS(); // 最初の再生を開始
        }, 1000);

        pageArea.innerHTML = `
            <div class="site-center" style="color:#ddd;">
                <h2 style="color:red;">LIVE FEED (Rec)</h2>
                <div class="surveillance-cam">
                    <div class="cam-noise"></div>
                    <div class="cam-overlay"><span class="blink">● PLAY</span></div>
                    <div style="width:100%; height:100%; background: radial-gradient(circle, #444, #111); position:relative; display:flex; justify-content:center; align-items:center;">
                        <!-- テキストヒントをモールス信号風に -->
                        <div style="color:#fff; font-size:1.2em; font-family:monospace;">
                            [SIGNAL FRAGMENT: ･ ･ ･ ... ― ― ― ... ･ ･ ･]

                        </div>
                    </div>
                </div>
                <p>Identify the distress signal.</p>
                <div class="input-group">
                    <input type="text" id="input-d4_sound" placeholder="Answer" autocomplete="off">
                    <button onclick="checkAnswer('d4_sound')">Verify</button>
                </div>
            </div>`;
    }

    else if (pageId === 'd4_map') {
        // 画像とGPS情報
        pageArea.innerHTML = `
            <div class="site-center">
                <h2>Geo-Location Analysis</h2>
                <div style="width:300px; height:250px; margin:0 auto; border:1px solid #555; overflow:hidden; position:relative;">
                    <img src="assets/evidence_view.jpg" style="width:100%; height:100%; object-fit:cover;" alt="Night View">
                    <div style="position:absolute; bottom:0; left:0; background:rgba(0,0,0,0.7); color:#00ff41; font-size:0.7em; padding:5px; width:100%; text-align:left;">
                       LAT: 34.9841 N<br>
                       LON: 138.4022 E<br>
                       ALT: 125m
                    </div>
                </div>
                <p style="color:#aaa; margin-top:10px;">
                    Target is in a hotel overlooking this city.<br>
                    Identify the Name of a nearby station.
                </p>
                <div class="input-group">
                    <input type="text" id="input-d4_map" placeholder="station Name (e.g. Ueno,Natori)" autocomplete="off">
                    <button onclick="checkAnswer('d4_map')">Search</button>
                </div>
            </div>`;
    }
    // === DAY 4 BATTLE フェーズ1: 偽りの画面 ===
    else if (pageId === 'd4_battle_fake') {
        switchMode('fullscreen');
        document.body.classList.add('danger-mode');
        playSE('alert');
        
        // リフレッシュ回数をリセット
        let fakeRefreshCount = 0;
        window.handleFakeRefresh = () => {
            fakeRefreshCount++;
            playSE('glitch');
            const torIcon = document.getElementById('tor-icon');
            
            if (fakeRefreshCount === 5 && torIcon) {
                torIcon.textContent = '🔑'; // アイコンを鍵に変更
            }
            if (fakeRefreshCount >= 10) {
                const trueInput = document.getElementById('true-input-container');
                if (trueInput) {
                    trueInput.style.display = 'block';
                    trueInput.style.display = 'block';
                    setTimeout(() => { 
                        trueInput.style.opacity = '1';
                        document.getElementById('input-d4-real').focus(); // 入力欄に自動でフォーカス
                    }, 50);
                }

                isHackHintVisible = true; // ヒントフラグを立てる
                // もしDevToolsが開いていたら、表示を即時更新する
                if (!document.getElementById('devtools-panel').classList.contains('hidden')) {
                    updateDevToolsContent();
                }

                // 10回押したらハンドラを無効化
                window.handleFakeRefresh = () => {};
            }
        };
        // ゲーム内の更新ボタンの挙動を乗っ取る
        document.getElementById('btn-refresh').onclick = window.handleFakeRefresh;

        pageArea.innerHTML = `
            <div class="site-center">
                <h1 style="color:red; font-size:4em; animation:blink 0.2s infinite;">SYSTEM HACKED</h1>
                <p style="margin-top: 50px; color:#888;">"おめでとう！お前のPCは完全に掌握した！おめでとう！おめでとう！おめでとう！おめでとう！おめでとう！"</p>
                <div class="input-group">
                    <input type="text" placeholder="おめでとう！" disabled>
                    <button disabled>9煉ァ</button>
                </div>

                <div id="true-input-container" style="display:none; opacity:0; transition:opacity 0.5s; margin-top: 50px;">
                    <p style="color:yellow;">--- HIDDEN CONSOLE ---</p>
                    <div class="input-group">
                        <input type="text" id="input-d4-real" placeholder="ENTER TRUE COMMAND" autocomplete="off">
                        <button onclick="checkAnswer('d4-real')">EXECUTE</button>
                    </div>
                </div>
            </div>`;
    }

// (loadPageContent 関数内)

    // === DAY 4 BATTLE フェーズ2: CMD攻防 ===
    else if (pageId === 'd4_battle_cmd') {
        document.getElementById('btn-refresh').onclick = handleRefresh;
        
        pageArea.innerHTML = `
            <div class="cmd-window" style="position:relative;">
                <div class="cmd-log" id="battle-cmd-log" style="font-size:0.8em; color: #ff4d4d;"></div>
                <div id="cmd-overlay-text" style="position:absolute; top:40%; left:50%; transform:translateX(-50%); color:yellow; font-size:2em; font-family:'Share Tech Mono'; text-shadow:0 0 10px yellow; display:none; text-align:center;"></div>
            </div>`;

        const logArea = document.getElementById('battle-cmd-log');
        const overlayText = document.getElementById('cmd-overlay-text');
        const junkCode = "0123456789ABCDEF!@#$%^&*()[]{}";
        let enemyTypingInterval;

        // 犯人のタイピング処理を関数化
        function startEnemyTyping() {
            enemyTypingInterval = setInterval(() => {
                const p = document.createElement('p');
                p.textContent = "> " + Array(45).fill(0).map(() => junkCode[Math.floor(Math.random() * junkCode.length)]).join('');
                logArea.appendChild(p);
                logArea.scrollTop = logArea.scrollHeight;
            }, 100);
        }

        // メッセージをタイプライター風に表示する関数
        async function typeMessage(element, text, color = 'yellow') {
            element.innerHTML = '';
            element.style.color = color;
            element.style.display = 'block';
            for (let char of text) {
                element.innerHTML += char;
                await new Promise(r => setTimeout(r, 50));
            }
        }

        startEnemyTyping(); // 最初に犯人のタイピングを開始

        // --- イベントシーケンス ---
        (async () => {
            // 3秒後: LogicMaster登場
            await new Promise(r => setTimeout(r, 3000));
            clearInterval(enemyTypingInterval);
            await typeMessage(overlayText, "BACKSPACEを連打して奴のコードを消せ！");

            // BackSpace連打パート
            await new Promise(resolve => {
                let backspaceCount = 0;
                const handleBackspace = (e) => {
                    if (e.key === 'Backspace') {
                        e.preventDefault();
                        const lines = logArea.querySelectorAll('p');
                        if (lines.length > 0) {
                            lines[lines.length - 1].remove();
                        } else { // 全て消したら成功
                            backspaceCount++; // 念のためカウンター
                            document.removeEventListener('keydown', handleBackspace);
                            resolve();
                        }
                    }
                };
                document.addEventListener('keydown', handleBackspace);
            });

            // 犯人の反撃
            overlayText.style.display = 'none';
            await typeMessage(logArea, '...何をする...', '#ff4d4d');
            await typeMessage(logArea, '貴様の個人情報を特定した。世界中にばら撒いてやる。', '#ff4d4d');
            startEnemyTyping(); // 犯人が再びタイピング開始

            // LogicMasterの反撃
            await new Promise(r => setTimeout(r, 2000));
            clearInterval(enemyTypingInterval);
            await typeMessage(overlayText, "耐えろ！今俺が奴の情報を抜いている！", 'cyan');
            await new Promise(r => setTimeout(r, 2000));
            await typeMessage(overlayText, "気づかれた！PCに負荷をかけてくるぞ！", 'cyan');

            // 次のフェーズへ
            await new Promise(r => setTimeout(r, 1000));
            playScenario('load_d4_battle_phase3');
        })();
    }

// (loadPageContent 関数内)

    // === DAY 4 BATTLE フェーズ3: ダイアログスパム ===
    else if (pageId === 'd4_battle_dialog') {
        pageArea.innerHTML = `
            <div id="dialog-hell" style="width:100%; height:100vh; position:relative; background:#111; overflow:hidden;">
                
                <div id="dialog-timer" style="position:absolute; top:20px; left:50%; transform:translateX(-50%); font-size:3em; color:red; font-family:'Share Tech Mono'; z-index:9999;">40</div>
                <div id="dialog-gauge-container" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); width:80%; height:30px; background:#500; border:2px solid red; z-index:9999;">
                    <div id="dialog-gauge-bar" style="width:0%; height:100%; background:red; transition:width 0.2s;"></div>
                </div>
                <div style="position:absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #555; font-family:'Share Tech Mono'; font-size:1.5em;">
                    [D] [E] （キー）憐ｸa }p&a（を） d1押 せa^ｄ"3 ！
                </div>
            </div>`;

        setTimeout(() => {
            const container = document.getElementById('dialog-hell');
            const timerText = document.getElementById('dialog-timer');
            const gaugeBar = document.getElementById('dialog-gauge-bar');
            
            if (!container || !timerText || !gaugeBar) return;

            let timeLeft = 15;
            let engagement = 0;
            const maxEngagement = 100;
            let gameEnded = false; // ★★★ ゲーム終了フラグを追加 ★★★

            // --- キーボード入力の処理 ---
            const handleDialogDefense = (e) => {
                if (gameEnded) return; // ゲームが終わっていたら何もしない
                if (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'e') {
                    const dialogs = document.querySelectorAll('.fake-dialog');
                    if (dialogs.length > 0) {
                        dialogs[dialogs.length - 1].remove();
                        engagement -= 18;
                        if (engagement < 0) engagement = 0;
                        updateGauge();
                    }
                }
            };
            document.addEventListener('keydown', handleDialogDefense);
            
            // --- タイマーとゲージの処理 ---
            const timerId = setInterval(() => {
                if (gameEnded) return;
                timeLeft--;
                timerText.textContent = timeLeft;
                if (timeLeft <= 0) {
                    cleanupAndProceed('hacking_success');
                }
            }, 1000);

            const spamId = setInterval(() => {
                if (gameEnded) return;
                engagement += 3;

playSE('dialog_spawn');
                
                const dialog = document.createElement('div');
                dialog.className = 'fake-dialog';
                dialog.style.top = `${Math.random() * 80 + 10}vh`; 
                dialog.style.left = `${Math.random() * 80 + 10}vw`;                 dialog.innerHTML = `
                    <div class="fake-dialog-header"><span>おめでとう！</span><span style="color:red; font-weight:bold;">×</span></div>
                    <div class="fake-dialog-body">おめでとう！おめでとう！おめでとう！</div>`;
                container.appendChild(dialog);
                
                engagement += 8;
                updateGauge();
            }, 600);

            function updateGauge() {
                if (gameEnded || !gaugeBar) return;
                gaugeBar.style.width = `${(engagement / maxEngagement) * 100}%`;
                if (engagement >= maxEngagement) {
                    cleanupAndProceed('end_hacking_failure');
                }
            }

            // --- 終了処理をまとめる関数 ---
            function cleanupAndProceed(scenarioId) {
                if (gameEnded) return; // 既に終了処理が走っていたら何もしない
                gameEnded = true; // ★★★ 終了フラグを立てる ★★★

                clearInterval(timerId);
                clearInterval(spamId);
                document.removeEventListener('keydown', handleDialogDefense);
                document.querySelectorAll('.fake-dialog').forEach(d => d.remove());
                
                // ▼▼▼ 追加: チャットウィンドウを永久に隠す ▼▼▼
                const chatWindow = document.querySelector('.chat-window');
                if (chatWindow) {
                    chatWindow.classList.add('hidden'); // CSSの .hidden { display: none !important; } を利用
                }
                
                // ブラウザの右枠線を消して全画面感を維持する
                const browserWindow = document.getElementById('browser-window');
                if (browserWindow) {
                    browserWindow.style.borderRight = 'none';
                }
                // ▲▲▲ 追加ここまで ▲▲▲

                playScenario(scenarioId);
            }
        }, 10);
    }

    // === DAY 4: FINAL LOCK ===
    else if (pageId === 'p_final') {
        // 全画面モードを維持しつつ、赤基調の警告画面にする
        document.body.classList.add('danger-mode');
        
        pageArea.innerHTML = `
            <div class="site-center" style="animation: fadeIn 0.5s;">
                <div style="border: 4px solid red; padding: 40px; background: rgba(0,0,0,0.8); display: inline-block;">
                    <h1 style="color: red; font-size: 3em; margin: 0; text-shadow: 0 0 10px red;">FINAL SECURITY LOCK</h1>
                    <p style="color: #fff; margin-top: 20px; font-family: 'Share Tech Mono';">
                        SYSTEM LOCKDOWN IN PROGRESS...
                    </p>
                    
                    <!-- タイマー表示用 -->
                    <div id="final-timer" style="font-size: 4em; color: red; font-family: 'Share Tech Mono'; margin: 20px 0; font-weight: bold;">
                        30
                    </div>

                    <p style="color: #aaa;">ENTER ROOM NUMBER TO UNLOCK</p>
                    
                    <div class="input-group">
                        <input type="text" id="input-p_final" placeholder="ROOM NUMBER" 
                               style="font-size: 1.5em; width: 200px; text-align: center; border: 2px solid red; color: red; background: #000;" 
                               autocomplete="off" autofocus>
                        <button onclick="checkAnswer('p_final')" 
                                style="font-size: 1.2em; background: red; color: white; border: none; padding: 10px 20px;">
                            UNLOCK
                        </button>
                    </div>
                </div>
            </div>`;
            
        // 入力欄に自動フォーカス
        setTimeout(() => {
            const input = document.getElementById('input-p_final');
            if (input) input.focus();
        }, 100);
    }

    // === DAY 5 (Hidden) ===
    else if (pageId === 'd5_console') {
        playSE('glitch');

        pageArea.innerHTML = `
            <div class="site-center" style="font-family:'Courier New', monospace; text-align:left; padding:20px;">
                <h1 style="color:red;">>_ ROOT CONSOLE</h1>
                <p style="color:#aaa;">// SYSTEM LOCKED. AUTHENTICATION REQUIRED.</p>
                
                <div style="border-left: 2px solid red; padding-left: 10px; margin: 20px 0; color: #ff5555; line-height: 1.6;">
                    > SECURITY QUESTION:<br>
                    "・[遖ｾ]  ｭ謫ｾ菴阪＃$%"''()*+,-./fs0a"<br>
                    (この数■■英単■から全■1■引■■検■■ろ)<br>
                    <br>
                    > HINT: 6846-82 ebn
                </div>
                
                <p>Enter the passkey to decrypt the final log.</p>
                <div class="input-group" style="text-align:left;">
                    <span style="color:red;">root@admin:~$</span>
                    <input type="text" id="input-d5_console" placeholder="Passkey?" style="width:200px; text-align:left;" autocomplete="off">
                    <button onclick="checkAnswer('d5_console')">Unlock</button>
                </div>
            </div>`;
    }
}

function toggleDevTools() {
    const panel = document.getElementById('devtools-panel');
    panel.classList.toggle('hidden');
    if (currentPageId === 'd2_files' || currentPageId === 'd2_error' || currentPageId === 'd2_dom') switchDevTab('Console');
    else switchDevTab('Elements');
    updateDevToolsContent();
}

function switchDevTab(tabName) {
    currentDevTab = tabName;
    document.querySelectorAll('.dt-tab').forEach(t => {
        if (t.textContent === tabName) t.classList.add('active');
        else t.classList.remove('active');
    });
    updateDevToolsContent();
}

function updateDevToolsContent() {
    const body = document.getElementById('devtools-body');
    body.innerHTML = '';
    
    if (currentPageId === 'd1_entry') {
        if (currentDevTab === 'Elements') {
            body.innerHTML = `
                <div><span class="code-tag">&lt;body&gt;</span></div>
                <div style="padding-left:10px;"><span class="code-tag">&lt;div</span> <span class="code-attr">id</span>=<span class="code-str">"login-form"</span><span class="code-tag">&gt;</span></div>
                <div style="padding-left:20px; color:#6a9955;">&lt;!-- この籠には声なき『つぶやき』だけが残されている。この は自由に飛ぶことはできない。 --&gt;</div>
                <div style="padding-left:10px;"><span class="code-tag">&lt;/div&gt;</span></div>
            `;
        } else body.innerHTML = `<div style="color:#aaa;">// No logs.</div>`;
    } 
    else if (currentPageId === 'd2_error') {
        if (currentDevTab === 'Console') {
             body.innerHTML = `
                <div style="color:red;">Uncaught ReferenceError: system is not defined at app.js:404</div>
                <div style="color:#aaa;">> _</div>
            `;
        } else body.innerHTML = `<div style="color:#aaa;">// Source hidden.</div>`;
    } 
    else if (currentPageId === 'd2_dom') {
        if (currentDevTab === 'Elements') {
             body.innerHTML = `
                <div style="padding-left:10px;"><span class="code-tag">&lt;div</span> <span class="code-attr">id</span>=<span class="code-str">"firewall-layer"</span><span class="code-tag">&gt;</span>...<span class="code-tag">&lt;/div&gt;</span></div>
                <div style="padding-left:10px;"><span class="code-tag">&lt;button&gt;</span>DOWNLOAD<span class="code-tag">&lt;/button&gt;</span></div>
            `;
        } else body.innerHTML = `<div style="color:#aaa;">> Try removing the overlay element.</div>`;
    }

    else if (currentPageId === 'd2_noise') {
        if (currentDevTab === 'Network') {
            body.innerHTML = `
                <div style="color:#aaa; border-bottom:1px solid #444; padding-bottom:5px; margin-bottom:10px;">
                    Status: 200 OK | Type: image/jpeg | Size: 404KB
                </div>
                <div>
                    <span style="color:#569cd6;">GET</span> puzzle_noise.jpg
                    <button onclick="hackImage()" style="margin-left:10px; background:#333; color:#ddd; border:1px solid #555; cursor:pointer;">
                        ↻ Reload Image (Debug Mode)
                    </button>
                </div>
                <div style="margin-top:10px; color:#6a9955;">// Debug: Force reload with inverted color profile.</div>
            `;
        } else {
            body.innerHTML = `<div style="color:#aaa;">// Check Network tab for image resources.</div>`;
        }
    }

    else if (currentPageId === 'd3_dark') {
        if (currentDevTab === 'Console') {
            body.innerHTML = `
                <div style="color:#ff3333;">[ERROR] CamFeed failed to initialize: Main power grid offline.</div>
                <div style="color:#e6e600; margin-top:10px;">> Emergency power system active.</div>
                <div>> Available override commands: <span style="color:#00ff41; font-weight:bold;">'暗闇を照らすなら？'</span></div>
            `;
        } else {
            body.innerHTML = `<div style="color:#aaa;">// Video stream is corrupted. Check Console for error logs.</div>`;
        }
    }

    else if (currentPageId === 'd4_battle_fake') {
        if (currentDevTab === 'Console') {
            if (isHackHintVisible) {
                // フラグが立っている場合：ヒントを表示
                body.innerHTML = `
                    <div style="color:#e6e600;">// LogicMaster's last message...</div>
                    <div style="margin-top:10px;">> クソッ、回線を切られた…！</div>
                    <div>> だが、奴のシステムにバックドアを仕掛けておいた。</div>
                    <div>> 以下のコマンドを実行して、カウンターハックを開始しろ！</div>
                    <div style="color:#00ff41; font-weight:bold; margin-top:10px;">> execute_counter_hack.bat</div>
                `;
            } else {
                // フラグが立っていない場合：待機メッセージを表示
                body.innerHTML = `
                    <div style="color:#888;">// Analyzing connection...</div>
                    <div style="color:#888;">// Awaiting trigger signal...</div>
                `;
            }
        } else {
            body.innerHTML = `<div style="color:#aaa;">// CONNECTION INTERRUPTED...</div>`;
        }
    }

    else {
        body.innerHTML = `<div style="color:#aaa;">// No source available for this secure page.</div>`;
    }
}

function handleRefresh() {
    if (isRefreshCleared) return;
    const content = document.getElementById('page-area');
    
    if (currentPageId === 'd1_404') {
        refreshCount++;
        playSE('glitch');
        if (refreshCount < 4) {
            content.style.opacity = '0.5';
            setTimeout(() => content.style.opacity = '1', 100);
            return;
        }
        content.style.opacity = '0.1';
        setTimeout(() => {
            const progress = (refreshCount - 3) / 5;
            content.innerHTML = `<div class="site-center"><h1 style="font-size:3em;">404... <span style="color:red; opacity:${progress}">CONNECTING</span></h1></div>`;
            content.style.opacity = '1';
        }, 100);

        if (refreshCount >= 8) {
            isRefreshCleared = true; 
            setTimeout(() => {
                playSE('success');
                
                // ★追加: 繋がった瞬間に時間を3:00に進める
                const indicator = document.getElementById('day-indicator');
                if (indicator) indicator.textContent = "Day 1 - 03:00 AM";
                
                playScenario('chat_d1_files'); 
            }, 800);
        }
    } else {
        content.style.opacity = '0.5';
        setTimeout(() => content.style.opacity = '1', 300);
    }
}

const RIDDLES = {
    // Day 1
    'd1_files': { 
        branches: [
            { hashes: ['open readme.txt', 'cat readme.txt'], type: 'hint', text: '--- readme.txt ---\nTo access the next layer,\nplease verify your age.\nPasscode: GATE_OPEN' },
            { hashes: ['open welcome.msg'], type: 'hint', text: '--- welcome.msg ---\nWelcome to the public archive.' },
            { hashes: ['gate_open', 'gate open'], next: 'chat_d1_script' } 
        ]
    },
    'd1_script': { hashes: ['age=20', 'age = 20', 'age=18', 'age = 18', 'age=100'], next: 'chat_d1_ghost' },
    'd1_ghost': { hashes: ['help', 'sos'], next: 'chat_d1_entry' },
    'd1_entry': { hashes: ['tori', '鳥', 'とり'], next: 'chat_d1_port' },
    'd1_port':  { 
        branches: [
            { 
                hashes: ['netstat', 'scan', 'status'], 
                type: 'hint', 
                text: `Active Internet connections (servers and established)
Proto  Local Address          State
tcp    0.0.0.0:80             CLOSE
tcp    0.0.0.0:443            CLOSE
tcp    0.0.0.0:8080           CLOSE
tcp    0.0.0.0:666            LISTEN  <-- TARGET
tcp    0.0.0.0:3306           CLOSE`
            },
            { hashes: ['open 666', 'connect 666'], next: 'chat_d1_clear' }
        ]
    },

    // Day 2
    'd2_sql': { hashes: ['admin', 'root', 'system', 'administrator'], next: 'chat_d2_dom' },
    'd2_dom': {
        hashes: ["0x5f3a"],   // 入力される値と完全に一致させる
        next: 'chat_d2_read'  // ★重要: 正解した後の行き先を指定する
    },
'd2_diary': {
        branches: [
            { 
                hashes: ['open 2023_10_20_mynewfriend.txt'], 
                type: 'hint', 
                text: '【2023/10/20 - 新しい友達】\n今日、新しい家族ができた。\n小さくて、鮮やかな「黄色い羽」を持つ小鳥。\n昔は「炭鉱」に連れて行かれて、毒ガスの検知役をさせられていた可哀想な種類らしい。\n……まるで、危険を知らせる警報機だ。' 
            },
            { 
                hashes: ['open 2023_10_30_someoneiswatching.txt'], 
                type: 'hint', 
                text: '【2023/10/30 - 視線】\n今日はハロウィン。でも誰も家に来ない。\n外から視線を感じる。誰かが見ている。\n私の小鳥が、窓の方を見て激しく鳴き叫んでいる。\nあの子には「何か」が見えているの？' 
            },
            { 
                hashes: ['open 2023_11_01_thedoorbell.txt'], 
                type: 'hint', 
                text: '【2023/11/01 - 訪問者】\nチャイムが鳴った。何度も。\n「荷物です」と言っていたけど、私は何も頼んでいない。\nドアチェーン越しに見えた作業服の男。\n目が笑っていなかった。' 
            },
            { 
                hashes: ['open 2023_11_07_whereami.txt'], 
                type: 'hint', 
                text: '【2023/11/07 - 暗闇】\n連れてこられた。ここは暗い。\n男が笑いながらパスワードを設定していた。\n「お前の友達にしてやったぞ」\n「俺たちに危険を知らせてくれる、黄色い警報機」' 
            },
            {
                hashes: ['open data_log_corrupted.bin'],
                type: 'hint',
                text: 'ERROR: FAILED TO READ FILE.\nDATA SECTOR 0x00A4... CORRUPTED.'
            },
            // 答えは変わらずカナリアだが、文章からは消えている
            { hashes: ['canary', 'カナリア', 'かなりあ'], next: 'chat_d2_noise' }
        ]
    },
    'd2_noise': { hashes: ['reverse'], next: 'chat_d2_error' },
    'd2_error': { hashes: ['taskkill /f /im tracker.exe'], next: 'load_d2_help_dialog' },

    // Day 3
    'd3_api': { type: 'api_action', required: 'admin', next: 'chat_d3_dark' },
    'd3_dark':  { hashes: ['light', 'ライト', 'らいと'],  next: 'chat_d3_lit' },

    // Day 4 (長崎)
    'd4_sound': { hashes: ['sos'], next: 'chat_d4_map' },    'd4_map':   { hashes: ['yunoki', '柚木', 'ゆのき', '柚木駅'], next: 'chat_d4_battle' },
    'd4-real': { hashes: ['execute_counter_hack.bat'], next: 'load_d4_battle_phase2' },

'p_final': {
        branches: [
            { hashes: ['close', 'exit'], next: 'end_bad' },
            { hashes: ['121'], next: 'end_normal' },
            { hashes: ['report', 'police'], next: 'end_report' }
        ]
    },

    // Day 5 (Hidden)
    'd5_console': { 
        branches: [
            { 
                // 正解：飛べない鳥 (日本語、ローマ字、英語)
                hashes: ['tobenaitori', '飛べない鳥', 'flightless bird', 'flightlessbird'], 
                next: 'day5_end' 
            }
        ]
    } 
};

window.checkAnswer = async function(pageId) {
    const input = document.getElementById(`input-${pageId}`);
    if (!input || input.disabled || isSolving) return;

    if (pageId === 'd1_script' && !isNaN(input.value) && parseInt(input.value) >= 18) {
        input.value = `age = ${input.value}`;
    }

    isSolving = true; 
    const msg = document.getElementById(`msg-${pageId}`);
    
    let viewer = document.getElementById('file-viewer');        
    if (!viewer) viewer = document.getElementById('port-scan-result'); 
    if (!viewer) viewer = document.getElementById('diary-content');    

    // ▼▼▼【修正箇所】Day3 APIチェック専用ロジックを追加 ▼▼▼
    if (pageId === 'd3_api') {
        try {
            const apiData = JSON.parse(input.value);
            const riddle = RIDDLES[pageId];
            if (apiData && apiData.role && apiData.role.toLowerCase() === riddle.required) {
                playSE('success');
                input.disabled = true;
                document.querySelector('button[onclick="checkAnswer(\'d3_api\')"]').disabled = true;
            setTimeout(() => {
                playScenario('load_d3_dark'); // ★ここが重要！
                isSolving = false; 
            }, 1500);

        } else {
            throw new Error('Invalid role');
        }
    } catch (e) {
        playSE('error');
        input.classList.add('shake');
        setTimeout(() => {
            input.classList.remove('shake');
            isSolving = false;
        }, 500);
    }
    return; // この後の処理は行わない
}

    let val = input.value.trim().toLowerCase();
    
    if (pageId === 'd2_noise') {
        const riddle = RIDDLES['d2_noise'];
        if (riddle.hashes.includes(val)) {
            playSE('success');

            const devtoolsPanel = document.getElementById('devtools-panel');
            if (devtoolsPanel && !devtoolsPanel.classList.contains('hidden')) {
                devtoolsPanel.classList.add('hidden');
            }

            playSE('glitch'); // 怖い音を追加
            
            // 画像を反転させる
            const img = document.getElementById('target-image');
            if (img) {
                img.style.filter = "invert(1) contrast(1.5)";
            }
            
            if(msg) msg.style.color = '#00ff41';
            input.disabled = true;

            // 演出を見せるために少し待ってから次へ
            setTimeout(() => {
                playScenario(riddle.next);
                setTimeout(() => { isSolving = false; }, 2000);
            }, 2500); 
            return;
        }
    }

    // Day 3: ライト点灯 -> 動画切り替え
    if (pageId === 'd3_dark') {
        const riddle = RIDDLES['d3_dark'];
        if (riddle.hashes.includes(val)) {
            playSE('success');

            const devtoolsPanel = document.getElementById('devtools-panel');
            if (devtoolsPanel && !devtoolsPanel.classList.contains('hidden')) {
                devtoolsPanel.classList.add('hidden');
            }

            const video = document.getElementById('video-feed');
            if (video) {
                video.src = "assets/cam_light.mp4"; // 女性の縦動画
                video.play();
            }
            if(msg) {
                msg.style.color = '#00ff41';
                msg.textContent = "System: LIGHTS ON";
            }
            input.disabled = true;
            setTimeout(() => {
                playScenario(riddle.next);
                setTimeout(() => { isSolving = false; }, 2000);
            }, 3000); // 動画を見せるため長めに待機
            return;
        }
    }

    const riddle = RIDDLES[pageId];
    if (!riddle) { isSolving = false; return; }

    if (riddle.type === 'dom_action') {
        if (val.includes(riddle.targetId) && (val.includes('remove') || val.includes('none'))) {
            playSE('success');
            const el = document.getElementById(riddle.targetId);
            if(el) {
                el.style.opacity = '0';
                setTimeout(() => el.style.display = 'none', 1000);
            }
            input.value = "Executed.";
            input.disabled = true;
            isSolving = false;
            return;
        }
    }

    let nextScenarioId = null;
    let hintText = null;

    if (riddle.branches) {
        for (const branch of riddle.branches) {
            if (branch.hashes.includes(val)) {
                if (branch.type === 'hint') hintText = branch.text;
                else nextScenarioId = branch.next;
                break;
            }
        }
    } else if (riddle.hashes && riddle.hashes.includes(val)) {
        nextScenarioId = riddle.next;
    }

    if (hintText) {
        playSE('click');
        if (viewer) {
            viewer.innerText = hintText; 
            viewer.style.display = 'block';
            
            if (pageId === 'd1_port') {
                viewer.style.whiteSpace = 'pre'; 
                viewer.style.color = '#00ff41';
            } else {
                viewer.style.borderColor = '#00ff41';
                viewer.style.whiteSpace = 'pre-wrap';
            }
        }
        input.value = '';
        isSolving = false;
        return;
    }

if (nextScenarioId) {
        playSE('success');

        if (morseCodeTimerId) { // ★名前を変更
            clearTimeout(morseCodeTimerId); // ★clearInterval から clearTimeout に変更
            morseCodeTimerId = null; // ★名前を変更
        }

        // DevToolsが開いていたら閉じる
        const devtoolsPanel = document.getElementById('devtools-panel');
        if (devtoolsPanel && !devtoolsPanel.classList.contains('hidden')) {
            devtoolsPanel.classList.add('hidden');
        }

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null; // リセット
            const indicator = document.getElementById('day-indicator');
            if (indicator) {
                indicator.classList.add('hidden'); // タイマーを隠す
                // Day表示に戻す
                setTimeout(() => updateDayIndicator(), 1000);
            }
            document.body.classList.remove('danger-mode'); // 赤点滅解除
        }
        
        if (pageId === 'd2_sql') {
            const res = document.getElementById('sql-result');
            if(res) {
                res.style.display = 'block';
                res.style.height = '200px'; 
                res.innerHTML = ''; 
                
                const randomHex = () => Math.floor(Math.random()*16777215).toString(16);
                const randomName = () => Math.random().toString(36).substring(7);
                
                let count = 0;
                const maxLines = 80; 
                
                const interval = setInterval(() => {
                    count++;
                    const id = String(count).padStart(4, '0');
                    const color = count % 2 === 0 ? '#00ff41' : '#00cc33';
                    
                    const line = document.createElement('div');
                    line.style.color = color;
                    line.style.fontFamily = 'monospace';
                    line.style.fontSize = '0.9em';
                    line.innerHTML = `ID:${id} | USER:${randomName()} | PASS:${randomHex()} | ACCESS: OK`;
                    res.appendChild(line);
                    res.scrollTop = res.scrollHeight;

                    if (count >= maxLines) {
                        clearInterval(interval);
                        const targetLine = document.createElement('div');
                        targetLine.innerHTML = `-------------------------------------------------<br>ID:404 | USER:<span style="color:red; font-weight:bold; font-size:1.2em;">victim_1031</span> | FILE: <span style="color:yellow;">DIARY_FOUND</span>`;
                        targetLine.style.color = "#fff";
                        targetLine.style.marginTop = "10px";
                        targetLine.classList.add('blink');
                        res.appendChild(targetLine);
                        res.scrollTop = res.scrollHeight;
                        playSE('alert'); 
                    }
                }, 20); 
            }
        }
        
        if (pageId === 'd1_script') {
             const codeAge = document.getElementById('code-age');
             if(codeAge) codeAge.textContent = val.replace(/[^0-9]/g, '') || '20';
        }

        if(timerInterval) { 
            clearInterval(timerInterval);
            document.body.classList.remove('danger-mode');
        }
        input.disabled = true;
        if(msg) {
            msg.style.color = '#00ff41';
            msg.textContent = "Access Granted.";
        }
        
        setTimeout(() => {
            playScenario(nextScenarioId);
            setTimeout(() => { isSolving = false; }, 2000);
        }, 1500);
    } else {
        playSE('error');
        if(msg) msg.textContent = "Error: Invalid Input";
        
        if (pageId === 'd2_error') {
            const logArea = document.getElementById('cmd-log-area');
            if(logArea) {
                const p = document.createElement('p');
                p.style.color = "#ff5555";
                p.textContent = `'${input.value}' is not recognized as an internal or external command, operable program or batch file.`;
                logArea.appendChild(p);
                logArea.scrollTop = logArea.scrollHeight;
            }
        } else if(viewer) {
             viewer.style.display = 'block';
             viewer.innerText = "Error: Command not found or invalid syntax.";
             viewer.style.borderColor = 'red';
             viewer.style.color = '#ff5555';
        }
        
        input.classList.add('shake');
        setTimeout(() => {
            input.classList.remove('shake');
            isSolving = false; 
        }, 500);
    }
};

async function playNovel(textLines) {
    const novelBoxText = document.getElementById('novel-text');
    for (const line of textLines) {
        novelBoxText.textContent = "";
        let skipped = false;
        const skipHandler = (e) => { if (e.type === 'click' || (e.type === 'keypress' && e.key === 'Enter')) skipped = true; };
        document.body.addEventListener('click', skipHandler);
        document.body.addEventListener('keypress', skipHandler);

        for (let i = 0; i < line.length; i++) {
            if (skipped) { novelBoxText.textContent = line; break; }
            novelBoxText.textContent += line[i];
            await new Promise(r => setTimeout(r, 30)); 
        }
        document.body.removeEventListener('click', skipHandler);
        document.body.removeEventListener('keypress', skipHandler);

        await new Promise(resolve => {
            const nextHandler = (e) => {
                if (e.type === 'click' || (e.type === 'keypress' && e.key === 'Enter')) {
                    document.body.removeEventListener('click', nextHandler);
                    document.body.removeEventListener('keypress', nextHandler);
                    playSE('click');
                    resolve();
                }
            };
            setTimeout(() => {
                document.body.addEventListener('click', nextHandler);
                document.body.addEventListener('keypress', nextHandler);
            }, 100);
        });
    }
}

// --- Day 2 新ギミック用 ---
window.keySpawnEnabled = false; // KEY生成フラグ

window.enableKeySpawn = function() {
    if (window.keySpawnEnabled) return; // すでに有効なら無視
    
    playSE('click');
    playSE('alert'); // 音で気づかせる
    
    window.keySpawnEnabled = true; // フラグをON
    
    // 見た目の変化（発動した感）
    const btn = document.getElementById('btn-spawn-key');
    if(btn) {
        btn.style.color = "#fff";
        btn.style.backgroundColor = "#ff3333";
        btn.textContent = "INJECTING KEY...";
    }
};

// --- Day 2 画像ハック ---
window.hackImage = function() {
    playSE('click');
    playSE('glitch');
    
    const img = document.getElementById('target-image');
    const pass = document.getElementById('hidden-pass');
    
    if (img && pass) {
        // 画像を反転＆薄くする
        img.style.filter = "invert(1)";
        img.style.opacity = "0.3";
        
        // 奥の文字を浮かび上がらせる
        pass.style.opacity = "1";
        pass.style.color = "#fff"; // 文字色を白くして目立たせる
        pass.style.textShadow = "0 0 10px red"; // 赤く光らせる
    }
};

// --- Day 2 マトリックス演出 ---
let matrixInterval;

function startMatrixRain() {
    const box = document.getElementById('matrix-box');
    if (!box) return;

    // 既存のインターバルがあればクリア
    if (matrixInterval) clearInterval(matrixInterval);

    // 文字列生成用
    const chars = "01010101アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
    let targetCreated = false;

    matrixInterval = setInterval(() => {
        // ランダムな位置に列を生成
        const span = document.createElement('span');
        span.className = 'matrix-column';
        span.style.left = Math.floor(Math.random() * 90) + '%'; // 右端で見切れないように調整
        
        // デフォルトの速度 (1〜3秒)
        let speed = (Math.random() * 2 + 1) + 's';
        
        // 文字列を作る
        let content = "";
        const len = Math.floor(Math.random() * 10) + 5;
        
        // ターゲット（赤い文字）を混ぜる判定
        // ★修正: フラグ(window.keySpawnEnabled)がTrueの時だけKEYを生成
        let isTargetColumn = false;
        if (window.keySpawnEnabled && !targetCreated && Math.random() < 0.2) {
            isTargetColumn = true;
            targetCreated = true;
            speed = '8s'; // ゆっくり落ちる
            
            // ターゲットが流れ去ってしまったら再生成フラグを戻す
            setTimeout(() => { 
                if(document.getElementById('input-d2_dom') && !document.getElementById('input-d2_dom').value.includes('FOUND')) {
                    targetCreated = false; 
                }
            }, 8000);
        }

        span.style.animationDuration = speed;

        for(let i=0; i<len; i++) {
            if (isTargetColumn && i === Math.floor(len / 2)) {
                // ★修正: 文字を大きくし、クリックしやすいようにパディングをつける
                const targetChar = "【 KEY 】"; 
                content += `<span class="matrix-target" onclick="matrixHit(this)" 
                            style="font-size:24px; padding:15px; background:rgba(0,0,0,0.8); display:inline-block; border:2px solid red;">
                            ${targetChar}
                            </span><br>`;
                
                // ★修正: マウスホバーで停止させる処理
                span.onmouseover = function() { this.style.animationPlayState = 'paused'; };
                span.onmouseout = function() { this.style.animationPlayState = 'running'; };
                
            } else {
                 content += `<span class="matrix-head">${chars.charAt(Math.floor(Math.random() * chars.length))}</span>`;
            }
            // 縦に並べるために改行
            if (!isTargetColumn) content += "<br>"; 
        }
        
        span.innerHTML = content;
        
        // 正解の列は手前に表示
        if (isTargetColumn) span.style.zIndex = 10;
        
        box.appendChild(span);

        // アニメーション終わったら消す (ターゲットの場合は長く残す)
        setTimeout(() => { if(span.parentNode) span.remove(); }, isTargetColumn ? 8000 : 3000);

    }, 100);
}

window.matrixHit = function(el) {
    playSE('success');
    clearInterval(matrixInterval); // 雨を止める
    
    // エフェクト
    el.style.color = "#fff";
    el.style.textShadow = "0 0 20px #fff";
    el.parentElement.style.animationPlayState = 'paused'; // その列を止める
    
    const box = document.getElementById('matrix-box');
    box.style.borderColor = "#00ff41";
    box.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#00ff41; font-size:2em; font-weight:bold;">ACCESS GRANTED</div>`;

    // 入力欄に反映
    const input = document.getElementById('input-d2_dom');
    input.value = "0x5f3a"; 
    input.style.color = "#00ff41";
    input.classList.add('blink');
};

// =========================================================
// Day 2 URL表示用のカスタム関数
// =========================================================
window.revealUrlAndProceed = function() {
    // 成功音を鳴らす
    playSE('success');

    // 「助けて」のオーバーレイを取得
    const overlay = document.querySelector('#page-area .reset-overlay');

    if (overlay) {
        // オーバーレイの中身をURL表示に書き換える
        overlay.innerHTML = `
            <div class="site-center" style="animation: fadeIn 1s;">
                <h2 style="color:#00ff41;">DECODING TRACE DATA...</h2>
                <p style="font-family: 'Share Tech Mono', monospace; font-size: 1.5em; color: #fff; margin-top: 20px; border: 1px solid #555; padding: 10px 20px; background: #111; letter-spacing: 2px;">
                    cage404.onion
                </p>
                <p style="color:#888; margin-top: 20px;">Connection to Dark Web established.</p>
            </div>
        `;

        // 3秒後に次のシナリオへ進む
        setTimeout(() => {
            // URL表示のオーバーレイを削除
            overlay.remove();
            // 次のチャットシナリオを開始
            playScenario('chat_d2_clear');
        }, 3000); // 3000ミリ秒 = 3秒
    }
};