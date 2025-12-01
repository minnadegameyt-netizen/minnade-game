// twitch.js
// このファイルは触らなくてOKです。Twitchに接続する機能だけを持っています。

export let twitchClient = null;

// Twitchに接続する関数
export function connectTwitch(channelName, onMessageCallback) {
    if (twitchClient) {
        try { twitchClient.disconnect(); } catch (e) {}
    }

    // tmi.js (Twitch用ライブラリ) の設定
    // @ts-ignore
    twitchClient = new tmi.Client({
        channels: [channelName]
    });

    twitchClient.connect().catch(console.error);

    // コメントが来たら実行する
    twitchClient.on('message', (channel, tags, message, self) => {
        // ゲーム側の処理に「コメント内容」と「投稿者名」を渡す
        onMessageCallback(message, tags['display-name']);
    });
}

// 切断する関数
export function disconnectTwitch() {
    if (twitchClient) {
        try { twitchClient.disconnect(); } catch (e) {}
        twitchClient = null;
    }
}