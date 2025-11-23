// js/sound.js

import { ui } from './ui.js';

let isMuted = false;
let currentBgm = null;
let currentVolume = 0.5;

const bgm = {
    1: new Audio('bgm/year1.mp3'),
    2: new Audio('bgm/year2.mp3'),
    3: new Audio('bgm/year3.mp3'),
    match: new Audio('bgm/match.mp3'), // ★追加: 試合用BGM
};

const sfx = {
    point: new Audio('bgm/point.mp3'),
    negative: new Audio('bgm/negative.mp3'),
    select: new Audio('bgm/select.mp3'),
    start_turn: new Audio('bgm/start_turn.mp3'),
    event_start: new Audio('bgm/event_start.mp3'),
    gameover: new Audio('bgm/gameover.mp3'),
    quiz_correct: new Audio('bgm/quiz_correct.mp3'),
    quiz_incorrect: new Audio('bgm/quiz_incorrect.mp3'),
    roulette: new Audio('bgm/roulette.mp3'),
    roulette_stop: new Audio('bgm/roulette_stop.mp3'),
    hit: new Audio('bgm/hit.mp3'),       // ★追加: ヒット音
    out: new Audio('bgm/out.mp3'),       // ★追加: アウト音
    cheer: new Audio('bgm/cheer.mp3'),     // ★追加: 歓声音
};

for (const key in bgm) {
    bgm[key].loop = true;
    bgm[key].volume = currentVolume;
}
for (const key in sfx) {
    sfx[key].volume = currentVolume;
}

sfx['roulette'].loop = true;

// ★関数名を playBgm -> playBgmByName に変更
export function playBgmByName(name) {
    if (currentBgm) {
        currentBgm.pause();
    }
    currentBgm = bgm[name];
    if (currentBgm && !isMuted) {
        currentBgm.currentTime = 0;
        const playPromise = currentBgm.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {});
        }
    }
}

// ★★★ 初期ミュート設定用の関数を追加 ★★★
export function setInitialMuteState(shouldMute) {
    isMuted = shouldMute;
    if (isMuted) {
        ui.muteBtn.textContent = "BGM OFF";
    } else {
        ui.muteBtn.textContent = "BGM ON";
    }
}

export function stopAllBgm() {
    if (currentBgm) {
        currentBgm.pause();
        currentBgm = null;
    }
}

export function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        if (currentBgm) currentBgm.pause();
        stopLoopSfx('roulette');
        ui.muteBtn.textContent = "BGM OFF";
    } else {
        if (currentBgm) {
            const currentSrc = currentBgm.src;
            if (currentSrc.includes('year1')) playBgmByName(1);
            else if (currentSrc.includes('year2')) playBgmByName(2);
            else if (currentSrc.includes('year3')) playBgmByName(3);
            else if (currentSrc.includes('match')) playBgmByName('match');
        }
        ui.muteBtn.textContent = "BGM ON";
    }
}

export function setVolume(value) {
    currentVolume = value;
    for (const key in bgm) { bgm[key].volume = currentVolume; }
    for (const key in sfx) { sfx[key].volume = currentVolume; }
}

export function playSfx(name) {
    if (sfx[name] && !isMuted) {
        sfx[name].currentTime = 0;
        sfx[name].play().catch(e => {});
    }
}

export function playLoopSfx(name) {
    if (sfx[name] && !isMuted) {
        sfx[name].currentTime = 0;
        sfx[name].play().catch(e => {});
    }
}

export function stopLoopSfx(name) {
    if (sfx[name]) {
        sfx[name].pause();
    }
}