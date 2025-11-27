import * as state from '../state.js';
import { ui } from '../ui.js';
import { processEndOfTurn } from '../game-loop.js';
import { setTournamentState } from '../state.js';
import { runRoulette, runJanken, runShuttleRun, runSelectionQuiz, runTestRoulette, runSenkyuganChallenge } from './minigames.js';
import { createDateEvent, createConfessionEvent, createConfessionSetupEvent } from './girlfriend-events.js';
import { playSfx } from '../sound.js';

// 未来のターンが何年何月何週になるか計算する関数
function calculateDateForTurn(targetTurn) {
    const baseTurn = state.gameState.currentTurn;
    let year = state.gameState.year;
    let month = state.gameState.month;
    let week = state.gameState.week;
    const turnDifference = targetTurn - baseTurn;
    if (turnDifference <= 0) return { year, month, week };
    let totalWeeks = week + turnDifference;
    while(totalWeeks > 4) {
        totalWeeks -= 4;
        month++;
        if (month > 12) { month = 1; year++; }
    }
    week = totalWeeks;
    return { year, month, week };
}

const testEventScene = {
    character: "主人公", image: "img/p_sad.png", text: "期末テストだ！<br>学力に応じて赤点マスの数が変わるぞ！",
    miniGame: "testRoulette",
    action: result => {
        let log = `テスト結果は… <span style="font-weight:bold;">${result}</span>！<br>`;
        if (result === '赤点') {
            playSfx('negative');
            state.player.redMarkCount++;
            state.player.intelligence -= 1;
            state.team.coachEval -= 1;
            log += "赤点を取ってしまった…<br>学力と監督評価が 1 ダウンした。";
            if (state.player.redMarkCount > 1) {
                log += `<br><span style="color:red;">連続赤点 ${state.player.redMarkCount}回目…（注意：3回連続でゲームオーバーになります、勉強しましょう）</span>`;
            }
            if (state.player.redMarkCount >= 3) {
                return { gameOver: true };
            }
        } else {
            playSfx('point');
            state.player.redMarkCount = 0;
            state.player.intelligence += 3;
            state.team.coachEval += 3;
            log += `無事セーフ！<br>学力と監督評価が <span style="color: #ecc94b;">3</span> アップした！`;
        }
        return log;
    },
    gameOverText: "3回連続で赤点を取ってしまい、留年が決定した…<br>GAME OVER"
};

export const allEvents = [
    {
        id: "breakup_crisis", title: "破局の危機", type: "special", // このイベントはcheckEventからは呼ばれない
        executed: false,
        scenes: [
            { text: "彼女から電話だ…。深刻そうな声だ…。" },
            { 
                character: "彼女", image: "img/sakurai_sad.png", // ベース画像、後で上書き
                text: "ねぇ…私たち、最近全然会えてないよね。なんだか、気持ちが離れていってる気がするの…。" 
            },
            {
                text: "どうする…？", choices: ["今すぐ会いに行く", "どうしようか…"],
                action: (choice) => {
                    if (choice === "今すぐ会いに行く") {
                        // 関係修復ルート
                        delete state.player.specialAbilities['すれ違い'];
                        state.player.noDateTurnCount = 0;
                        state.player.girlfriendEval = Math.min(100, state.player.girlfriendEval + 15);
                        state.player.condition = "普通";
                        return { log: "俺は練習を中断して、彼女のもとへ駆けつけた。\n必死に謝り、なんとか関係を修復することができた…\n「すれ違い」がなくなり、彼女評価が15回復した。", endsEvent: true };
                    } else {
                        // 破局ルート
                        return { log: "俺が言葉に詰まっていると、彼女は静かに言った…" };
                    }
                }
            },
            { character: "彼女", text: "…そっか。もう、無理なんだね。さよなら。" },
            { 
                action: () => {
                    playSfx('negative');
                    // プレイヤーの状態をリセット
                    state.player.isGirlfriend = false;
                    state.player.hasPhoneNumber = false;
                    state.player.girlfriendEval = 0;
                    state.player.girlfriendRoute = 'none';
                    delete state.player.specialAbilities['すれ違い'];
                    delete state.player.specialAbilities['お弁当'];
                    state.player.noDateTurnCount = 0;
            
                    // ペナルティ
                    state.player.condition = "絶不調";
                    state.player.health = Math.max(1, state.player.health - 20);
            
                    return "電話は切られてしまった。俺たちの関係は、終わってしまったんだ…。\nやる気が絶不調になり、体力が20減少した…。";
                }
            }
        ]
    },

    // --- 1年目 ---
    {
        id: "opening", title: "入学式", type: "date", year: 1, month: 4, week: 1, executed: false,
        scenes: [
            { character: "田中", image: "img/tanaka_normal.png", text: "いやー、入学式って長くて疲れるな。オレはもうクタクタだよ。" },
            { character: "主人公", image: "img/p_normal.png", text: "それより田中、いよいよだな！俺たちの高校野球が始まるんだ！" },
            { character: "田中", image: "img/tanaka_smile.png", text: "そうだな！オレの華麗な守備と、お前の活躍で甲子園に行くぜ！" },
            { character: "主人公", image: "img/p_smile.png", text: "（今日から高校生活がスタートだ！甲子園目指して頑張るぞ！）", action: () => { state.player.health = state.player.maxHealth; state.player.condition = "絶好調"; return "体力とやる気が最大になった！" } }
        ]
    },
    { // ★★★ 新規イベント ★★★
        id: "tanaka_lecture_1", title: "チーム総合力", type: "date", year: 1, month: 4, week: 2, executed: false,
        scenes: [
            { character: "田中", image: "img/tanaka_normal.png", text: "なあ主人公、監督が言ってたんだけどさ、俺たち個人の能力が上がると、それが『チーム総合力』ってのに反映されるらしいぜ。" },
            { character: "主人公", image: "img/p_sad.png", text: "…？何言ってんだ？練習したら強くなるのは当たり前だろ？" },
            { character: "田中", image: "img/tanaka_smile.png", text: "まあ気にすんなって！オレの華麗な守備と、お前の打撃でガンガン総合力上げて、他の部員も引っ張っていこうぜ！" },
            { 
                character: "主人公", image: "img/p_sad.png", text: "（…よく分からないが、俺が強くなったら周りのみんなも強くなるんだな）", 
                action: () => { 
                    state.player.condition = "絶好調";
                    state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 1);
                    return "やる気が絶好調になり、監督の評価が1上がった！";
                } 
            }
        ]
    },
    {
        id: "gw_1", title: "GWの出会い", type: "date", year: 1, month: 5, week: 1, executed: false,
        condition: () => state.player.girlfriendRoute === "none",
        scenes: [
            { character: "田中", image: "img/tanaka_smile.png", text: "GWで暇だなー！主人公、気分転換にゲーセン行こうぜ！" },
            { character: "主人公", image: "img/p_normal.png", text: "どうしようかな…", choices: ["行く", "断る"], action: c => {
                if (c === "断る") {
                    state.player.girlfriendRoute = "rikujo";
                    return { log: "家で休んで体力が少し回復した。", endsEvent: true };
                }
                return null;
            }},
            { text: "（…あれって…ゲームセンターの隅で、UFOキャッチャーをしていた女の子に、ガラの悪い男たちが絡んでいる…）" },
            { character: "不良A", image: "img/mysterious_man.png", text: "お嬢ちゃん一人？俺らが取り方教えてやろうか？" },
            { character: "？？？", image: "img/sakurai_surprised.png", text: "いえ、大丈夫です…。" },
            { character: "主人公", image: "img/p_sad.png", text: "（どう見ても怖がってるじゃないか…でも、直接割って入るのは危険すぎる…）" },
            { text: "どうする？", choices: ["こっそり店員を呼ぶ", "関わらない"], action: c => c === "こっそり店員を呼ぶ" ? (state.player.girlfriendFlag.gw = 1, "勇気を出して店員に事情を話し、事なきを得た…。僕たちに気づいた女の子は、ぺこりとお辞儀をして去っていった。") : (state.player.girlfriendRoute = "rikujo", state.player.health = Math.min(state.player.maxHealth, state.player.health + 5), "見て見ぬふりをした…。情けない…。") }
        ]
    },
    {
        id: "mid_term_test_1", title: "中間テスト (1年)", type: "date", year: 1, month: 5, week: 3, executed: false,
        scenes: [
            { text: "中間テストだ！" },
            {
                miniGame: "generalQuiz",
                action: correctCount => {
                    if (correctCount > 0) {
                        playSfx('point');
                        state.player.intelligence = Math.min(state.maxStats.playerStats, state.player.intelligence + 1);
                        return `正解！ 学力が <span style="color: #ecc94b;">1</span> アップした！`;
                    } else {
                        state.team.coachEval -= 1;
                        return "不正解… 監督の評価が 1 ダウンした…";
                    }
                }
            }
        ]
    },
    {
        id: "fitness_test_1", title: "体力測定", type: "date", year: 1, month: 6, week: 3, executed: false,
        scenes: [
            { character: "監督", image: "img/kantoku.png", text: "今日は体力測定、まずはシャトルランだ！" },
            { character: "鈴木くん", image: "img/suzuki_confident.png", text: "フン、野球部なんかに負けるかよ。持久力ならサッカー部が上だってこと、見せてやるぜ！" },
            { character: "主人公", image: "img/p_normal.png", text: "（なんだあいつ…見てろよ、絶対負けないからな！）" },
            {
                text: "【シャトルラン勝負！】<br>制限時間内に 'run' と打ちまくれ！目標は15回だ！",
                miniGame: "shuttleRun",
                action: score => {
                    playSfx('point');
                    const TARGET_SCORE = 15;
                    if (score >= TARGET_SCORE) {
                        state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 3);
                        return `記録は <span style="color:#ecc94b;">${score}</span> 回！見事、鈴木くんに勝利した！<br>走力が <span style="color: #ecc94b;">3</span> アップした！`;
                    } else {
                        state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 1);
                        return `記録は <span style="color:#ecc94b;">${score}</span> 回…。惜しくも鈴木くんに負けてしまった…<br>悔しさをバネに走力が <span style="color: #ecc94b;">1</span> アップした。`;
                    }
                }
            }
        ]
    },
    { id: "summer_tournament_1", title: "夏の地方大会", type: "date", year: 1, month: 7, week: 1, executed: false, scenes: [{ action: () => { setTournamentState('summer_1', 1); return "夏の大会が始まる！1年生だけど、絶対活躍してやる！" } }] },
    { id: "test_1_1", title: "期末テスト", type: "date", year: 1, month: 7, week: 3, executed: false, scenes: [testEventScene] },
    {
        id: "gw_2", title: "夏の出会い", type: "date", year: 1, month: 8, week: 1, executed: false,
        condition: () => state.player.girlfriendFlag.gw === 1,
        scenes: [
            { character: "田中", image: "img/tanaka_smile.png", text: "夏休みといえば、やっぱりゲーセンだよな！なあ、主人公！" },
            { character: "主人公", image: "img/p_normal.png", text: "またかよ…。お、あれは確か…" },
            { text: "（GWに助けた女の子が、一人で音楽ゲームに熱中している。今日は楽しそうで良かったな…）" },
            { character: "田中", image: "img/tanaka_normal.png", text: "おっと、わりぃ！ちょっと腹の調子が…。トイレ行ってくる！" },
            { text: "（田中がトイレに行った、その時だった）" },
            { character: "不良A", image: "img/mysterious_man.png", text: "よぉ、また会ったな、お嬢ちゃん。今日は邪魔者もいねぇみたいだし、俺らと遊ぼうぜ？" },
            { text: "（まずい！この前の不良たちが、再び女の子に絡み始めた！）" },
            { character: "？？？", image: "img/sakurai_surprised.png", text: "…！" },
            { text: "（恐怖に固まる女の子と、目が合ってしまった…！彼女は俺を覚えているようだ！）" },
            {
                character: "主人公", image: "img/p_sad.png", text: "（どうする！？今度は俺一人だ…！）",
                choices: ["彼女の手を引いて逃げる", "見て見ぬふりをする"],
                action: (choice) => {
                    if (choice === "見て見ぬふりをする") {
                        state.player.girlfriendFlag.gw = 0;
                        state.player.health -= 10;
                        state.player.girlfriendRoute = "rikujo";
                        return { log: "怖くなって、俺は目をそらしてしまった…。\n自己嫌悪で体力が少し減った。", endsEvent: true };
                    }
                    return null;
                }
            },
            { text: "（俺は無我夢中で彼女の手を取り、ゲームセンターの外へ走り出した！）" },
            { character: "？？？", image: "img/sakurai_shy.png", text: "はぁ…はぁ…。あ、ありがとう…。また助けてもらっちゃったね。" },
            { character: "主人公", image: "img/p_smile.png", text: "いや、無事でよかったよ。" },
            { character: "？？？", image: "img/sakurai_smile.png", text: "ごめんなさい、私のためにこんなことして…" },
            {
                text: "（少し話した後に別れた。って言うかあの制服うちの学校と同じだよな。…あ、田中を忘れてた）",
                action: () => {
                    playSfx('point');
                    state.player.girlfriendFlag.gw = 2;
                    state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 5);
                    state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 2);
                    return `？？？さんと少し親しくなった！\n彼女評価が <span style="color: #ecc94b;">5</span>、走力が <span style="color: #ecc94b;">2</span> 上がった。`;
                }
            }
        ]
    },
    {
        id: "rikujo_1", title: "忘れ物", type: "date", year: 1, month: 8, week: 4, executed: false,
        condition: () => state.player.girlfriendRoute === "rikujo",
        scenes: [
            { character: "主人公", image: "img/p_sad.png", text: "ふぅ、今日も疲れたな…。ん？あれ、部室にスマホ忘れたかも！" },
            { text: "どうする？", choices: ["取りに戻る", "諦める"], action: c => c === "諦める" ? { log: "まあ、いいか…。明日でいっか。", endsEvent: true } : null },
            { text: "（部室に戻る途中、日が落ちかけたグラウンドで誰かが何かを探しているのが見えた）" },
            { character: "？？？", image: "img/kazami_sad.png", text: "はぁ…どこにもない…。どうしよう…" },
            { character: "主人公", image: "img/p_surprised.png", text: "（陸上部のジャージ…？ずいぶん長い時間探しているみたいだ。なんだかすごく困ってるみたいだけど…）" },
            {
                text: "どうする？",
                choices: ["声をかけてみる", "関わらないでおこう"],
                action: (choice) => {
                    if (choice === "関わらないでおこう") {
                        return { log: "（他人が面倒ごとに首を突っ込むのはやめておこう…）\n俺は気づかないふりをして、その場を通り過ぎた。", endsEvent: true };
                    }
                    return null;
                }
            },
            { character: "主人公", image: "img/p_shy.png", text: "あの…何か探し物？" },
            { character: "？？？", image: "img/kazami_surprised.png", text: "…うん、家の鍵落としちゃって…" },
            { character: "主人公", image: "img/p_normal.png", text: "そっか、大変だ。俺も一緒に探すよ。二人の方が早いでしょ？" },
            { character: "？？？", image: "img/kazami_smile.png", text: "本当！？ありがとう！助かる！" },
            {
                text: "（こうして俺は、陸上部の彼女と一緒に鍵を探すことになった）",
                action: () => {
                    playSfx('point');
                    state.player.girlfriendFlag.rikujo = 1;
                    state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 2);
                    return `人助けをしたことで、良い気分になった。\n監督の評価が <span style="color: #ecc94b;">2</span> 上がった。`;
                }
            }
        ]
    },
    {
        id: "gw_3", title: "再会", type: "date", year: 1, month: 9, week: 1, executed: false,
        condition: () => state.player.girlfriendFlag.gw === 2,
        scenes: [
            { text: "（放課後、廊下を歩いていると、見覚えのある姿が目に入った）" },
            { character: "主人公", image: "img/p_normal.png", text: "（あ、ゲームセンターの時の子だ。やっぱりうちの学校だったんだな）" },
            { text: "（俺に気づいた彼女が、駆け寄ってきた）" },
            { character: "？？？", image: "img/sakurai_smile.png", text: "あ、この前の！やっぱり同じ学校だったんだね！私、桜井っていいます。" },
            { character: "主人公", image: "img/p_shy.png", text: "俺は野球部の主人公。この前は災難だったね。" },
            { character: "桜井さん", image: "img/sakurai_shy.png", text: "ううん、助けてくれて本当にありがとう。ゲーム好きな友達がいなくて、一人でいるからああなっちゃうんだよね…" },
            { text: "（…！これって…）" },
            { character: "桜井さん", image: "img/sakurai_smile.png", text: "主人公くんって…その…ゲームとか好き…？" },
            { character: "主人公", image: "img/p_smile.png", text: "（…！連絡先を聞く絶好のチャンスだ！）" },
            {
                text: "どうする？",
                choices: ["「今度一緒に行こうよ！」", "「野球以外はあんまり興味ないかな…」"],
                action: (choice) => {
                    if (choice === "「野球以外はあんまり興味ないかな…」") {
                        state.player.girlfriendFlag.gw = 0;
                        return { log: "俺は照れ隠しにそう言って、その場を後にしてしまった。\n桜井さんは少し寂しそうに見えた…。", endsEvent: true };
                    }
                    return null;
                }
            },
            { character: "桜井さん", image: "img/sakurai_happy.png", text: "…！うん、わかった…！" },
            {
                text: "（こうして俺は、桜井さんと連絡先を交換することができた！）",
                action: () => {
                    playSfx('point');
                    state.player.hasPhoneNumber = true;
                    state.player.girlfriendRoute = "game_center";
                    state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 12);
                    return `桜井さんとの関係が一歩前進した！\n彼女評価が <span style="color: #ecc94b;">12</span> 上がった！`;
                }
            }
        ]
    },
    {
        id: "rikujo_2", title: "お礼", type: "date", year: 1, month: 9, week: 2, executed: false,
        condition: () => state.player.girlfriendFlag.rikujo === 1,
        scenes: [
            { text: "（昼休み、教室で弁当を食べていると、クラスの入口が少し騒がしい…）" },
            { character: "クラスメイトA", text: "野球部の主人公くんに用だってさ。えーっと…" },
            { character: "？？？", image: "img/kazami_smile.png", text: "やっほー！同じ学年だったのねー！" },
            { character: "主人公", image: "img/p_surprised.png", text: "（え、俺？って、この前の陸上部の子だ！）" },
            { text: "（彼女はすごい勢いでクラスメイトたちの間を抜けて俺の席までやってきた）" },
            { character: "？？？", image: "img/kazami_smile.png", text: "この前は、鍵を探すの手伝ってくれてありがとう。これ、お礼に作ったの。良かったら食べて！" },
            { character: "主人公", image: "img/p_smile.png", text: "手作りクッキーだ！わざわざありがとう。すごくいい匂いがする！" },
            { character: "風見さん", image: "img/kazami_smile.png", text: "うん！私の名前は風見。陸上部で短距離やってるんだ。きみは…主人公くん、だよね？" },
            { character: "主人公", image: "img/p_smile.png", text: "ああ、そうだよ。よろしくな、風見さん。" },
            { 
                text: "（俺はクッキーを受け取った、どうやら風見さんは男子から人気みたいで、殺伐とした雰囲気が流れている）",
                action: () => { 
                    state.player.health = Math.min(state.player.maxHealth, state.player.health + 15); 
                    state.player.girlfriendFlag.rikujo = 2; 
                    state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 1);
                    return "手作りクッキーはとてもおいしくて、体力が回復した！\n田中は今日一日話しを聞いてくれなかったが、監督の評価はなぜか上がった。";
                }
            }
        ]
    },
    { id: "quiz_1", title: "野球知識テスト", type: "date", year: 1, month: 9, week: 3, executed: false, scenes: [{ character: "監督", image: "img/kantoku.png", text: "お前ら、野球のルールや歴史についてどれだけ知っているか、抜き打ちテストを行う！" }, { character: "主人公", image: "img/p_surprised.png", text: "えぇーっ！？" }, { text: "【野球知識テスト】<br>全3問だ。一度でも間違えたら終了だぞ！", miniGame: "baseballQuiz", action: c => { let t = `結果は <span style="color: #ecc94b;">${c}</span> 問正解だった。<br>`; if (c > 0) playSfx('point'); if (c === 1) { state.player.intelligence = Math.min(state.maxStats.playerStats, state.player.intelligence + 1); state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 1); t += `学力と監督評価が <span style="color: #ecc94b;">1</span> アップした。`; } else if (c === 2) { state.player.intelligence = Math.min(state.maxStats.playerStats, state.player.intelligence + 2); state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 2); t += `学力と監督評価が <span style="color: #ecc94b;">2</span> アップした。`; } else if (c === 3) { state.player.intelligence = Math.min(state.maxStats.playerStats, state.player.intelligence + 4); state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 4); state.player.specialAbilities["野球脳"] = true; t += `全問正解！学力と監督評価が <span style="color: #ecc94b;">4</span> アップ！<br>特殊能力「野球脳」を手に入れた！`; } else { playSfx('negative'); t += "一問も正解できなかった…。"; } return t; } }] },
    { id: "autumn_tournament_1", title: "秋の地方大会", type: "date", year: 1, month: 10, week: 1, executed: false, scenes: [{ action: () => { setTournamentState('autumn_1', 1); return "秋の大会が始まる！新チームで俺が活躍する番だ！" } }] },
    {
        id: "rikujo_3", title: "体育祭", type: "date", year: 1, month: 10, week: 4, executed: false,
        condition: () => state.player.girlfriendFlag.rikujo === 2,
        scenes: [
            { character: "田中", image: "img/tanaka_smile.png", text: "体育祭のメインイベント、クラス対抗リレーだ！アンカーはお前だぞ、主人公！頼んだぜ！" },
            { character: "主人公", image: "img/p_normal.png", text: "任せとけ！…って、相手チームのアンカー…風見さん！？" },
            { text: "（俺に気づいた風見さんが、ニヤリと挑戦的な笑みを浮かべて近づいてきた）" },
            { character: "風見さん", image: "img/kazami_normal.png", text: "ねえ、主人公くん。ただ走るだけじゃつまらないから、賭けない？" },
            { character: "主人公", image: "img/p_surprised.png", text: "賭け？" },
            { character: "風見さん", image: "img/kazami_smile.png", text: "うん。勝った方が、負けた方に何でも一つお願いできるっていうの！どう？" },
            {
                text: "面白そうな提案だ…！受けるか？",
                choices: ["望むところだ！", "いや、やめておく"],
                action: (choice) => {
                    if (choice === "いや、やめておく") {
                        state.player.girlfriendRoute = "none";
                        return { log: "「そっか…つまんないの」\n風見さんは心底ガッカリした様子で去っていった…。\n勝負を避けたことで、彼女との関係は終わってしまったかもしれない。", endsEvent: true };
                    }
                    return "（面白い！絶対に勝って、お願いを言わせてやる！）\n「いいぜ、その勝負、乗った！」";
                }
            },
            { text: "（勝負はアンカー対決にもつれ込んだ。ほぼ同時にバトンを受け取る！デッドヒートの末、わずかに俺が先にゴールテープを切った！）" },
            { character: "風見さん", image: "img/kazami_angry.png", text: "くぅぅ…！本気で走ったのに…負けた…。" },
            { character: "主人公", image: "img/p_smile.png", text: "俺の勝ちだな、風見さん。じゃあ、約束通りお願いを聞いてもらおうか。" },
            { character: "風見さん", image: "img/kazami_shy.png", text: "はいはい…で、何？" },
            {
                text: "（よっしゃ！ここで決めるしかない！）",
                choices: ["「じゃあ…連絡先、教えてよ」", "「ジュース奢って！」"],
                action: (choice) => {
                    if (choice === "「じゃあ…連絡先、教えてよ」") {
                        state.player.hasPhoneNumber = true;
                        state.player.girlfriendRoute = "rikujo";
                        state.player.girlfriendEval = 15;
                        state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 2);
                        return { log: null };
                    } else {
                        state.player.girlfriendRoute = "none";
                        state.player.health += 5;
                        return { log: "俺はジュースを奢ってもらった。風見さんは「それだけでいいの？」と少し不満そうだった…。\n大きなチャンスを逃してしまったかもしれない。", endsEvent: true };
                    }
                }
            },
            { character: "風見さん", image: "img/kazami_blush.png", text: "仕方ない！勝負に負けたしねー" },
            { character: "田中", image: "img/tanaka_surprised.png", text: "…これが青春か…" },

            {
                text: "（こうして俺は、勝負に勝ち、風見さんの連絡先をゲットした！）",
                action: () => {
                    playSfx('point');
                    return `風見さんとの関係が一歩前進した！\n彼女評価が <span style="color: #ecc94b;">15</span>、走力が <span style="color: #ecc94b;">2</span> 上がった！`;
                }
            }
        ]
    },
    {
        id: "senkyugan_1", title: "選球眼トレーニング", type: "date", year: 1, month: 11, week: 2, executed: false,
        scenes: [
            { text: "動体視力を鍛えるぞ！（表示された文字を記憶してください）" },
            {
                miniGame: "senkyugan",
                action: result => {
                    if (result) {
                        playSfx('point');
                        state.player.meet = Math.min(state.maxStats.playerStats, state.player.meet + 3);
                        state.player.defense = Math.min(state.maxStats.playerStats, state.player.defense + 2);
                        state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 2);
                        return `正解！ミート <span style="color: #ecc94b;">+3</span>、守備力 <span style="color: #ecc94b;">+2</span>、監督評価 <span style="color: #ecc94b;">+2</span>！`;
                    } else {
                        return "失敗…何も得られなかった。";
                    }
                }
            }
        ]
    },
    { id: "test_1_2", title: "期末テスト", type: "date", year: 1, month: 12, week: 2, executed: false, scenes: [testEventScene] },
    {
        id: "christmas_1", title: "クリスマス (1年)", type: "date", year: 1, month: 12, week: 4, executed: false,
        scenes: [
            { 
                condition: () => !state.player.isGirlfriend,
                action: () => {
                    playSfx('negative');
                    state.player.condition = "不調";
                    state.player.health = Math.max(1, state.player.health - 10);
                    return "クリスマスは一人で素振りをして過ごした…<br>寂しさで調子が悪くなり、体力が10下がった。";
                }
            },
            { 
                condition: () => state.player.isGirlfriend,
                text: "今日はクリスマスだ。彼女と一緒に過ごす約束をしている。" 
            },
            { 
                condition: () => state.player.isGirlfriend,
                character: "DYNAMIC_GF_NAME", image: "DYNAMIC_GF_SMILE", 
                text: "わぁ、イルミネーションきれいだね！一緒に来れて嬉しいな！" 
            },
            { 
                condition: () => state.player.isGirlfriend,
                character: "主人公", image: "img/p_smile.png", 
                text: "ああ、本当にきれいだな。一緒に見れて良かったよ。" 
            },
            {
                condition: () => state.player.isGirlfriend,
                action: () => {
                    playSfx('point');
                    state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 10);
                    return "彼女と素敵なクリスマスを過ごした。<br>評価が <span style=\"color: #ecc94b;\">10</span> 上がった！";
                }
            }
        ]
    },

    // --- 2年目 ---
    { // ★★★ 新規イベント ★★★
        id: "new_year_2", title: "初詣 (2年)", type: "date", year: 2, month: 1, week: 1, executed: false,
        scenes: [
            { character: "田中", image: "img/tanaka_smile.png", text: "あけおめ！主人公、初詣行こうぜ！" },
            { character: "主人公", image: "img/p_smile.png", text: "ああ、いいな。行こう！" },
            { text: "（神社で、今年1年の活躍を祈願した）" },
            { character: "田中", image: "img/tanaka_normal.png", text: "よし、今年最初の運試しだ！おみくじ引くぞ！" },
            { text: "（二人でおみくじを引く…ガラガラガラ……）" },
            {
                action: () => {
                    const rand = Math.random();
                    if (rand < 0.3) { // 30%で大吉
                        playSfx('point');
                        Object.keys(state.player).forEach(k => {
                            if (typeof state.player[k] === 'number' && ["power", "meet", "speed", "shoulder", "defense"].includes(k)) {
                                state.player[k] = Math.min(state.maxStats.playerStats, state.player[k] + 1);
                            }
                        });
                        return "なんと結果は大吉だった！今年はいい年になりそうだ！\n野球能力がALL+1！";
                    } else if (rand < 0.8) { // 50%で吉
                        playSfx('point');
                        state.player.health = Math.min(state.player.maxHealth, state.player.health + 20);
                        return "結果は吉。まあまあだな。\n体力が20回復した。";
                    } else { // 20%で凶
                        playSfx('negative');
                        return "結果は凶だった…。まあ、こういう時もあるよな。";
                    }
                }
            }
        ]
    },
    {
        id: "valentine_2", title: "バレンタイン", type: "date", year: 2, month: 2, week: 2, executed: false,
        scenes: [
            { 
                condition: () => !state.player.isGirlfriend,
                action: () => {
                    playSfx('negative');
                    state.player.condition = "不調";
                    state.player.health = Math.max(1, state.player.health - 10);
                    return "バレンタイン…誰からもチョコをもらえなかった…<br>悲しさで調子が悪くなり、体力が10下がった。";
                }
            },
            { 
                condition: () => state.player.isGirlfriend,
                text: "（下駄箱を開けると、見覚えのあるラッピングの箱が…）" 
            },
            { 
                condition: () => state.player.isGirlfriend,
                character: "DYNAMIC_GF_NAME", image: "DYNAMIC_GF_SMILE", 
                text: "主人公くん、ハッピーバレンタイン！一生懸命作ったんだから、ちゃんと食べてね！" 
            },
            { 
                condition: () => state.player.isGirlfriend,
                character: "主人公", image: "img/p_smile.png", 
                text: "ありがとう！すごく嬉しいよ。大事に食べるよ。" 
            },
            {
                condition: () => state.player.isGirlfriend,
                action: () => {
                    playSfx('point');
                    state.player.health = Math.min(state.player.maxHealth, state.player.health + 20);
                    state.player.condition = "絶好調";
                    return "彼女からチョコをもらった！<br>体力とやる気が回復した！";
                }
            }
        ]
    },
    { id: "spring_tournament_2", title: "春の地方大会 (2年)", type: "date", year: 2, month: 3, week: 1, executed: false, scenes: [{ action: () => { setTournamentState('spring_2', 1); return "2年目の春の大会！夏に繋げるぞ！" } }] },
    {
        id: "new_members_2", title: "新入部員加入", type: "date", year: 2, month: 4, week: 1, executed: false,
        scenes: [
            { character: "主人公", image: "img/p_smile.png", text: "新入部員が入ってきた！俺も先輩か…。<br>よし、いいところを見せないと！", 
            action: () => {
                Object.keys(state.player).forEach(key => { if (typeof state.player[key] === 'number' && ["power", "meet", "speed", "shoulder", "defense", "intelligence"].includes(key)) { state.player[key] = Math.min(state.maxStats.playerStats, state.player[key] + 1); } });
                return "やる気がみなぎり、全能力が1上がった！";
            }}
        ]
    },
    // --- 2年目5月1週: 田中とじゃんけん ---
    {
        id: "janken_juice_2", title: "ジュースじゃんけん", type: "date", year: 2, month: 5, week: 1, executed: false,
        scenes: [
            { character: "田中", image: "img/tanaka_smile.png", text: "練習終わりは喉が渇くなぁ！おい主人公、ジュース賭けてじゃんけんしようぜ！" },
            { character: "主人公", image: "img/p_normal.png", text: "いいぜ、負けないぞ！" },
            { 
                miniGame: "janken", 
                action: (result) => {
                    if (result === 'win') {
                        playSfx('point');
                        const juices = ["炭酸", "コーヒー", "アイスティー"];
                        const juice = juices[Math.floor(Math.random() * juices.length)];
                        
                        let logText = `じゃんけんに勝った！田中から「${juice}」を奢ってもらった！<br>体力が15回復した！`;
                        state.player.health = Math.min(state.player.maxHealth, state.player.health + 15);

                        // アイスティーだった場合、フラグを立てる
                        if (juice === "アイスティー") {
                            state.player.girlfriendFlag.gotIcedTea = true;
                            logText += "<br>（…なんだか甘い匂いがするアイスティーだな）";
                        }
                        return logText;
                    } else if (result === 'lose') {
                        playSfx('negative');
                        return "負けてしまった…。自分の分は自分で買おう。";
                    } else {
                        // あいこ（ゲームシステム上、決着がつくまでやるか、引き分けとするかですが、今回は引き分け扱い）
                        return "引き分けだ。まあ、割り勘で飲むか。";
                    }
                }
            }
        ]
    },
    {
        id: "mid_term_test_2", title: "中間テスト (2年)", type: "date", year: 2, month: 5, week: 3, executed: false,
        scenes: [{ text: "中間テストだ！" }, { miniGame: "generalQuiz", action: c => c > 0 ? (state.player.intelligence = Math.min(state.maxStats.playerStats, state.player.intelligence + 1), "正解！ 学力が 1 アップした！") : (state.team.coachEval--, "不正解… 監督の評価が 1 ダウンした…") }]
    },
    {
        id: "clean_up_2", title: "部屋の掃除", type: "date", year: 2, month: 6, week: 1, executed: false,
        scenes: [
            { text: "気分転換に何をしようかな…", choices: ["部屋の掃除をする", "寝る"], action: c => "寝る" === c ? (state.player.health = Math.min(state.player.maxHealth, state.player.health + 20), { log: "ぐっすり寝て体力が回復した。", endsEvent: true }) : null },
            { text: "部屋を掃除していると、ベッドの下から<br>ホコリをかぶった大人の本を見つけてしまった…" },
            { text: "どうする？", choices: ["こっそり見る", "掃除を続ける"], action: c => {
                if ("こっそり見る" === c) {
                    return "見ていると、親が部屋に入ってきた！";
                } else {
                    playSfx('point');
                    state.player.meet = Math.min(state.maxStats.playerStats, state.player.meet + 3);
                    state.player.defense = Math.min(state.maxStats.playerStats, state.player.defense + 3);
                    return { log: "誘惑に打ち勝った！<br>集中力が高まり、ミートと守備力が3上がった！", endsEvent: true };
                }
            }},
            { text: "「あらやだ、それ趣味で撮った私の水着写真集じゃない…あんた何してるの？」", action: () => {
                playSfx('negative');
                state.player.health = Math.max(1, state.player.health - 30);
                state.player.meet = Math.max(1, state.player.meet - 3);
                state.player.defense = Math.max(1, state.player.defense - 3);
                return "…なんでこんなとこにあるんだよ<br>ミートと守備力が3下がった…。";
            }}
        ]
    },
    { id: "fitness_test_2", title: "体力測定 (2年)", type: "date", year: 2, month: 6, week: 3, executed: false, scenes: [{ character: "監督", image: "img/kantoku.png", text: "よし、2回目の体力測定だ！去年より成長した姿を見せてみろ！" }, { text: "【シャトルラン勝負！】<br>目標は20回だ！", miniGame: "shuttleRun", action: s => { const t = 20; return s >= t ? (state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 3), `記録は <span style="color:#ecc94b;">${s}</span> 回！目標達成！<br>走力が 3 アップした！`) : (state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 1), `記録は <span style="color:#ecc94b;">${s}</span> 回…。目標未達…<br>悔しさをバネに走力が 1 アップした。`) } }] },
    { id: "summer_tournament_2", title: "夏の地方大会 (2年)", type: "date", year: 2, month: 7, week: 1, executed: false, scenes: [{ action: () => { setTournamentState('summer_2', 1); return "2年目の夏！今年こそ甲子園に行くぞ！" } }] },
    { id: "test_2_1", title: "期末テスト", type: "date", year: 2, month: 7, week: 3, executed: false, scenes: [testEventScene] },
    // --- 2年目8月2週: 謎の男（アイスティー派生） ---
    {
        id: "summer_park_icedtea", title: "真夏の公園", type: "date", year: 2, month: 8, week: 2, executed: false,
        condition: () => state.player.girlfriendFlag.gotIcedTea === true, // アイスティーフラグが立っている時のみ
        scenes: [
            { text: "（暑い…。練習の帰りに公園のベンチで休んでいると、見知らぬ男が声をかけてきた）" },
            { character: "謎の男", text: "いい体してるねぇ。喉、乾かない？飲み物、奢ろうか？" },
            { 
                text: "どうする？", 
                choices: ["「はい」", "逃げる"], 
                action: (choice) => {
                    if (choice === "逃げる") {
                        playSfx('negative');
                        state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 2);
                        state.player.health = Math.max(1, state.player.health - 20);
                        return { log: "（なんかヤバい気がする…！）<br>俺は全力で逃げ出した。<br>走力が2上がったが、体力が20減った。", endsEvent: true };
                    }
                    return null; // 「はい」の場合は次のシーンへ
                }
            },
            { character: "謎の男", text: "そうかそうか。じゃあ…アイスティーでも、いいかな？" },
            { character: "主人公", image: "img/p_surprised.png", text: "（…！？ このシチュエーション、どこかで…）" },
            { 
                text: "どうする！？", 
                choices: ["「はい」", "逃げる"], 
                action: (choice) => {
                    playSfx('negative');
                    state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 5);
                    state.player.health = Math.max(1, state.player.health - 20);
                    return "（やっぱりヤバい！！）<br>俺は本能に従って、死に物狂いでダッシュして逃げた！<br>火事場の馬鹿力で走力が <span style='color:#ecc94b;'>5</span> 上がったが、精神的に疲弊して体力が20減った…。";
                }
            }
        ]
    },
    {
        id: "mystery_drink_1", title: "謎の飲み物①", type: "date", year: 2, month: 8, week: 3, executed: false,
        scenes: [
            { text: "親「疲労回復にいいぞ」<br>親が謎の飲み物を渡してきた。" },
            { text: "どうする？", choices: ["飲む", "飲まない"], action: c => "飲まない" === c ? { log: "得体の知れないものは飲めない…", endsEvent: true } : null },
            { miniGame: "roulette", options: ["当たり", "はずれ", "はずれ"], action: r => {
                if ("当たり" === r) {
                    playSfx('point');
                    Object.keys(state.player).forEach(k => { if (typeof state.player[k] === 'number' && ["power", "meet", "speed", "shoulder", "defense", "intelligence"].includes(k)) { state.player[k] = Math.min(state.maxStats.playerStats, state.player[k] + 2); } });
                    state.player.health = state.player.maxHealth;
                    return "当たり！体がみなぎる！<br>全能力+2、体力全回復！";
                } else {
                    playSfx('negative');
                    Object.keys(state.player).forEach(k => { if (typeof state.player[k] === 'number' && ["power", "meet", "speed", "shoulder", "defense", "intelligence"].includes(k)) { state.player[k] = Math.max(1, state.player[k] - 2); } });
                    state.player.health = 1;
                    return "はずれ…体がだるい…<br>全能力-2、体力が1になった。";
                }
            }}
        ]
    },
    { // ★★★ 新規イベント ★★★
        id: "reading_autumn_2", title: "読書の秋", type: "date", year: 2, month: 9, week: 3, executed: false,
        scenes: [
            { character: "田中", image: "img/tanaka_normal.png", text: "夏も終わって、少し落ち着いたな。秋の夜長ってやつは、どうも退屈だぜ。" },
            { character: "主人公", image: "img/p_normal.png", text: "じゃあ、この前買った野球雑誌でも一緒に読まないか？次の大会に向けて、他校のデータでも研究しようぜ。" },
            { character: "田中", image: "img/tanaka_smile.png", text: "お、いいなそれ！オレ、そういうの結構好きなんだよな。" },
            { text: "（二人で雑誌を読みふけり、野球談義に花を咲かせた…）" },
            { 
                action: () => {
                    playSfx('point');
                    state.player.intelligence = Math.min(state.maxStats.playerStats, state.player.intelligence + 3);
                    state.player.meet = Math.min(state.maxStats.playerStats, state.player.meet + 1);
                    return "野球の知識が深まった！\n学力が3、ミートが1上がった。";
                }
            }
        ]
    },
    {
        id: "sports_day_2_girlfriend",
        title: "体育祭 (2年)",
        type: "date",
        year: 2,
        month: 10,
        week: 1,
        executed: false,
        condition: () => state.player.isGirlfriend,
        scenes: [
            { text: "体育祭の昼休み、彼女がお弁当を作ってきてくれた！" },
            { 
                character: "DYNAMIC_GF_NAME", image: "DYNAMIC_GF_SMILE", 
                text: "主人公くん、お疲れ様！午後の競技も頑張ってね！" 
            },
            {
                action: () => {
                    playSfx('point');
                    state.player.health = Math.min(state.player.maxHealth, state.player.health + 40);
                    state.player.power = Math.min(state.maxStats.playerStats, state.player.power + 3);
                    state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 3);
                    return "おいしいお弁当で体力回復！<br>パワーと走力が3上がった！";
                }
            }
        ]
    },
    {
        id: "sports_day_2_chance",
        title: "体育祭での急接近",
        type: "date",
        year: 2,
        month: 10,
        week: 1,
        executed: false,
        condition: () => state.player.hasPhoneNumber && !state.player.isGirlfriend,
        scenes: [
            { text: "体育祭の種目決めで、二人三脚に出場することになった。" },
            { text: "（クジ引きの結果、ペアになったのはなんと…）" },
            { 
                character: "DYNAMIC_GF_NAME", image: "DYNAMIC_GF_SMILE", 
                text: "わ、主人公くんとだ！よろしくね！" 
            },
            { character: "主人公", image: "img/p_shy.png", text: "お、おう…！こちらこそ！" },
            { text: "（二人で息を合わせて練習するうちに、自然と会話も弾んだ）" },
            { character: "田中", image: "img/tanaka_normal.png", text: "俺はどの女子とペアかな～" },
            { character: "鈴木くん", image: "suzuki_confident.png", text: "よっ、田中、俺と青春しようぜ" },
            { character: "田中", image: "img/tanaka_normal.png", text: "…" },
            {
                text: "本番、俺と彼女は息の合った走りを見せ、見事1位でゴールした！",
                action: () => {
                    playSfx('point');
                    state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 8);
                    state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 2);
                    return "彼女との距離がぐっと縮まった！\n彼女評価が <span style=\"color: #ecc94b;\">8</span>、走力が <span style=\"color: #ecc94b;\">2</span> アップした！";
                }
            }
        ]
    },
    { id: "autumn_tournament_2", title: "秋の地方大会 (2年)", type: "date", year: 2, month: 10, week: 3, executed: false, scenes: [{ action: () => { setTournamentState('autumn_2', 1); return "2年目の秋の大会だ！来年につながる試合をするぞ！" } }] },
    {
        id: "mystery_drink_2", title: "謎の飲み物②", type: "date", year: 2, month: 11, week: 1, executed: false,
        condition: () => state.player.girlfriendFlag.mysteriousMan === false, // 1回目を飲んだ場合のみ
        scenes: [
            { text: "親「この前のアレ、また手に入ったぞ」" },
            { text: "どうする？", choices: ["飲む", "飲まない"], action: c => "飲まない" === c ? { log: "もうこりごりだ…", endsEvent: true } : { onComplete: () => { state.player.girlfriendFlag.mysteriousMan = true; } , log: null } },
            { miniGame: "roulette", options: ["当たり", "はずれ", "当たり", "はずれ"], action: r => {
                if ("当たり" === r) {
                    playSfx('point');
                    Object.keys(state.player).forEach(k => { if (typeof state.player[k] === 'number' && ["power", "meet", "speed", "shoulder", "defense", "intelligence"].includes(k)) { state.player[k] = Math.min(state.maxStats.playerStats, state.player[k] + 3); } });
                    state.player.health = state.player.maxHealth;
                    return "当たり！体が覚醒する！<br>全能力+3、体力全回復！";
                } else {
                    playSfx('negative');
                    Object.keys(state.player).forEach(k => { if (typeof state.player[k] === 'number' && ["power", "meet", "speed", "shoulder", "defense", "intelligence"].includes(k)) { state.player[k] = Math.max(1, state.player[k] - 3); } });
                    state.player.health = 1;
                    return "はずれ…頭がクラクラする…<br>全能力-3、体力が1になった。";
                }
            }}
        ]
    },
{
        id: "ob_visit_2", title: "伝説のOB", type: "date", year: 2, month: 11, week: 4, executed: false,
        scenes: [
            { character: "田中", image: "img/tanaka_surprised.png", text: "おい主人公！見ろよ、あの人…この高校からプロ入りした伝説のOB、豪田先輩だぞ！" },
            { character: "主人公", image: "img/p_surprised.png", text: "えっ、本当に！？なんで学校に…？" },
            { text: "豪田先輩「よう、後輩たち。近くまで来たから顔を出してみたんだが、いい練習してるな。」" },
            { character: "主人公", image: "img/p_normal.png", text: "（すごい…体がめちゃくちゃ大きい…。プロの選手に直接アドバイスをもらえるチャンスだ！）" },
            { 
                text: "何について教わろうか？",
                choices: ["打撃の極意", "守備・走塁の極意", "プロの心構え"],
                action: (choice) => {
                    playSfx('point');
                    if (choice === "打撃の極意") {
                        state.player.power = Math.min(state.maxStats.playerStats, state.player.power + 3);
                        state.player.meet = Math.min(state.maxStats.playerStats, state.player.meet + 3);
                        return "「バッティングは腰の回転と、インパクトの瞬間の押し込みだ！」\n熱心な指導を受け、パワーとミートが <span style=\"color:#ecc94b;\">3</span> 上がった！";
                    } else if (choice === "守備・走塁の極意") {
                        state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 3);
                        state.player.defense = Math.min(state.maxStats.playerStats, state.player.defense + 3);
                        state.player.shoulder = Math.min(state.maxStats.playerStats, state.player.shoulder + 3);
                        return "「一歩目の出し方と、捕球の姿勢で世界が変わるぞ。」\n実演を交えた指導を受け、走力・肩力・守備力が <span style=\"color:#ecc94b;\">3</span> 上がった！";
                    } else {
                        state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 5);
                        state.player.condition = "絶好調";
                        state.player.intelligence = Math.min(state.maxStats.playerStats, state.player.intelligence + 3);
                        return "「一番大事なのは、誰よりも野球を楽しむこと。そして準備を怠らないことさ。」\n深い言葉に感銘を受けた。\n監督評価が5、学力が3上がり、やる気が絶好調になった！";
                    }
                }
            }
        ]
    },
    { id: "test_2_2", title: "期末テスト", type: "date", year: 2, month: 12, week: 2, executed: false, scenes: [testEventScene] },
    {
        id: "christmas_2", title: "クリスマス (2年)", type: "date", year: 2, month: 12, week: 4, executed: false,
        scenes: [
            { 
                condition: () => !state.player.isGirlfriend,
                action: () => {
                    playSfx('negative');
                    state.player.condition = "不調";
                    state.player.health = Math.max(1, state.player.health - 10);
                    return "クリスマス…今年も一人か…<br>寂しさで調子が悪くなり、体力が10下がった。";
                }
            },
            { 
                condition: () => state.player.isGirlfriend,
                text: "2回目のクリスマス。今年は彼女の家で過ごすことになった。" 
            },
            { 
                condition: () => state.player.isGirlfriend,
                character: "DYNAMIC_GF_NAME", image: "DYNAMIC_GF_SMILE", 
                text: "メリークリスマス！プレゼント、気に入ってくれるといいな…。" 
            },
            { 
                condition: () => state.player.isGirlfriend,
                character: "主人公", image: "img/p_smile.png", 
                text: "ありがとう！はい、俺からもこれどうぞ…でも、君といられるだけで、最高のプレゼントだよ。" 
            },
            {
                condition: () => state.player.isGirlfriend,
                action: () => {
                    playSfx('point');
                    state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 10);
                    return "彼女とクリスマスを過ごした。<br>評価が10上がった！";
                }
            }
        ]
    },

    // --- 3年目 ---
    { // ★★★ 新規イベント ★★★
        id: "new_year_3", title: "最後の初詣", type: "date", year: 3, month: 1, week: 1, executed: false,
        scenes: [
            { character: "田中", image: "img/tanaka_smile.png", text: "あけましておめでとう！主人公、最後の初詣だ。行こうぜ！" },
            { character: "主人公", image: "img/p_smile.png", text: "ああ。今年こそ、絶対に甲子園に行くって誓わないとな。" },
            { text: "（神社で、最後の夏の勝利を固く祈願した）" },
            { character: "田中", image: "img/tanaka_normal.png", text: "最後のおみくじだ…！頼むぞ…！" },
            { text: "（二人でおみくじを引く…ガラガラガラ……）" },
            {
                action: () => {
                    const rand = Math.random();
                    if (rand < 0.4) { // 40%で大吉
                        playSfx('point');
                        Object.keys(state.player).forEach(k => {
                            if (typeof state.player[k] === 'number' && ["power", "meet", "speed", "shoulder", "defense"].includes(k)) {
                                state.player[k] = Math.min(state.maxStats.playerStats, state.player[k] + 2);
                            }
                        });
                        return "結果は大吉！神様も俺たちを応援してくれてる！\n野球能力がALL+2！";
                    } else if (rand < 0.9) { // 50%で吉
                        playSfx('point');
                        state.player.health = state.player.maxHealth;
                        return "結果は吉。幸先の良いスタートだ。\n体力が全回復した！";
                    } else { // 10%で凶
                        playSfx('negative');
                        state.player.condition = "不調";
                        return "結果は凶だった…。だが、こんなことで俺たちの決意は揺るがない！\n少しやる気が下がった。";
                    }
                }
            }
        ]
    },
    { // ★★★ 新規イベント ★★★
        id: "kantoku_meeting_3", title: "監督との面談", type: "date", year: 3, month: 1, week: 4, executed: false,
        scenes: [
            { character: "監督", image: "img/kantoku.png", text: "主人公、ちょっといいか。" },
            { character: "主人公", image: "img/p_normal.png", text: "はい、監督。" },
            { character: "監督", image: "img/kantoku.png", text: "お前も入学してから随分と成長したな。…だが、まだ足りん。最後の夏、お前がチームを甲子園に導くんだ。期待しているぞ。" },
            { character: "主人公", image: "img/p_smile.png", text: "はい！必ず期待に応えてみせます！" },
            { 
                text: "（監督の言葉に、身が引き締まる思いだった。）",
                action: () => {
                    playSfx('point');
                    state.player.condition = "絶好調";
                    state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 5);
                    return "やる気が絶好調になり、監督の評価が5上がった！";
                }
            }
        ]
    },
    {
        id: "valentine_3", title: "バレンタイン", type: "date", year: 3, month: 2, week: 2, executed: false,
        scenes: [
            { 
                condition: () => !state.player.isGirlfriend,
                action: () => {
                    playSfx('negative');
                    state.player.condition = "不調";
                    state.player.health = Math.max(1, state.player.health-10);
                    return "バレンタイン…もう慣れたよ…<br>調子が悪くなり、体力が10下がった。";
                }
            },
            { 
                condition: () => state.player.isGirlfriend,
                text: "部活の帰り道、彼女が少し照れくさそうに待っていた。" 
            },
            { 
                condition: () => state.player.isGirlfriend,
                character: "DYNAMIC_GF_NAME", image: "DYNAMIC_GF_SMILE", 
                text: "はい、これ。最後の大会、頑張ってねっていう気持ち、たくさん込めたから！" 
            },
            { 
                condition: () => state.player.isGirlfriend,
                character: "主人公", image: "img/p_smile.png", 
                text: "ありがとう。君の応援があるから頑張れるよ。" 
            },
            {
                condition: () => state.player.isGirlfriend,
                action: () => {
                    playSfx('point');
                    state.player.health = Math.min(state.player.maxHealth, state.player.health + 20);
                    state.player.condition = "絶好調";
                
                    state.player.power = Math.min(state.maxStats.playerStats, state.player.power + 3);
                    state.player.meet = Math.min(state.maxStats.playerStats, state.player.meet + 3);
                    state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 3);
                    state.player.shoulder = Math.min(state.maxStats.playerStats, state.player.shoulder + 3);
                    state.player.defense = Math.min(state.maxStats.playerStats, state.player.defense + 3);
              
                    return "彼女からチョコをもらった！<br>体力とやる気が回復した！<br>さらに、野球の基本能力が ALL+3 された！";
                }
            }
        ]
    },
    { id: "spring_tournament_3", title: "春の地方大会", type: "date", year: 3, month: 3, week: 1, executed: false, scenes: [{ action: () => { setTournamentState('spring_3', 1); return "最後の春の大会！夏に向けて弾みをつけるぞ！" } }] },
    { // ★★★ 新規イベント ★★★
        id: "last_rookies_3", title: "最後の後輩", type: "date", year: 3, month: 4, week: 2, executed: false,
        scenes: [
            { text: "（グラウンドに、今年の新入部員の姿がある。俺たちにとって、最後の後輩たちだ）" },
            { character: "新入部員", text: "あの…主人公先輩！いつも試合見てます！憧れてこの高校に来ました！よろしくお願いします！" },
            { character: "主人公", image: "img/p_smile.png", text: "（俺に憧れて…か。なんだか照れるな）ああ、よろしくな！期待してるぞ！" },
            { 
                text: "（後輩たちのまっすぐな眼差しに、最高学年としての責任と誇りが湧いてきた。）",
                action: () => {
                    playSfx('point');
                    Object.keys(state.player).forEach(k => {
                        if (typeof state.player[k] === 'number' && ["power", "meet", "speed", "shoulder", "defense"].includes(k)) {
                            state.player[k] = Math.min(state.maxStats.playerStats, state.player[k] + 1);
                        }
                    });
                    return "最上級生としての自覚が芽生え、野球能力がALL+1！";
                }
            }
        ]
    },
    {
        id: "mid_term_test_3", title: "中間テスト (3年)", type: "date", year: 3, month: 5, week: 3, executed: false,
        scenes: [{ text: "最後のテストだ！" }, { miniGame: "generalQuiz", action: c => c > 0 ? (state.player.intelligence = Math.min(state.maxStats.playerStats, state.player.intelligence + 1), "正解！ 学力が 1 アップした！") : (state.team.coachEval--, "不正解… 監督の評価が 1 ダウンした…") }]
    },
    { // ★★★ 新規イベント ★★★
        id: "final_summer_promise_3", title: "最後の夏を前に", type: "date", year: 3, month: 6, week: 2, executed: false,
        scenes: [
            { text: "（練習後、田中と二人きりで夕日に染まるグラウンドを眺める…）" },
            { character: "田中", image: "img/tanaka_normal.png", text: "…いよいよだな、主人公。俺たちの、最後の夏だ。" },
            { character: "主人公", image: "img/p_normal.png", text: "ああ。あっという間だったな。" },
            { character: "田中", image: "img/tanaka_smile.png", text: "色々あったけどさ、お前がいたからここまで来れたよ。絶対、甲子園行こうな。" },
            { character: "主人公", image: "img/p_smile.png", text: "当たり前だろ。最高の夏にしようぜ。" },
            { 
                text: "（俺たちは固く握手を交わした。）",
                action: () => {
                    playSfx('point');
                    state.player.health = state.player.maxHealth;
                    state.player.condition = "絶好調";
                    return "最後の大会に向けて、決意を新たにした。\n体力とやる気が最大になった！";
                }
            }
        ]
    },
    { id: "summer_tournament_3", title: "最後の夏の地方大会", type: "date", year: 3, month: 7, week: 1, executed: false, scenes: [{ action: () => { setTournamentState('summer_3', 1); return "最後の夏が始まる…絶対に甲子園に行くぞ！" } }] },
    
    // --- 彼女・コマンド・ランダム・特殊イベント ---
    {
        id: "manager_1",
        title: "マネージャーとの出会い",
        type: "command", command: "気分転換", chance: 0.5, executed: false,
        condition: () => state.gameState.year === 2 && state.gameState.month === 1 && !state.player.hasPhoneNumber,
        scenes: [
            { text: "（練習も終わり、気分転換にぶらぶら歩いて帰っていると、前から見慣れた顔が…）" },
            { character: "星川さん", image: "img/hoshikawa_normal.png", text: "あ、主人公くん。練習お疲れ様。今帰り？" },
            { character: "主人公", image: "img/p_shy.png", text: "星川さんこそ。うん、まあね。奇遇だな。（マネージャーか、何してんだろ…）" },
            { character: "星川さん", image: "img/hoshikawa_normal.png", text: "私、これから駅前の本屋さんに寄って行こうと思って。次の対戦相手のデータ分析に役立つ本がないかなって。" },
            { character: "主人公", image: "img/p_surprised.png", text: "（マネージャーの仕事って、そんなことまで…？すごいな…）" },
            { 
                text: "これはチャンスかもしれない…！", choices: ["「俺も付き合うよ」", "「そうなんだ、頑張って」"],
                action: (choice) => {
                    if (choice === "「そうなんだ、頑張って」") { return { log: "「うん、ありがとう！」\n星川さんは笑顔で手を振って、本屋の方へ向かっていった。\n…一緒に行けばよかったかな。", endsEvent: true }; }
                    state.player.girlfriendFlag.manager = 1;
                    return null;
                }
            },
            { character: "星川さん", image: "img/hoshikawa_smile.png", text: "本当？ありがとう！主人公くんも何か探してる本があるの？" },
            { character: "主人公", image: "img/p_shy.png", text: "（やばい、とっさに言っちゃったけど何も考えてなかった…！どうする！？）" },
            {
                text: "ここは真面目なところを見せるべきか…？", choices: ["「バッティング理論の本を探してる」", "「新作の漫画でも見ようかなって…」"],
                action: (choice) => {
                    ui.showCharacter("img/hoshikawa_smile.png");
                    if (choice === "「バッティング理論の本を探してる」") {
                        state.player.girlfriendFlag.manager = 2;
                        state.player.intelligence = Math.min(state.maxStats.playerStats, state.player.intelligence + 1);
                        return "「へぇ、熱心だね！私も手伝うよ！」\n彼女と一緒に本を選んだおかげで、少しだけ野球の知識が深まった気がする。";
                    } else { return "「ふふ、そうなんだ。じゃあ、まずは野球雑誌のコーナーに行ってもいいかな？」\n彼女は優しく笑ってくれた。"; }
                }
            }
        ]
    },
    {
        id: "manager_2",
        title: "マネージャーの差し入れ",
        type: "date", year: 2, month: 2, week: 3, executed: false,
        condition: () => state.player.girlfriendFlag.manager === 2,
        scenes: [
            { text: "（自主練習をしていると、グラウンドの隅に星川さんの姿が見えた）" },
            { character: "主人公", image: "img/p_normal.png", text: "星川さん、どうしたの？もう部活は終わったはずだけど。" },
            { character: "星川さん", image: "img/hoshikawa_smile.png", text: "うん。主人公くんが頑張ってるから、つい見に来ちゃった。…そうだ、これ、良かったら飲んで。差し入れ！" },
            { character: "主人公", image: "img/p_surprised.png", text: "え、いいの？ありがとう！" },
            { text: "（彼女が差し出してくれたのは、特製のスポーツドリンクだった）" },
            { character: "星川さん", image: "img/hoshikawa_smile.png", text: "この前の本、ちゃんと読んでる？主人公くんが熱心だから、私も応援したくなっちゃうんだ。" },
            { character: "主人公", image: "img/p_shy.png", text: "（俺のこと、見ててくれたんだ…）" },
            {
                text: "（星川さんの応援に応えたい…！）",
                action: () => {
                    state.player.health = Math.min(state.player.maxHealth, state.player.health + 20);
                    state.player.condition = "絶好調";
                    state.player.girlfriendEval = Math.min(state.maxStats.teamStats, state.player.girlfriendEval + 5);
                    state.player.girlfriendFlag.manager = 3;
                    return "特製ドリンクで体力が回復し、やる気も絶好調になった！\n星川さんからの評価も上がった！";
                }
            }
        ]
    },
    {
        id: "manager_3",
        title: "マネージャーと本屋へ",
        type: "date", year: 2, month: 3, week: 4, executed: false,
        condition: () => state.player.girlfriendFlag.manager === 3,
        scenes: [
            { text: "（部活の帰り道、星川さんが俺を待っていてくれた）" },
            { character: "星川さん", image: "img/hoshikawa_smile.png", text: "主人公くん、お疲れ様。この前のドリンク、口に合ったかな？" },
            { character: "主人公", image: "img/p_smile.png", text: "うん、すごく美味しかったよ。おかげで練習もはかどったし。ありがとう。" },
            { character: "星川さん", image: "img/hoshikawa_smile.png", text: "ふふ、良かった。ねえ、今日も新しい野球雑誌が出てるはずだから、また本屋さん、付き合ってくれないかな？" },
            { text: "（彼女と野球の話をするのは楽しい。断る理由なんてなかった）" },
            { text: "（本屋で雑誌を読みながら、俺たちは夢中になって野球の戦術について語り合った）" },
            { character: "星川さん", image: "img/hoshikawa_smile.png", text: "…ごめんね、つい熱くなっちゃった。主人公くんと話してると、時間忘れちゃうな。" },
            { character: "主人公", image: "img/p_shy.png", text: "俺もだよ。すごく楽しい。…あのさ、" },
            {
                text: "（もっと話したい…。ここで誘うべきか？）", choices: ["「良かったら、この後ご飯でも行かない？」", "「それじゃ、また明日」"],
                action: (choice) => {
                    if (choice === "「それじゃ、また明日」") {
                        state.player.girlfriendRoute = "none";
                        return { log: "結局、勇気が出ずに俺はそう言ってしまった。\n「うん、また明日ね」彼女は少し寂しそうに笑った気がした。", endsEvent: true };
                    }
                    return null;
                }
            },
            { character: "星川さん", image: "img/hoshikawa_blush.png", text: "えっ…でも、ごめん、このあと家の用事があってさ…。" },
            { character: "主人公", image: "img/p_sad.png", text: "そっか、急に誘ってごめんな。（…だめか）" },
            { character: "星川さん", image: "img/hoshikawa_smile.png", text: "ううん！ほんとにタイミングが悪かったから…その、良かったら連絡先、交換しない？" },
            {
                text: "（最高の展開だ！俺は頷き、星川さんと連絡先を交換した）",
                action: () => {
                    state.player.hasPhoneNumber = true;
                    state.player.girlfriendRoute = "manager";
                    state.player.girlfriendEval = 15;
                    return "星川さんとの関係が大きく前進した！\n彼女の評価が15上がった！";
                }
            }
        ]
    },
/* --- events.js の ask_for_a_date_1 イベント --- */

    {
        id: "ask_for_a_date_1", title: "デートに誘う", type: "command", command: "電話する", chance: 1.0, executed: false,
        // ▼▼▼ 修正: 最後に && !state.gameState.dateInviteAttemptedThisTurn を追加 ▼▼▼
        condition: () => state.player.hasPhoneNumber && state.player.phoneCallCount >= 3 && !state.player.girlfriendFlag.isDateScheduled && !state.player.isGirlfriend && !state.gameState.phoneConfessionAttemptedThisTurn && !state.gameState.dateInviteAttemptedThisTurn,
        scenes: [
            { character: "主人公", image: "img/p_normal.png", text: "（…そろそろデートに誘ってみようかな…）" },
            { character: "DYNAMIC_GF_NAME", image: "DYNAMIC_GF_SMILE", text: "もしもし、主人公くん？" },
            {
                text: "どうする？", choices: ["デートに誘う", "やっぱりやめる"],
                action: async (choice) => {
                    // ▼▼▼ 追加: 「このターンはもう試行した」というフラグを立ててループ防止 ▼▼▼
                    state.gameState.dateInviteAttemptedThisTurn = true;
                    // ▲▲▲ 追加ここまで ▲▲▲

                    if (choice === "デートに誘う") {
                        // (デート予約処理... 省略)
                        let targetTurn = state.gameState.currentTurn + 1;
                        while (true) {
                            const { year, month, week } = calculateDateForTurn(targetTurn);
                            const eventExists = allEvents.some(e => e.type === 'date' && !e.executed && e.year === year && e.month === month && e.week === week);
                            if (!eventExists) break;
                            targetTurn++;
                        }
                        state.player.girlfriendFlag.isDateScheduled = true;
                        state.player.girlfriendFlag.scheduledDateTurn = targetTurn;
                        const { year, month, week } = calculateDateForTurn(targetTurn);
                        return { log: `「うん、いいよ！楽しみにしてるね！」\nデートの約束を取り付けた！(${year}年${month}月${week}週)`, endsEvent: true };

                    } else { 
                        // ▼▼▼ ここで「未実行」に戻すが、上のフラグのおかげでこのターンは再発生しない ▼▼▼
                        const thisEvent = allEvents.find(e => e.id === "ask_for_a_date_1");
                        if(thisEvent) thisEvent.executed = false;

                        return { log: "（…やっぱりまだ早いか）\n今回は世間話だけにしておいた。", endsEvent: true }; 
                    }
                }
            }
        ]
    },
    { id: "random_test", title: "抜き打ちテスト", type: "random", chance: .05, scenes: [{ character: "先生", text: "席に着けー！今から抜き打ちテストを始めるぞー！" }, { text: "【抜き打ちテスト】<br>正しい答えを選べ！", miniGame: "generalQuiz", action: c => c > 0 ? (playSfx('point'), state.player.intelligence = Math.min(state.maxStats.playerStats, state.player.intelligence + 2), state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 2), "正解！学力と監督評価が 2 アップした！") : (playSfx('negative'), "不正解…評価が下がってしまった…。") }] },
    { id: "ground_duty", title: "グラウンド整備", type: "random", chance: .05, scenes: [{ character: "監督", image: "img/kantoku.png", text: "おい、主人公！そこのグラウンド整備を手伝え！" }, { text: "どうする？", choices: ["真面目にやる", "サボる"], action: c => "真面目にやる" === c ? (playSfx('point'), state.team.coachEval = Math.min(state.maxStats.teamStats, state.team.coachEval + 2), "監督の評価が 2 上がった！") : (playSfx('point'), state.player.health = Math.min(state.player.maxHealth, state.player.health + 5), "サボって体力が 5 回復した。") }] },
    { id: "ufo", title: "UFO目撃？", type: "random", chance: .01, scenes: [{ character: "主人公", image: "img/p_surprised.png", text: "（ん？夜のグラウンドに妙な光が…まさか…！）" }, { text: "追いかけるか？", choices: ["追いかける", "気のせいだ"], action: c => "追いかける" === c ? (playSfx('point'), state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 10), state.player.health -= 20, `光を追いかけて全力疾走！走力が <span style="color:#ecc94b;">10</span> アップしたが、体力が <span style="color:red;">20</span> ダウンした…`) : "見間違いだろう…" }] },
    { id: "cat", title: "猫の恩返し？", type: "random", chance: .03, scenes: [{ character: "主人公", image: "img/p_normal.png", text: "（道端で猫が弱ってる…。かわいそうに。よし、助けてやるか。）" }, { action: () => (playSfx('point'), state.player.power = Math.min(state.maxStats.playerStats, state.player.power + 1), state.player.meet = Math.min(state.maxStats.playerStats, state.player.meet + 1), state.player.speed = Math.min(state.maxStats.playerStats, state.player.speed + 1), state.player.shoulder = Math.min(state.maxStats.playerStats, state.player.shoulder + 1), state.player.defense = Math.min(state.maxStats.playerStats, state.player.defense + 1), "数日後、なぜか絶好調に！猫のおかげ…？<br>野球の基本能力がすべて 1 ずつ上がった！") }] },
/* events.js の allEvents 配列内に追加 */

    // --- 特殊能力取得イベント ---
    {
        id: "god_dream", title: "夢のお告げ", type: "random", chance: 0.01, // 1%の確率
        condition: () => !state.player.specialAbilities["神の啓示"],
        scenes: [
            { text: "（…ふわぁ、なんだか不思議な夢を見たぞ）" },
            { character: "神様", text: "「野球を愛する若者よ…汝に力を授けよう…」" },
            { character: "主人公", image: "img/p_surprised.png", text: "（枕元にボールが置いてある…これは夢じゃないのか！？）" },
            { 
                action: () => {
                    playSfx('point');
                    state.player.specialAbilities["神の啓示"] = true;
                    return "特殊能力「神の啓示」を習得した！<br>毎月不思議な力が湧いてくる気がする…";
                }
            }
        ]
    },
    {
        id: "kantoku_secret_training", title: "監督の特別指導", type: "command", command: "チーム練習", chance: 0.2, // 条件を満たせば20%で発生
        condition: () => state.team.coachEval >= 70 && !state.player.specialAbilities["監督の秘蔵っ子"],
        scenes: [
            { character: "監督", image: "img/kantoku.png", text: "おい、主人公。少し残れ。" },
            { character: "主人公", image: "img/p_surprised.png", text: "（えっ、何か怒られるようなことしたっけ…？）" },
            { character: "監督", image: "img/kantoku.png", text: "お前の最近の頑張りは目を見張るものがある。…どうだ、俺とお前で専用のメニューを組んでみないか？" },
            { character: "主人公", image: "img/p_smile.png", text: "はい！ぜひお願いします！" },
            { 
                action: () => {
                    playSfx('point');
                    state.player.specialAbilities["監督の秘蔵っ子"] = true;
                    return "特殊能力「監督の秘蔵っ子」を習得した！<br>これから毎月、監督が付きっきりで指導してくれるようだ！";
                }
            }
        ]
    },
    
    // --- エンディング関連イベント ---
    {
        id: "summer_defeat_3",
        title: "夏の終わり（地方大会敗退）",
        type: "special", executed: false,
        scenes: [
            { text: "…試合終了のサイレンが、やけに遠くに聞こえる。" },
            { text: "俺たちの最後の夏は、甲子園の土を踏むことなく、ここで終わった。" },
            { character: "田中", image: "img/tanaka_sad.png", text: "…終わっちまったな。悔しいな、主人公…。" },
            { character: "主人公", image: "img/p_sad.png", text: "ああ…。でも、お前とここまで来れてよかった。" },
            { character: "監督", image: "img/kantoku.png", text: "…胸を張って帰るぞ。お前たちは、最後までよく戦った。" },
            {
                action: () => {
                    playSfx('negative');
                    state.gameState.isGameOver = true;
                    return "悔し涙が止まらなかった。でも、この3年間は、決して無駄じゃなかったはずだ。";
                }
            }
        ]
    },
    {
        id: "koshien_defeat",
        title: "夏の終わり（甲子園敗退）",
        type: "special", executed: false,
        scenes: [
            { text: "あと一歩、届かなかった…。日本一の夢は、ここで潰えた。" },
            { text: "スタンドからの暖かい拍手が、俺たちを包み込む。" },
            { character: "田中", image: "img/tanaka_sad.png", text: "負けちまったけど…最高の夏だったな。ここまで連れてきてくれて、ありがとうな、主人公。" },
            { character: "主人公", image: "img/p_smile.png", text: "違うさ、みんなで来たんだ。…ああ、最高の夏だった。" },
            { character: "監督", image: "img/kantoku.png", text: "立派だったぞ。お前たちは、俺の誇りだ。" },
            {
                action: () => {
                    playSfx('point');
                    state.gameState.isGameOver = true;
                    return "甲子園の土を、ポケットに詰めた。この思い出と悔しさを胸に、俺は次のステージへ進む。";
                }
            }
        ]
    },
    {
        id: "koshien_victory",
        title: "甲子園優勝",
        type: "special", executed: false,
        scenes: [
            { text: "最後のバッターを打ち取った…！<br>サイレンが鳴り響く！俺たちは…勝ったんだ！" },
            { text: "日本一の高校球児になったんだ！" },
            { character: "田中", image: "img/tanaka_smile.png", text: "やった…やったぞ主人公！俺たち、本当に甲子園で優勝しちまったんだ！" },
            { character: "主人公", image: "img/p_smile.png", text: "ああ…！信じられないよ…！" },
            { text: "（チームメイトたちに駆け寄られ、俺は何度も胴上げされた）" },
            { character: "監督", image: "img/kantoku.png", text: "…よくやった。お前は最高の選手だ。胸を張れ。" },
            {
                action: () => {
                    playSfx('cheer');
                    playSfx('point');
                    Object.keys(state.player).forEach(key => {
                        if (typeof state.player[key] === 'number' && ["power", "meet", "speed", "shoulder", "defense"].includes(key)) {
                            state.player[key] = Math.min(state.maxStats.playerStats, state.player[key] + 10);
                        }
                    });
                    state.gameState.isGameOver = true; 
                    return "深紅の大優勝旗が授与された。<br>この栄光は、一生忘れることはないだろう。<br><br>能力が大幅にアップした！";
                }
            }
        ]
    }
];

export async function runEvent(event) {
    playSfx('event_start');
    if (event.type === "date" || event.type === "command" || event.type === "scheduled" || event.type === "special") {
        event.executed = true;
    }
    state.gameState.isEventRunning = true;
    for (const scene of event.scenes) {
        if (scene.condition && !scene.condition()) continue;

        let imagePath = scene.image;
        let characterName = scene.character;

        // 動的な画像と名前の解決
        if (imagePath === "DYNAMIC_GF_SMILE" || characterName === "DYNAMIC_GF_NAME") {
            switch (state.player.girlfriendRoute) {
                case 'rikujo':
                    imagePath = "img/kazami_smile.png";
                    characterName = "風見さん";
                    break;
                case 'manager':
                    imagePath = "img/hoshikawa_smile.png";
                    characterName = "星川さん";
                    break;
                case 'game_center':
                default:
                    imagePath = "img/sakurai_smile.png";
                    characterName = "桜井さん";
                    break;
            }
        }

        if (imagePath) {
            ui.showCharacter(imagePath);
        } else {
            ui.hideCharacter();
        }

        if (scene.text) {
            const processedText = scene.text.replace(/主人公/g, state.player.name);
            const displayText = characterName ? `${characterName.replace(/主人公/g, state.player.name)}「${processedText}」` : processedText;
            await ui.typeWriter(displayText);
            await ui.waitForUserAction();
        }
        let result;
        if (scene.miniGame === "roulette") result = await runRoulette(scene.options);
        else if (scene.miniGame === "janken") result = await runJanken();
        else if (scene.miniGame === "shuttleRun") result = await runShuttleRun();
        else if (scene.miniGame === "baseballQuiz") result = await runSelectionQuiz('baseball', 3);
        else if (scene.miniGame === "generalQuiz") result = await runSelectionQuiz('general', 1);
        else if (scene.miniGame === "testRoulette") result = await runTestRoulette(state.player.intelligence);
        else if (scene.miniGame === "senkyugan") result = await runSenkyuganChallenge(); 
        else if (scene.choices) result = await ui.waitForChoice(scene.choices);

        let endEvent = false;
        if (scene.action) {
            const actionResult = await scene.action(result);
            if (typeof actionResult === "string") {
                await ui.typeWriter(actionResult.replace(/主人公/g, state.player.name));
                await ui.waitForUserAction();
            } else if (actionResult) {
                if (actionResult.log) {
                    await ui.typeWriter(actionResult.log.replace(/主人公/g, state.player.name));
                    await ui.waitForUserAction();
                }
                if (actionResult.gameOver) {
                    state.gameState.isGameOver = true;
                    await ui.showGameOverScreen(scene.gameOverText || actionResult.gameOverText);
                    return;
                }
                if (actionResult.endsEvent) {
                    endEvent = true;
                }
            }
            ui.updateAllDisplays();
        }
        if (scene.onComplete) scene.onComplete();

        if (scene.gameOver && result === scene.choices[1]) {
            state.gameState.isGameOver = true;
            await ui.showGameOverScreen(scene.gameOverText);
            return;
        }

        if (endEvent) break;
    }

ui.hideCharacter();
    state.gameState.isEventRunning = false;
    
    if (state.gameState.isGameOver) {
        return;
    }

    await processEndOfTurn();
}

export function checkEvent() {
    if (!allEvents) return null;

    // --- デート当日の処理（ここはそのまま） ---
    if (state.player.girlfriendFlag.isDateScheduled && state.gameState.currentTurn === state.player.girlfriendFlag.scheduledDateTurn) {
        if (state.player.girlfriendFlag.confessionReady) {
            return createConfessionEvent(); // 引数なしでOK
        } else {
            return createDateEvent();
        }
    }
    
    // --- ★ここを修正（電話での呼び出し処理） ---
    // 告白条件を満たしている かつ まだデートの約束をしていない状態で電話をした場合
    if (state.gameState.lastCommand === "電話する" && 
        state.player.girlfriendFlag.confessionReady && 
        !state.player.girlfriendFlag.isDateScheduled && // 既にデートの約束があるなら二重に発生させない
        !state.gameState.phoneConfessionAttemptedThisTurn) {
            
        // いきなり告白イベントではなく「呼び出しイベント」を返す
        return createConfessionSetupEvent();
    }

    const currentYear = state.gameState.year;
    const currentMonth = state.gameState.month;
    const currentWeek = state.gameState.week;
    const currentTurn = state.gameState.currentTurn;

    for (const event of allEvents) {
        if (event.type === 'date' && !event.executed) {
            if (event.year === currentYear && event.month === currentMonth && event.week === currentWeek) {
                if (!event.condition || event.condition()) {
                    return event;
                }
            }
        }
    }

    for (const event of allEvents) {
        if (event.type === 'command' && event.command === state.gameState.lastCommand && !event.executed && (!event.condition || event.condition()) && Math.random() < event.chance) {
            return event;
        }
    }
    
    const COOL_DOWN_TURNS = 3;
    const recentEvent = state.randomEventHistory.length > 0 ? state.randomEventHistory[state.randomEventHistory.length - 1] : null;

    if (recentEvent && currentTurn - recentEvent.turn < COOL_DOWN_TURNS) {
        return null;
    }
    
    for (const event of allEvents) {
        if (event.type === 'random' && (!event.condition || event.condition()) && Math.random() < event.chance) {
            state.randomEventHistory.push({ id: event.id, turn: currentTurn });
            return event;
        }
    }

    return null;
}