// ★★★★★ 修正点 ★★★★★
// tmi.jsをモジュールとして直接インポートします
import tmi from 'https://cdn.jsdelivr.net/npm/tmi.js@1.8.5/+esm';


// このファイルはTwitchに接続する機能だけを持っています。
export let twitchClient = null;

// Twitchに接続する関数 (Promiseを返すように修正)
export function connectTwitch(channelName, onMessageCallback) {
    // Promiseを返すように変更
    return new Promise((resolve, reject) => {
        if (twitchClient) {
            try { twitchClient.disconnect(); } catch (e) {}
        }

        // チャンネル名が空の場合はエラーを返す
        if (!channelName || channelName.trim() === '') {
            // エラーメッセージを付けてreject
            reject(new Error("Twitchチャンネル名が指定されていません。"));
            return;
        }

        // tmi.js (Twitch用ライブラリ) の設定
        // @ts-ignore
        twitchClient = new tmi.Client({
            options: { debug: true }, // デバッグモードを有効にしてコンソールに詳細情報を表示
            connection: {
                secure: true,
                reconnect: true
            },
            channels: [channelName]
        });

        // 接続成功時のイベントリスナー
        twitchClient.on('connected', (address, port) => {
            console.log(`[Twitch] 接続成功: ${address}:${port}`);
            // 接続に成功したらPromiseを解決(resolve)
            resolve(true); 
        });

        // 認証失敗や切断時のイベントリスナー
        twitchClient.on('disconnected', (reason) => {
            console.error(`[Twitch] 切断されました: ${reason}`);
        });

        // コメントが来たら実行する
        twitchClient.on('message', (channel, tags, message, self) => {
            onMessageCallback(message, tags['display-name']);
        });

        // 接続を開始
        twitchClient.connect().catch(err => {
            console.error('[Twitch] 接続開始時にエラー:', err);
            // 接続開始自体に失敗したらPromiseを拒否(reject)
            reject(err);
        });
    });
}

// 切断する関数
export function disconnectTwitch() {
    if (twitchClient) {
        try { twitchClient.disconnect(); } catch (e) {}
        twitchClient = null;
        console.log('[Twitch] 切断しました。');
    }
}