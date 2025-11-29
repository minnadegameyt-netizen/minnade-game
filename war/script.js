document.addEventListener('DOMContentLoaded', function() {
    // --- 1. グローバル変数・定数定義 ---
    const factions = {
        player: { id: 'faction1', name: 'きのこ', armyName: 'A軍', color: '#3fb950' },
        ai: { id: 'faction2', name: 'たけのこ', armyName: 'B軍', color: '#2f81f7' }
    };
    
    // 制圧（拡散開始）に必要な最低戦力
    const CAPTURE_THRESHOLD = 500;

    // YouTube API用変数
    let YOUTUBE_API_KEY = "";
    let TARGET_VIDEO_ID = "";
    let liveChatId = null;
    let nextPageToken = null;
    let youtubeIntervalId = null;

    // 都道府県データ
    const prefData = {
        "JP01": { name: "北海道", aliases: ["ほっかいどう", "ホッカイドウ"] },
        "JP02": { name: "青森", aliases: ["あおもり", "アオモリ", "青森県"] },
        "JP03": { name: "岩手", aliases: ["いわて", "イワテ", "岩手県"] },
        "JP04": { name: "宮城", aliases: ["みやぎ", "ミヤギ", "宮城県"] },
        "JP05": { name: "秋田", aliases: ["あきた", "アキタ", "秋田県"] },
        "JP06": { name: "山形", aliases: ["やまがた", "ヤマガタ", "山形県"] },
        "JP07": { name: "福島", aliases: ["ふくしま", "フクシマ", "福島県"] },
        "JP08": { name: "茨城", aliases: ["いばらき", "イバラキ", "茨城県"] },
        "JP09": { name: "栃木", aliases: ["とちぎ", "トチギ", "栃木県"] },
        "JP10": { name: "群馬", aliases: ["ぐんま", "グンマ", "群馬県"] },
        "JP11": { name: "埼玉", aliases: ["さいたま", "サイタマ", "埼玉県"] },
        "JP12": { name: "千葉", aliases: ["ちば", "チバ", "千葉県"] },
        "JP13": { name: "東京", aliases: ["とうきょう", "トウキョウ", "東京都"] },
        "JP14": { name: "神奈川", aliases: ["かながわ", "カナガワ", "神奈川県"] },
        "JP15": { name: "新潟", aliases: ["にいがた", "ニイガタ", "新潟県"] },
        "JP16": { name: "富山", aliases: ["とやま", "トヤマ", "富山県"] },
        "JP17": { name: "石川", aliases: ["いしかわ", "イシカワ", "石川県"] },
        "JP18": { name: "福井", aliases: ["ふくい", "フクイ", "福井県"] },
        "JP19": { name: "山梨", aliases: ["やまなし", "ヤマナシ", "山梨県"] },
        "JP20": { name: "長野", aliases: ["ながの", "ナガノ", "長野県"] },
        "JP21": { name: "岐阜", aliases: ["ぎふ", "ギフ", "岐阜県"] },
        "JP22": { name: "静岡", aliases: ["しずおか", "シズオカ", "静岡県"] },
        "JP23": { name: "愛知", aliases: ["あいち", "アイチ", "愛知県"] },
        "JP24": { name: "三重", aliases: ["みえ", "ミエ", "三重県"] },
        "JP25": { name: "滋賀", aliases: ["しが", "シガ", "滋賀県"] },
        "JP26": { name: "京都", aliases: ["きょうと", "キョウト", "京都府"] },
        "JP27": { name: "大阪", aliases: ["おおさか", "オオサカ", "大阪府"] },
        "JP28": { name: "兵庫", aliases: ["ひょうご", "ヒョウゴ", "兵庫県"] },
        "JP29": { name: "奈良", aliases: ["なら", "ナラ", "奈良県"] },
        "JP30": { name: "和歌山", aliases: ["わかやま", "ワカヤマ", "和歌山県"] },
        "JP31": { name: "鳥取", aliases: ["とっとり", "トットリ", "鳥取県"] },
        "JP32": { name: "島根", aliases: ["しまね", "シマネ", "島根県"] },
        "JP33": { name: "岡山", aliases: ["おかやま", "オカヤマ", "岡山県"] },
        "JP34": { name: "広島", aliases: ["ひろしま", "ヒロシマ", "広島県"] },
        "JP35": { name: "山口", aliases: ["やまぐち", "ヤマグチ", "山口県"] },
        "JP36": { name: "徳島", aliases: ["とくしま", "トクシマ", "徳島県"] },
        "JP37": { name: "香川", aliases: ["かがわ", "カガワ", "香川県"] },
        "JP38": { name: "愛媛", aliases: ["えひめ", "エヒメ", "愛媛県"] },
        "JP39": { name: "高知", aliases: ["こうち", "コウチ", "高知県"] },
        "JP40": { name: "福岡", aliases: ["ふくおか", "フクオカ", "福岡県"] },
        "JP41": { name: "佐賀", aliases: ["さが", "サガ", "佐賀県"] },
        "JP42": { name: "長崎", aliases: ["ながさき", "ナガサキ", "長崎県"] },
        "JP43": { name: "熊本", aliases: ["くまもと", "クマモト", "熊本県"] },
        "JP44": { name: "大分", aliases: ["おおいた", "オオイタ", "大分県"] },
        "JP45": { name: "宮崎", aliases: ["みやざき", "ミヤザキ", "宮崎県"] },
        "JP46": { name: "鹿児島", aliases: ["かごしま", "カゴシマ", "鹿児島県"] },
        "JP47": { name: "沖縄", aliases: ["おきなわ", "オキナワ", "沖縄県"] }
    };
    
    const adjacency = { "JP01": ["JP02"], "JP02": ["JP01", "JP03", "JP05"], "JP03": ["JP02", "JP04", "JP05"], "JP04": ["JP03", "JP06", "JP07"], "JP05": ["JP02", "JP03", "JP06"], "JP06": ["JP04", "JP05", "JP07", "JP15"], "JP07": ["JP04", "JP06", "JP08", "JP09", "JP10", "JP15"], "JP08": ["JP07", "JP09", "JP11", "JP12"], "JP09": ["JP07", "JP08", "JP10", "JP11"], "JP10": ["JP07", "JP09", "JP11", "JP15", "JP20"], "JP11": ["JP08", "JP09", "JP10", "JP12", "JP13", "JP19", "JP20"], "JP12": ["JP08", "JP11", "JP13"], "JP13": ["JP11", "JP12", "JP14", "JP19"], "JP14": ["JP13", "JP19", "JP22"], "JP15": ["JP06", "JP07", "JP10", "JP16", "JP20"], "JP16": ["JP15", "JP17", "JP20", "JP21"], "JP17": ["JP16", "JP18", "JP21"], "JP18": ["JP17", "JP21", "JP25", "JP26"], "JP19": ["JP11", "JP13", "JP14", "JP20", "JP22"], "JP20": ["JP10", "JP11", "JP15", "JP16", "JP19", "JP21", "JP22", "JP23"], "JP21": ["JP16", "JP17", "JP18", "JP20", "JP23", "JP24", "JP25"], "JP22": ["JP14", "JP19", "JP20", "JP23"], "JP23": ["JP20", "JP21", "JP22", "JP24"], "JP24": ["JP21", "JP23", "JP25", "JP26", "JP29"], "JP25": ["JP18", "JP21", "JP24", "JP26"], "JP26": ["JP18", "JP24", "JP25", "JP27", "JP28", "JP29"], "JP27": ["JP26", "JP28", "JP29"], "JP28": ["JP26", "JP27", "JP29", "JP30", "JP31", "JP33"], "JP29": ["JP24", "JP26", "JP27", "JP28", "JP30"], "JP30": ["JP28", "JP29"], "JP31": ["JP28", "JP32", "JP33"], "JP32": ["JP31", "JP34", "JP35"], "JP33": ["JP28", "JP31", "JP34", "JP37", "JP38"], "JP34": ["JP32", "JP33", "JP35", "JP38"], "JP35": ["JP32", "JP34", "JP40"], "JP36": ["JP37", "JP38", "JP39"], "JP37": ["JP33", "JP36", "JP38"], "JP38": ["JP33", "JP34", "JP36", "JP37", "JP39"], "JP39": ["JP36", "JP38"], "JP40": ["JP35", "JP41", "JP43", "JP44"], "JP41": ["JP40", "JP42"], "JP42": ["JP41"], "JP43": ["JP40", "JP44", "JP45", "JP46"], "JP44": ["JP40", "JP43", "JP45"], "JP45": ["JP43", "JP44", "JP46"], "JP46": ["JP43", "JP45"], "JP47": [] };

    let GAME_DURATION_SECONDS = 600;
    const BATTLE_INTERVAL_MS = 100;
    const islandConfig = { 'JP13': 1, 'JP15': 2, 'JP42': 2 };
    const okinawaPosition = { x: -30, y: -1180, scale: 1.8 };
    
    const regionConfig = {
        hokkaido: { name: "北部エリア", viewBox: "500 -10 300 240", ids: ['JP01', 'JP02', 'JP03', 'JP04', 'JP05', 'JP06', 'JP07'] },
        kanto: { name: "関東エリア", viewBox: "470 330 140 140", ids: ['JP08', 'JP09', 'JP10', 'JP11', 'JP12', 'JP13', 'JP14'] },
        chubu: { name: "中部エリア", viewBox: "380 260 240 240", ids: ['JP15', 'JP16', 'JP17', 'JP18', 'JP19', 'JP20', 'JP21', 'JP22', 'JP23'] },
        kansai: { name: "近畿エリア", viewBox: "360 370 150 150", ids: ['JP24', 'JP25', 'JP26', 'JP27', 'JP28', 'JP29', 'JP30'] },
        chugoku: { name: "西部エリア", viewBox: "240 370 220 160", ids: ['JP31', 'JP32', 'JP33', 'JP34', 'JP35', 'JP36', 'JP37', 'JP38', 'JP39'] },
        kyushu: { name: "南部エリア", viewBox: "180 420 200 200", ids: ['JP40', 'JP41', 'JP42', 'JP43', 'JP44', 'JP45', 'JP46'] },
        okinawa: { name: "沖縄エリア", viewBox: "0 0 400 400", ids: ['JP47'] }
    };
    
    let currentRegionIds = regionConfig.kanto.ids; 
    let gameMode = 'stream'; 
    let isSeOn = true;
    let isEventOn = true;
    let currentCommentPower = 10;
    let prefecturesData = {};
    let gameIntervalId = null;
    let prefCenterCoords = {};
    let renderIntervalId = null;
    let timerIntervalId = null;
    let isGameEnded = false;
    let eventTimeoutId = null;
    let eventIntervalIds = [];

    // --- 2. 関数定義 ---

    function initializePrefectures() {
        const paths = document.querySelectorAll('#features > path');
        paths.forEach(path => {
            const id = path.id;
            const data = prefData[id];
            if (id && data) {
                prefecturesData[id] = { 
                    id, 
                    name: data.name, 
                    aliases: data.aliases,
                    owner: null, 
                    faction1Power: 0, 
                    faction2Power: 0, 
                    totalPower: 0 
                };
            }
        });
    }

    function calculateCenterPoints() {
        const svg = document.getElementById('japan-map');
        if(!svg) return;
        const paths = svg.querySelectorAll('#features > path');
        paths.forEach(path => {
            try {
                const bbox = path.getBBox();
                prefCenterCoords[path.id] = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
            } catch (e) { prefCenterCoords[path.id] = { x: 0, y: 0 }; }
        });
        if (prefCenterCoords['JP47']) { 
            const okinawaPath = document.getElementById('JP47');
            const transform = okinawaPath.getAttribute('transform');
            if(transform) {
                const translateMatch = /translate\(([^,]+),([^)]+)\)/.exec(transform);
                const scaleMatch = /scale\(([^)]+)\)/.exec(transform);
                if(translateMatch && scaleMatch) {
                    const tx = parseFloat(translateMatch[1]), ty = parseFloat(translateMatch[2]), scale = parseFloat(scaleMatch[1]);
                    const originalBbox = okinawaPath.getBBox();
                    prefCenterCoords['JP47'] = { x: (originalBbox.x + originalBbox.width / 2) * scale + tx, y: (originalBbox.y + originalBbox.height / 2) * scale + ty };
                }
            }
        }
    }

    function processPrefectureIslands(prefId, partsToKeep) {
        const pathElement = document.getElementById(prefId);
        if (!pathElement || !pathElement.getAttribute('d')) return;
        const d = pathElement.getAttribute('d');
        const pathParts = d.split(/(?=[mM])/).filter(p => p.trim() !== '').map(partData => ({ d: partData, length: partData.length })).sort((a, b) => b.length - a.length);
        const partsToShow = pathParts.slice(0, partsToKeep);
        pathElement.setAttribute('d', partsToShow.map(part => part.d).join(' '));
    }
    
    function moveAndResizeOkinawa() {
        const okinawa = document.getElementById('JP47');
        if (okinawa) okinawa.setAttribute('transform', `translate(${okinawaPosition.x}, ${okinawaPosition.y}) scale(${okinawaPosition.scale})`);
    }

    function setupGradients() {
        const mainSvg = document.getElementById('japan-map');
        const svgs = [
            document.getElementById('kanto-map'),
            document.getElementById('chubu-map'),
            document.getElementById('kansai-map')
        ];
        
        let mainDefs = mainSvg.querySelector('defs');
        if (!mainDefs) { mainDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); mainSvg.prepend(mainDefs); }

        svgs.forEach(svg => {
            if(svg && !svg.querySelector('defs')) {
                const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                svg.prepend(defs);
            }
        });

        for (const prefId in prefecturesData) {
            const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            grad.setAttribute('id', `grad-${prefId}`);
            grad.innerHTML = `<stop offset="0%" stop-color="${factions.player.color}" /><stop offset="0%" stop-color="${factions.ai.color}" />`;
            mainDefs.appendChild(grad);

            svgs.forEach(svg => {
                if(svg) {
                    const defs = svg.querySelector('defs');
                    const clone = grad.cloneNode(true);
                    clone.setAttribute('id', `w-grad-${prefId}`);
                    defs.appendChild(clone);
                }
            });
        }
    }

    function setupBattleArrows() {
        const group = document.getElementById('battle-arrows-group');
        if (!group) return;
        for (let i = 0; i < 10; i++) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('id', `arrow-${i}`); path.style.opacity = '0';
            group.appendChild(path);
        }
    }

    function showBattleArrow(attackerId, defenderId) {
        const arrow = document.querySelector('#battle-arrows-group path[style*="opacity: 0"]');
        if (!arrow) return;
        const start = prefCenterCoords[attackerId]; 
        const end = prefCenterCoords[defenderId];
        if (!start || !end) return;
        arrow.setAttribute('d', `M ${start.x},${start.y} L ${end.x},${end.y}`);
        arrow.style.opacity = '1';
        setTimeout(() => { arrow.style.opacity = '0'; }, 1000);
    }

    function setupInsetMap() {
        const targets = [
            { groupId: 'kanto-features', svgId: 'kanto-map', ids: currentRegionIds },
            { groupId: 'chubu-features', svgId: 'chubu-map', ids: regionConfig.chubu.ids },
            { groupId: 'kansai-features', svgId: 'kansai-map', ids: regionConfig.kansai.ids }
        ];

        targets.forEach(target => {
            const group = document.getElementById(target.groupId);
            const svg = document.getElementById(target.svgId);
            if (!group || !svg) return;
            
            group.innerHTML = ''; 
            const viewBoxAttr = svg.getAttribute('viewBox');
            const vb = viewBoxAttr ? viewBoxAttr.split(' ').map(Number) : [0, 0, 300, 300];
            const vbCenterX = vb[0] + vb[2] / 2;
            const vbCenterY = vb[1] + vb[3] / 2;

            target.ids.forEach(id => {
                const original = document.getElementById(id);
                if (original) {
                    const clone = original.cloneNode(true);
                    clone.id = `k_${id}_${target.svgId}`;
                    clone.style.fill = ''; 
                    clone.removeAttribute('transform');
                    group.appendChild(clone);
                    
                    if (id === 'JP47' && target.svgId === 'kanto-map') {
                        try {
                            const bbox = clone.getBBox();
                            const pathCenterX = bbox.x + bbox.width / 2;
                            const pathCenterY = bbox.y + bbox.height / 2;
                            const scale = 2.5; 
                            clone.setAttribute('transform', `translate(${vbCenterX}, ${vbCenterY}) scale(${scale}) translate(${-pathCenterX}, ${-pathCenterY})`);
                        } catch (e) {}
                    }
                }
            });
        });
    }

    function playSe(id) {
        if (!isSeOn) return;
        const audio = document.getElementById(id);
        if (audio) {
            const cloneAudio = audio.cloneNode();
            cloneAudio.volume = audio.volume;
            cloneAudio.play().catch(e => {});
        }
    }

    function setupInitialUI() {
        const setupGroups = document.querySelectorAll('.button-group');
        setupGroups.forEach(group => {
            group.addEventListener('click', (e) => {
                if(e.target.classList.contains('setup-btn')) {
                    group.querySelectorAll('.setup-btn').forEach(btn => btn.classList.remove('selected'));
                    e.target.classList.add('selected');
                    
                    const desc = document.getElementById('mode-description');
                    
                    // ▼▼▼ 追加: YouTube設定欄の表示切り替え ▼▼▼
                    const youtubeSettings = document.getElementById('youtube-settings');
                    
                    if (desc) {
                        if (e.target.id === 'stream-mode-btn') {
                            desc.textContent = "視聴者のコメントで勢力が拡大する配信向けモードです。";
                            if(youtubeSettings) youtubeSettings.style.display = 'block'; // 表示
                        } else if (e.target.id === 'demo-mode-btn') {
                            desc.textContent = "配信での動作イメージを確認するためのAIによる自動シミュレーションです。";
                            if(youtubeSettings) youtubeSettings.style.display = 'none'; // 非表示
                        }
                    }
                }
            });
        });
        
        // 初期状態の設定
        if(document.getElementById('stream-mode-btn').classList.contains('selected')) {
             const ys = document.getElementById('youtube-settings');
             if(ys) ys.style.display = 'block';
        }
    }

    const backToSetupBtn = document.getElementById('back-to-setup-btn');
    if (backToSetupBtn) {
        backToSetupBtn.addEventListener('click', () => {
            // 待機画面を隠す
            document.getElementById('ready-screen').style.display = 'none';
            // 設定画面を表示する
            document.getElementById('start-screen').style.display = 'flex';
        });
    }

    const startButton = document.getElementById('start-button');
    const realStartBtn = document.getElementById('real-start-btn');
    
    startButton.addEventListener('click', () => {
        const streamBtn = document.getElementById('stream-mode-btn');
        gameMode = streamBtn.classList.contains('selected') ? 'stream' : 'demo';
        
        // ▼▼▼ 追加: YouTube設定の取得とチェック ▼▼▼
        if (gameMode === 'stream') {
            // ▼▼▼ ここが修正ポイント ▼▼▼
            
            // 【誤】以前のコード（これだとエラーになる）
            // YOUTUBE_API_KEY = document.getElementById('api-key-input').value.trim();
            // TARGET_VIDEO_ID = document.getElementById('video-id-input').value.trim();

            // 【正】修正後のコード（sessionStorageから取る）
            YOUTUBE_API_KEY = sessionStorage.getItem('youtube_api_key');
            TARGET_VIDEO_ID = sessionStorage.getItem('youtube_target_video_id');
            
            if (!YOUTUBE_API_KEY || !TARGET_VIDEO_ID) {
                // アラートを出して終了（トップページへの誘導）
                if (confirm('配信設定が見つかりません。\nトップページの「配信者用設定」から設定してください。\nトップページに戻りますか？')) {
                    window.location.href = "../index.html";
                }
                return;
            }
            // ▲▲▲ 修正ここまで ▲▲▲
        }
        
        isSeOn = document.getElementById('se-on-btn').classList.contains('selected');
        isEventOn = document.getElementById('event-on-btn').classList.contains('selected');

        const name1 = document.getElementById('faction1-name-input').value.trim() || 'きのこ';
        const name2 = document.getElementById('faction2-name-input').value.trim() || 'たけのこ';
        
        if (name1 === name2) { setText('error-message', '派閥名は異なるものを設定してください。'); return; }

        factions.player.name = name1;
        factions.player.armyName = `${name1}派`;
        factions.ai.name = name2;
        factions.ai.armyName = `${name2}派`;

        GAME_DURATION_SECONDS = parseInt(document.querySelector('#time-setting-group .selected').dataset.time, 10);
        
        document.getElementById('start-screen').style.display = 'none';
        
        applyTheme();
        
        currentCommentPower = 10; 
        Object.values(prefecturesData).forEach(pref => {
            pref.faction1Power = 0;
            pref.faction2Power = 0;
            pref.owner = null; 
        });

        renderMap();
        updateDashboard();

        // マップ上の巨大文字に接頭辞を付与
        setText('big-f1-name', `A: ${factions.player.name}`);
        setText('big-f2-name', `B: ${factions.ai.name}`);

        document.getElementById('ready-screen').style.display = 'flex';
    });

    realStartBtn.addEventListener('click', () => {
        document.getElementById('ready-screen').style.display = 'none';
        playStartAnimation(() => {
            startMainGameLoop();
        });
    });

    function playStartAnimation(callback) {
        const overlay = document.getElementById('countdown-overlay');
        const text = document.getElementById('countdown-text');
        overlay.classList.remove('hidden');
        
        if (isSeOn) {
            const conquerAudio = document.getElementById('se-conquer');
            if (conquerAudio) { conquerAudio.volume = 0; conquerAudio.play().then(() => { conquerAudio.pause(); conquerAudio.volume = 1; }).catch(e=>{}); }
        }

        let count = 3;
        function showCount() {
            if (count > 0) {
                text.textContent = count;
                text.className = 'anim-count'; 
                playSe('se-count'); 
                setTimeout(() => text.classList.remove('anim-count'), 750);
                count--;
                setTimeout(showCount, 1000);
            } else {
                text.textContent = "投票開始!";
                text.style.color = "var(--accent-orange)";
                text.className = 'anim-count';
                playSe('se-start'); 
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    callback();
                }, 1000);
            }
        }
        showCount();
    }

    function startMainGameLoop() {
        addLog("【開始】投票の受付を開始しました！");
        
        setText('timer-label', '残り時間');
        const endTime = new Date(new Date().getTime() + GAME_DURATION_SECONDS * 1000);
        
        timerIntervalId = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, endTime.getTime() - now);
            const minutes = Math.floor((remaining / 1000 / 60) % 60);
            const seconds = Math.floor((remaining / 1000) % 60);
            setText('countdown-timer', `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
            if (remaining === 0) endGame();
        }, 1000);
        
        gameIntervalId = setInterval(executeBattle, BATTLE_INTERVAL_MS);
        renderIntervalId = setInterval(renderMap, 500);
        
        if (isEventOn) {
            const events = [
                ev_volunteerSquad,
                ev_feverTime,
                ev_betrayal,
                ev_emergencyDraft,
                ev_miracleTurn,
                ev_pandemic,
                ev_supplyCut
            ];
            const eventInterval = setInterval(() => {
                if (isGameEnded) return;
                events[Math.floor(Math.random() * events.length)]();
            }, 60000); 
            eventIntervalIds.push(eventInterval);
        }

        if (gameMode === 'demo') {
            setupAiSimulation();
        } else {
            // ▼▼▼ 修正: YouTube接続開始 ▼▼▼
            startYouTubeConnection(); 
        }
    }

    function executeBattle() {
        Object.values(prefecturesData).forEach(pref => {
            if (!pref.owner || pref.totalPower < CAPTURE_THRESHOLD) return;

            const neighborIds = adjacency[pref.id] || [];
            const spreadPower = 2;

            neighborIds.forEach(nId => {
                const neighbor = prefecturesData[nId];
                if (!neighbor) return;

                if (pref.owner === factions.player.id) {
                    neighbor.faction1Power += spreadPower;
                } else {
                    neighbor.faction2Power += spreadPower;
                }
                
                updateOwnership(neighbor);

                if (Math.random() < 0.005) {
                    showBattleArrow(pref.id, nId);
                }
            });
        });
    }

    function addSupport(parseResult, basePower, userName) {
        const { pref, factionId } = parseResult;
        // コメントの影響力を currentCommentPower でスケーリング
        const powerToAdd = (basePower * currentCommentPower) / 10; // 基準を10とするなら割る、あるいはbasePowerをそのまま使う調整

        if (factionId === factions.player.id) {
            pref.faction1Power += powerToAdd;
        } else {
            pref.faction2Power += powerToAdd;
        }
        
        updateOwnership(pref);

        const factionColor = factionId === factions.player.id ? factions.player.color : factions.ai.color;
        
        // チャット欄にはYouTubeポーリング側で追加するので、ここはログとエフェクトのみ
        // ただし、デモモードの場合はここでログに追加する必要がある
        if (gameMode === 'demo') {
             addLog(`<span style="color:${factionColor}">${userName}</span> が ${pref.name} に投票 (+${powerToAdd})`);
        }
        
        showMapEffect(pref.id, `+${powerToAdd}`, factionColor);
    }

    function updateOwnership(pref) {
        const p1 = pref.faction1Power;
        const p2 = pref.faction2Power;
        
        if (p1 === 0 && p2 === 0) return;

        const currentOwner = pref.owner;
        let newOwner = currentOwner;

        if (p1 > p2) {
            newOwner = factions.player.id;
        } else if (p2 > p1) {
            newOwner = factions.ai.id;
        }

        if (newOwner !== currentOwner && newOwner !== null) {
            pref.owner = newOwner;
            
            playSe('se-conquer');

            const winner = (newOwner === factions.player.id) ? factions.player : factions.ai;
            if (currentOwner === null) {
                addLog(`【制圧】${pref.name} を <span style="color:${winner.color}">${winner.name}</span> が制圧しました！`);
            } else {
                addLog(`【奪取】${pref.name} の支持が <span style="color:${winner.color}">${winner.name}</span> に傾きました！`);
            }
        }
    }

    function ev_volunteerSquad() {
        const loser = getLoserFaction();
        if (!loser) return;
        showCentralAnnouncement("支援拡大", `[${loser.name}]の全支持地域にボーナス(+100)！`);
        addLog(`【速報】無党派層が${loser.name}を支持し始めました。`);
        playSe('se-start');
        Object.values(prefecturesData).forEach(p => {
            if (p.owner === loser.id) {
                if (loser.id === factions.player.id) p.faction1Power += 100;
                else p.faction2Power += 100;
            }
        });
    }
    function ev_feverTime() {
        showCentralAnnouncement("注目度急上昇！", "30秒間、投票の効果が【3倍】になります！");
        addLog("【速報】FEVER TIME！投票の影響力が3倍に！");
        playSe('se-start');
        const originalPower = currentCommentPower;
        currentCommentPower *= 3;
        setTimeout(() => {
            currentCommentPower = originalPower;
            addLog("【速報】FEVER TIME終了。");
        }, 30000);
    }
    function ev_betrayal() {
        const winner = getWinnerFaction();
        if (!winner) return;
        const loserId = winner.id === factions.player.id ? factions.ai.id : factions.player.id;
        const winnerPrefs = Object.values(prefecturesData).filter(p => p.owner === winner.id);
        if (winnerPrefs.length === 0) return;
        const target = winnerPrefs[Math.floor(Math.random() * winnerPrefs.length)];
        const p1 = target.faction1Power;
        const p2 = target.faction2Power;
        target.faction1Power = p2;
        target.faction2Power = p1;
        target.owner = loserId;
        showCentralAnnouncement("支持基盤の揺らぎ", `${target.name}の世論が[${winner.name}]から離れました！`);
        addLog(`【衝撃】${target.name}の支持層が逆転しました。`);
        playSe('se-conquer');
    }
    function ev_emergencyDraft() {
        const loser = getLoserFaction();
        if (!loser) return;
        const loserPrefs = Object.values(prefecturesData).filter(p => p.owner === loser.id);
        if (loserPrefs.length === 0) return;
        const targets = loserPrefs.sort(() => 0.5 - Math.random()).slice(0, 3);
        targets.forEach(p => {
            if (loser.id === factions.player.id) p.faction1Power += 300;
            else p.faction2Power += 300;
        });
        showCentralAnnouncement("緊急キャンペーン", `[${loser.name}]の支持基盤が強化されました(+300)！`);
        addLog(`【速報】${loser.name}が大規模なキャンペーンを展開しました。`);
        playSe('se-start');
    }
    function ev_miracleTurn() {
        const f1Total = Object.values(prefecturesData).reduce((s,p)=>s+p.faction1Power,0);
        const f2Total = Object.values(prefecturesData).reduce((s,p)=>s+p.faction2Power,0);
        let loserId = null;
        if (f1Total > f2Total * 2) loserId = factions.ai.id;
        else if (f2Total > f1Total * 2) loserId = factions.player.id;
        if (!loserId) return;
        const loserName = loserId === factions.player.id ? factions.player.name : factions.ai.name;
        showCentralAnnouncement("起死回生", `[${loserName}]の支持率が【倍増】しました！`);
        addLog("【速報】劣勢側への同情票が集まっています！支持率倍増！");
        playSe('se-start');
        Object.values(prefecturesData).forEach(p => {
            if (loserId === factions.player.id) p.faction1Power *= 2;
            else p.faction2Power *= 2;
        });
    }
    function ev_pandemic() {
        showCentralAnnouncement("関心の低下", "全体の熱量が【半減】しました。");
        addLog("【速報】有権者の関心が薄れています。両陣営の勢いが半減。");
        playSe('se-start');
        Object.values(prefecturesData).forEach(p => {
            p.faction1Power = Math.floor(p.faction1Power / 2);
            p.faction2Power = Math.floor(p.faction2Power / 2);
        });
    }
    function ev_supplyCut() {
        const winner = getWinnerFaction();
        if (!winner) return;
        showCentralAnnouncement("ネガティブキャンペーン", `[${winner.name}]の支持が20%ダウン！`);
        addLog(`【速報】${winner.name}への批判が高まっています。`);
        playSe('se-start');
        Object.values(prefecturesData).forEach(p => {
            if (winner.id === factions.player.id) p.faction1Power = Math.floor(p.faction1Power * 0.8);
            else p.faction2Power = Math.floor(p.faction2Power * 0.8);
        });
    }
    function getLoserFaction() {
        const f1Total = Object.values(prefecturesData).reduce((s,p)=>s+p.faction1Power,0);
        const f2Total = Object.values(prefecturesData).reduce((s,p)=>s+p.faction2Power,0);
        if (f1Total < f2Total) return factions.player;
        if (f2Total < f1Total) return factions.ai;
        return null;
    }
    function getWinnerFaction() {
        const f1Total = Object.values(prefecturesData).reduce((s,p)=>s+p.faction1Power,0);
        const f2Total = Object.values(prefecturesData).reduce((s,p)=>s+p.faction2Power,0);
        if (f1Total > f2Total) return factions.player;
        if (f2Total > f1Total) return factions.ai;
        return null;
    }

    function parseComment(comment) {
        let targetPref = null;
        const prefList = Object.values(prefecturesData);
        
        for (const pref of prefList) {
            if (comment.includes(pref.name)) {
                targetPref = pref;
                break;
            }
            if (pref.aliases) {
                for (const alias of pref.aliases) {
                    if (comment.includes(alias)) {
                        targetPref = pref;
                        break;
                    }
                }
            }
            if (targetPref) break;
        }
        if (!targetPref) return null;

        const keywordsA = ['A', 'a', 'Ａ', 'ａ', 'きのこ', factions.player.name];
        const keywordsB = ['B', 'b', 'Ｂ', 'ｂ', 'たけのこ', factions.ai.name];

        let targetFactionId = null;
        if (keywordsA.some(k => comment.includes(k))) {
            targetFactionId = factions.player.id;
        } else if (keywordsB.some(k => comment.includes(k))) {
            targetFactionId = factions.ai.id;
        }

        if (!targetFactionId) return null;
        return { pref: targetPref, factionId: targetFactionId };
    }

    function setupAiSimulation() {
        setInterval(() => {
            if (isGameEnded) return;
            
            const dummyNamesA = ["A派", "きのこ好き", "森の住人", "緑の風", "草の根"];
            const dummyNamesB = ["B派", "たけのこ推し", "里の民", "青い稲妻", "空の旅人"];
            const prefList = Object.values(prefecturesData);
            const randomPref = prefList[Math.floor(Math.random() * prefList.length)];
            const isFaction1 = Math.random() > 0.5;
            
            const factionKey = isFaction1 ? "A" : "B";
            const commentText = `${randomPref.name} ${factionKey}`;
            const userName = isFaction1 
                ? dummyNamesA[Math.floor(Math.random() * dummyNamesA.length)]
                : dummyNamesB[Math.floor(Math.random() * dummyNamesB.length)];

            const chatList = document.getElementById('live-chat-list');
            if (chatList) {
                const li = document.createElement('li');
                const color = isFaction1 ? factions.player.color : factions.ai.color;
                li.innerHTML = `<span class="chat-author" style="color:${color}">${userName}</span>: ${commentText}`;
                chatList.prepend(li);
                if (chatList.children.length > 20) chatList.removeChild(chatList.lastChild);
            }

            const result = parseComment(commentText);
            if (result) {
                addSupport(result, 10, userName); 
            }

        }, 400);
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
    function setHTML(id, html) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    function applyTheme() {
        factions.faction1 = factions.player;
        factions.faction2 = factions.ai;
        document.title = `${factions.player.name} VS ${factions.ai.name}`;
        setHTML('faction-1-title', `${factions.player.armyName} <span>(0%)</span>`);
        setHTML('faction-2-title', `${factions.ai.armyName} <span>(0%)</span>`);
        setText('faction-1-rate-label', factions.player.name);
        setText('faction-2-rate-label', factions.ai.name);
        setText('kanto-faction-1-rate-label', factions.player.name);
        setText('kanto-faction-2-rate-label', factions.ai.name);
        document.documentElement.style.setProperty('--faction-1-color', factions.player.color);
        document.documentElement.style.setProperty('--faction-2-color', factions.ai.color);
    }
    
    function renderMap() {
        for (const prefId in prefecturesData) {
            const pref = prefecturesData[prefId];
            const totalPower = pref.faction1Power + pref.faction2Power;
            let fillColor;
            let opacity = totalPower > 0 ? Math.min(Math.max(totalPower / CAPTURE_THRESHOLD, 0.7), 1.0) : 1.0;

            if (totalPower === 0) {
                fillColor = "#21262d"; 
            } else {
                const faction1Rate = (pref.faction1Power / totalPower) * 100;
                const grad = document.getElementById(`grad-${prefId}`);
                if (grad) {
                    const stops = grad.getElementsByTagName('stop');
                    stops[0].setAttribute('offset', `${faction1Rate}%`);
                    stops[1].setAttribute('offset', `${faction1Rate}%`);
                }
                fillColor = `url(#grad-${prefId})`;

                const wipeGrads = document.querySelectorAll(`linearGradient[id="w-grad-${prefId}"]`);
                wipeGrads.forEach(wg => {
                    const stops = wg.getElementsByTagName('stop');
                    stops[0].setAttribute('offset', `${faction1Rate}%`);
                    stops[1].setAttribute('offset', `${faction1Rate}%`);
                });
            }
            
            const path = document.getElementById(prefId);
            if (path) {
                path.style.fill = fillColor;
                path.style.fillOpacity = opacity; 
            }

            const wipePaths = document.querySelectorAll(`[id^="k_${prefId}_"]`);
            wipePaths.forEach(wp => {
                let kantoFillColor = fillColor;
                if (totalPower > 0) {
                    kantoFillColor = `url(#w-grad-${prefId})`;
                }
                wp.style.fill = kantoFillColor;
                wp.style.fillOpacity = opacity; 
            });
        }
        updateDashboard();
    }
    
    function updateDashboard() {
        let totalSoldiersFaction1 = 0, totalSoldiersFaction2 = 0;
        const faction1Prefs = [], faction2Prefs = [];
        
        Object.values(prefecturesData).forEach(pref => {
            totalSoldiersFaction1 += pref.faction1Power;
            totalSoldiersFaction2 += pref.faction2Power;
            pref.totalPower = pref.faction1Power + pref.faction2Power;

            if (pref.totalPower > 0) {
                const f1Rate = (pref.faction1Power / pref.totalPower) * 100;
                if (pref.faction1Power >= pref.faction2Power) {
                    faction1Prefs.push({ 
                        name: pref.name, 
                        power: pref.totalPower, 
                        rate: f1Rate.toFixed(0) 
                    });
                } else {
                    faction2Prefs.push({ 
                        name: pref.name, 
                        power: pref.totalPower, 
                        rate: (100 - f1Rate).toFixed(0) 
                    });
                }
            }
        });

        if (!isGameEnded) {
            const totalPrefCount = Object.keys(prefecturesData).length; 
            
            if (faction1Prefs.length === totalPrefCount) {
                addLog(`【決着】<span style="color:${factions.player.color}">${factions.player.name}</span> が全土を統一しました！`);
                setTimeout(endGame, 500); 
                return;
            }
            
            if (faction2Prefs.length === totalPrefCount) {
                addLog(`【決着】<span style="color:${factions.ai.color}">${factions.ai.name}</span> が全土を統一しました！`);
                setTimeout(endGame, 500);
                return;
            }
        }
        
        const totalNationalPower = totalSoldiersFaction1 + totalSoldiersFaction2;
        let rate1 = 0;
        if (totalNationalPower > 0) {
             rate1 = (totalSoldiersFaction1 / totalNationalPower) * 100;
             setText('national-faction-1-rate', `${rate1.toFixed(1)}%`);
             setText('national-faction-2-rate', `${(100 - rate1).toFixed(1)}%`);
        }

        const domBar1 = document.getElementById('dom-bar-f1');
        const domBar2 = document.getElementById('dom-bar-f2');
        if (domBar1 && domBar2) {
            const displayRate = totalNationalPower > 0 ? rate1 : 50;
            domBar1.style.width = `${displayRate}%`;
            domBar2.style.width = `${100 - displayRate}%`;
        }
        
        const title1 = document.querySelector('#faction-1-title span');
        if(title1) title1.textContent = `(${faction1Prefs.length}地域)`;
        const title2 = document.querySelector('#faction-2-title span');
        if(title2) title2.textContent = `(${faction2Prefs.length}地域)`;
        
        faction1Prefs.sort((a, b) => b.power - a.power);
        setHTML('faction-1-prefectures', faction1Prefs.map(p => 
            `<li>${p.name} <span><b style="margin-right:8px; color:#fff;">${p.rate}%</b> (${Math.floor(p.power).toLocaleString()})</span></li>`
        ).join(''));

        faction2Prefs.sort((a, b) => b.power - a.power);
        setHTML('faction-2-prefectures', faction2Prefs.map(p => 
            `<li>${p.name} <span><b style="margin-right:8px; color:#fff;">${p.rate}%</b> (${Math.floor(p.power).toLocaleString()})</span></li>`
        ).join(''));
    }

    function endGame() {
        if (isGameEnded) return;
        isGameEnded = true;

        clearInterval(gameIntervalId); clearInterval(renderIntervalId); clearInterval(timerIntervalId); 
        eventIntervalIds.forEach(id => clearInterval(id));
        
        // YouTubeポーリング停止
        if (youtubeIntervalId) clearTimeout(youtubeIntervalId);
        
        setText('countdown-timer', "00:00");
        
        const finalFaction1Power = Object.values(prefecturesData).reduce((sum, p) => sum + p.faction1Power, 0);
        const finalFaction2Power = Object.values(prefecturesData).reduce((sum, p) => sum + p.faction2Power, 0);

        const winner = finalFaction1Power > finalFaction2Power ? factions.player : (finalFaction2Power > finalFaction1Power ? factions.ai : null);
        const announcement = document.getElementById('winner-announcement');
        if (announcement) {
            announcement.innerHTML = winner ? `<span style="color:${winner.color}; font-weight:bold;">${winner.name}</span> の勝利!` : "引き分け!";
        }
        addLog(winner ? `【終了】${winner.name}が過半数を獲得しました！` : "【終了】引き分け！");
        
        const totalFinalPower = finalFaction1Power + finalFaction2Power;
        const f1Rate = totalFinalPower > 0 ? (finalFaction1Power / totalFinalPower) * 100 : 50;
        
        const bar1 = document.getElementById('final-faction-1-bar');
        if(bar1) bar1.style.width = `${f1Rate}%`;
        setText('final-faction-1-name', `${factions.player.name} ${f1Rate.toFixed(1)}%`);
        const bar2 = document.getElementById('final-faction-2-bar');
        if(bar2) bar2.style.width = `${100 - f1Rate}%`;
        setText('final-faction-2-name', `${factions.ai.name} ${(100 - f1Rate).toFixed(1)}%`);

        const modal = document.getElementById('game-over-modal');
        if(modal) modal.style.display = 'flex';
        
        playSe('se-start'); 
    }

    function showMapEffect(prefId, textToShow, factionColor) {
        const center = prefCenterCoords[prefId];
        if (!center) return;
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', center.x); text.setAttribute('y', center.y);
        text.setAttribute('class', 'effect-text'); text.style.fill = factionColor;
        text.textContent = textToShow;
        group.appendChild(text);
        document.getElementById('effects-layer')?.appendChild(group);
        setTimeout(() => group.remove(), 1000);
    }
    
    function addLog(message) {
        const logList = document.getElementById('event-log-list');
        if(!logList) return;
        const li = document.createElement('li');
        li.innerHTML = message;
        logList.prepend(li);
        if (logList.children.length > 50) logList.removeChild(logList.lastChild);
    }
    
    function showCentralAnnouncement(title, message, duration = 4000) {
        const box = document.getElementById('event-announcement-box');
        if(!box) return;
        if (eventTimeoutId) clearTimeout(eventTimeoutId);
        box.querySelector('#event-title').innerHTML = title;
        box.querySelector('#event-message').innerHTML = message;
        box.style.display = 'block';
        setTimeout(() => { box.style.opacity = '1'; }, 10);
        eventTimeoutId = setTimeout(() => {
            box.style.opacity = '0';
            setTimeout(() => { box.style.display = 'none'; }, 500);
        }, duration);
    }
    
    function addTickerItem(text) {
        const ticker = document.getElementById('ticker');
        if(!ticker) return;
        const item = document.createElement('span');
        item.className = 'ticker-item';
        item.innerHTML = text;
        ticker.appendChild(item);
        if (ticker.children.length > 20) ticker.removeChild(ticker.children[0]);
    }

    // --- YouTube API連携ロジック ---

    async function startYouTubeConnection() {
        addLog("【システム】YouTubeチャットIDを取得中...");
        await fetchLiveChatId();
        
        if (liveChatId) {
            addLog("【システム】接続成功！コメント取得を開始します。");
            nextPageToken = null; // ポーリング履歴をリセット
            // 初回実行
            pollYouTubeChat();
        } else {
            addLog("【エラー】チャットIDの取得に失敗しました。設定を確認してください。");
        }
    }

    async function fetchLiveChatId() {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${TARGET_VIDEO_ID}&key=${YOUTUBE_API_KEY}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.error) {
                console.error("API Error:", data.error);
                addLog(`【APIエラー】${data.error.message}`);
                return;
            }

            if (data.items && data.items.length > 0) {
                liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId;
            } else {
                addLog("【エラー】動画が見つからないか、ライブ配信ではありません。");
            }
        } catch (e) {
            console.error("Fetch Error:", e);
            addLog("【通信エラー】APIへの接続に失敗しました。");
        }
    }

    async function pollYouTubeChat() {
        if (isGameEnded || !liveChatId) return;

        let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${YOUTUBE_API_KEY}`;
        if (nextPageToken) {
            url += `&pageToken=${nextPageToken}`;
        }

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (data.error) {
                console.error("Polling Error:", data.error);
                // エラー時は少し待って再試行
                youtubeIntervalId = setTimeout(pollYouTubeChat, 10000);
                return;
            }

            if (data.items) {
                data.items.forEach(item => {
                    const comment = item.snippet.displayMessage;
                    const author = item.authorDetails.displayName;
                    
                    // 1. チャット欄に表示
                    const chatList = document.getElementById('live-chat-list');
                    if (chatList) {
                        const li = document.createElement('li');
                        // どちらの派閥のコメントか解析して色を付ける
                        const analysis = parseComment(comment);
                        let colorStyle = "";
                        if (analysis) {
                            colorStyle = (analysis.factionId === factions.player.id) 
                                ? `color:${factions.player.color}` 
                                : `color:${factions.ai.color}`;
                        }
                        
                        li.innerHTML = `<span class="chat-author" style="${colorStyle}">${author}</span>: ${comment}`;
                        chatList.prepend(li);
                        if (chatList.children.length > 20) chatList.removeChild(chatList.lastChild);
                    }

                    // 2. ゲームへの反映
                    const result = parseComment(comment);
                    if (result) {
                        // YouTubeコメントは影響力を強めに設定 (例: 50)
                        const power = 50; 
                        addSupport(result, power, author);
                    }
                });
            }

            // 次のページトークンを保存
            nextPageToken = data.nextPageToken;
            
            // APIが指定する待機時間を守る (なければ5秒)
            const interval = Math.max(data.pollingIntervalMillis || 5000, 3000);
            youtubeIntervalId = setTimeout(pollYouTubeChat, interval);

        } catch (e) {
            console.error("Network Error:", e);
            youtubeIntervalId = setTimeout(pollYouTubeChat, 10000);
        }
    }

    window.switchRegion = function(regionKey) {
        const config = regionConfig[regionKey];
        if (!config) return;
        const title = document.getElementById('sector-title');
        if(title) title.textContent = config.name;
        const svg = document.getElementById('kanto-map');
        if(svg) svg.setAttribute('viewBox', config.viewBox);
        currentRegionIds = config.ids;
        setupInsetMap(); 
        const btns = document.querySelectorAll('.region-buttons button');
        btns.forEach(btn => btn.classList.remove('active'));
        const indexMap = { 'hokkaido': 0, 'chubu': 1, 'kanto': 2, 'kansai': 3, 'chugoku': 4, 'kyushu': 5, 'okinawa': 6 };
        if (indexMap[regionKey] !== undefined) btns[indexMap[regionKey]].classList.add('active');
        renderMap();
    };

    initializePrefectures();
    for (const prefId in islandConfig) { processPrefectureIslands(prefId, islandConfig[prefId]); }
    moveAndResizeOkinawa();
    calculateCenterPoints();
    
    setupInsetMap(); 
    setupGradients(); 
    setupBattleArrows();
    setupInitialUI();

    const backToHomeBtn = document.getElementById('back-to-home-btn');
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            // トップページ（../index.html）へ戻る
            // ※ファイルの配置構成に合わせてパスは調整してください
            window.location.href = "../index.html";
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    if (mode === 'stream') {
        // 配信モードボタンを自動クリック
        const btn = document.getElementById('stream-mode-btn');
        if (btn) btn.click();
    } else if (mode === 'demo') {
        // デモモードボタンを自動クリック
        const btn = document.getElementById('demo-mode-btn');
        if (btn) btn.click();
    }

    renderMap();
});