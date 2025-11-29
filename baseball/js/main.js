// --- START OF FILE main.js ---

import { ui } from './ui.js';
import * as youtube from './youtube.js';

const assetCache = []; // 画像と音声だけを保持する配列

const assetsToLoad = [
    // BGM
    'bgm/year1.mp3', 'bgm/year2.mp3', 'bgm/year3.mp3', 'bgm/match.mp3',
    // 効果音
    'bgm/point.mp3', 'bgm/negative.mp3', 'bgm/select.mp3', 'bgm/start_turn.mp3',
    'bgm/event_start.mp3', 'bgm/gameover.mp3', 'bgm/quiz_correct.mp3', 'bgm/quiz_incorrect.mp3',
    'bgm/roulette.mp3', 'bgm/roulette_stop.mp3', 'bgm/hit.mp3', 'bgm/out.mp3', 'bgm/cheer.mp3',
    // 画像
    'img/p_normal.png', 'img/p_smile.png', 'img/p_sad.png', 'img/p_surprised.png', 'img/p_shy.png',
    'img/tanaka_normal.png', 'img/tanaka_smile.png', 'img/tanaka_sad.png',
    'img/kantoku.png', 
    'img/sakurai_happy.png', 'img/sakurai_blush.png', 'img/sakurai_sad.png', 'img/sakurai_shy.png', 'img/sakurai_smile.png', 'img/sakurai_surprised.png',
    'img/kazami_angry.png', 'img/kazami_blush.png', 'img/kazami_normal.png', 'img/kazami_sad.png', 'img/kazami_shy.png', 'img/kazami_smile.png', 'img/kazami_surprised.png',
    'img/hoshikawa_blush.png', 'img/hoshikawa_normal.png', 'img/hoshikawa_smile.png',
    'img/suzuki_confident.png',
    'img/mysterious_man.png',
    
    // 動画 (ディスクキャッシュに入れるためにロードする)
    'video/april.mp4', 'video/summer.mp4', 'video/school.mp4', 'video/winter.mp4',
    'video/matchday.mp4', 'video/game-center.mp4',
    'video/muscle_training.mp4', 'video/running.mp4', 'video/training.mp4',
    'video/study.mp4', 'video/city.mp4', 'video/cafe.mp4', 'video/phone.mp4'
];

function preloadAssets(paths) {
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-progress');
    const percentDisplay = document.getElementById('loading-percent');

    let loadedCount = 0;
    const totalAssets = paths.length;
    progressBar.max = totalAssets;

    // 進捗更新関数
    const updateProgress = () => {
        loadedCount++;
        progressBar.value = loadedCount;
        const percent = totalAssets > 0 ? Math.round((loadedCount / totalAssets) * 100) : 100;
        if (percentDisplay) {
            percentDisplay.textContent = `${percent}%`;
        }
    };

    if (totalAssets === 0) return Promise.resolve();

    // ★修正1: 同時実行数を3に減らす（動画のスタック防止）
    const CONCURRENT_LIMIT = 3;

    // 1つのアセットをロードする内部関数
    const loadSingleAsset = (path) => {
        return new Promise((resolve) => {
            const extension = path.split('.').pop().toLowerCase();
            let isResolved = false;

            // 完了時の処理（成功・失敗問わず）
            const done = () => {
                if (!isResolved) {
                    isResolved = true;
                    resolve();
                }
            };

            // ★修正2: タイムアウト設定
            // 動画は30秒、それ以外は10秒で強制的に「完了」扱いにして次へ進める
            const timeoutMs = ['mp4', 'webm'].includes(extension) ? 30000 : 10000;
            setTimeout(() => {
                if (!isResolved) {
                    console.warn(`Load timeout: ${path}`);
                    done();
                }
            }, timeoutMs);

            if (['png', 'jpg', 'jpeg', 'gif', 'ico'].includes(extension)) {
                const img = new Image();
                img.src = path;
                assetCache.push(img); // 画像はメモリ保持
                img.onload = done;
                img.onerror = () => { console.warn(`Img error: ${path}`); done(); };

            } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
                const audio = new Audio();
                audio.oncanplaythrough = () => {
                    audio.oncanplaythrough = null;
                    done();
                };
                audio.onerror = () => { console.warn(`Audio error: ${path}`); done(); };
                audio.src = path;
                audio.load();

            } else if (['mp4', 'webm'].includes(extension)) {
                fetch(path)
                    .then(res => {
                        if (!res.ok) throw new Error(res.statusText);
                        return res.blob();
                    })
                    .then(() => {
                        // メモリには保持せず完了（ブラウザキャッシュに入る）
                        done();
                    })
                    .catch(e => {
                        console.warn(`Video fetch error: ${path}`, e);
                        done(); // エラーでも止まらない
                    });

            } else {
                done();
            }
        });
    };

    // ★修正3: ワーカー方式による確実な並列処理
    // キューからタスクを取り出して処理し続けるワーカーを作成
    const queue = [...paths];
    
    const worker = async () => {
        while (queue.length > 0) {
            const path = queue.shift();
            if (path) {
                await loadSingleAsset(path);
                updateProgress();
            }
        }
    };

    // ワーカーを複数起動して並列処理
    const workers = [];
    for (let i = 0; i < CONCURRENT_LIMIT; i++) {
        workers.push(worker());
    }

    return Promise.all(workers);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await preloadAssets(assetsToLoad);

        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('loaded');
        
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.style.display = 'none';
        });

        document.getElementById('home-page').classList.remove('hidden');
        ui.setupEventListeners();

        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');

        if (mode === 'solo') {
            const soloBtn = document.getElementById('start-solo-btn');
            if (soloBtn) soloBtn.click();
        } else if (mode === 'streamer') {
            const streamerBtn = document.getElementById('start-streamer-btn');
            if (streamerBtn) streamerBtn.click();
        }

    } catch (error) {
        console.error("アセットの読み込みに失敗しました:", error);
        // 万が一全体がコケてもゲームは開始させる
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('home-page').classList.remove('hidden');
        ui.setupEventListeners();
    }
});