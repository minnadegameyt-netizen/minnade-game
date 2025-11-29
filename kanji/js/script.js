document.addEventListener('DOMContentLoaded', () => {
    // --- 設定変数 ---
    let gameMode = 'solo';
    let questionCountGoal = 10;
    let voteTimeLimit = 30;
    let difficulty = 2; // 1:初級 ~ 4:特級
    let maxLife = 3;
    let currentLife = 3;
    
    // --- ゲーム状態 ---
    let currentQuestions = [];
    let currentQIndex = 0;
    let isVoting = false;
    let voteCounts = [0, 0, 0, 0];
    let timerInterval = null;
    let youtubeInterval = null;

    // --- YouTube API用 ---
    let YOUTUBE_API_KEY = "";
    let TARGET_VIDEO_ID = "";
    let liveChatId = null;
    let nextPageToken = null;

    // --- DOM要素 ---
    const setupModal = document.getElementById('setup-modal');
    const readyScreen = document.getElementById('ready-screen');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownText = document.getElementById('countdown-text');
    const gameContainer = document.getElementById('game-container');
    const resultModal = document.getElementById('result-modal');
    
    const questionText = document.getElementById('question-text');
    const optionBtns = [
        document.getElementById('btn-1'),
        document.getElementById('btn-2'),
        document.getElementById('btn-3'),
        document.getElementById('btn-4')
    ];
    const timerDisplay = document.getElementById('timer');
    const votingStatus = document.getElementById('voting-status');
    const voteCountDisplay = document.getElementById('vote-count');
    const lifeDisplay = document.getElementById('life-display');

    // --- SE読み込み ---
    // ※ bgmフォルダが kanji/bgm/ にある想定
    const sfx = {
        correct: new Audio('bgm/quiz_correct.mp3'),
        wrong: new Audio('bgm/quiz_incorrect.mp3'),
        count: new Audio('bgm/count.mp3'),
        start: new Audio('bgm/start.mp3'),
        clear: new Audio('bgm/game_clear.mp3'),
        over: new Audio('bgm/game_over.mp3')
    };
    
    function playSe(name) {
        if(sfx[name]) {
            sfx[name].currentTime = 0;
            sfx[name].play().catch(()=>{});
        }
    }

    // --- 初期化 ---
    function init() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode')) gameMode = urlParams.get('mode');

        // 設定ボタンの挙動
        document.querySelectorAll('.setup-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const parent = this.parentElement;
                parent.querySelectorAll('.setup-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            });
        });

        document.getElementById('setup-done-btn').addEventListener('click', onSetupDone);
        document.getElementById('game-start-btn').addEventListener('click', startCountDown);
        document.getElementById('back-btn').addEventListener('click', () => window.location.href = "../index.html");
        document.getElementById('back-to-setup-btn').addEventListener('click', () => {
            readyScreen.classList.add('hidden');
            setupModal.classList.remove('hidden');
        });

        optionBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                if (gameMode === 'solo' && isVoting) submitAnswer(index);
            });
        });
    }

    // --- 設定完了 -> 待機画面へ ---
    async function onSetupDone() {
        // 設定値取得
        difficulty = parseInt(document.querySelector('#diff-select .selected').dataset.val);
        maxLife = parseInt(document.querySelector('#life-select .selected').dataset.val);
        questionCountGoal = parseInt(document.querySelector('#goal-select .selected').dataset.val);
        voteTimeLimit = parseInt(document.querySelector('#time-select .selected').dataset.val);

        // 配信設定チェック
        if (gameMode === 'streamer') {
            YOUTUBE_API_KEY = sessionStorage.getItem('youtube_api_key');
            TARGET_VIDEO_ID = sessionStorage.getItem('youtube_target_video_id');
            if (!YOUTUBE_API_KEY || !TARGET_VIDEO_ID) {
                alert("配信設定がありません。トップページから設定してください。");
                return;
            }
            const connected = await fetchLiveChatId();
            if (!connected) return;
        }

        // 問題データ準備 (kanji-data.js の QUIZ_DATA を使用)
        prepareQuestions();

        setupModal.classList.add('hidden');
        readyScreen.classList.remove('hidden');
    }

    // --- 問題データの準備 ---
    function prepareQuestions() {
        let filtered = QUIZ_DATA.filter(q => q.diff === difficulty);
        
        // データ不足時は全データから補充（あまりないはずだが念のため）
        if (filtered.length < questionCountGoal) {
            filtered = [...QUIZ_DATA]; 
        }
        
        shuffleArray(filtered);
        currentQuestions = [];
        
        // 目標数までループして埋める
        while (currentQuestions.length < questionCountGoal) {
            currentQuestions = currentQuestions.concat(filtered);
        }
        currentQuestions = currentQuestions.slice(0, questionCountGoal);
    }

    // --- カウントダウン演出 ---
    function startCountDown() {
        readyScreen.classList.add('hidden');
        countdownOverlay.classList.remove('hidden');
        
        let count = 3;
        const textEl = document.getElementById('countdown-text');
        
        textEl.textContent = count;
        playSe('count');
        
        textEl.classList.remove('anim');
        void textEl.offsetWidth; 
        textEl.classList.add('anim');

        const countInterval = setInterval(() => {
            count--;
            if (count > 0) {
                textEl.textContent = count;
                playSe('count');
                
                textEl.classList.remove('anim');
                void textEl.offsetWidth;
                textEl.classList.add('anim');
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

    // --- ゲーム開始 ---
    function startGame() {
        gameContainer.classList.remove('hidden');
        currentLife = maxLife;
        updateLifeDisplay();
        document.getElementById('total-q-num').textContent = questionCountGoal;
        
        currentQIndex = 0;
        nextQuestion();
    }

    function updateLifeDisplay() {
        let lifeStr = "";
        for(let i=0; i<currentLife; i++) lifeStr += "❤️";
        lifeDisplay.textContent = lifeStr;
    }

    // --- 次の問題へ ---
    function nextQuestion() {
        if (currentQIndex >= questionCountGoal) {
            gameClear();
            return;
        }

        resetUI();
        document.getElementById('current-q-num').textContent = currentQIndex + 1;

        const qData = currentQuestions[currentQIndex];
        questionText.textContent = qData.q;

        // 選択肢セット
        optionBtns.forEach((btn, i) => {
            btn.querySelector('.opt-text').textContent = qData.a[i];
        });

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
        
        if (gameMode === 'streamer') {
            votingStatus.classList.remove('hidden');
            nextPageToken = null; // ポーリング履歴をリセット
            startYouTubePolling();
        } else {
            votingStatus.classList.add('hidden');
        }

        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                if (gameMode === 'streamer') {
                    stopYouTubePolling();
                    decideStreamerAnswer();
                } else {
                    // ソロの場合、時間切れはミス扱い
                    handleIncorrect();
                }
            }
        }, 1000);
    }

    function submitAnswer(selectedIndex) {
        if (!isVoting) return;
        isVoting = false;
        clearInterval(timerInterval);
        if (gameMode === 'streamer') stopYouTubePolling();

        const qData = currentQuestions[currentQIndex];
        const correctIndex = qData.correct;

        optionBtns[selectedIndex].classList.add('selected');

        setTimeout(() => {
            if (selectedIndex === correctIndex) {
                // 正解
                playSe('correct');
                optionBtns[selectedIndex].classList.remove('selected');
                optionBtns[selectedIndex].classList.add('correct');
                setTimeout(() => {
                    currentQIndex++;
                    nextQuestion();
                }, 2000);
            } else {
                // 不正解
                playSe('wrong');
                optionBtns[selectedIndex].classList.remove('selected');
                optionBtns[selectedIndex].classList.add('wrong');
                optionBtns[correctIndex].classList.add('correct');
                setTimeout(() => {
                    handleIncorrect();
                }, 2000);
            }
        }, 1500);
    }

    function handleIncorrect() {
        currentLife--;
        updateLifeDisplay();
        if (currentLife <= 0) {
            gameOver();
        } else {
            currentQIndex++;
            nextQuestion();
        }
    }

    function decideStreamerAnswer() {
        let maxVotes = -1;
        let maxIndex = -1;
        for (let i = 0; i < 4; i++) {
            if (voteCounts[i] > maxVotes) {
                maxVotes = voteCounts[i];
                maxIndex = i;
            }
        }
        if (maxVotes === 0) {
            handleIncorrect();
            return;
        }
        submitAnswer(maxIndex);
    }

    function gameOver() {
        playSe('over');
        resultModal.classList.remove('hidden');
        document.getElementById('result-title').textContent = "GAME OVER";
        document.getElementById('result-title').style.color = "#e74c3c";
        document.getElementById('result-msg').textContent = `${currentQIndex + 1}問目で脱落...\n正解数: ${currentQIndex}`;
    }

    function gameClear() {
        playSe('clear');
        resultModal.classList.remove('hidden');
        document.getElementById('result-title').textContent = "達人！";
        document.getElementById('result-title').style.color = "#f1c40f";
        document.getElementById('result-msg').textContent = `見事、全${questionCountGoal}問正解しました！`;
    }

    // --- YouTube連携 ---
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

    function startYouTubePolling() {
        pollChat();
        youtubeInterval = setInterval(pollChat, 5000);
    }

    function stopYouTubePolling() {
        if (youtubeInterval) clearInterval(youtubeInterval);
    }

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
                    const msg = item.snippet.displayMessage;
                    if (msg.match(/[1１]/)) vote(0);
                    else if (msg.match(/[2２]/)) vote(1);
                    else if (msg.match(/[3３]/)) vote(2);
                    else if (msg.match(/[4４]/)) vote(3);
                });
                updateVoteBars();
            }
        } catch (e) {}
    }

    function vote(index) { voteCounts[index]++; }

    function updateVoteBars() {
        const total = voteCounts.reduce((a, b) => a + b, 0);
        document.getElementById('vote-count').textContent = total;
        optionBtns.forEach((btn, i) => {
            const count = voteCounts[i];
            let percentage = 0;
            if (total > 0) percentage = (count / total) * 100;
            btn.querySelector('.vote-bar').style.width = `${percentage}%`;
        });
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    init();
});