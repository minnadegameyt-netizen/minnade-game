import * as state from '../state.js';

export function createDateEvent() {
    let characterImageHappy = "img/sakurai_happy.png";
    let dateMessage = "今日は楽しかったね！また来ようね！";

    switch (state.player.girlfriendRoute) {
        case 'rikujo':
            characterImageHappy = "img/kazami_smile.png";
            dateMessage = "うん、すっごく楽しかった！また誘ってね！";
            break;
        case 'manager':
            characterImageHappy = "img/hoshikawa_smile.png";
            dateMessage = "ふふ、楽しかったです。いい気分転換になりました。";
            break;
    }

    return {
        id: "scheduled_date", title: "彼女とのデート", type: "scheduled",
        scenes: [
            { character: "彼女", image: characterImageHappy, text: dateMessage },
            {
                action: () => {
                    state.player.dateCount++;
                    state.player.health = Math.min(state.player.maxHealth, state.player.health + 20);
                    // ▼▼▼ 修正箇所 ▼▼▼
                    state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 10);
                    state.player.girlfriendFlag.isDateScheduled = false;
                    state.player.girlfriendFlag.scheduledDateTurn = -1;
                    return `デートは楽しかった！\n体力+20、彼女評価+10！\n（デート回数: ${state.player.dateCount}回）`;
                }
            }
        ]
    };
}


export function createConfessionEvent(triggerType) {
    const CONFESSION_SUCCESS_THRESHOLD = 45; // 告白が成功する評価値
    
    let characterImageBlush = "img/sakurai_blush.png";
    let successMessage = "…っ！はい、喜んで…！";

    switch (state.player.girlfriendRoute) {
        case 'rikujo':
            characterImageBlush = "img/kazami_blush.png";
            successMessage = "…うんっ！私も、好き…です！";
            break;
        case 'manager':
            characterImageBlush = "img/hoshikawa_blush.png";
            successMessage = "！…はい、私も…。よろしくお願いします。";
            break;
    }

    return {
        id: "confession_event", title: "告白", type: "scheduled",
        executed: false,
        scenes: [
            { character: "主人公", image: "img/p_shy.png", text: "（彼女との交流も増えてきた…仲良くなった気がするし、そろそろ気持ちを伝えるべきか…？）" },
            {
                text: "どうする？", choices: ["告白する", "今はやめておく"],
                action: (choice) => {
                    // 電話での告白イベントはこのターン試行済みとしてフラグを立てる
                    if (triggerType === 'phone') {
                        state.gameState.phoneConfessionAttemptedThisTurn = true;
                    }

                    // --- ▼▼▼ ここから全面的に修正 ▼▼▼ ---

                    // 選択肢に関わらず、評価が足りない場合はループを防ぐためにフラグをリセットしてイベント終了
                    if (state.player.girlfriendEval < CONFESSION_SUCCESS_THRESHOLD) {
                        if (triggerType === 'date') state.player.dateCount++;
                        state.player.girlfriendFlag.confessionReady = false; // ループ防止
                        return { log: "（やっぱりまだ早い気がする…もう少し仲良くなってからにしよう）", endsEvent: true };
                    } 
                    
                    // 評価が足りていて、「今はやめておく」を選んだ場合もフラグをリセットしてイベント終了
                    if (choice === "今はやめておく") {
                        if (triggerType === 'date') state.player.dateCount++;
                        state.player.girlfriendFlag.confessionReady = false; // ループ防止
                        return { log: "（まだだ…もう少し仲良くなってからにしよう）", endsEvent: true };
                    }
                    
                    // 「告白する」を選んだ場合は、次のシーン（成功ルート）に進む
                    return { log: null };

                    // --- ▲▲▲ ここまで全面的に修正 ▲▲▲ ---
                }
            },
            { character: "主人公", image: "img/p_smile.png", text: "ずっと好きでした。俺と、付き合ってください！" },
            { character: "彼女", image: characterImageBlush, text: successMessage },
            {
                action: () => {
                    state.player.isGirlfriend = true;
                    if (triggerType === 'date') state.player.dateCount++;
                    state.player.girlfriendFlag.isDateScheduled = false;
                    state.player.girlfriendFlag.scheduledDateTurn = -1;
                    state.player.girlfriendFlag.confessionReady = false; // 告白が終わったのでフラグをリセット
                    state.player.health = state.player.maxHealth;
                    state.player.condition = "絶好調";
                    // ▼▼▼ 修正箇所 ▼▼▼
                    state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 20);
                    return "こうして、俺たちは恋人同士になった！\n体力全回復、やる気絶好調、彼女評価+20！";
                }
            }
        ]
    };
}