// --- START OF FILE game-loop.js ---

import * as state from './state.js';
import { ui, abilityDescriptions } from './ui.js';
import { checkEvent, runEvent, allEvents } from './events/events.js'; 
import { getOpponent, runMatch } from './events/match-system.js';
import { playBgmByName, playSfx, stopAllBgm } from './sound.js';
import * as youtube from './youtube.js'; 

let currentBgmYear = 0;
let isPaused = false;

// ★★★ prefetchVideo関数は削除（初期ロードで行うため） ★★★

export async function triggerDraftEnding() {
    // ... (変更なし) ...
    stopAllBgm();
    state.gameState.isGameOver = true;
    
    const p = state.player;
    const totalStats = p.power + p.meet + p.speed + p.shoulder + p.defense + p.intelligence;
    const abilityBonus = Object.keys(p.specialAbilities).length * 50;
    const gfBonus = p.isGirlfriend ? p.girlfriendEval * 2 : 0;
    const coachBonus = state.team.coachEval * 3;
    const score = totalStats * 5 + abilityBonus + gfBonus + coachBonus;

    let rankName = "";
    let comments = "";

    if (score >= 4000) {
        rankName = "ドラフト1位 指名";
        comments = "球界の宝として、12球団競合の末に指名された！伝説の始まりだ！";
    } else if (score >= 3000) {
        rankName = "ドラフト上位 指名";
        comments = "即戦力として高い評価を受けた！開幕一軍も夢ではない。";
    } else if (score >= 2000) {
        rankName = "ドラフト下位 指名";
        comments = "素材型として指名された。これからの努力次第でスターになれる。";
    } else if (score >= 1000) {
        rankName = "育成ドラフト 指名";
        comments = "ギリギリプロへの切符を掴んだ。這い上がれ！";
    } else {
        rankName = "指名漏れ...";
        comments = "名前が呼ばれることはなかった... 大学や社会人で野球を続けよう。";
    }

    if (p.redMarkCount > 0) {
        comments += "<br>（※学業成績に不安があるため、スカウトが少し懸念していたようだ...）";
    }

    await ui.typeWriter("3年間の高校野球生活が終わった...");
    await ui.waitForUserAction();
    await ui.showDraftResult({ rankName, score, comments });
}

// ★★★ 動画表示関数（エラー対策強化版） ★★★
function updateCharacterDisplay(newVideoName = null) {
    let videoPath = '';

    if (newVideoName) {
        videoPath = `video/${newVideoName}.mp4`;
    } else {
        const month = state.gameState.month;
        if (month >= 3 && month <= 5) {
            videoPath = 'video/april.mp4';
        } else if (month >= 6 && month <= 8) {
            videoPath = 'video/summer.mp4';
        } else if (month >= 9 && month <= 11) {
            videoPath = 'video/school.mp4';
        } else {
            videoPath = 'video/winter.mp4';
        }
    }
    
    const videoElement = ui.characterVideo;
    // getAttributeを使って現在の生のsrc値を確認
    const currentSrc = videoElement.getAttribute('src');

    // パスが同じ場合、再生されていなければ再生
    if (currentSrc === videoPath && !videoElement.classList.contains('hidden')) {
        if (videoElement.paused) {
           videoElement.play().catch(e => { /* エラー無視 */ });
        }
        return;
    }

    // ★重要: 動画を切り替える前に、前の動画を停止し、srcを空にしてメモリ解放を促す
    try {
        videoElement.pause();
    } catch(e) {}

    // srcを空にしてload()することで、ブラウザにメモリ解放のヒントを与える
    videoElement.removeAttribute('src'); 
    videoElement.load(); 
    
    if (videoPath) {
        videoElement.src = videoPath; // ここでブラウザキャッシュから読み込まれるはず
        videoElement.classList.remove('hidden');
        
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                // AbortErrorは頻発するのでログに出さない、またはWarnレベルにする
                if (e.name !== 'AbortError') {
                    console.log("Video play failed:", e);
                }
            });
        }
    } else {
        videoElement.classList.add('hidden');
    }
}

function calculateTeamTotal() {
    const p = state.player;
    const stats = [p.power, p.meet, p.speed, p.shoulder, p.defense];
    const avg = stats.reduce((s, v) => s + v, 0) / stats.length;
    return Math.round(avg);
}


export async function initializeGame(mode, playerName, saveData = null) {
    if (mode === 'solo') {
        document.querySelector('.vote-status').classList.add('hidden');
        document.querySelector('.community-panel').classList.add('hidden');
    } else if (mode === 'streamer') {
        youtube.startYouTubeFetching(state.youtubeSettings.apiKey, state.youtubeSettings.liveChatId);
    }
    
    // ... (中略) ...

    const missionDefinitions = [ 
        { command: "筋トレ", text: "パワーをつけろ！", reward: { type: "health", value: 5 }, rewardText: "体力+5" }, 
        { command: "気分転換", text: "リフレッシュしろ！", reward: { type: "health", value: 10 }, rewardText: "体力+10" },
        { command: "走り込み", text: "走り込んで足を鍛えろ！", reward: { type: "health", value: 5 }, rewardText: "体力+5" },
        { command: "勉強", text: "テストに備えて勉強だ！", reward: { type: "intelligence", value: 2 }, rewardText: "学力+2" },
        { command: "チーム練習", text: "チームの輪を大事にしろ！", reward: { type: "coachEval", value: 1 }, rewardText: "監督評価+1" }
    ];

    if (saveData) {
        const savedEvents = saveData.gameEvents;
        allEvents.forEach(event => {
            const savedEvent = savedEvents.find(se => se.id === event.id);
            if (savedEvent) {
                event.executed = savedEvent.executed;
            }
        });

        state.setInitialState({ 
            gameState: saveData.gameState, 
            player: saveData.player, 
            team: saveData.team, 
            gameEvents: allEvents,
            missions: missionDefinitions,
            randomEventHistory: saveData.randomEventHistory,
            logHistory: saveData.logHistory,
        });
        currentBgmYear = saveData.gameState.year;
    } else {
        allEvents.forEach(event => event.executed = false);
        state.setInitialState({
            gameState: { gameMode: mode, totalTurns: 109, currentTurn: 0, year: 1, month: 4, week: 1, isVoting: false, isAudienceMode: true, isEventRunning: false, matchScheduled: false, currentMissions: [], tournamentProgress: 0, tournamentState: null, lastCommand: null },
            player: { name: playerName, health: 100, maxHealth: 100, intelligence: 10, power: 1, meet: 1, speed: 1, shoulder: 1, defense: 1, condition: "普通", specialAbilities: {}, girlfriendEval: 0, hasPhoneNumber: false, girlfriendRoute: 'none', redMarkCount: 0, studyCount: 0, noRefreshTurnCount: 0, noDateTurnCount: 0, commandHistory: [] },
            team: { total: 0, coachEval: 0 },
            gameEvents: allEvents,
            missions: missionDefinitions
        });
    }
    ui.startModal.classList.add('hidden');
    
    if(currentBgmYear === 0 && !saveData) {
        currentBgmYear = 1;
    }
    playBgmByName(currentBgmYear);
    
    state.team.total = calculateTeamTotal();
    ui.updateAllDisplays(); 
    updateCharacterDisplay(); // 初期表示更新
    
    if (saveData) {
        await ui.typeWriter("セーブデータをロードしました。");
        await ui.waitForUserAction();
        await nextTurn();
    } else {
        const openingEvent = allEvents.find(e => e.id === 'opening');
        if(openingEvent && !openingEvent.executed) {
            await runEvent(openingEvent);
        } else {
            await processEndOfTurn();
        }
    }
}

async function runTournamentSequence() {
    state.gameState.isEventRunning = true;
    stopAllBgm();
    playBgmByName('match');

    const tournamentName = state.gameState.tournamentState.name;
    let currentRound = state.gameState.tournamentState.round;

    const tournamentRounds = {
        summer_1: 2, autumn_1: 2,
        spring_2: 2, summer_2: 3, autumn_2: 2,
        spring_3: 2, summer_3: 4, koshien: 4,
    };
    const totalMatches = tournamentRounds[tournamentName] || 0;

    const opponent = getOpponent(tournamentName, currentRound);
    if (!opponent) {
        state.setTournamentState(null);
        await processEndOfTurn();
        return;
    }

    const roundName = (tournamentName === 'koshien' && currentRound === 4) ? "決勝" : `${currentRound}回戦`;
    await ui.typeWriter(`${roundName}の相手は ${opponent.name} だ！`);
    await ui.waitForUserAction();

    updateCharacterDisplay('matchday');
    const hasWon = await runMatch(opponent);

    // ... (以降の処理は変更なし) ...
    if (hasWon) {
        if (currentRound >= totalMatches && tournamentName === 'koshien') {
            const victoryEvent = allEvents.find(e => e.id === 'koshien_victory');
            if (victoryEvent) {
                await runEvent(victoryEvent);
                if (state.gameState.isGameOver) {
                    await triggerDraftEnding();
                }
                return;
            }
        }
        
        if (currentRound < totalMatches) {
            await ui.typeWriter(`${opponent.name} に勝利した！<br>選手の能力が上がった！`);
            playSfx('point');

            const statsToUpgrade = ["power", "meet", "speed", "shoulder", "defense"];
            statsToUpgrade.forEach(stat => {
                if (typeof state.player[stat] === 'number') {
                    state.player[stat] = Math.min(state.maxStats.playerStats, state.player[stat] + 2);
                }
            });

            state.team.total = calculateTeamTotal();
            ui.updateAllDisplays();
            await ui.waitForUserAction();
            
            state.gameState.tournamentState.round++;
            state.gameState.isEventRunning = false;
            await nextTurn();
            return;
        } 
        else {
             if (tournamentName === 'summer_3') {
                await ui.typeWriter("見事、地方大会を勝ち抜いた！");
                await ui.waitForUserAction();
                await ui.typeWriter("甲子園出場だ！");
                await ui.waitForUserAction();
                state.setTournamentState('koshien', 1);
                state.gameState.isEventRunning = false;
                await nextTurn();
                return;
            } else {
                 await ui.typeWriter(`試合に勝利した！…次の試合、惜しくも試合に負けてしまった。敗北を糧に次に活かすぞ。`);
            }
        }
    } else {
        if (state.gameState.year === 3 && (tournamentName === 'summer_3' || tournamentName === 'koshien')) {
            const defeatEventId = tournamentName === 'koshien' ? 'koshien_defeat' : 'summer_defeat_3';
            const defeatEvent = allEvents.find(e => e.id === defeatEventId);
            if (defeatEvent) {
                await runEvent(defeatEvent);
                if (state.gameState.isGameOver) {
                    await triggerDraftEnding();
                }
                return;
            }
        }

        await ui.typeWriter("大会で敗退した...<br>この悔しさをバネに練習だ！");
        await ui.waitForUserAction();
        state.setTournamentState(null);
        state.gameState.isEventRunning = false;
        playBgmByName(state.gameState.year);
        updateCharacterDisplay();
        await processEndOfTurn();
        return;
    }
    
    await ui.waitForUserAction();
    state.setTournamentState(null);
    state.gameState.isEventRunning = false;
    playBgmByName(state.gameState.year);
    updateCharacterDisplay();
    await processEndOfTurn();
}

export async function nextTurn() {
    // ... (先読みロジックを削除して元の状態に戻す) ...
    if (state.gameState.isGameOver || state.gameState.isEventRunning) return;
    state.gameState.phoneConfessionAttemptedThisTurn = false;
    state.gameState.dateInviteAttemptedThisTurn = false;
    
    state.gameState.currentTurn++;
    if (state.gameState.currentTurn > 1) {
        state.gameState.week++;
        if (state.gameState.week > 4) { state.gameState.week = 1; state.gameState.month++; }
        if (state.gameState.month > 12) { state.gameState.month = 1; state.gameState.year++; }
    }
    
    if (state.gameState.tournamentState && state.gameState.tournamentState.round > 0) {
        await runTournamentSequence();
        return;
    }
    
    if (state.gameState.year !== currentBgmYear) {
        currentBgmYear = state.gameState.year;
        playBgmByName(currentBgmYear);
    }

    playSfx('start_turn');

    ui.updateAllDisplays(); 
    updateCharacterDisplay();
    
    if (state.gameState.year === 3 && state.gameState.month === 9 && state.gameState.week > 1) {
        await triggerDraftEnding();
        return;
    }
    
    await startVoting();
}

export async function processEndOfTurn() {
    if (state.gameState.isGameOver) return; 
    const eventToRun = checkEvent();
    if (eventToRun) {
        if (eventToRun.id === "gw_1" || eventToRun.id === "gw_2") {
             updateCharacterDisplay("game-center");
        } else if (eventToRun.id.includes("rikujo_")) {
             updateCharacterDisplay("school");
        }
        
        await runEvent(eventToRun);
        return;
    }
    
    if (state.gameState.tournamentState && state.gameState.tournamentState.round > 0) {
        await runTournamentSequence();
        return;
    }

    await nextTurn();
}

// ... (以下、startVotingなどは変更なし) ...
async function startVoting() {
    if (state.player.health <= 0) {
        await ui.typeWriter("体力が尽きて倒れてしまった...<br>今週は強制的に休む。");
        state.player.health = state.player.maxHealth;
        ui.updateAllDisplays();
        await ui.waitForUserAction();
        await processEndOfTurn();
        return;
    }

    if (state.gameState.week === 1) {
        const stats = ["power", "meet", "speed", "shoulder", "defense", "intelligence"];
        
        const statJapanese = {
            power: "パワー", meet: "ミート", speed: "走力", 
            shoulder: "肩力", defense: "守備力", intelligence: "学力"
        };
        
        if (state.player.specialAbilities["神の啓示"]) {
            const target = stats[Math.floor(Math.random() * stats.length)];
            state.player[target] = Math.min(state.maxStats.playerStats, state.player[target] + 1);
            await ui.typeWriter(`【神の啓示】不思議な力が湧いてくる… ${statJapanese[target] || target}が 1 上がった！`);
            playSfx('point');
            await ui.waitForUserAction();
        }

        if (state.player.specialAbilities["監督の秘蔵っ子"]) {
            const target = stats[Math.floor(Math.random() * stats.length)];
            state.player[target] = Math.min(state.maxStats.playerStats, state.player[target] + 1);
            await ui.typeWriter(`【監督の秘蔵っ子】監督との朝練の成果だ！ ${statJapanese[target] || target}が 1 上がった！`);
            playSfx('point');
            await ui.waitForUserAction();
        }
    }
    
    if (state.player.specialAbilities["お弁当"] && state.player.isGirlfriend && state.gameState.month !== state.player.bentoEventLastMonth) {
        await ui.typeWriter("彼女からお弁当をもらった！体力が回復し、やる気が最大に！");
        state.player.health = Math.min(state.player.maxHealth, state.player.health + 30);
        state.player.condition = "絶好調";
        state.player.bentoEventLastMonth = state.gameState.month;
        await ui.waitForUserAction();
    }
    if (state.player.specialAbilities["すれ違い"]) {
        const prevEval = state.player.girlfriendEval;
        state.player.condition = "不調";
        state.player.girlfriendEval = Math.max(0, state.player.girlfriendEval - 7);
        await ui.typeWriter("彼女とすれ違っているようだ…。やる気が下がり、彼女評価が7ダウンした。");
        ui.updateTeamStatusDisplay();
        await ui.waitForUserAction();

        if (prevEval >= 40 && state.player.girlfriendEval < 40) {
            const crisisEvent = allEvents.find(e => e.id === 'breakup_crisis');
            if (crisisEvent) {
                switch(state.player.girlfriendRoute) {
                    case 'rikujo':
                        crisisEvent.scenes[1].image = "img/kazami_sad.png";
                        crisisEvent.scenes[1].text = "ねぇ…私たち、このままでいいのかな。最近、あなたのこと、よくわからないよ…。";
                        break;
                    case 'manager':
                        crisisEvent.scenes[1].image = "img/hayakawa_sad.png";
                        crisisEvent.scenes[1].text = "あの…少し、お話があります。私たち、少し距離ができていませんか…？";
                        break;
                    default:
                        crisisEvent.scenes[1].image = "img/sakurai_sad.png";
                        crisisEvent.scenes[1].text = "ねぇ…私たち、最近全然会えてないよね。なんだか、気持ちが離れていってる気がするの…。";
                        break;
                }
                await runEvent(crisisEvent);
                return;
            }
        }
    }
    
    generateMissions();
    ui.updateAllDisplays();
    if (state.gameState.gameMode === 'streamer' && state.gameState.isAudienceMode) {
        await ui.typeWriter(`第${state.gameState.year}年${state.gameState.month}月${state.gameState.week}週の行動をコメントで投票してください！ (番号で投票)`);
    } else {
        await ui.typeWriter(`第${state.gameState.year}年${state.gameState.month}月${state.gameState.week}週の行動を選んでください。`);
    }
    
    let currentCommands = [...state.commands];
    if (state.player.hasPhoneNumber) {
        currentCommands.push("電話する");
    }

    const chosenCommand = await ui.waitForChoice(currentCommands, true);
    await executeCommand(chosenCommand);
    await processEndOfTurn();
}

async function executeCommand(command) {
    state.gameState.lastCommand = command;

    const effectiveCommand = (state.player.isGirlfriend && command === "気分転換") ? "デート" : command;

    let videoName;
    switch(effectiveCommand) {
        case "筋トレ": videoName = "muscle_training"; break;
        case "走り込み": videoName = "running"; break;
        case "チーム練習": videoName = "training"; break;
        case "勉強": videoName = "study"; break;
        case "気分転換": videoName = "city"; break;
        case "デート": videoName = "cafe"; break;
        case "電話する": videoName = "phone"; break;
        default: videoName = null;
    }
    updateCharacterDisplay(videoName);

    await ui.typeWriter(`「${effectiveCommand}」を実行！`);
    await ui.waitForUserAction();

    let healthChange = 0;
    let practiceBonus = 1.0;
    if (state.player.specialAbilities["野球脳"] && (command === "チーム練習" || command === "勉強")) practiceBonus *= 1.2;
    if (state.player.specialAbilities["データ野球"] && Math.random() < 0.2) {
        await ui.typeWriter("データに基づいた練習で効果が倍増！");
        await ui.waitForUserAction();
        practiceBonus *= 2.0;
    }
    if (state.player.specialAbilities["自己分析"] && ["筋トレ", "走り込み", "勉強"].includes(command) && Math.random() < 0.3) {
        await ui.typeWriter("自己分析の成果だ！ 練習効果が倍になった！");
        await ui.waitForUserAction();
        practiceBonus *= 2.0;
    }

    const statUp = async (label, statName, value) => {
        const upValue = Math.round(value * practiceBonus);
        state.player[statName] = Math.min(state.maxStats.playerStats, state.player[statName] + upValue);
        
        const targetEl = ui.statuses[statName];
        if (targetEl) {
             ui.showFloatingText(targetEl, `+${upValue}`);
        }

        await ui.typeWriter(`${label}が <span style="color: #ecc94b;">${upValue} ポイント</span> アップ！`);
        playSfx('point');
        await ui.waitForUserAction();
    };

    switch(effectiveCommand) {
        case "筋トレ": 
            await statUp('パワー', 'power', 2); 
            await statUp('肩力', 'shoulder', 2);
            healthChange = -15; break;
        case "走り込み": 
            await statUp('走力', 'speed', 3); 
            healthChange = -15; break;
        case "チーム練習": 
            await statUp('ミート', 'meet', 2);
            await statUp('守備力', 'defense', 2);
            state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 1); 
            await ui.typeWriter("監督評価が 1 ポイントアップ！");
            playSfx('point');
            await ui.waitForUserAction();
            healthChange = -20;
            break;
        case "勉強": 
            await statUp('学力', 'intelligence', 3);
            healthChange = -5; break;
        case "気分転換": 
             if(state.player.specialAbilities["すれ違い"]) {
                delete state.player.specialAbilities["すれ違い"];
                state.player.noDateTurnCount = 0; // カウントもリセット
                await ui.typeWriter("気分転換して、彼女とのすれ違いが解消された！");
                await ui.waitForUserAction();
            }
            
            healthChange = 10; state.player.condition = "絶好調"; 
            await ui.typeWriter("体力が回復し、やる気が絶好調になった！");
            playSfx('point'); 
            break;
        case "デート": 
            if(state.player.specialAbilities["すれ違い"]) {
                delete state.player.specialAbilities["すれ違い"];
                state.player.noDateTurnCount = 0;
                await ui.typeWriter("彼女とデートして、すれ違いが解消された！");
                await ui.waitForUserAction();
            }

            state.player.dateCount++;
            state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 5); 
            healthChange = 10; 
            await ui.typeWriter("彼女と過ごして癒された...評価もアップ！");
            playSfx('point'); 
            break;
        case "電話する": 
            if(state.player.specialAbilities["すれ違い"]) {
                delete state.player.specialAbilities["すれ違い"];
                state.player.noDateTurnCount = 0;
                await ui.typeWriter("電話で話して、彼女とのすれ違いが解消された！");
                await ui.waitForUserAction();
            }
            state.player.phoneCallCount++;
            state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 3); 
            healthChange = -2; 
            await ui.typeWriter("彼女と電話した。評価が少しアップ！");
            playSfx('point'); 
            break;
    }
    state.player.health = Math.max(0, Math.min(state.player.maxHealth, state.player.health + healthChange));
    state.team.total = calculateTeamTotal();
    
    const missionLog = checkMissionCompletion(command);
    if(missionLog) {
        await ui.waitForUserAction();
        await ui.typeWriter(missionLog);
        playSfx('point'); 
    }

    if (state.player.girlfriendEval >= 40 && !state.player.isGirlfriend) {
        state.player.girlfriendFlag.confessionReady = true;
    }
    
    await checkSpecialAbilities(command);
    
    ui.eventChoicesWindow.innerHTML = '';
    ui.updateAllDisplays();
    await ui.waitForUserAction();
}

async function checkSpecialAbilities(command) {
    const acquireAbility = async (name) => {
        if (!state.player.specialAbilities[name]) {
            state.player.specialAbilities[name] = true;
            const description = abilityDescriptions[name] || "謎の力だ…";
            await ui.typeWriter(`<br><span style="color:#63b3ed;">特殊能力「${name}」を習得した！</span><br><small>（${description}）</small>`);
            playSfx('point');
            ui.updatePlayerStatusDisplay();
            await ui.waitForUserAction();
        }
    };
    
    const effectiveCommand = (state.player.isGirlfriend && command === "気分転換") ? "デート" : command;
    state.player.commandHistory.push(effectiveCommand);
    if (state.player.commandHistory.length > 10) state.player.commandHistory.shift();
    if(command === "勉強") state.player.studyCount++;

    if (state.player.studyCount >= 10) await acquireAbility("データ野球");
    
    if (state.player.studyCount >= 20) await acquireAbility("自己分析");

    if (state.player.girlfriendEval >= 40 && state.player.isGirlfriend && !state.player.specialAbilities["すれ違い"]) await acquireAbility("お弁当");

    if (effectiveCommand !== "気分転換" && effectiveCommand !== "デート") state.player.noRefreshTurnCount++;
    else state.player.noRefreshTurnCount = 0;
    if (state.player.noRefreshTurnCount >= 20) await acquireAbility("野球鬱");
    else delete state.player.specialAbilities["野球鬱"];

    if (state.player.isGirlfriend) {
        if(effectiveCommand !== "デート" && effectiveCommand !== "電話する") {
            state.player.noDateTurnCount++;
        } else {
            state.player.noDateTurnCount = 0;
        }

        if (state.player.noDateTurnCount >= 8) {
            await acquireAbility("すれ違い");
            if (state.player.specialAbilities["お弁当"]) {
                delete state.player.specialAbilities["お弁当"];
                await ui.typeWriter("すれ違いにより、お弁当を作ってもらえなくなった…");
                await ui.waitForUserAction();
            }
        }
    }
}

function generateMissions() {
    const shuffled = [...state.missions].sort(() => 0.5 - Math.random());
    state.gameState.currentMissions = shuffled.slice(0, 2);
}

function checkMissionCompletion(executedCommand) {
    if(!state.gameState.currentMissions) return '';
    const completed = state.gameState.currentMissions.find(m => m.command === executedCommand);
    if (completed) {
        switch(completed.reward.type) {
            case "health": 
                state.player.health = Math.min(state.player.maxHealth, state.player.health + completed.reward.value); 
                break;
            case "intelligence":
                state.player.intelligence = Math.min(state.maxStats.playerStats, state.player.intelligence + completed.reward.value);
                break;
            case "coachEval":
                state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + completed.reward.value);
                break;
        }
        return `<br><span style="color:#ecc94b;">目標達成！ (${completed.rewardText})</span>`;
    }
    return '';
}

export function saveGame() {
    if (state.gameState.isEventRunning || isPaused) {
        alert("イベント中または一時中断中はセーブできません。");
        return;
    }

    try {
        const eventsToSave = allEvents.map(e => ({ id: e.id, executed: e.executed }));
        const saveData = {
            gameState: state.gameState,
            player: state.player,
            team: state.team,
            gameEvents: eventsToSave,
            randomEventHistory: state.randomEventHistory,
            logHistory: state.logHistory,
        };
        localStorage.setItem('audienceGameSaveData', JSON.stringify(saveData));
        ui.typeWriter("ゲームデータをセーブしました！");
        playSfx('point');
    } catch (e) {
        console.error("セーブに失敗しました: ", e);
        alert("セーブに失敗しました。");
    }
}

export function loadGame() {
    const saveDataString = localStorage.getItem('audienceGameSaveData');
    if (saveDataString) {
        try {
            const saveData = JSON.parse(saveDataString);
            stopAllBgm();
            initializeGame(saveData.gameState.gameMode, null, saveData);
        } catch (e) {
            console.error("ロードに失敗しました: ", e);
            alert("セーブデータの読み込みに失敗しました。新しいゲームを開始します。");
            localStorage.removeItem('audienceGameSaveData');
            initializeGame('solo', '主人公');
        }
    } else {
        alert("セーブデータが見つかりません。");
    }
}

export function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        ui.pauseModal.classList.remove('hidden');
    } else {
        ui.pauseModal.classList.add('hidden');
    }
}