// js/main.js
import { ui } from './ui.js';
import * as youtube from './youtube.js';

// --- ▼▼▼ アセットのプリロード処理 ▼▼▼ ---

// 読み込んだアセットをメモリに保持しておくためのキャッシュ（ガベージコレクション対策）
const assetCache = [];

// ゲームで使用するすべてのアセットのパスをリストアップ
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
    
    // ★動画ファイルも確実にリストに含めてください
    'video/april.mp4', 'video/summer.mp4', 'video/school.mp4', 'video/winter.mp4',
    'video/matchday.mp4', 'video/game-center.mp4',
    'video/muscle_training.mp4', 'video/running.mp4', 'video/training.mp4',
    'video/study.mp4', 'video/city.mp4', 'video/cafe.mp4', 'video/phone.mp4'
];

// js/main.js

function preloadAssets(paths) {
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-progress');
    // ★追加: パーセント表示要素を取得
    const percentDisplay = document.getElementById('loading-percent');

    let loadedCount = 0;
    const totalAssets = paths.length;
    progressBar.max = totalAssets;

    // ★便利関数: 進捗を更新する処理をまとめる
    const updateProgress = () => {
        loadedCount++;
        progressBar.value = loadedCount;
        
        // パーセント計算 (小数点なしの整数)
        const percent = Math.round((loadedCount / totalAssets) * 100);
        if (percentDisplay) {
            percentDisplay.textContent = `${percent}%`;
        }
    };

    const promises = paths.map(path => {
        return new Promise((resolve, reject) => {
            const extension = path.split('.').pop().toLowerCase();
            
            if (['png', 'jpg', 'jpeg', 'gif', 'ico'].includes(extension)) {
                const img = new Image();
                img.src = path;
                assetCache.push(img);
                // ★ updateProgress() を呼ぶ
                img.onload = () => { updateProgress(); resolve(); };
                img.onerror = (e) => { 
                    console.warn(`Failed: ${path}`, e); 
                    updateProgress(); // エラーでも進める
                    resolve(); 
                };

            } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
                const audio = new Audio();
                audio.src = path;
                audio.oncanplaythrough = () => {
                    audio.oncanplaythrough = null;
                    updateProgress(); // ★
                    resolve();
                };
                audio.onerror = (e) => {
                    console.warn(`Failed: ${path}`, e);
                    updateProgress(); // ★
                    resolve();
                };
                audio.load();

            } else if (['mp4', 'webm'].includes(extension)) {
                fetch(path)
                    .then(response => {
                        if (!response.ok) throw new Error('Network response was not ok');
                        return response.blob();
                    })
                    .then(blob => {
                        updateProgress(); // ★
                        resolve();
                    })
                    .catch(e => {
                        console.warn(`Failed: ${path}`, e);
                        updateProgress(); // ★
                        resolve();
                    });

            } else {
                updateProgress(); // ★
                resolve();
            }
        });
    });

    return Promise.all(promises);
}

// --- ▼▼▼ ゲーム初期化処理 ▼▼▼ ---

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. アセットの読み込みを開始
        await preloadAssets(assetsToLoad);

        // 2. 読み込み完了後、ロード画面をフェードアウト
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('loaded');
        
        // フェードアウトアニメーションが終わったら完全に非表示にする
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.style.display = 'none';
        });

        // 3. ホームページを表示し、イベントリスナーを設定
        document.getElementById('home-page').classList.remove('hidden');
        ui.setupEventListeners();

        // ▼▼▼ 追加: URLパラメータを見て自動でモードを選択する処理 ▼▼▼
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');

        if (mode === 'solo') {
            const soloBtn = document.getElementById('start-solo-btn');
            if (soloBtn) soloBtn.click();
        } else if (mode === 'streamer') {
            const streamerBtn = document.getElementById('start-streamer-btn');
            if (streamerBtn) streamerBtn.click();
        }
        // ▲▲▲ 追加ここまで ▲▲▲

    } catch (error) {
        console.error("アセットの読み込みに失敗しました:", error);
        // エラーが起きても最低限ゲーム画面は出す（ロードスタック防止）
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('home-page').classList.remove('hidden');
        ui.setupEventListeners();
    }
});