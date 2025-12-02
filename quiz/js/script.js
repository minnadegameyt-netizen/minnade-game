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
            if (platform === 'twitch') disconnectTwitch();
        });
        
        // 結果画面のボタンの onclick 属性はHTML側で直接書くのではなく、こちらで設定
        const resultButton = resultModal.querySelector('button');
        if(resultButton) {
            resultButton.addEventListener('click', () => {
                if (platform === 'twitch') disconnectTwitch();
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
                    await connectTwitch(TWITCH_CHANNEL_ID);
                } catch(e) {
                    alert('Twitchへの接続に失敗しました: ' + e); return;
                }
            }
        }

        prepareQuestions();
        setupModal.classList.add('hidden');
        readyScreen.classList.remove('hidden');
    }

    // (ここから下のゲームロジック関数は変更なし)
    // prepareQuestions, startCountDown, startGame, ...
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
                    handleIncorrect();
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
    function handleIncorrect() {
        currentLife--;
        updateLifeDisplay();
        if (currentLife <= 0) { gameOver(); } else { currentQIndex++; nextQuestion(); }
    }
    function decideStreamerAnswer() {
        const maxVotes = Math.max(...voteCounts);
        if (maxVotes === 0) { handleIncorrect(); return; }
        const maxIndex = voteCounts.indexOf(maxVotes);
        submitAnswer(maxIndex);
    }
    function gameOver() {
        playSe('over');
        resultModal.classList.remove('hidden');
        document.getElementById('result-title').textContent = "GAME OVER";
        document.getElementById('result-title').style.color = "#e74c3c";
        document.getElementById('result-msg').textContent = `${currentQIndex + 1}問目でリタイア...\n正解数: ${currentQIndex}`;
    }
    function gameClear() {
        playSe('clear');
        resultModal.classList.remove('hidden');
        document.getElementById('result-title').textContent = "CONGRATULATIONS!!";
        document.getElementById('result-title').style.color = "#f1c40f";
        document.getElementById('result-msg').textContent = `全${questionCountGoal}問クリア！\n素晴らしい知識です！`;
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

    // --- Twitch連携 (ここからが修正・追加箇所) ---
    let twitchClient = null;

    function connectTwitch(channelName) {
        return new Promise((resolve, reject) => {
            // ★★★★★ 重要なチェック ★★★★★
            // tmiオブジェクトがwindowに存在するか確認
            // @ts-ignore
            if (typeof tmi === 'undefined') {
                // エラーメッセージを具体的にしてreject
                return reject("TMI.jsライブラリが読み込まれていません。");
            }

            // @ts-ignore
            twitchClient = new tmi.Client({ channels: [channelName] });
            
            twitchClient.on('connected', () => {
                console.log('Twitchに接続しました。');
                resolve(true);
            });

            twitchClient.on('message', (channel, tags, message, self) => {
                if (isVoting) {
                    handleCommentFromStream(message);
                }
            });

            twitchClient.connect().catch(e => {
                console.error('Twitch接続エラー:', e);
                reject(e);
            });
        });
    }

    function disconnectTwitch() {
        if (twitchClient) {
            twitchClient.disconnect();
            twitchClient = null;
            console.log('Twitchから切断しました。');
        }
    }
    
    // 共通のコメント処理関数
    function handleCommentFromStream(msg) {
        if (msg.match(/[1１]/)) vote(0);
        else if (msg.match(/[2２]/)) vote(1);
        else if (msg.match(/[3３]/)) vote(2);
        else if (msg.match(/[4４]/)) vote(3);
        updateVoteBars();
    }

    init();
});