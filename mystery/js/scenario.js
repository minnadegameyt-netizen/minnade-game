const SCENARIO = [
    // ==============================
    // Day 1: 都市伝説の検証 (Tutorial)
    // ==============================
    {
        id: 'intro', mode: 'novel', type: 'novel',
        text: [
            "──深夜2時50分。",
            "俺は所属する大学の謎解きサークル『Enigma（エニグマ）』のメンバーとチャットをしている。",
            "巷で噂になっている奇妙なサイト『真夜中の鳥籠（とりかご）』の検証を行うために──",
            "「K大のミス研も匙（さじ）を投げたらしいぜ」",
            "噂では「死者と会話できる」とか「莫大なビットコインが隠されている」と言われている。",
            "「どうせ学生か誰かの遊びだろ？まあ、やってみるか」",
            "そんなオカルトじみた噂を、俺たちはゲーム感覚で暴こうとしていた。"
        ],
        next: 'chat_start'
    },
    {
        id: 'chat_start', mode: 'game', type: 'chat',
        messages: [
            { name: 'OccultGirl', text: '先輩、もうすぐ午前3時です。本当に繋がるんでしょうか？' },
            { name: 'NetStalker', text: 'URLは生きている。だが、特定の時間にしかポートが開かない仕様のようだ。' },
            { name: 'LogicMaster', text: '時間だ。2時59分59秒……今だ、接続しろ。' }
        ],
        next: 'load_d1_404'
    },
    
    // --- [Day 1] 問1: 更新連打 ---
    { id: 'load_d1_404', type: 'action', action: 'loadPage', pageId: 'd1_404', next: 'chat_d1_hint' },
    { 
        id: 'chat_d1_hint', type: 'chat', 
        messages: [
            { name: 'System', text: '404 Not Found', type: 'error' },
            { name: 'NetStalker', text: 'なんだ、ただのリンク切れか？' },
            { name: 'LogicMaster', text: 'いや、諦めるな。噂では「扉を叩き続けろ」と言われている。試しに更新ボタンを何回か押してみろ。' }
        ] 
    },
    
    // --- [Day 1] 問2: ディレクトリ探索 ---
    {
        id: 'chat_d1_files', type: 'chat',
        messages: [
            { name: 'System', text: 'Directory Listing Enabled.', type: 'alert' },
            { name: 'OccultGirl', text: '画面が変わりました！ ……これ、ファイルのリストですか？' },
            { name: 'NetStalker', text: 'セキュリティが甘いな。公開ディレクトリ（Index of /pub）が見えている。' },
            { name: 'LogicMaster', text: 'ここに次の階層へのパスワードがあるかもしれない。ファイルを開いてみろ。何かヒントはないか？' }
        ],
        next: 'load_d1_files'
    },
    { id: 'load_d1_files', type: 'action', action: 'loadPage', pageId: 'd1_files' },

    // --- [Day 1] 問3: スクリプト変数改変 ---
    {
        id: 'chat_d1_script', type: 'chat',
        messages: [
            { name: 'NetStalker', text: 'パスコードは通ったが……今度は「年齢確認」か？' },
            { name: 'System', text: 'Access Denied: Underage.', type: 'error' },
            { name: 'OccultGirl', text: '「18歳未満は立ち入り禁止」……そういうサイトなんですかね…？' },
            { name: 'LogicMaster', text: '馬鹿、だったらただのエロサイトで噂にならないだろ？画面上のコードを見ろ。変数「age」が「18」未満なら拒否する設定になっている。' },
            { name: 'LogicMaster', text: '変数を書き換えろ。「age = 20」のように入力して、システムを騙すんだ。' }
        ],
        next: 'load_d1_script'
    },
    { id: 'load_d1_script', type: 'action', action: 'loadPage', pageId: 'd1_script' },

    // --- [Day 1] 問4: 文字化け解読 ---
    { 
        id: 'chat_d1_ghost', type: 'chat', 
        messages: [
            { name: 'OccultGirl', text: 'ひっ！？ 画面が……赤くなりました！', type: 'alert' },
            { name: 'NetStalker', text: '認証突破直後にこれか。ノイズの中に文字が隠れている。' },
            { name: 'LogicMaster', text: '急に真っ赤になるのが怪しい。この画面のどこかにパスワードが隠されているはずだ。どこかに単語らしきものは隠されてないか？' }
        ],
        next: 'load_d1_ghost'
    },
    { id: 'load_d1_ghost', type: 'action', action: 'loadPage', pageId: 'd1_ghost' },

    // --- [Day 1] 問5: ログイン ---
    { 
        id: 'chat_d1_entry', type: 'chat', 
        messages: [
            { name: 'System', text: 'Gateway Found.', type: 'alert' },
            { name: 'LogicMaster', text: 'よし、ログイン画面だ。パスワードのヒントはソースコードにあることが多い。DevTools（🛠）を確認しろ。' }
        ],
        next: 'load_d1_entry'
    },
    { id: 'load_d1_entry', type: 'action', action: 'loadPage', pageId: 'd1_entry' },
    
    // --- [Day 1] 問6: ポート開放 ---
    {
        id: 'chat_d1_port', type: 'chat',
        messages: [
            { name: 'System', text: 'Login Successful.', type: 'alert' },
            { name: 'OccultGirl', text: '入れた……けど、真っ暗です。「利用不可」って出てます。' },
            { name: 'NetStalker', text: '表の玄関（80番ポート）は閉じられているな。' },
            { name: 'LogicMaster', text: '裏口（バックドア）が開いているはずだ。「netstat」コマンドで通信状況を一覧表示し、「LISTEN（待機中）」になっているポート番号を探せ。使えそうな番号があれば、「open ○○」と打ってみろ。スペースを入れるのも忘れるな。' }
        ],
        next: 'load_d1_port'
    },
    { id: 'load_d1_port', type: 'action', action: 'loadPage', pageId: 'd1_port' },

    // --- Day 1 終了 ---
    {
        id: 'chat_d1_clear', type: 'chat',
        messages: [
            { name: 'System', text: 'Connection Established.', type: 'alert' },
            { name: 'OccultGirl', text: '先輩……今の音、聞こえましたか？ 誰かの「ため息」みたいな……。' },
            { name: 'System', text: 'SESSION TIMEOUT', type: 'error' }
        ],
        next: 'novel_d1_end'
    },
    {
        id: 'novel_d1_end', mode: 'novel', type: 'novel',
        text: [
            "通信が強制的に切断された。",
            "深夜3時35分。",
            "俺たちの検証初日は、不気味な手応えを残して終わった。",
            "画面の向こう側にいたのは、本当にプログラムだったのだろうか？",
            "（クリックで Day 1 終了）"
        ],
        next: 'end_day1'
    },
    { id: 'end_day1', type: 'action', action: 'endDay', nextDay: 'day2_start' },

    // ==============================
    // Day 2: 疑惑と日記
    // ==============================
    {
        id: 'day2_start', mode: 'novel', type: 'novel',
        text: [
            "Day 2", 
            "次の日の深夜。", 
            "俺は、他大学共通のオカルト検証掲示板『Occult Truth』を監視していた。",
            "この『鳥籠』サイトを並行して追っていた、ある大学のミステリー研究会がこう書き込んだ",
            "「俺たちはかなり奥まで進むことに成功した」",
            "「だが、これ以上このサイトを調べることはない」",
            "「…悔しいが、負けてしまった」",
            "「…くそっ…あれは本当なのか？…でも、これ以上突っ込むと…」",
            "…これが最後の書き込みだった。"
        ],
        next: 'chat_d2_bbs'
    },
    {
        id: 'chat_d2_bbs', mode: 'game', type: 'chat',
        messages: [
            { name: 'OccultGirl', text: '先輩、掲示板見ましたか？ 大学に問い合わせたら、あのサークルのメンバー、学校に来ていないみたいですよ……。' },
            { name: 'NetStalker', text: 'ああ。何かあったんだろうな。しかし、「負けた」「あれは本当なのか」とは一体なんだ？' },
            { name: 'LogicMaster', text: '彼らは警告を残した。「private（非公開）」領域。そこに何かがあるということだ。' },
            { name: 'LogicMaster', text: '我々はそこを目指す。……覚悟はいいか？' },
            { name: 'OccultGirl', text: '……はい。確かめなきゃいけません。' }
        ],
        next: 'chat_d2_start'
    },
    {
        id: 'chat_d2_start', mode: 'game', type: 'chat',
        messages: [
            { name: 'System', text: 'Session Restored.', type: 'alert' },
            { name: 'NetStalker', text: '再接続完了。昨日は弾かれた会員データベースへの迂回ルートを見つけたぞ。' },
            { name: 'LogicMaster', text: '検索フォームがあるな。一般会員ではなく、管理者権限を持つアカウントを探し出せ。' },
            { name: 'LogicMaster', text: '「admin」や「root」、あるいは「system」で検索してみろ。' }
        ],
        next: 'load_d2_sql'
    },

    // --- [Day 2] 問1: SQLインジェクション ---
    { id: 'load_d2_sql', type: 'action', action: 'loadPage', pageId: 'd2_sql' },

    // --- [Day 2] 問2: Firewall破壊 (マトリックス) ---
    {
        id: 'chat_d2_dom', type: 'chat',
        messages: [
            { name: 'System', text: 'Database Dumped.', type: 'alert' },
            { name: 'OccultGirl', text: 'うわっ、すごい量の個人情報……！ あ、「diary（日記）」へのリンクがあります！' },
            { name: 'NetStalker', text: 'クリックできない。「FIREWALL DETECTED」……データストリームに隠された鍵が必要だ。' },
            { name: 'LogicMaster', text: '膨大なデータの中に、一つだけ「赤いキーコード」が混ざっているはずだ。見つけてクリックしろ。' }
        ],
        next: 'load_d2_dom'
    },
    { id: 'load_d2_dom', type: 'action', action: 'loadPage', pageId: 'd2_dom' },

    // --- [Day 2] 追加: 日記探索 (Reading Files) ---
    {
        id: 'chat_d2_read', type: 'chat',
        messages: [
            { name: 'System', text: 'Firewall Removed. Folder Accessed.', type: 'alert' },
            { name: 'OccultGirl', text: '壁が消えて、ファイルが開けるようになりました！' },
            { name: 'NetStalker', text: 'ちっ、子供だましかよ。……日記データだ。複数あるな。' },
            { name: 'LogicMaster', text: 'この中に、次のロックを解除するパスワードか、暗号化キーが記されているはずだ。片っ端から読んでみろ。' }
        ],
        next: 'load_d2_diary'
    },
    { id: 'load_d2_diary', type: 'action', action: 'loadPage', pageId: 'd2_diary' },

    // --- [Day 2] 問3: 暗号解読 ---
{
        id: 'chat_d2_noise', type: 'chat',
        messages: [
            { name: 'System', text: 'Decryption Key Accepted.', type: 'alert' },
            { name: 'OccultGirl', text: '画像が出てきました……CAN YOU SEE ME？ なんですかこれ？' },
            { name: 'NetStalker', text: 'ただの画像ファイルじゃないな。' },
            { name: 'LogicMaster', text: 'また何かギミックが隠されてそうだ。色々調べてみろ。' }
        ],
        next: 'load_d2_noise'
    },
    { id: 'load_d2_noise', type: 'action', action: 'loadPage', pageId: 'd2_noise' },

// --- [Day 2] 問4: エラー修復 (CMDハッキング) ---
    {
        id: 'chat_d2_error', type: 'chat',
        messages: [
            { name: 'System', text: 'FATAL ERROR: SCRIPT CRASHED', type: 'error' },
            { name: 'NetStalker', text: 'トラップだ！ 逆探知プログラムが起動した！' },
            { name: 'OccultGirl', text: 'きゃっ！警告が止まりません！', type: 'alert' }
        ],
        next: 'action_spam_alerts' // 次にアラートを連続表示
    },
    {
        id: 'action_spam_alerts', type: 'action', action: 'showAlertSpam',
        next: 'chat_d2_cmd_intro' // アラート後にCMD導入会話へ
    },
    {
        id: 'chat_d2_cmd_intro', type: 'chat',
        messages: [
            { name: 'LogicMaster', text: '落ち着け！こんな時のために強制的にコマンドプロンプトを立ち上げるシステムにしてやっただろ。' },
            { name: 'LogicMaster', text: '奴のプログラム（tracker.exe）を強制終了させろ。コマンドはこれだ。打て！' },
            { name: 'LogicMaster', text: 'taskkill /f /im tracker.exe ……急げ！' }
        ],
        // ★修正1: 先に画面を表示するIDへ飛ばす
        next: 'display_d2_cmd' 
    },
    
    // ★修正2: 先に「loadPage」を実行して、ページIDを「d2_error」にする
    { id: 'display_d2_cmd', type: 'action', action: 'loadPage', pageId: 'd2_error', next: 'start_d2_timer' },
    
    // ★修正3: ページ切り替え後にタイマーを始動する
    { id: 'start_d2_timer', type: 'action', action: 'startTimer', seconds: 40 },

    // --- [Day 2] 選択肢イベント (NEW!) ---
    { id: 'load_d2_help_dialog', type: 'action', action: 'loadPage', pageId: 'd2_help_dialog' },

    // --- Day 2 終了 ---
    {
        id: 'chat_d2_clear', type: 'chat',
        messages: [
            { name: 'System', text: 'Dark Web URL Decoded: cage404.onion', type: 'alert' },
            { name: 'NetStalker', text: '逆探知は防いだ。……このアドレス…？' },
        ],
        next: 'novel_d2_end'
    },
    {
        id: 'novel_d2_end', mode: 'novel', type: 'novel',
        text: [
            "urlが表示された後、プツン、と画面が暗転する。",
            "制作者は一体何を伝えたいんだ？",
            "…分からない",
            ".onionって深層webのurlだよな…",
            "（クリックで Day 2 終了）"
        ],
        next: 'end_day2'
    },
    { id: 'end_day2', type: 'action', action: 'endDay', nextDay: 'day3_start' },

    // ==============================
    // Day 3: 禁断の視界 (Horror & Jumpscare)
    // ==============================
    {
        id: 'day3_start', mode: 'novel', type: 'novel',
        text: [
            "Day 3", 
            "手に入れた深層WebのURL。", 
            "俺たちは震える手でTorブラウザを起動した。",
            "今日こそ、この「鳥籠」の中身を暴く。"
        ],
        next: 'chat_d3_start'
    },
    {
        id: 'chat_d3_start', mode: 'game', type: 'chat',
        messages: [
            { name: 'NetStalker', text: 'Tor接続確立。指示通りIPは偽装済んだな。行くぞ。' },
            { name: 'LogicMaster', text: 'URL「cage404.onion」を手動入力でエンターキーだ。' }
        ],
        next: 'action_enable_tor'
    },
    { id: 'action_enable_tor', type: 'action', action: 'enableTorMode' },

    // --- [Day 3] 問1: API改ざん ---
    { id: 'load_d3_api', type: 'action', action: 'loadPage', pageId: 'd3_api', next: 'chat_d3_api' },
    { 
        id: 'chat_d3_api', type: 'chat', 
        messages: [
            { name: 'System', text: 'Login as Guest.', type: 'alert' },
            { name: 'NetStalker', text: 'ゲスト権限じゃカメラも見れない。サーバーへのリクエストを書き換える必要がある。' },
            { name: 'LogicMaster', text: '送信前のJSONデータが見えているな。「role」パラメータを「visitor」から「admin」に書き換えてから送信しろ。' }
        ] 
    },

    // --- [Day 3] 問2: 深層 (カメラ・女発見) ---
    { id: 'load_d3_dark', type: 'action', action: 'loadPage', pageId: 'd3_dark', next: 'chat_d3_dark' },
{ 
        id: 'chat_d3_dark', type: 'chat', 
        messages: [
            { name: 'System', text: 'Welcome, Administrator.', type: 'alert' }, 
            { name: 'OccultGirl', text: '入れました！ でも真っ暗です。' }, 
            { name: 'NetStalker', text: '管理者で入ったのにカメラがオフラインだと？サーバー側でエラーが起きているはずだ。' },
            { name: 'LogicMaster', text: '何か手がかりがあるはずだ。探せ。' }
        ] 
    },
    
    // --- [Day 3] 恐怖のビックリ演出 (Video) ---
    { 
        id: 'chat_d3_lit', type: 'chat', 
        messages: [
            { name: 'System', text: 'LIGHT: ON', type: 'alert' },
            { name: 'OccultGirl', text: '！！ ……女性？…え？なんですかこれ？' },
            { name: 'OccultGirl', text: '……これ、まじでヤバいやつじゃ…' },
            { name: 'NetStalker', text: 'おい、カメラの映像がおかしいぞ！？' },
            { name: 'LogicMaster', text: '切断しろ！！ 罠だ！！' }
        ], 
        next: 'load_d3_scare' 
    },
    { id: 'load_d3_scare', type: 'action', action: 'loadPage', pageId: 'd3_scare' },

    {
        id: 'end_d3_timeout', mode: 'novel', type: 'novel',
        text: [
            "シャットダウンが間に合わなかった。",
            "システムは完全に掌握され、画面は真っ暗になった。",
            "もしかすると、俺たちの情報は犯人に盗まれたかもしれない。",
            "あのサークルが言っていたのは、このことだったのか",
            "【 GAME OVER: 籠の中 】"
        ],
        next: 'action_reset'
    },

// --- Day 3 強制終了 (ホラーエンド) ---
    {
        id: 'novel_d3_end', mode: 'novel', type: 'novel',
        text: [
            "画面いっぱいに表示された、嗤う悪魔の顔。",
            "スピーカーから耳をつんざくようなノイズが響き渡った。",
            "『I SEE YOU (見ているぞ)』",
            "俺は恐怖に駆られ、強制的に電源を切った。", // ← セリフを少し変更
            "あの一瞬、女性の背後の壁に「数字」が見えた気がする……。",
            "（クリックで Day 3 終了）"
        ],
        next: 'end_day3'
    },
    { id: 'end_day3', type: 'action', action: 'endDay', nextDay: 'day4_start' },

    // ==============================
    // Day 4: 決着 (Final Battle & Rescue)
    // ==============================
    {
        id: 'day4_start', mode: 'novel', type: 'novel',
        text: [
            "Day 4 (Final)", 
            "最終日。", 
            "ここまで来たら、謎を解き明かすしかいない。そんな使命感が俺たちの震える心を駆り立てる。",
            "犯人はネット上の動きを監視している可能性がある。",
            "すでに俺たちのPCも乗っ取られているかもしれない。",
            "掲示板やSNSでの共有は危険だ。",
            "俺たちはサークル内のクローズドなチャットだけで特定を進めることにした。"
        ],
        next: 'chat_d4_sound'
    },
    {
        id: 'chat_d4_sound', mode: 'game', type: 'chat',
        messages: [
            { name: 'NetStalker', text: '…調べたのだが、昨日の映像、先週のニュースで行方不明と報道された女性じゃないのか？' },
            { name: 'OccultGirl', text: 'ど、ど…どうします？警察に…' },
            { name: 'LogicMaster', text: 'いや、ダメだ。犯人がこういうサイトを作った以上、あえて乗らなければ何をするか分からない。まずは謎を解き明かすべきだ。' },
            { name: 'LogicMaster', text: '…これはモールス信号だ。おそらく何かの単語か？' }
        ],
        next: 'load_d4_sound'
    },

    // --- [Day 4] 問1: 音の解析 ---
    { id: 'load_d4_sound', type: 'action', action: 'loadPage', pageId: 'd4_sound' },

    // --- [Day 4] 問2: 都市特定 ---
    { 
        id: 'chat_d4_map', type: 'chat', 
        messages: [
            { name: 'System', text: 'Signal Identified: S.O.S.', type: 'alert' },
            { name: 'OccultGirl', text: 'SOS……！' },
            { name: 'NetStalker', text: 'これは…そういえば昨日、女性の映像に背景がかすかに映っていたが…' },
            { name: 'NetStalker', text: '駅名…難しいな。景色は山頂からのようだが、建物は特定できないな。何かのサイトで探す必要がありそうだな…' },
            { name: 'LogicMaster', text: 'よし、その座標に最も近い鉄道駅を特定しろ。そこから絞り込めるはずだ。' }
        ],
        next: 'load_d4_map'
    },
    { id: 'load_d4_map', type: 'action', action: 'loadPage', pageId: 'd4_map' },

    // --- [Day 4] 問3: ハッキング対決 ---
// (scenario.js 内)
    { 
        id: 'chat_d4_battle', type: 'chat', 
        messages: [
            { name: 'System', text: 'Nearest Station Identified: Yunoki Station', type: 'alert' },
            { name: 'OccultGirl', text: '柚木駅……！ 駅のすぐ北にある谷津山、山頂に廃墟のホテルがあります！' },
            { name: 'LogicMaster', text: 'よし、警察に通報する前に、電子ロックを—' },
            { name: 'NetStalker', text: '待て、犯人がシステムに気づいた！ こちらの回線に侵入してくるぞ！' },
            { name: 'OccultGirl', text: 'きゃっ！通信が……！' },
            { name: 'LogicMaster', text: 'クソっ…回線を切る！健闘を祈る…ザー…' }, // ヒントを削除
            { name: 'System', text: 'PRIVATE CHANNEL: CONNECTION LOST', type: 'error' }
        ],
        next: 'load_d4_battle_phase1' // 新しい開始地点へ
    },

    // ▼▼▼ ここから全面的な書き換え ▼▼▼

    // --- 第1フェーズ: 偽りの画面 ---
    {
        id: 'load_d4_battle_phase1',
        type: 'action',
        action: 'loadPage',
        pageId: 'd4_battle_fake' // 新しいページID
    },

    // --- 第2フェーズ: コマンドプロンプトでの攻防 ---
    {
        id: 'load_d4_battle_phase2',
        type: 'action',
        action: 'loadPage',
        pageId: 'd4_battle_cmd' // 新しいページID
    },
    
    // --- 第3フェーズ: ダイアログスパム ---
    {
        id: 'load_d4_battle_phase3',
        type: 'action',
        action: 'loadPage',
        pageId: 'd4_battle_dialog' // 新しいページID
    },

// --- ハッキング成功 → 最終決戦へ ---
    {
        id: 'hacking_success',
        mode: 'novel', // ★ここを 'fullscreen' から 'novel' に変更！
        type: 'novel',
        text: [
            "やった…！犯人の妨害を凌ぎきった…！",
            "LogicMasterからの通信だ…『よくやった！だがすまん！犯人に逃げられた！』",
            "『まだ終わっていない！最後のロックを解除しろ！時間は残されていないぞ！』",
            "そうだ、俺がやるべきことは一つ…ルームナンバー…！"
        ],
        next: 'load_final' // ★ここを変更: 先にロードへ飛ばす
    },
    
    // ★順番を入れ替え: 先にページを読み込む
    { 
        id: 'load_final', 
        type: 'action', 
        action: 'loadPage', 
        pageId: 'p_final',
        next: 'action_timer' // ロードが終わったらタイマーへ
    },

    // ★順番を入れ替え: ページがある状態でタイマー始動
    { 
        id: 'action_timer', 
        type: 'action', 
        action: 'startTimer', 
        seconds: 30 
        // nextは不要（時間切れかクリアで遷移するため）
    },

    // --- エンディング分岐 ---
    // 1. Bad End
    { id: 'end_bad', mode: 'novel', type: 'novel', text: ["恐怖に負け、接続を切った。", "女性は救えなかった。", "【 Bad End: 共犯者 】"], next: 'action_reset' },
    
    // 2. Normal End (Report) -> 失敗扱い
    { id: 'end_report', mode: 'novel', type: 'novel', text: ["警察に通報したが、ロック解除が間に合わず、犯人は彼女を連れて逃走した。", "【 Normal End: 迷走 】"], next: 'action_reset' },

    // 3. True End (Open) -> 成功 -> リザルト画面
    { 
        id: 'end_normal', mode: 'novel', type: 'novel', 
        text: [
            "コマンド：OPEN", 
            "電子ロック解除に成功。", 
            "その後、突入した警察部隊により、女性は無事保護された。",
            "……だが、現場に犯人の姿はなかった。",
            "「とりあえず、彼女が助かっただけで良しとするか」",
            "俺たちはPCを閉じた。",
            "【 Day 4 Clear: 救出成功 】"
        ], 
        next: 'action_show_result' 
    },
    { id: 'action_show_result', type: 'action', action: 'showResultScreen' },
    { id: 'action_reset', type: 'action', action: 'showResetButton' },


    // ==============================
    // Day 2 Give Up END (NEW!)
    // ==============================
    {
        id: 'end_day2_giveup', mode: 'novel', type: 'novel',
        text: [
            "画面から聞こえる悲痛な叫び。",
            "これはもう、ただのゲームじゃない。",
            "俺達は恐怖に耐えきれず、PCの電源を落とした。",
            "このサイトは、闇に葬られた。",
            "【 GAME OVER: 聞こえぬフリ 】"
        ],
        next: 'action_reset'
    },

    {
        id: 'end_hacking_failure', mode: 'novel', type: 'novel',
        text: [
            "犯人の妨害を防ぎきれなかった。",
            "システムは完全にクラッシュし、画面は闇に飲まれた。",
            "PCから異音が鳴り響く…もう手遅れだ。",
            "【 GAME OVER: HACKED 】"
        ],
        next: 'action_reset'
    },

    // ==============================
    // Day 5: 追跡 (Hidden Secret)
    // ==============================

    { id: 'setup_d5', type: 'action', action: 'loadPage', pageId: 'd5_console', next: 'day5_start' },

    {
        id: 'day5_start', mode: 'novel', type: 'novel',
        text: [
            "Day 5 (Extra)", 
            "サイトは消滅し、犯人は闇に身を潜めた。",
            "女性も無事だった。これですべてが解決だ。",
            "……いや、違う。",
            "先輩が犯人のサーバーにハッキングした時に盗んだログ。",
            "ここにはまだ謎が残っている。",
            "考えろ…っ、やつが設定しそうなパスワードを…！"
        ],
},
    {
        id: 'day5_end', mode: 'novel', type: 'novel',
        text: [
            "認証成功。",
            "画面に完全に消去しきれていない『次の犯行計画』の一部データが表示された。",
            "これは…！",
            "俺はこのデータを警察に転送した。",
            "…後日、このデータがカギとなり、捜査員によって男は逮捕された。",
            "犯人はただの遊びと言い、反省の態度を見せなかったらしい。",
            "「知ってるか！ネット上には飛べない鳥がたくさん鳴いているんだよ！」",
            "「俺はこいつらを救ってやっているんだ！」",
            "【 True End: 籠から飛び立った鳥 】"
        ],
        next: 'action_true_reset'
    },
    { id: 'action_true_reset', type: 'action', action: 'showResetButton' }
];