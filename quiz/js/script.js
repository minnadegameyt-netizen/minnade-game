// ★共通ライブラリをインポート（階層に合わせてパスを調整しています）
import * as twitch from '../../twitch.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 設定変数 ---
    let gameMode = 'solo';
    let platform = 'youtube';
    let TWITCH_CHANNEL_ID = "";
    let questionCountGoal = 10;
    let voteTimeLimit = 30;
    let difficulty = 2;
    let maxLife = 3;
    let currentLife = 3;
    
    // --- ゲーム状態など ---
    let currentQuestions = [];
    let currentQIndex = 0;
    let isVoting = false;
    let voteCounts = [0, 0, 0, 0];
    let timerInterval = null;
    let youtubeInterval = null;
    let questionStartTime = null;

    // --- YouTube API用 ---
    let YOUTUBE_API_KEY = "";
    let TARGET_VIDEO_ID = "";
    let liveChatId = null;
    let nextPageToken = null;

    // --- DOM要素 ---
    const setupModal = document.getElementById('setup-modal');
    const readyScreen = document.getElementById('ready-screen');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const gameContainer = document.getElementById('game-container');
    const resultModal = document.getElementById('result-modal');
    const questionText = document.getElementById('question-text');
    const optionBtns = [ document.getElementById('btn-1'), document.getElementById('btn-2'), document.getElementById('btn-3'), document.getElementById('btn-4') ];
    const timerDisplay = document.getElementById('timer');
    const votingStatus = document.getElementById('voting-status');
    const lifeDisplay = document.getElementById('life-display');
    const reloadBtn = document.getElementById('reload-btn');

    // --- SE読み込み ---
    const sfx = {
        correct: new Audio('bgm/quiz_correct.mp3'), wrong: new Audio('bgm/quiz_incorrect.mp3'),
        count: new Audio('bgm/count.mp3'), start: new Audio('bgm/start.mp3'),
        clear: new Audio('bgm/game_clear.mp3'), over: new Audio('bgm/game_over.mp3')
    };
    function playSe(name) { if(sfx[name]) { sfx[name].currentTime = 0; sfx[name].play().catch(()=>{}); } }

    // --- 初期化 ---
    function init() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode')) gameMode = urlParams.get('mode');

        document.body.classList.add(gameMode === 'streamer' ? 'mode-streamer' : 'mode-solo');

        document.querySelectorAll('.setup-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const parent = this.parentElement;
                parent.querySelectorAll('.setup-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            });
        });

        const platformSelect = document.getElementById('platform-select');
        if (platformSelect) {
            platformSelect.addEventListener('click', e => {
                if (e.target.tagName === 'BUTTON') platform = e.target.dataset.val;
            });
        }

        document.getElementById('setup-done-btn').addEventListener('click', onSetupDone);
        document.getElementById('game-start-btn').addEventListener('click', startCountDown);
        document.getElementById('back-btn').addEventListener('click', () => window.location.href = "../index.html");
        
        document.getElementById('back-to-setup-btn').addEventListener('click', () => {
            readyScreen.classList.add('hidden');
            setupModal.classList.remove('hidden');
            // ★修正: twitchモジュールの切断関数を使用
            if (platform === 'twitch') twitch.disconnectTwitch();
        });
        
        const resultButton = resultModal.querySelector('button');
        if(resultButton) {
            resultButton.addEventListener('click', () => {
                // ★修正: twitchモジュールの切断関数を使用
                if (platform === 'twitch') twitch.disconnectTwitch();
                location.reload();
            });
        }

        optionBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                if (gameMode === 'solo' && isVoting) submitAnswer(index);
            });
        });
    }

    // --- 設定完了処理 ---
    async function onSetupDone() {
        difficulty = parseInt(document.querySelector('#diff-select .selected').dataset.val);
        maxLife = parseInt(document.querySelector('#life-select .selected').dataset.val);
        questionCountGoal = parseInt(document.querySelector('#goal-select .selected').dataset.val);
        voteTimeLimit = parseInt(document.querySelector('#time-select .selected').dataset.val);

        if (gameMode === 'streamer') {
            if (platform === 'youtube') {
                YOUTUBE_API_KEY = sessionStorage.getItem('youtube_api_key');
                TARGET_VIDEO_ID = sessionStorage.getItem('youtube_target_video_id');
                if (!YOUTUBE_API_KEY || !TARGET_VIDEO_ID) {
                    alert("YouTube配信設定が見つかりません。"); return;
                }
                const connected = await fetchLiveChatId();
                if (!connected) return;
            } else if (platform === 'twitch') {
                TWITCH_CHANNEL_ID = sessionStorage.getItem('twitch_channel_id');
                if (!TWITCH_CHANNEL_ID) {
                    alert("Twitchチャンネル名が設定されていません。"); return;
                }
                try {
                    // ★修正: twitchモジュールの接続関数を使用し、コールバックを渡す
                    await twitch.connectTwitch(TWITCH_CHANNEL_ID, handleCommentFromStream);
                } catch(e) {
                    alert('Twitchへの接続に失敗しました: ' + e); return;
                }
            }
        }

        prepareQuestions();
        setupModal.classList.add('hidden');
        readyScreen.classList.remove('hidden');
    }

    function prepareQuestions() {
        // @ts-ignore
        let filtered = QUIZ_DATA.filter(q => q.diff === difficulty);
        if (filtered.length < questionCountGoal) {
            // @ts-ignore
            filtered = [...QUIZ_DATA];
        }
        shuffleArray(filtered);
        currentQuestions = [];
        while (currentQuestions.length < questionCountGoal) {
            currentQuestions = currentQuestions.concat(filtered);
        }
        currentQuestions = currentQuestions.slice(0, questionCountGoal);
    }
    function startCountDown() {
        readyScreen.classList.add('hidden');
        countdownOverlay.classList.remove('hidden');
        let count = 3;
        const textEl = document.getElementById('countdown-text');
        const showCount = () => {
            textEl.textContent = count;
            playSe('count');
            textEl.classList.remove('anim');
            void textEl.offsetWidth;
            textEl.classList.add('anim');
        };
        showCount();
        const countInterval = setInterval(() => {
            count--;
            if (count > 0) {
                showCount();
            } else {
                clearInterval(countInterval);
                textEl.textContent = "START!";
                playSe('start');
                setTimeout(() => {
                    countdownOverlay.classList.add('hidden');
                    startGame();
                }, 1000);
            }
        }, 1000);
    }
    function startGame() {
        gameContainer.classList.remove('hidden');
        currentLife = maxLife;
        updateLifeDisplay();
        document.getElementById('total-q-num').textContent = questionCountGoal;
        currentQIndex = 0;
        nextQuestion();
    }
    function updateLifeDisplay() { lifeDisplay.textContent = "❤️".repeat(currentLife); }
    function nextQuestion() {
        if (currentQIndex >= questionCountGoal) { gameClear(); return; }
        resetUI();
        document.getElementById('current-q-num').textContent = currentQIndex + 1;
        const qData = currentQuestions[currentQIndex];
        questionText.textContent = qData.q;
        optionBtns.forEach((btn, i) => { btn.querySelector('.opt-text').textContent = qData.a[i]; });
        startVotingPhase();
    }
    function resetUI() {
        optionBtns.forEach(btn => {
            btn.className = 'option-btn';
            btn.querySelector('.vote-bar').style.width = '0%';
            btn.blur(); 
        });
        voteCounts = [0, 0, 0, 0];
        timerDisplay.textContent = voteTimeLimit;
        document.getElementById('vote-count').textContent = "0";
    }
    function startVotingPhase() {
        isVoting = true;
        let timeLeft = voteTimeLimit;
        questionStartTime = new Date();
        if (gameMode === 'streamer') {
            votingStatus.classList.remove('hidden');
            if (platform === 'youtube') {
                nextPageToken = null;
                startYouTubePolling();
            }
            // Twitchは常時接続なのでポーリング開始は不要
        } else {
            votingStatus.classList.add('hidden');
        }
        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                if (gameMode === 'streamer') {
                    if (platform === 'youtube') stopYouTubePolling();
                    decideStreamerAnswer();
                } else {
                    // ★修正: いきなり handleIncorrect() を呼ばず、時間切れ演出を呼ぶ
                    handleTimeUp();
                }
            }
        }, 1000);
    }
    function submitAnswer(selectedIndex) {
        if (!isVoting) return;
        isVoting = false;
        clearInterval(timerInterval);
        if (gameMode === 'streamer' && platform === 'youtube') stopYouTubePolling();
        const qData = currentQuestions[currentQIndex];
        const correctIndex = qData.correct;
        optionBtns[selectedIndex].classList.add('selected');
        setTimeout(() => {
            if (selectedIndex === correctIndex) {
                playSe('correct');
                optionBtns[selectedIndex].classList.remove('selected');
                optionBtns[selectedIndex].classList.add('correct');
                setTimeout(() => {
                    currentQIndex++;
                    nextQuestion();
                }, 2000);
            } else {
                playSe('wrong');
                optionBtns[selectedIndex].classList.remove('selected');
                optionBtns[selectedIndex].classList.add('wrong');
                optionBtns[correctIndex].classList.add('correct');
                setTimeout(() => handleIncorrect(), 2000);
            }
        }, 1500);
    }

    // ★追加: 時間切れ時の処理（不正解と同じ演出を行う）
    function handleTimeUp() {
        isVoting = false; // 操作を受け付けなくする
        clearInterval(timerInterval); // 念のためタイマー停止
        
        playSe('wrong'); // 不正解音

        // 正解のボタンを緑色にする
        const qData = currentQuestions[currentQIndex];
        const correctIndex = qData.correct;
        optionBtns[correctIndex].classList.add('correct');

        // 2秒待ってからライフ減少処理へ
        setTimeout(() => {
            handleIncorrect();
        }, 2000);
    }

    function handleIncorrect() {
        currentLife--;
        updateLifeDisplay();
        if (currentLife <= 0) { gameOver(); } else { currentQIndex++; nextQuestion(); }
    }
    function decideStreamerAnswer() {
        const maxVotes = Math.max(...voteCounts);
        // ★修正: 0票の場合も即座に進まず、時間切れ演出（handleTimeUp）を呼ぶ
        if (maxVotes === 0) { handleTimeUp(); return; }
        
        const maxIndex = voteCounts.indexOf(maxVotes);
        submitAnswer(maxIndex);
    }
    function gameOver() {
        playSe('over');
        resultModal.classList.remove('hidden');
        document.getElementById('result-title').textContent = "GAME OVER";
        document.getElementById('result-title').style.color = "#e74c3c";
        document.getElementById('result-msg').textContent = `${currentQIndex + 1}問目でリタイア...\n回答数: ${currentQIndex}`;
        
        if (platform === 'twitch') twitch.disconnectTwitch();
    }
    function gameClear() {
        playSe('clear');
        resultModal.classList.remove('hidden');
        document.getElementById('result-title').textContent = "CONGRATULATIONS!!";
        document.getElementById('result-title').style.color = "#f1c40f";
        document.getElementById('result-msg').textContent = `全${questionCountGoal}問クリア！\n素晴らしい知識です！`;
        
        if (platform === 'twitch') twitch.disconnectTwitch();
    }
    async function fetchLiveChatId() {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${TARGET_VIDEO_ID}&key=${YOUTUBE_API_KEY}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId;
                return true;
            } else {
                alert("動画が見つからないか、ライブ配信ではありません。");
                return false;
            }
        } catch (e) { return false; }
    }
    function startYouTubePolling() { pollChat(); youtubeInterval = setInterval(pollChat, 5000); }
    function stopYouTubePolling() { if (youtubeInterval) clearInterval(youtubeInterval); }
    async function pollChat() {
        if (!liveChatId) return;
        let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet&key=${YOUTUBE_API_KEY}`;
        if (nextPageToken) url += `&pageToken=${nextPageToken}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.nextPageToken) nextPageToken = data.nextPageToken;
            if (data.items) {
                data.items.forEach(item => {
                    const messageTimestamp = new Date(item.snippet.publishedAt);
                    if (questionStartTime && messageTimestamp >= questionStartTime) {
                        handleCommentFromStream(item.snippet.displayMessage);
                    }
                });
            }
        } catch (e) {}
    }
    function vote(index) { voteCounts[index]++; }
    function updateVoteBars() {
        const total = voteCounts.reduce((a, b) => a + b, 0);
        document.getElementById('vote-count').textContent = total;
        optionBtns.forEach((btn, i) => {
            const percentage = total > 0 ? (voteCounts[i] / total) * 100 : 0;
            btn.querySelector('.vote-bar').style.width = `${percentage}%`;
        });
    }
    function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } }

    
    // --- ★修正: 共通のコメント処理関数のみ残しました ---
    function handleCommentFromStream(msg) {
        if (!isVoting) return;

        if (msg.match(/[1１]/)) vote(0);
        else if (msg.match(/[2２]/)) vote(1);
        else if (msg.match(/[3３]/)) vote(2);
        else if (msg.match(/[4４]/)) vote(3);
        updateVoteBars();
    }

    init();
});