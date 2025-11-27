import * as state from '../state.js';
import { playSfx } from '../sound.js';

// --- 通常のデートイベント ---
export function createDateEvent() {
    let characterImageHappy = "img/sakurai_happy.png";
    let dateMessage = "今日は楽しかったね！また来ようね！";

    switch (state.player.girlfriendRoute) {
        case 'rikujo':
            characterImageHappy = "img/kazami_smile.png";
            dateMessage = "すっごく楽しかった！また誘ってね！";
            break;
        case 'manager':
            characterImageHappy = "img/hoshikawa_smile.png";
            dateMessage = "ふふ、楽しかった。いい気分転換になった。";
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
                    state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 10);
                    state.player.girlfriendFlag.isDateScheduled = false;
                    state.player.girlfriendFlag.scheduledDateTurn = -1;
                    return `デートは楽しかった！\n体力+20、彼女評価+10！\n（デート回数: ${state.player.dateCount}回）`;
                }
            }
        ]
    };
}

// --- ★新規追加: 告白のための呼び出しイベント（電話で発生） ---
export function createConfessionSetupEvent() {
    let targetName = "桜井さん";
    let image = "img/sakurai_shy.png";
    let reaction = "え…？ 大事な話…？ うん、わかった。次の日曜日、空けておくね。";

    switch (state.player.girlfriendRoute) {
        case 'rikujo':
            targetName = "風見さん";
            image = "img/kazami_shy.png";
            reaction = "えっ、改まってなによ…。わかった、グラウンドの裏で待ってる。";
            break;
        case 'manager':
            targetName = "星川さん";
            image = "img/hoshikawa_normal.png";
            reaction = "…うん、わかった。大事なお話…。待ってます。";
            break;
    }

    return {
        id: "confession_setup", title: "決意の電話", type: "command",
        scenes: [
            { character: "主人公", image: "img/p_shy.png", text: "（もう気持ちは固まった。電話で済ませるようなことじゃない。直接会って伝えよう）" },
            {
                text: "どうする？", choices: ["電話して呼び出す", "まだ心の準備が…"],
                action: (choice) => {
                    state.gameState.phoneConfessionAttemptedThisTurn = true;
                    if (choice === "まだ心の準備が…") {
                        return { log: "（…やっぱり、もう少し勇気が出てからにしよう）", endsEvent: true };
                    }
                    playSfx('select');
                    return { log: null };
                }
            },
            { character: "主人公", image: "img/p_normal.png", text: `もしもし、${targetName}？\n今度の日曜、時間作れないかな。どうしても直接、伝えたいことがあるんだ。` },
            { character: targetName, image: image, text: reaction },
            {
                text: "（約束を取り付けた…！ 次のデートで、必ず想いを伝えるぞ！）",
                action: () => {
                    // ▼▼▼ 安全な予約ロジックに修正 ▼▼▼
                    // 大会などのイベントと被らない、最短の空き日を探す
                    let offset = 1;
                    while (true) {
                        // オフセット週後の日付を計算
                        let y = state.gameState.year;
                        let m = state.gameState.month;
                        let w = state.gameState.week + offset;
                        while (w > 4) { w -= 4; m++; if (m > 12) { m = 1; y++; } }

                        // その日に重要なイベント(type: 'date')があるかチェック
                        // state.gameEvents に全イベント情報が入っています
                        const hasConflict = state.gameEvents && state.gameEvents.some(e => 
                            e.type === 'date' && !e.executed && 
                            e.year === y && e.month === m && e.week === w
                        );

                        if (!hasConflict) break; // 空いていれば決定
                        offset++;
                        if (offset > 10) break; // 安全装置（万が一全部埋まっていたら諦めて直近にする）
                    }
                    
                    let targetTurn = state.gameState.currentTurn + offset;
                    // ▲▲▲ 修正ここまで ▲▲▲

                    state.player.girlfriendFlag.isDateScheduled = true;
                    state.player.girlfriendFlag.scheduledDateTurn = targetTurn;
                    
                    return "デートの約束をした！";
                }
            }
        ]
    };
}

// --- 告白イベント（修正版: デート当日に発生） ---
export function createConfessionEvent() { 
    const CONFESSION_SUCCESS_THRESHOLD = 45; 
    
    // ▼▼▼ 1. 変数定義の追加（会った直後の会話用） ▼▼▼
    let characterImageBlush = "img/sakurai_blush.png";
    let characterImageNormal = "img/sakurai_shy.png";
    
    // 会った直後のセリフ（デフォルト：桜井さん）
    let meetingLine = "来てくれたんだね。急に呼び出してごめん。";
    let girlArrivalLine = "ううん、大丈夫だよ。…で、電話で言ってた「大事な話」ってなに？ ちょっとドキドキしちゃった。";

    // 告白のセリフ（デフォルト）
    let heroConfessionLine = "その…桜井さんと一緒にいるのが楽しくてさ…好きなんだ！気持ちが抑えきれなくて…だから、付き合ってください！";
    let girlReactionPre = "えっ…主人公くん…？";
    let successMessage = "…っ！はい、喜んで…！私で、いいの…？";

    // ▼▼▼ 2. ルートごとのセリフ設定 ▼▼▼
    switch (state.player.girlfriendRoute) {
        case 'rikujo':
            characterImageBlush = "img/kazami_blush.png";
            characterImageNormal = "img/kazami_normal.png"; // 通常顔に変更
            
            // 会った直後
            meetingLine = "来てくれてありがとう。練習、疲れてないか？";
            girlArrivalLine = "平気。それより、わざわざ裏に呼び出すなんて珍しいじゃない。…で、何があったの？";
            
            // 告白
            heroConfessionLine = "好きだ！付き合ってくれ！";
            girlReactionPre = "わっ、いっいきなり…もうっ…";
            successMessage = "…うん、よろしくね。全く…もうちょっとムードとか作ってよー。";
            break;

        case 'manager':
            characterImageBlush = "img/hoshikawa_blush.png";
            characterImageNormal = "img/hoshikawa_normal.png";
            
            // 会った直後
            meetingLine = "待たせてごめん。来てくれてありがとう。";
            girlArrivalLine = "ううん、私も今来たところ。…あの、電話の様子、いつもと違ったから…気になって。どうしたの？";
            
            // 告白
            heroConfessionLine = "いつも支えてくれる君のことが、いつの間にか特別になってた。これからは俺が君を支えたい。";
            girlReactionPre = "主人公くん…それって、部員として…ううん、違うよね…？";
            successMessage = "！…うん、私も…。彼女として支えさせてください。";
            break;
    }

    return {
        id: "confession_event", title: "告白", type: "scheduled",
        executed: false,
        scenes: [
            // ▼▼▼ 3. シーンの追加（会ってからの導入会話） ▼▼▼
            { character: "主人公", image: "img/p_normal.png", text: meetingLine },
            { character: "彼女", image: characterImageNormal, text: girlArrivalLine },
            
            // ここから心の声（既存の流れ）
            { character: "主人公", image: "img/p_shy.png", text: "（…彼女の顔を見たら、心臓が跳ね上がった。今日こそ、この気持ちを伝えるんだ…！）" },
            
            {
                text: "どうする？", choices: ["告白する", "今はやめておく"],
                action: (choice) => {
                    // 評価不足の場合
                    if (state.player.girlfriendEval < CONFESSION_SUCCESS_THRESHOLD) {
                        state.player.dateCount++;
                        state.player.girlfriendFlag.confessionReady = false; 
                        
                        if (choice === "告白する") {
                            return { log: "（いざ伝えようとしたが、言葉に詰まってしまった…。\n「あ、いや、なんでもないんだ」\n俺は勇気が出ず、誤魔化してしまった…）", endsEvent: true };
                        } else {
                            return { log: "（やっぱりまだ早い気がする…\n「あ、いや、顔が見たかっただけなんだ」\n俺は適当に誤魔化して、普通に遊んで帰ることにした）", endsEvent: true };
                        }
                    } 
                    
                    if (choice === "今はやめておく") {
                        state.player.dateCount++;
                        state.player.girlfriendFlag.confessionReady = false;
                        return { log: "（まだだ…もう少し自信をつけてからにしよう。\n「いや、なんでもないんだ。行こうか」\n俺は告白を先延ばしにした）", endsEvent: true };
                    }
                    
                    playSfx('select'); 
                    return { log: null }; 
                }
            },
            { character: "主人公", image: "img/p_smile.png", text: `${heroConfessionLine}\n好きです。俺と、付き合ってください！` },
            { character: "彼女", image: characterImageNormal, text: girlReactionPre },
            { text: "（ドクン…ドクン…）" },
            { character: "彼女", image: characterImageBlush, text: successMessage, action: () => playSfx('point') },
            {
                action: () => {
                    state.player.isGirlfriend = true;
                    state.player.dateCount++;
                    state.player.girlfriendFlag.isDateScheduled = false;
                    state.player.girlfriendFlag.scheduledDateTurn = -1;
                    state.player.girlfriendFlag.confessionReady = false; 
                    state.player.health = state.player.maxHealth;
                    state.player.condition = "絶好調";
                    state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 20);
                    return "こうして、俺たちは恋人同士になった！\n体力全回復、やる気絶好調、彼女評価+20！";
                }
            }
        ]
    };
}