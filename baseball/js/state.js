// js/state.js

export let gameState = {
    gameMode: 'solo',
    isAudienceMode: true, // 配信者モードのデフォルトは視聴者参加
};
export let player = {};
export let team = {};
export let gameEvents = [];
export let missions = [];
export let matchState = {};
export let voteCounts = {};
export let hypeLevel = 0;

export let youtubeSettings = {
    apiKey: '',
    liveChatId: '',
    voteDuration: 15 // デフォルト値を設定 (例: 15秒)
};

export let randomEventHistory = [];
export let logHistory = [];

export const TURN_DURATION = 2000;
export const commands = ["筋トレ", "走り込み", "チーム練習", "勉強", "気分転換"];

export const maxStats = {
    playerStats: 99,
    teamStats: 100
};

export function setInitialState(state) {
    const defaultPlayerState = {
        phoneCallCount: 0,
        dateCount: 0,
        isGirlfriend: false,
        girlfriendFlag: {
            gw: 0, rikujo: 0, manager: 0, gotJuice: false, mysteriousMan: false,
            isDateScheduled: false,
            scheduledDateTurn: -1,
            confessionReady: false
        },
        noDateTurnCount: 0,
        bentoEventLastMonth: -1,
    };

    const defaultGameState = {
        phoneConfessionAttemptedThisTurn: false,
    };

    gameState = { ...defaultGameState, ...state.gameState };
    player = { ...defaultPlayerState, ...state.player };
    if (state.player.girlfriendFlag) {
        player.girlfriendFlag = { ...defaultPlayerState.girlfriendFlag, ...state.player.girlfriendFlag };
    }
    if (typeof player.noDateTurnCount === 'undefined') {
        player.noDateTurnCount = 0;
    }
     if (typeof player.bentoEventLastMonth === 'undefined') {
        player.bentoEventLastMonth = -1;
    }

    team = state.team;
    gameEvents = state.gameEvents;
    missions = state.missions || [];
    randomEventHistory = state.randomEventHistory || [];
    logHistory = state.logHistory || [];
}

export function setMatchState(newMatchState) {
    matchState = newMatchState;
}

export function setTournamentState(name = null, round = 0, currentMatchWeek = 0) {
    if (name) {
        gameState.tournamentState = { name, round, currentMatchWeek };
    } else {
        gameState.tournamentState = null;
    }
}