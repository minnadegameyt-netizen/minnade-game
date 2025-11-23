// baseball/js/ui.js

import * as state from './state.js';
import { initializeGame, saveGame, loadGame, togglePause } from './game-loop.js';
import { toggleMute, setVolume, playSfx, setInitialMuteState } from './sound.js';
import * as youtube from './youtube.js'; 

export const abilityDescriptions = {
    "野球脳": "チーム練習と勉強の効果が少し上がる。",
    "データ野球": "時々、練習効果が倍になることがある。",
    "自己分析": "筋トレ、走り込み、勉強コマンド実行時、確率で経験点2倍。",
    "お弁当": "彼女評価が40以上になると、月に一度体力が回復することがある。",
    "野球鬱": "20ターン以上気分転換しないと習得。練習効果が下がる。",
    "すれ違い": "彼女と8ターン以上交流しないと習得。ターン開始時やる気が下がり、彼女評価が毎週7下がる。お弁当イベントが発生しなくなる。",
};

const uiElements = {
    homePage: document.getElementById('home-page'),
    gameWrapper: document.getElementById('game-wrapper'),
    startSoloBtn: document.getElementById('start-solo-btn'),
    startStreamerBtn: document.getElementById('start-streamer-btn'),
    howToPlayBtn: document.getElementById('how-to-play-btn'),
    supportBtn: document.getElementById('support-btn'),
    supportModal: document.getElementById('support-modal'),
    closeSupportBtn: document.getElementById('close-support-btn'),
    helpModal: document.getElementById('help-modal'),
    closeHelpBtn: document.getElementById('close-help-btn'),
    missionList: document.getElementById('mission-list'),
    
    // --- 削除: API設定モーダル関連の要素 ---
    // apiSetupModal, youtubeApiKeyInput, liveChatIdInput, apiValidationMsg, confirmApiSetupBtn, toggleApiDetailsBtn, apiDetails は削除済み

    startModal: document.getElementById('start-modal'),
    saveDataButtons: document.querySelector('.save-data-buttons'),
    newGameBtn: document.getElementById('new-game-btn'),
    loadGameBtn: document.getElementById('load-game-btn'),
    
    setupModal: document.getElementById('setup-modal'),
    playerNameInput: document.getElementById('player-name-input'),
    nameValidationMsg: document.getElementById('name-validation-msg'),
    bgmOnBtn: document.getElementById('bgm-on-btn'),
    bgmOffBtn: document.getElementById('bgm-off-btn'),
    confirmSetupBtn: document.getElementById('confirm-setup-btn'),
    
    toggleAudienceModeBtn: document.getElementById('toggle-audience-mode-btn'),
    liveChatList: document.getElementById('live-chat-list'),
    
    pauseBtn: document.getElementById('pause-btn'),
    saveBtn: document.getElementById('save-btn'),
    muteBtn: document.getElementById('mute-btn'),
    volumeSlider: document.getElementById('volume-slider'),
    dateDisplay: document.getElementById('date-display'),
    turnDisplay: document.getElementById('turn-display'),
    logText: document.getElementById('log-text'),
    voteTimer: document.getElementById('vote-timer'),
    voteList: document.getElementById('vote-list'),
    teamTotalBar: document.getElementById('team-total-bar'),
    coachEvalBar: document.getElementById('coach-eval-bar'),
    gfEvalBar: document.getElementById('gf-eval-bar'),
    gfEvalLabel: document.querySelector('.team-status-item:nth-child(3) span'),
    playerCondition: document.getElementById('player-condition'),
    girlfriendStatus: document.getElementById('girlfriend-status'),
    redMarkDisplay: document.getElementById('red-mark-display'),
    healthBar: document.getElementById('health-bar'),
    statuses: { intelligence: document.getElementById('status-intelligence'), power: document.getElementById('status-power'), meet: document.getElementById('status-meet'), speed: document.getElementById('status-speed'), shoulder: document.getElementById('status-shoulder'), defense: document.getElementById('status-defense') },
    specialAbilityGrid: document.querySelector('.special-ability-grid'),
    upcomingEventText: document.getElementById('upcoming-event-text'),
    eventChoicesWindow: document.getElementById('event-choices-window'),
    characterSprite: document.getElementById('character-sprite'),
    logWindow: document.querySelector('.log-window'),
    characterVideo: document.getElementById('character-video'),
    pauseModal: document.getElementById('pause-modal'),
    resumeBtn: document.getElementById('resume-btn'),
    backlogBtn: document.getElementById('backlog-btn'),
    backlogModal: document.getElementById('backlog-modal'),
    backlogList: document.getElementById('backlog-list'),
    closeBacklogBtn: document.getElementById('close-backlog-btn'),
    matchUI: document.getElementById('match-ui'),
    matchLogList: document.getElementById('match-log-list'),
    matchInteractionWindow: document.getElementById('match-interaction-window'),
    awayTeamNamePower: document.getElementById('away-team-name-power'),
    homeTeamNamePower: document.getElementById('home-team-name-power'),
    awayTeamPower: document.getElementById('away-team-power'),
    homeTeamPower: document.getElementById('home-team-power'),
    awayTeamName: document.getElementById('away-team-name'),
    homeTeamName: document.getElementById('home-team-name'),
    awayTeamScore: document.getElementById('away-team-score'),
    homeTeamScore: document.getElementById('home-team-score'),
    awayInningScores: document.getElementById('away-inning-scores'),
    homeInningScores: document.getElementById('home-inning-scores'),
    calendarModal: document.getElementById('calendar-modal'),
    calendarGrid: document.getElementById('calendar-grid'),
    calendarBtn: document.getElementById('calendar-btn'),
    closeCalendarBtn: document.getElementById('close-calendar-btn'),
};

function showMatchUI() {
    uiElements.logWindow.classList.add('hidden');
    uiElements.eventChoicesWindow.classList.add('hidden');
    uiElements.matchUI.classList.remove('hidden');
    uiElements.matchLogList.innerHTML = '';
}

function hideMatchUI() {
    uiElements.matchUI.classList.add('hidden');
    uiElements.logWindow.classList.remove('hidden');
    uiElements.eventChoicesWindow.classList.remove('hidden');
    uiElements.matchInteractionWindow.innerHTML = '';
}

function addMatchLog(text) {
    const li = document.createElement('li');
    li.innerHTML = text;
    uiElements.matchLogList.appendChild(li);
    uiElements.matchLogList.parentElement.scrollTop = uiElements.matchLogList.parentElement.scrollHeight;
}

function showCharacter(imagePath) {
    if (imagePath) {
        uiElements.characterSprite.src = imagePath;
        uiElements.characterSprite.classList.remove('hidden');
        uiElements.logWindow.style.alignItems = 'flex-start';
        setTimeout(() => uiElements.characterSprite.classList.add('fade-in'), 10);
    }
}

function hideCharacter() {
    uiElements.characterSprite.classList.remove('fade-in');
    uiElements.logWindow.style.alignItems = 'center';
    setTimeout(() => uiElements.characterSprite.classList.add('hidden'), 300);
}

function waitForUserAction() {
    return new Promise(resolve => {
        const indicator = document.createElement('div');
        indicator.className = 'continue-indicator';
        indicator.textContent = '▼';
        uiElements.logWindow.appendChild(indicator);

        const proceed = (e) => {
            e.stopPropagation();
            if ((e.type === 'keydown' && e.key !== 'Enter') || (e.type === 'click' && e.button !== 0)) {
                return;
            }
            uiElements.logWindow.removeEventListener('click', proceed);
            window.removeEventListener('keydown', proceed);
            indicator.remove();
            resolve();
        };

        uiElements.logWindow.addEventListener('click', proceed);
        window.addEventListener('keydown', proceed);
    });
}

function typeWriter(text, element = uiElements.logText) {
    return new Promise(resolve => {
        state.logHistory.push(text);
        if (state.logHistory.length > 100) {
            state.logHistory.shift();
        }

        const plainText = text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
        let i = 0;
        const speed = 30;
        function type() {
            if (i <= plainText.length) {
                element.textContent = plainText.substring(0, i);
                i++;
                setTimeout(type, speed);
            } else {
                element.innerHTML = text;
                resolve();
            }
        }
        element.textContent = '';
        type();
    });
}

function waitForChoice(choices, isCommand = false) {
    return new Promise(resolve => {
        uiElements.eventChoicesWindow.innerHTML = '';
        const container = document.createElement('div');
        if (isCommand) container.className = 'command-choices-container';

        const handlePlayerChoice = (choice) => {
            playSfx('select');
            uiElements.eventChoicesWindow.innerHTML = '';
            resolve(choice);
        };

        const isAudienceVoting = state.gameState.gameMode === 'streamer' && state.gameState.isAudienceMode;

        choices.forEach((choiceText, index) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = `<span class="choice-number">${index + 1}.</span> ${choiceText}`;
            if (!isAudienceVoting) {
                btn.onclick = () => handlePlayerChoice(choiceText);
            }
            container.appendChild(btn);
        });

        uiElements.eventChoicesWindow.appendChild(container);

        if (isAudienceVoting) {
            document.querySelectorAll('.choice-btn').forEach(b => b.classList.add('is-voting'));
            youtube.startVote(choices).then(winner => {
                const winnerBtn = Array.from(document.querySelectorAll('.choice-btn')).find(b => b.textContent.includes(winner));
                if (winnerBtn) {
                    winnerBtn.classList.add('is-selected');
                }
                setTimeout(() => handlePlayerChoice(winner), 1500);
            });
        }
    });
}

async function showGameOverScreen(message) {
    playSfx('gameover');
    uiElements.pauseModal.classList.add('hidden');
    uiElements.eventChoicesWindow.innerHTML = '';
    hideCharacter();
    await typeWriter(message);
    await new Promise(resolve => setTimeout(resolve, 5000));
    window.location.reload();
}

function showFloatingText(targetElement, text, isPositive = true) {
    if (!targetElement) return;
    const rect = targetElement.getBoundingClientRect();
    const span = document.createElement('span');
    span.textContent = text;
    span.className = `floating-text ${isPositive ? '' : 'negative'}`;
    span.style.left = `${rect.left + rect.width / 2}px`;
    span.style.top = `${rect.top}px`;
    document.body.appendChild(span);
    setTimeout(() => { span.remove(); }, 1500);
}

function showDraftResult(result) {
    return new Promise(resolve => {
        uiElements.eventChoicesWindow.innerHTML = '';
        uiElements.logWindow.classList.add('hidden');
        const container = document.createElement('div');
        container.className = 'draft-result-container';
        container.innerHTML = `
            <h2>育成終了！運命のドラフト会議...</h2>
            <p>第1巡選択希望選手...</p>
            <div class="draft-rank">${result.rankName}</div>
            <div class="total-score">総合スコア: ${result.score} Pt</div>
            <div class="ability-summary">
                <p>${result.comments}</p>
            </div>
            <button id="end-game-btn" class="choice-btn">タイトルへ戻る</button>
        `;
        uiElements.eventChoicesWindow.appendChild(container);
        document.getElementById('end-game-btn').addEventListener('click', () => {
            window.location.reload();
        });
    });
}

function showBacklog() {
    uiElements.backlogList.innerHTML = '';
    state.logHistory.forEach(log => {
        const li = document.createElement('li');
        li.innerHTML = log;
        uiElements.backlogList.appendChild(li);
    });
    uiElements.backlogList.scrollTop = uiElements.backlogList.scrollHeight;
    uiElements.backlogModal.classList.remove('hidden');
}

function hideBacklog() {
    uiElements.backlogModal.classList.add('hidden');
}

function addLiveComment(author, message) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="chat-author">${author}</span><span class="chat-message">${message}</span>`;
    uiElements.liveChatList.prepend(li);
    if (uiElements.liveChatList.children.length > 50) {
        uiElements.liveChatList.lastChild.remove();
    }
}

function updateAllDisplays(){updateDateDisplay();updateTeamStatusDisplay();updatePlayerStatusDisplay();updateUpcomingEventDisplay();updateMissionDisplay();}

function updatePlayerStatusDisplay(){
    document.getElementById('player-name').textContent = state.player.name;
    uiElements.playerCondition.textContent = `調子: ${state.player.condition}`;
    uiElements.playerCondition.classList.remove("is-injured");
    
    uiElements.healthBar.value=state.player.health;const getRankInfo=(val)=>{if(val>=90)return{rank:'S',className:'rank-s'};if(val>=75)return{rank:'A',className:'rank-a'};if(val>=60)return{rank:'B',className:'rank-b'};if(val>=50)return{rank:'C',className:'rank-c'};if(val>=35)return{rank:'D',className:'rank-d'};if(val>=15)return{rank:'E',className:'rank-e'};return{rank:'F',className:'rank-f'};};for(const key in uiElements.statuses){const value=state.player[key];if(value===undefined)continue;const rankInfo=getRankInfo(value);const element=uiElements.statuses[key];element.textContent=`${rankInfo.rank} (${value})`;element.className=rankInfo.className;}
    const gridItems=uiElements.specialAbilityGrid.children;
    const abilities=Object.keys(state.player.specialAbilities);
    for(let i=0;i<gridItems.length;i++){
        const abilityName = abilities[i];
        gridItems[i].textContent=abilityName||'-';
        if (abilityName) {
            gridItems[i].title = abilityDescriptions[abilityName] || "説明がありません。";
        } else {
            gridItems[i].title = "";
        }
    }
    uiElements.girlfriendStatus.textContent=`彼女: ${state.player.isGirlfriend?"あり":"なし"}`;uiElements.redMarkDisplay.textContent=`赤点: ${state.player.redMarkCount}回`;state.player.redMarkCount>=2?uiElements.redMarkDisplay.classList.add("is-danger"):uiElements.redMarkDisplay.classList.remove("is-danger");
}

function updateDateDisplay(){uiElements.dateDisplay.textContent=`${state.gameState.year}年目 ${state.gameState.month}月 ${state.gameState.week}週`;uiElements.turnDisplay.textContent=`残り: ${state.gameState.totalTurns - state.gameState.currentTurn}ターン`;}
function updateUpcomingEventDisplay(){
    if(!state.gameEvents) return;
    const now=state.gameState.year*1000+state.gameState.month*100+state.gameState.week;let nextEvent=null;
    for(const event of state.gameEvents){
        if(!event.executed&&event.type==='date'){
            const eventDate=event.year*1000+event.month*100+event.week;
            if(eventDate>now){
                if(!nextEvent||eventDate<(nextEvent.year*1000+nextEvent.month*100+nextEvent.week)){
                    nextEvent=event;
                }
            }
        }
    }
    if(nextEvent){uiElements.upcomingEventText.textContent=`${nextEvent.year}年${nextEvent.month}月${nextEvent.week}週: ${nextEvent.title}`;}else{uiElements.upcomingEventText.textContent="しばらく大きなイベントはありません";}
}

function updateTeamStatusDisplay() {
    uiElements.teamTotalBar.value = state.team.total;
    document.querySelector('.team-status-item:nth-child(1) span').textContent = `チーム総合力: ${state.team.total}`;
    
    uiElements.coachEvalBar.value = state.team.coachEval;
    document.querySelector('.team-status-item:nth-child(2) span').textContent = `監督の評価: ${state.team.coachEval}`;

    uiElements.gfEvalBar.value = state.player.girlfriendEval;
    
    let gfLabel = "恋人の評価";
    const route = state.player.girlfriendRoute;
    if (state.player.isGirlfriend) {
        gfLabel = "彼女の評価";
    } else if (route !== 'none' && state.player.hasPhoneNumber) {
        if (route === 'game_center') gfLabel = "桜井さんの評価";
        else if (route === 'rikujo') gfLabel = "風見さんの評価";
        else if (route === 'manager') gfLabel = "星川さんの評価";
    } else if (route !== 'none') {
        gfLabel = "???の評価";
    }
    uiElements.gfEvalLabel.textContent = `${gfLabel}: ${state.player.girlfriendEval}`;
}

function updateVoteDisplay(voteCounts){
    uiElements.voteList.innerHTML = '';
    const choices = Object.keys(voteCounts);
    choices.forEach(cmd => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${cmd}</span><span class="vote-count">${voteCounts[cmd] || 0} 票</span>`;
        uiElements.voteList.appendChild(li);
    });
}
function updateMissionDisplay(){uiElements.missionList.innerHTML='';if(state.gameState.currentMissions)state.gameState.currentMissions.forEach(mission=>{const li=document.createElement('li');li.innerHTML=`<span>${mission.text}</span><span class="mission-reward">${mission.rewardText}</span>`;uiElements.missionList.appendChild(li);});}

function showCalendar() {
    uiElements.calendarGrid.innerHTML = '';
    const currentYear = state.gameState.year;
    
    for (let y = currentYear; y <= 3; y++) {
        for (let m = 1; m <= 12; m++) {
            if (y === currentYear && m < state.gameState.month) continue;

            const monthContainer = document.createElement('div');
            monthContainer.className = 'month-container';

            const monthHeader = document.createElement('div');
            monthHeader.className = 'month-header';
            monthHeader.textContent = `${y}年 ${m}月`;
            monthContainer.appendChild(monthHeader);
            
            const weekList = document.createElement('ul');
            weekList.className = 'week-list';
            
            for (let w = 1; w <= 4; w++) {
                const weekItem = document.createElement('li');
                weekItem.className = 'week-item';
                weekItem.textContent = `${w}週`;

                if (y === state.gameState.year && m === state.gameState.month && w === state.gameState.week) {
                    weekItem.classList.add('current-week');
                }
                if (state.gameEvents) {
                    const event = state.gameEvents.find(e => e.type === 'date' && !e.executed && e.year === y && e.month === m && e.week === w);
                    if (event) {
                        const eventSpan = document.createElement('span');
                        eventSpan.className = 'week-event';
                        eventSpan.textContent = `▶ ${event.title}`;
                        weekItem.appendChild(eventSpan);
                    }
                }
                weekList.appendChild(weekItem);
            }
            monthContainer.appendChild(weekList);
            uiElements.calendarGrid.appendChild(monthContainer);
        }
    }
    uiElements.calendarModal.classList.remove('hidden');
}

function hideCalendar() {
    uiElements.calendarModal.classList.add('hidden');
}

function setupEventListeners(){

    if (uiElements.howToPlayBtn) {
        uiElements.howToPlayBtn.addEventListener('click', () => {
            uiElements.helpModal.classList.remove('hidden');
        });
    }

    if (uiElements.closeHelpBtn) {
        uiElements.closeHelpBtn.addEventListener('click', () => {
            uiElements.helpModal.classList.add('hidden');
        });
    }

    if (uiElements.supportBtn) {
        uiElements.supportBtn.addEventListener('click', () => {
            uiElements.supportModal.classList.remove('hidden');
        });
    }

    if (uiElements.closeSupportBtn) {
        uiElements.closeSupportBtn.addEventListener('click', () => {
            uiElements.supportModal.classList.add('hidden');
        });
    }

    uiElements.startSoloBtn.addEventListener('click', () => {
        state.gameState.gameMode = 'solo';
        uiElements.homePage.classList.add('hidden');
        uiElements.gameWrapper.classList.remove('hidden');
        uiElements.startModal.classList.remove('hidden');
    });

    // --- ▼▼▼ 配信者モード: トップページの設定を読み込む ▼▼▼ ---
    uiElements.startStreamerBtn.addEventListener('click', async () => {
        state.gameState.gameMode = 'streamer';
        
        // 1. 設定チェック
        const apiKey = sessionStorage.getItem('youtube_api_key');
        const videoId = sessionStorage.getItem('youtube_target_video_id');

        if (!apiKey || !videoId) {
            if (confirm("配信設定が見つかりません。\nトップページの「配信者用設定」に戻って設定しますか？")) {
                window.location.href = "../index.html";
            }
            return;
        }

        // 2. Chat ID 自動取得
        try {
            // ▼▼▼ 追加: 簡易的なローディング表示（ボタンを無効化＆テキスト変更） ▼▼▼
            const originalText = uiElements.startStreamerBtn.textContent;
            uiElements.startStreamerBtn.textContent = "接続中...";
            uiElements.startStreamerBtn.disabled = true;
            // ▲▲▲ 追加ここまで ▲▲▲

            const chatUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`;
            const res = await fetch(chatUrl);
            const data = await res.json();

            // ローディング解除
            uiElements.startStreamerBtn.textContent = originalText;
            uiElements.startStreamerBtn.disabled = false;

            if (data.error) {
                console.error(data.error);
                alert(`YouTube APIエラー: ${data.error.message}`);
                return;
            }

            if (data.items && data.items.length > 0 && data.items[0].liveStreamingDetails && data.items[0].liveStreamingDetails.activeLiveChatId) {
                // 成功: IDをセットしてゲーム画面へ
                state.youtubeSettings.apiKey = apiKey;
                state.youtubeSettings.liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId;
                
                // ▼▼▼ 修正: ゲーム画面を表示し、即座に「開始確認モーダル」を出す ▼▼▼
                uiElements.homePage.classList.add('hidden');
                uiElements.gameWrapper.classList.remove('hidden');
                
                // ここで setupModal (名前入力) ではなく startModal (はじめから/続きから) を出す
                uiElements.startModal.classList.remove('hidden'); 
                uiElements.setupModal.classList.add('hidden'); // 念のため隠す
                // ▲▲▲ 修正ここまで ▲▲▲

            } else {
                // ▼▼▼ 修正: エラー時はトップへ戻る ▼▼▼
                alert("ライブチャットが見つかりませんでした。\n・Video IDが正しいか\n・配信が開始されているか\nを確認してください。");
                window.location.href = "../index.html"; 
                // ▲▲▲ 修正ここまで ▲▲▲
            }
        } catch (e) {
            console.error(e);
            // ローディング解除
            uiElements.startStreamerBtn.textContent = "配信で遊ぶ";
            uiElements.startStreamerBtn.disabled = false;
            
            // ▼▼▼ 修正: エラー時はトップへ戻る ▼▼▼
            alert("通信エラーが発生しました。");
            window.location.href = "../index.html";
            // ▲▲▲ 修正ここまで ▲▲▲
        }
    });

    uiElements.toggleApiDetailsBtn?.addEventListener('click', () => {
        // apiDetails要素自体が存在しない可能性が高いためオプショナルチェーンを使用、あるいはこのブロックごと削除しても良い
        uiElements.apiDetails?.classList.toggle('visible');
    });

    uiElements.newGameBtn.addEventListener('click',()=> {
        uiElements.startModal.classList.add('hidden');
        uiElements.setupModal.classList.remove('hidden');
        
        const voteDurationSetup = document.getElementById('vote-duration-setup');
        if (state.gameState.gameMode === 'streamer') {
            uiElements.toggleAudienceModeBtn.classList.remove('hidden');
            if(voteDurationSetup) voteDurationSetup.style.display = 'block';
        } else {
            uiElements.toggleAudienceModeBtn.classList.add('hidden');
            if(voteDurationSetup) voteDurationSetup.style.display = 'none';
        }
    });

    uiElements.loadGameBtn.addEventListener('click',()=>loadGame());
    uiElements.saveBtn.addEventListener('click',saveGame);
    uiElements.pauseBtn.addEventListener('click',togglePause);
    uiElements.muteBtn.addEventListener('click',toggleMute);
    uiElements.volumeSlider.addEventListener('input',(e)=>setVolume(e.target.value));
    uiElements.resumeBtn.addEventListener('click', togglePause);
    uiElements.backlogBtn.addEventListener('click', showBacklog);
    uiElements.closeBacklogBtn.addEventListener('click', hideBacklog);
    uiElements.calendarBtn.addEventListener('click', showCalendar);
    uiElements.closeCalendarBtn.addEventListener('click', hideCalendar);
    if(localStorage.getItem('audienceGameSaveData')){uiElements.loadGameBtn.classList.remove('hidden');}

    uiElements.toggleAudienceModeBtn.addEventListener('click', () => {
        state.gameState.isAudienceMode = !state.gameState.isAudienceMode;
        uiElements.toggleAudienceModeBtn.textContent = state.gameState.isAudienceMode ? '視聴者参加 ON' : '配信者操作 ON';
        uiElements.toggleAudienceModeBtn.classList.toggle('is-off', !state.gameState.isAudienceMode);
        typeWriter(state.gameState.isAudienceMode ? '視聴者参加モードに切り替えました。' : '配信者操作モードに切り替えました。');
    });

    uiElements.bgmOnBtn.addEventListener('click', () => {
        uiElements.bgmOnBtn.classList.add('selected');
        uiElements.bgmOffBtn.classList.remove('selected');
    });

    uiElements.bgmOffBtn.addEventListener('click', () => {
        uiElements.bgmOffBtn.classList.add('selected');
        uiElements.bgmOnBtn.classList.remove('selected');
    });

    uiElements.confirmSetupBtn.addEventListener('click', () => {
        const playerName = uiElements.playerNameInput.value.trim();
        const forbiddenNames = ["田中", "鈴木", "桜井", "風見", "星川", "監督"];

        if (playerName.length < 1) {
            uiElements.nameValidationMsg.textContent = "名前を1文字以上入力してください。";
            return;
        }
        if (playerName.length > 7) {
            uiElements.nameValidationMsg.textContent = "名前は7文字以内で入力してください。";
            return;
        }
        if (forbiddenNames.includes(playerName)) {
            uiElements.nameValidationMsg.textContent = `「${playerName}」は使用できません。別の名前を入力してください。`;
            return;
        }

        const isMuted = uiElements.bgmOffBtn.classList.contains('selected');
        setInitialMuteState(isMuted);

        if (state.gameState.gameMode === 'streamer') {
            const selectedDurationBtn = document.querySelector('.duration-btn.selected');
            if(selectedDurationBtn) {
                state.youtubeSettings.voteDuration = parseInt(selectedDurationBtn.dataset.duration, 10);
            }
        }

        uiElements.setupModal.classList.add('hidden');
        initializeGame(state.gameState.gameMode, playerName);
    });

    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });
}

function updateShuttleRunScore(score) {
    const scoreDisplay = document.getElementById('shuttle-score');
    if (scoreDisplay) {
        scoreDisplay.textContent = `SCORE: ${score}`;
        scoreDisplay.style.transition = "transform 0.1s";
        scoreDisplay.style.transform = "scale(1.3)";
        setTimeout(() => scoreDisplay.style.transform = "scale(1)", 100);
    }
}

export const ui = {
    ...uiElements,
    showCharacter,
    hideCharacter,
    typeWriter,
    waitForChoice,
    waitForUserAction,
    showGameOverScreen,
    showFloatingText,
    showDraftResult,
    showMatchUI,
    hideMatchUI,
    addMatchLog,
    addLiveComment,
    updateAllDisplays,
    updatePlayerStatusDisplay,
    updateDateDisplay,
    updateUpcomingEventDisplay,
    updateTeamStatusDisplay,
    updateVoteDisplay,
    updateMissionDisplay,
    setupEventListeners,
    updateShuttleRunScore
};