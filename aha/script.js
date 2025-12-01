import { stages } from './stages.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- 設定変数 ---
    let gameMode = 'solo'; // 'solo' or 'streamer'
    let audioEnabled = true;
    let questionsToPlay = 5;
    let voteTimeLimit = 20;

    // --- ゲーム状態 ---
    let gameState = {
        questions: [],
        currentQuestionIndex: -1,
        hostScore: 0,
        viewerScore: 0,
        hostAnswer: null,
        isVoting: false,
        timerInterval: null,
        changeTimerInterval: null, // 変化タイマー用
        preShowTime: 2000,         // 変化前の静止時間
        transitionDuration: 20000, // 20秒かけて変化
        resultDisplayTime: 4000,   // 正解表示時間（自動遷移は廃止するが演出用に使用）
        currentChange: null
    };

    // --- YouTube API用変数 ---
    let YOUTUBE_API_KEY = "";
    let TARGET_VIDEO_ID = "";
    let liveChatId = null;
    let nextPageToken = null;
    let youtubeInterval = null;
    let voteCounts = [0, 0, 0, 0]; // A, B, C, D
    let votingStartTime = null;

    // --- DOM要素 ---
    const baseImage = document.getElementById('base-image');
    const changedImage = document.getElementById('changed-image');
    const questionOverlay = document.getElementById('question-overlay');
    const optionsContainer = document.getElementById('options-container');
    const hostOptionsContainer = document.getElementById('host-options');
    const viewerOptionsContainer = document.getElementById('viewer-options');
    const votingStatus = document.getElementById('voting-status');
    const voteTotalDisplay = document.getElementById('vote-total');
    const timerDisplay = document.getElementById('timer');
    const hostScoreDisplay = document.getElementById('host-score');
    const viewerScoreDisplay = document.getElementById('viewer-score');
    const setupModal = document.getElementById('setup-modal');
    const readyScreen = document.getElementById('ready-screen');
    const resultModal = document.getElementById('result-modal');
    const gameContainer = document.getElementById('game-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // 演出用
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownText = document.getElementById('countdown-text');
    const transitionLayer = document.getElementById('transition-layer');
    const transitionText = document.getElementById('transition-text');
    
    // 変化タイマー（星隠し用）
    const changeTimerBox = document.getElementById('change-timer-box');
    const changeTimerVal = document.getElementById('change-timer-val');

    // --- SE読み込み ---
    const sfx = {
        correct: new Audio('bgm/quiz_correct.mp3'),
        wrong: new Audio('bgm/quiz_incorrect.mp3'),
        count: new Audio('bgm/count.mp3'),
        start: new Audio('bgm/start.mp3'),
        clear: new Audio('bgm/game_clear.mp3'),
        over: new Audio('bgm/game_over.mp3'),
        transition: new Audio('bgm/drum.mp3')
    };
    
    Object.values(sfx).forEach(audio => {
        audio.volume = 0.5;
        audio.onerror = () => {}; 
    });

    function playSe(name) {
        if(audioEnabled && sfx[name]) {
            sfx[name].currentTime = 0;
            sfx[name].play().catch(()=>{});
        }
    }

    // --- 初期化 ---
    function init() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode')) gameMode = urlParams.get('mode');

        setupSettings();
        
        document.getElementById('setup-done-btn').addEventListener('click', onSetupDone);
        document.getElementById('game-start-btn').addEventListener('click', startCountDown);
        document.getElementById('back-to-setup-btn').addEventListener('click', () => {
            readyScreen.classList.add('hidden');
            setupModal.classList.remove('hidden');
        });
    }

    // --- 設定画面の処理 ---
    function setupSettings() {
        const setupButtonGroup = (containerId, callback) => {
            const container = document.getElementById(containerId);
            if(!container) return;
            container.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    container.querySelector('.selected').classList.remove('selected');
                    e.target.classList.add('selected');
                    callback(e.target.dataset.val);
                }
            });
        };

        setupButtonGroup('questions-select', (val) => questionsToPlay = parseInt(val));
        setupButtonGroup('time-select', (val) => voteTimeLimit = parseInt(val));
        setupButtonGroup('sound-select', (val) => audioEnabled = (val === 'on'));
    }

    // --- 設定完了 → 画像ロード → 待機画面 ---
    async function onSetupDone() {
        if (gameMode === 'streamer') {
            YOUTUBE_API_KEY = sessionStorage.getItem('youtube_api_key');
            TARGET_VIDEO_ID = sessionStorage.getItem('youtube_target_video_id');
            if (!YOUTUBE_API_KEY || !TARGET_VIDEO_ID) {
                alert("配信設定が見つかりません。トップページから設定してください。");
                return;
            }
        }

        loadingOverlay.classList.remove('hidden');
        document.getElementById('setup-done-btn').disabled = true;

        try {
            // 問題選定
            const shuffledStages = [...stages].sort(() => 0.5 - Math.random());
            gameState.questions = shuffledStages.slice(0, questionsToPlay);
            
            // 画像プリロード
            await preloadImages(gameState.questions);
            
            // 配信接続テスト
            if (gameMode === 'streamer') {
                const connected = await fetchLiveChatId();
                if (!connected) {
                    loadingOverlay.classList.add('hidden');
                    document.getElementById('setup-done-btn').disabled = false;
                    return;
                }
            }

            // 準備完了
            setupModal.classList.add('hidden');
            readyScreen.classList.remove('hidden');
        } catch (e) {
            console.error(e);
            alert("ロードエラーが発生しました");
        } finally {
            loadingOverlay.classList.add('hidden');
            document.getElementById('setup-done-btn').disabled = false;
        }
    }

    function preloadImages(questions) {
        const promises = [];
        questions.forEach(stage => {
            promises.push(loadImage(stage.base_image));
            stage.changes.forEach(change => promises.push(loadImage(change.change_image)));
        });
        return Promise.all(promises);
    }
    function loadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(src);
            img.onerror = () => resolve(src);
        });
    }

    // --- スタートカウントダウン ---
    function startCountDown() {
        readyScreen.classList.add('hidden');
        countdownOverlay.classList.remove('hidden');
        
        let count = 3;
        countdownText.textContent = count;
        
        const refreshAnim = () => {
            countdownText.classList.remove('anim-text');
            void countdownText.offsetWidth;
            countdownText.classList.add('anim-text');
        };

        refreshAnim();
        playSe('count');

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownText.textContent = count;
                playSe('count');
                refreshAnim();
            } else {
                clearInterval(interval);
                countdownText.textContent = "START!";
                playSe('start');
                refreshAnim();
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
        gameState.currentQuestionIndex = -1;
        gameState.hostScore = 0;
        gameState.viewerScore = 0;
        updateScores();
        nextQuestion();
    }
    
    // --- 次の問題へ（トランジション付き） ---
    function nextQuestion() {
        gameState.currentQuestionIndex++;

        if (gameState.currentQuestionIndex >= gameState.questions.length) {
            endGame();
            return;
        }

        // トランジション演出
        transitionText.textContent = `QUESTION ${gameState.currentQuestionIndex + 1}`;
        transitionLayer.classList.remove('hidden', 'closing');
        
        setTimeout(() => {
            transitionLayer.classList.add('active');
            playSe('transition');
        }, 10);

        setTimeout(() => {
            prepareStageData();
            
            // 幕を開ける
            transitionLayer.classList.add('closing'); 
            transitionLayer.classList.remove('active');
            
            setTimeout(() => {
                transitionLayer.classList.add('hidden');
                transitionLayer.classList.remove('closing');
                startAhaExperience(); // 変化開始
            }, 400);
        }, 1000);
    }

    function prepareStageData() {
        resetUIForNewQuestion();

        const currentStage = gameState.questions[gameState.currentQuestionIndex];
        const changeIndex = Math.floor(Math.random() * currentStage.changes.length);
        const selectedChange = currentStage.changes[changeIndex];
        gameState.currentChange = selectedChange;

        baseImage.src = currentStage.base_image;
        changedImage.src = selectedChange.change_image;
        
        // CSS Transition時間設定
        const durationInSeconds = gameState.transitionDuration / 1000;
        changedImage.style.transition = `opacity ${durationInSeconds}s linear`;
    }

    // --- アハ体験（変化）開始処理 ---
    function startAhaExperience() {
        // 1. プレ表示（静止）
        setTimeout(() => {
            // 2. 変化開始
            changedImage.classList.add('fade-in');
            startChangeTimer(); // ★タイマー開始
        }, gameState.preShowTime);

        // 3. 変化完了後、投票開始
        setTimeout(() => {
            stopChangeTimer(); // ★タイマー停止
            setupOptions(gameState.currentChange);
            startVoting();
        }, gameState.preShowTime + gameState.transitionDuration);
    }

    // --- 変化タイマー制御 ---
    function startChangeTimer() {
        if(!changeTimerBox) return;
        changeTimerBox.classList.remove('hidden');
        let startTime = Date.now();
        let duration = gameState.transitionDuration / 1000; // 20.0

        // 初期表示
        changeTimerVal.textContent = duration.toFixed(1);
        changeTimerVal.style.color = "#ecc94b"; 

        if (gameState.changeTimerInterval) clearInterval(gameState.changeTimerInterval);

        gameState.changeTimerInterval = setInterval(() => {
            let elapsed = (Date.now() - startTime) / 1000;
            let remaining = duration - elapsed;

            if (remaining <= 0) {
                remaining = 0;
                changeTimerVal.style.color = "#48bb78"; // 完了したら緑色
            }
            changeTimerVal.textContent = remaining.toFixed(1);
        }, 50);
    }

    function stopChangeTimer() {
        if (gameState.changeTimerInterval) {
            clearInterval(gameState.changeTimerInterval);
            gameState.changeTimerInterval = null;
        }
        if(changeTimerVal) {
            changeTimerVal.textContent = "0.0";
            changeTimerVal.style.color = "#48bb78";
        }
    }

    // --- 選択肢生成 ---
    function setupOptions(change) {
        const { correct_answer, dummy_answers } = change;
        const choices = [correct_answer, ...dummy_answers].sort(() => 0.5 - Math.random());
        
        hostOptionsContainer.innerHTML = '';
        viewerOptionsContainer.innerHTML = '';
        const choiceLabels = ['A', 'B', 'C', 'D'];
        
        choices.forEach((text, i) => {
            // 配信者用
            const hostBtn = document.createElement('button');
            hostBtn.dataset.choice = choiceLabels[i];
            hostBtn.textContent = `${choiceLabels[i]}. ${text}`;
            hostBtn.onclick = () => handleHostAnswer(choiceLabels[i]);
            hostOptionsContainer.appendChild(hostBtn);
            
            // 視聴者用
            const viewerBtn = document.createElement('button');
            viewerBtn.dataset.choice = choiceLabels[i];
            viewerBtn.innerHTML = `<span style="position:relative; z-index:2;">${choiceLabels[i]}. ${text}</span><div class="vote-bar"></div>`;
            viewerBtn.disabled = true;
            viewerOptionsContainer.appendChild(viewerBtn);
        });
        
        questionOverlay.classList.remove('hidden');
        optionsContainer.classList.remove('hidden');
    }

    // --- 投票開始 ---
    function startVoting() {
        gameState.isVoting = true;
        gameState.hostAnswer = null;
        votingStatus.classList.remove('hidden');
        voteCounts = [0, 0, 0, 0]; 
        if (voteTotalDisplay) voteTotalDisplay.textContent = "0";

        let timeLeft = voteTimeLimit;
        timerDisplay.textContent = timeLeft;
        votingStartTime = new Date(); 

        if (gameMode === 'streamer') {
            nextPageToken = null;
            startYouTubePolling();
        }
        
        gameState.timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(gameState.timerInterval);
                finishVoting();
            }
        }, 1000);
    }

    function handleHostAnswer(choice) {
        if (!gameState.isVoting || gameState.hostAnswer) return;
        gameState.hostAnswer = choice;
        const buttons = hostOptionsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.dataset.choice === choice) btn.classList.add('selected');
            btn.disabled = true;
        });
    }

    function finishVoting() {
        gameState.isVoting = false;
        if (gameMode === 'streamer') stopYouTubePolling();
        handleResult();
    }

    // --- 結果判定 ---
    function handleResult() {
        let viewerChoice = null;

        // 視聴者の投票集計
        if (gameMode === 'streamer') {
            let maxVotes = -1;
            let maxIndex = -1;
            voteCounts.forEach((count, i) => {
                if (count > maxVotes) {
                    maxVotes = count;
                    maxIndex = i;
                }
            });
            if (maxVotes === 0) {
                viewerChoice = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
            } else {
                viewerChoice = ['A', 'B', 'C', 'D'][maxIndex];
            }
        } else {
            // ソロモードはランダム
            viewerChoice = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
        }
        
        const correctChoiceLabel = getCorrectChoiceLabel();
        
        let hostCorrect = (gameState.hostAnswer === correctChoiceLabel);
        let viewerCorrect = (viewerChoice === correctChoiceLabel);

        if (hostCorrect) gameState.hostScore++;
        if (viewerCorrect) gameState.viewerScore++;

        if (hostCorrect) playSe('correct');
        else playSe('wrong');
        
        updateScores();
        revealAnswers(correctChoiceLabel, viewerChoice);
        
        // ★修正: 自動遷移をやめて、手動ナビゲーションボタンを表示
        setTimeout(() => {
            showNavigationButtons();
        }, 1000); // 1秒だけ余韻を持たせてボタン表示
    }

    // --- ★追加: 結果確認後の手動ナビゲーション表示 ---
    function showNavigationButtons() {
        // 配信者エリアのボタンをクリアして、ナビゲーションボタンに置き換える
        hostOptionsContainer.innerHTML = '';
        
        // 1. 比較ボタン（押している間だけ変化前を表示）
        const compareBtn = document.createElement('button');
        compareBtn.textContent = '👀 変化前を見る (長押しで逆再生)';
        compareBtn.style.background = 'linear-gradient(145deg, #718096, #4a5568)';
        compareBtn.style.borderColor = '#a0aec0';
        compareBtn.style.gridColumn = "1 / -1"; // 横幅いっぱいに
        
        // イベント: マウスダウン/タッチ開始で変化後の画像を消す
        const showBase = () => { changedImage.style.opacity = '0'; };
        const showChanged = () => { changedImage.style.opacity = '1'; };
        
        compareBtn.addEventListener('mousedown', showBase);
        compareBtn.addEventListener('mouseup', showChanged);
        compareBtn.addEventListener('mouseleave', showChanged);
        compareBtn.addEventListener('touchstart', (e) => { e.preventDefault(); showBase(); });
        compareBtn.addEventListener('touchend', (e) => { e.preventDefault(); showChanged(); });
        
        // 2. 次へボタン
        const nextBtn = document.createElement('button');
        const isLastQuestion = gameState.currentQuestionIndex >= gameState.questions.length - 1;
        nextBtn.textContent = isLastQuestion ? '🏆 結果発表へ' : '➡ 次の問題へ';
        nextBtn.style.background = 'linear-gradient(145deg, #48bb78, #38a169)';
        nextBtn.style.borderColor = '#68d391';
        nextBtn.style.marginTop = '10px';
        nextBtn.style.gridColumn = "1 / -1"; // 横幅いっぱいに
        
        nextBtn.onclick = () => {
            // 画像状態を戻しておく
            changedImage.style.opacity = '1';
            nextQuestion();
        };

        hostOptionsContainer.appendChild(compareBtn);
        hostOptionsContainer.appendChild(nextBtn);
    }

    function getCorrectChoiceLabel() {
        const buttons = hostOptionsContainer.querySelectorAll('button');
        // 結果表示前に呼び出すので、既存のボタンから探す必要があるが、
        // handleResult内でhostOptionsContainerをクリアする前に呼んでいるのでOK
        // もしクリア後ならgameStateから再計算が必要
        if (buttons.length === 0) {
            // ボタンが無い場合の予備ロジック（通常ここには来ない）
            return null;
        }
        for (const btn of buttons) {
            if (btn.textContent.includes(gameState.currentChange.correct_answer)) {
                return btn.dataset.choice;
            }
        }
        return null;
    }

    function updateScores() {
        hostScoreDisplay.textContent = gameState.hostScore;
        viewerScoreDisplay.textContent = gameState.viewerScore;
    }

    function resetUIForNewQuestion() {
        questionOverlay.classList.add('hidden');
        optionsContainer.classList.add('hidden');
        votingStatus.classList.add('hidden');
        if(changeTimerBox) changeTimerBox.classList.add('hidden');
        
        timerDisplay.textContent = '--';
        hostOptionsContainer.innerHTML = '';
        viewerOptionsContainer.innerHTML = '';
        
        if (gameState.changeTimerInterval) clearInterval(gameState.changeTimerInterval);

        // 画像リセット
        changedImage.classList.remove('fade-in');
        changedImage.style.transition = 'none';
        changedImage.style.opacity = ''; 
        void changedImage.offsetHeight;
        
        baseImage.src = '';
        changedImage.src = '';
    }

    function revealAnswers(correctLabel, viewerChoice) {
        const hostBtns = hostOptionsContainer.querySelectorAll('button');
        const viewerBtns = viewerOptionsContainer.querySelectorAll('button');
        
        hostBtns.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.choice === correctLabel) btn.classList.add('correct');
            else if (btn.dataset.choice === gameState.hostAnswer) btn.classList.add('wrong');
        });

        viewerBtns.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.choice === viewerChoice) btn.classList.add('selected');
        });

        // 少し遅れて正解を表示
        setTimeout(() => {
            viewerBtns.forEach(btn => {
                if (btn.dataset.choice === correctLabel) btn.classList.add('correct');
                else if (btn.classList.contains('selected')) btn.classList.add('wrong');
            });
        }, 500);
    }

    function endGame() {
        playSe('over');
        const finalHost = document.getElementById('final-host-score');
        const finalViewer = document.getElementById('final-viewer-score');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        const resultImage = document.getElementById('result-last-image');

        finalHost.textContent = gameState.hostScore;
        finalViewer.textContent = gameState.viewerScore;

        // ★修正: 最後の問題のインデックスを安全に取得
        // gameState.currentQuestionIndex は nextQuestion() で加算されて length と等しくなっているため -1 する
        let lastIndex = gameState.currentQuestionIndex;
        if (lastIndex >= gameState.questions.length) {
            lastIndex = gameState.questions.length - 1;
        }

        if (lastIndex >= 0 && gameState.questions[lastIndex]) {
            resultImage.src = gameState.questions[lastIndex].base_image;
        }
        
        let title, message;
        if (gameState.hostScore > gameState.viewerScore) {
            title = "YOU WIN!";
            message = "配信者の勝利です！";
        } else if (gameState.viewerScore > gameState.hostScore) {
            title = "YOU LOSE...";
            message = "視聴者の勝利です！";
        } else {
            title = "DRAW";
            message = "引き分け！";
        }
        resultTitle.textContent = title;
        resultMessage.textContent = message;
        resultModal.classList.remove('hidden');
    }

    // --- YouTube連携機能 ---
    async function fetchLiveChatId() {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${TARGET_VIDEO_ID}&key=${YOUTUBE_API_KEY}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId;
                return true;
            } else {
                alert("指定された動画はライブ配信ではないか、見つかりません。");
                return false;
            }
        } catch (e) {
            alert("YouTube APIエラー: " + e.message);
            return false;
        }
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
                    const messageTimestamp = new Date(item.snippet.publishedAt);
                    if (votingStartTime && messageTimestamp >= votingStartTime) {
                        const msg = item.snippet.displayMessage;
                        if (msg.match(/^[aAａＡ]/)) vote(0);
                        else if (msg.match(/^[bBｂＢ]/)) vote(1);
                        else if (msg.match(/^[cCｃＣ]/)) vote(2);
                        else if (msg.match(/^[dDｄＤ]/)) vote(3);
                    }
                });
                updateVoteBars();
            }
        } catch (e) { console.error(e); }
    }

    function vote(index) {
        voteCounts[index]++;
    }

    function updateVoteBars() {
        const total = voteCounts.reduce((a, b) => a + b, 0);
        if (voteTotalDisplay) voteTotalDisplay.textContent = total;
        
        const viewerBtns = viewerOptionsContainer.querySelectorAll('button');
        viewerBtns.forEach((btn, i) => {
            const count = voteCounts[i];
            let percentage = 0;
            if (total > 0) percentage = (count / total) * 100;
            const bar = btn.querySelector('.vote-bar');
            if(bar) bar.style.width = `${percentage}%`;
        });
    }

    // 初期化実行
    init();
});