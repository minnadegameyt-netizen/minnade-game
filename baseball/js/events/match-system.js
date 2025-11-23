import * as state from '../state.js';
import { ui } from '../ui.js';
import { playSfx, playLoopSfx, stopLoopSfx } from '../sound.js';
import { opponents } from './events-data.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let matchState = {};

function getTeamRank(totalPower) {
    if (totalPower >= 100) return 'S+';
    if (totalPower >= 90) return 'S';
    if (totalPower >= 75) return 'A';
    if (totalPower >= 60) return 'B';
    if (totalPower >= 50) return 'C';
    if (totalPower >= 35) return 'D';
    if (totalPower >= 15) return 'E';
    return 'F';
}

function updateMatchUIDisplay() {
    ui.awayTeamPower.textContent = `${getTeamRank(matchState.awayTeamPower)} (${matchState.awayTeamPower})`;
    ui.homeTeamPower.textContent = `${getTeamRank(matchState.homeTeamPower)} (${matchState.homeTeamPower})`;
    ui.awayTeamScore.textContent = matchState.awayScore;
    ui.homeTeamScore.textContent = matchState.homeScore;
    const awaySpans = ui.awayInningScores.children;
    const homeSpans = ui.homeInningScores.children;
    for (let i = 0; i < 9; i++) {
        awaySpans[i].textContent = matchState.inningScores.away[i] ?? '-';
        homeSpans[i].textContent = matchState.inningScores.home[i] ?? '-';
    }
}

// ★★★ 修正箇所 ★★★
// 新しいopponentsオブジェクトの構造に合わせて、シンプルに書き換え
export function getOpponent(tournamentName, round) {
    return opponents[tournamentName]?.[round - 1];
}

export async function runMatch(opponent) {
    ui.showMatchUI();
    // const playerTotalPower = Object.values(state.player).filter((v, k) => typeof v === 'number' && ['power', 'meet', 'speed', 'shoulder', 'defense'].includes(k)).reduce((s, v) => s + v, 0);

    matchState = {
        inning: 1, topOrBottom: 'top', homeScore: 0, awayScore: 0,
        inningScores: { away: [], home: [] },
        playerTurnsTaken: 0, maxPlayerTurns: 2,
        // ▼▼▼ 修正箇所 ▼▼▼
        // 主人公の能力を二重に加算するロジックを削除し、state.team.totalを直接使用する
        homeTeamPower: state.team.total,
        // ▲▲▲ 修正箇所 ▲▲▲
        awayTeamPower: opponent.strength,
        awayTeamName: opponent.name,
    };
    
    ui.awayTeamNamePower.textContent = opponent.name;
    ui.homeTeamNamePower.textContent = "自チーム";
    ui.awayTeamName.textContent = opponent.shortName;
    ui.homeTeamName.textContent = "自チーム";

    ui.addMatchLog('プレイボール！');
    updateMatchUIDisplay();
    await sleep(1000);

    while (matchState.inning <= 9) {
        await playHalfInning('top');
        updateMatchUIDisplay();
        await sleep(1000);
        
        if (matchState.inning === 9 && matchState.homeScore > matchState.awayScore) {
            matchState.inning++;
            break;
        }

        if (matchState.inning > 9) break;

        await playHalfInning('bottom');
        updateMatchUIDisplay();
        await sleep(1000);

        if (matchState.inning > 9) break;
    }
    
    let isWin;
    if (matchState.homeScore > matchState.awayScore) {
        isWin = true;
        ui.addMatchLog(`<strong>試合終了！ ${matchState.awayScore} - ${matchState.homeScore}で勝利！</strong>`);
    } else if (matchState.homeScore < matchState.awayScore) {
        isWin = false;
        ui.addMatchLog(`<strong>試合終了！ ${matchState.awayScore} - ${matchState.homeScore}で敗北...</strong>`);
    } else {
        isWin = false;
        ui.addMatchLog(`<strong>9回終了 ${matchState.awayScore} - ${matchState.homeScore}で引き分け... 延長戦に突入した。</strong>`);
        await sleep(2000);
        ui.addMatchLog(`<strong>延長戦の末、相手に得点を許し、惜しくも敗北した...</strong>`);
    }

    await sleep(3000);
    ui.hideMatchUI();
    return isWin;
}

async function playHalfInning(topOrBottom) {
    const isHomeAttack = topOrBottom === 'bottom';
    const attackerName = isHomeAttack ? "自チーム" : matchState.awayTeamName;
    const attackerPower = isHomeAttack ? matchState.homeTeamPower : matchState.awayTeamPower;
    const defenderPower = isHomeAttack ? matchState.awayTeamPower : matchState.homeTeamPower;

    ui.addMatchLog(`--- ${matchState.inning}回 ${isHomeAttack ? '裏' : '表'} ${attackerName}の攻撃 ---`);

    const isImportantSituation = isHomeAttack && matchState.inning >= 4 && (matchState.homeScore <= matchState.awayScore) && matchState.playerTurnsTaken < matchState.maxPlayerTurns;

    let runs = 0;
    if (isImportantSituation) {
        runs = await playerTurn();
    } else {
        const powerRatio = attackerPower / defenderPower;
        const randomFactor = Math.random() * 1.2 + 0.4;
        runs = Math.floor(powerRatio * randomFactor * (isHomeAttack ? 1.2 : 1.0));
        if(runs > 4) runs = Math.floor(Math.random() * 2) + 2;
        if (runs > 0) { ui.addMatchLog(`${runs}点獲得！`); playSfx('cheer'); }
        else { ui.addMatchLog('三者凡退...'); }
    }
    
    if (isHomeAttack) {
        matchState.homeScore += runs;
        matchState.inningScores.home[matchState.inning - 1] = (matchState.inningScores.home[matchState.inning - 1] || 0) + runs;
    } else {
        matchState.awayScore += runs;
        matchState.inningScores.away[matchState.inning - 1] = (matchState.inningScores.away[matchState.inning - 1] || 0) + runs;
    }
    
    if (topOrBottom === 'bottom') matchState.inning++;
}

async function playerTurn() {
    matchState.playerTurnsTaken++;
    ui.addMatchLog(`<strong>★★★ チャンスで君の打席だ！ (${matchState.playerTurnsTaken}回目) ★★★</strong>`);

    const bonus = await runTimingGame();
    const result = await runRollRoulette(bonus);

    if (result === 'success') {
        playSfx('hit');
        playSfx('cheer');
        const runs = Math.floor(Math.random() * 2) + 2;
        ui.addMatchLog(`<strong>ナイスバッティング！ ${runs}点獲得！</strong>`);
        return runs;
    } else {
        playSfx('out');
        ui.addMatchLog('<strong>無念...チャンスを活かせず無得点...</strong>');
        return 0;
    }
}

function runTimingGame() {
    return new Promise(resolve => {
        ui.matchInteractionWindow.innerHTML = `
            <div class="timing-game-container">
                <p>タイミングを合わせて[Enter]キーを押せ！</p>
                <div class="timing-bar">
                    <div class="success-zone good"></div><div class="success-zone perfect"></div>
                    <div id="timing-marker" class="timing-marker"></div>
                </div>
            </div>`;
        const marker = document.getElementById('timing-marker');
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                marker.style.animationPlayState = 'paused';
                window.removeEventListener('keydown', handleKeyPress);
                const markerRect = marker.getBoundingClientRect();
                const perfectRect = marker.parentElement.querySelector('.perfect').getBoundingClientRect();
                const goodRect = marker.parentElement.querySelector('.good').getBoundingClientRect();
                const markerCenter = markerRect.left + markerRect.width / 2;
                let bonus = 0;
                if (markerCenter >= perfectRect.left && markerCenter <= perfectRect.right) bonus = 2;
                else if (markerCenter >= goodRect.left && markerCenter <= goodRect.right) bonus = 1;
                ui.addMatchLog(bonus === 2 ? '<strong>PERFECT!!</strong>' : bonus === 1 ? '<strong>GOOD!</strong>' : '<strong>MISS...</strong>');
                setTimeout(() => resolve(bonus), 1500);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
    });
}

async function runRollRoulette(bonus) {
    const stats = [state.player.power, state.player.meet, state.player.speed, state.player.shoulder, state.player.defense];
    const playerAverage = stats.reduce((s, v) => s + v, 0) / stats.length;
    let baseSuccessCount;
    if (playerAverage < 20) baseSuccessCount = 2; else if (playerAverage < 40) baseSuccessCount = 3;
    else if (playerAverage < 60) baseSuccessCount = 4; else if (playerAverage < 75) baseSuccessCount = 5;
    else if (playerAverage < 90) baseSuccessCount = 6; else baseSuccessCount = 7;
    const totalSuccessCount = Math.min(10, baseSuccessCount + bonus);
    ui.addMatchLog(`（能力平均${playerAverage.toFixed(1)}: ${baseSuccessCount} + ボーナス: ${bonus} = 成功マス ${totalSuccessCount}個）`);
    const options = Array.from({ length: 10 }, (_, i) => i < totalSuccessCount ? '成功' : '失敗');
    const reelItems = Array.from({length: 3}, () => [...options].sort(() => 0.5 - Math.random())).flat();
    ui.matchInteractionWindow.innerHTML = `<div class="roulette-reel-container roulette-container"><div class="roulette-reel">${reelItems.map(item => `<div class="roulette-cell ${item === '成功' ? 'cell-success' : 'cell-failure'}">${item}</div>`).join('')}</div></div>`;    const reel = document.querySelector('.roulette-reel');
    const randomIndex = 10 + Math.floor(Math.random() * 10);
    const finalPosition = -((randomIndex * 50) - (reel.parentElement.clientWidth / 2) + (50 / 2));
    playLoopSfx('roulette');
    reel.style.transition = `transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)`;
    reel.style.transform = `translateX(${finalPosition}px)`;
    await sleep(3500);
    stopLoopSfx('roulette'); playSfx('roulette_stop');
    const result = reelItems[randomIndex];
    ui.matchInteractionWindow.innerHTML = `<h2 style="color: ${result === '成功' ? '#48bb78' : '#f56565'};">結果は... ${result}！</h2>`;
    await sleep(2000);
    return result === '成功' ? 'success' : 'failure';
}

// ★★★ runTournament関数を削除 ★★★