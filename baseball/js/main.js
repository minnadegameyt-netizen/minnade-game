// js/main.js
import { ui } from './ui.js';
import * as youtube from './youtube.js';

// --- ▼▼▼ アセットのプリロード処理 ▼▼▼ ---

// ゲームで使用するすべてのアセットのパスをリストアップ
const assetsToLoad = [
    // BGM
    'bgm/year1.mp3', 'bgm/year2.mp3', 'bgm/year3.mp3', 'bgm/match.mp3',
    // 効果音
    'bgm/point.mp3', 'bgm/negative.mp3', 'bgm/select.mp3', 'bgm/start_turn.mp3',
    'bgm/event_start.mp3', 'bgm/gameover.mp3', 'bgm/quiz_correct.mp3', 'bgm/quiz_incorrect.mp3',
    'bgm/roulette.mp3', 'bgm/roulette_stop.mp3', 'bgm/hit.mp3', 'bgm/out.mp3', 'bgm/cheer.mp3',
    // 動画
    'video/april.mp4', 'video/summer.mp4', 'video/school.mp4', 'video/winter.mp4',
    'video/muscle_training.mp4', 'video/running.mp4', 'video/training.mp4', 'video/study.mp4',
    'video/city.mp4', 'video/cafe.mp4', 'video/phone.mp4', 'video/matchday.mp4', 'video/game-center.mp4',
    // 画像
    'img/p_normal.png', 'img/p_smile.png', 'img/p_sad.png', 'img/p_surprised.png', 'img/p_shy.png',
    'img/tanaka_normal.png', 'img/tanaka_smile.png', 'img/tanaka_sad.png',
    'img/kantoku.png',
    'img/sakurai_happy.png', 'img/sakurai_blush.png', 'img/sakurai_sad.png', 'img/sakurai_shy.png', 'img/sakurai_smile.png', 'img/sakurai_surprised.png',
    'img/kazami_angry.png', 'img/kazami_blush.png', 'img/kazami_normal.png', 'img/kazami_sad.png', 'img/kazami_shy.png', 'img/kazami_smile.png', 'img/kazami_surprised.png',
    'img/hoshikawa_blush.png', 'img/hoshikawa_normal.png', 'img/hoshikawa_smile.png',
    'img/suzuki_confident.png',
    'img/mysterious_man.png'
];

function preloadAssets(paths) {
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-progress');
    let loadedCount = 0;
    const totalAssets = paths.length;
    progressBar.max = totalAssets;

    const promises = paths.map(path => {
        return new Promise((resolve, reject) => {
            const extension = path.split('.').pop().toLowerCase();
            
            if (['png', 'jpg', 'jpeg', 'gif', 'ico'].includes(extension)) {
                // 画像の読み込み
                const img = new Image();
                img.src = path;
                img.onload = () => {
                    loadedCount++;
                    progressBar.value = loadedCount;
                    resolve();
                };
                img.onerror = (e) => {
                    console.warn(`Failed to load image: ${path}`, e);
                    // エラーでも進行させる
                    loadedCount++;
                    progressBar.value = loadedCount;
                    resolve();
                };
            } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
                // 音声の読み込み
                const audio = new Audio();
                audio.src = path;
                audio.oncanplaythrough = () => {
                    loadedCount++;
                    progressBar.value = loadedCount;
                    resolve();
                };
                audio.onerror = (e) => {
                    console.warn(`Failed to load audio: ${path}`, e);
                    loadedCount++;
                    progressBar.value = loadedCount;
                    resolve();
                };
            } else if (['mp4', 'webm'].includes(extension)) {
                // 動画の読み込み（修正版）
                const video = document.createElement('video');
                video.src = path;
                video.preload = 'metadata'; // ★メタデータのみ読み込む（高速化）
                video.muted = true;
                video.playsInline = true;

                // oncanplaythrough ではなく onloadedmetadata で完了とする
                video.onloadedmetadata = () => {
                    loadedCount++;
                    progressBar.value = loadedCount;
                    resolve();
                };
                
                video.onerror = (e) => {
                    console.warn(`Failed to load video: ${path}`, e);
                    // エラーでも進行させる
                    loadedCount++;
                    progressBar.value = loadedCount;
                    resolve();
                };
            } else {
                // その他のファイル
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
            // 「個人で遊ぶ」ボタンを自動クリック
            const soloBtn = document.getElementById('start-solo-btn');
            if (soloBtn) soloBtn.click();
        } else if (mode === 'streamer') {
            // 「配信で遊ぶ」ボタンを自動クリック
            const streamerBtn = document.getElementById('start-streamer-btn');
            if (streamerBtn) streamerBtn.click();
        }
        // ▲▲▲ 追加ここまで ▲▲▲

    } catch (error) {
        console.error("アセットの読み込みに失敗しました:", error);
        document.getElementById('loading-screen').innerHTML = "エラーが発生しました。ページをリロードしてください。";
    }
});