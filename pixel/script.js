document.addEventListener('DOMContentLoaded', () => {
    // --- 定数 ---
    const CANVAS_PIXEL_SIZE = 600; 
    
    const COLOR_DEFINITIONS = [
        { id: 1, color: '#ff7675', name: 'ピンク' },
        { id: 2, color: '#55efc4', name: '緑' },
        { id: 3, color: '#74b9ff', name: '青' },
        { id: 4, color: '#ffeaa7', name: '黄' },
        { id: 5, color: '#2d3436', name: '黒' },
        { id: 6, color: '#ffffff', name: '白' },
        { id: 7, color: '#d63031', name: '赤' },
        { id: 8, color: '#fdcb6e', name: '橙' },
        { id: 9, color: '#a29bfe', name: '紫' },
        { id: 10, color: '#636e72', name: '灰' },
        { id: 11, color: '#00cec9', name: '水' },
        { id: 12, color: '#e17055', name: '茶' }
    ];

    const COLORS = { 0: '#ffffff' }; 
    COLOR_DEFINITIONS.forEach(def => COLORS[def.id] = def.color);

    const ADJECTIVES = ["やばそうな", "巨大な", "輝く", "100年後の", "暗黒の", "踊る", "最強の", "デジタルの", "昭和の", "伝説の"];
    const NOUNS = ["ヤギ", "スシ", "城", "勇者", "猫", "宇宙人", "ドラゴン", "ラーメン", "社長", "パンダ"];

    // --- 状態管理 ---
    let state = {
        mode: 'solo',         
        players: 1,           
        gridSize: 20,         
        // layout: 'shared', // 削除
        themeMode: 'none',    
        timeLimit: 99999,       
        seEnabled: true,      // SE設定 (デフォルトON)
        isRunning: false,
        timeRemaining: 0,
        maps: []             
    };

    let soloState = {
        currentColorId: 5, 
        isDrawing: false,
        cursor: { x: 0, y: 0 }, 
        history: [],       
        currentStroke: []  
    };

    const playersMap = {}; 
    let totalEntries = 0;
    let YOUTUBE_API_KEY = "", TARGET_VIDEO_ID = "", liveChatId = null, nextPageToken = null;
    let intervals = [];

    // 音声
    const audio = {
        count: new Audio('../territory/bgm/count.mp3'),
        start: new Audio('../territory/bgm/start.mp3'),
        paint: new Audio('../territory/bgm/paint.mp3'),
        finish: new Audio('../territory/bgm/finish.mp3'),
        join: new Audio('../territory/bgm/join.mp3'),
        // ★変更: スロット停止音を追加
        slot_stop: new Audio('bgm/slot_stop.mp3') 
    };

    const container = document.getElementById('canvases-container');
    const colorLegend = document.getElementById('color-legend');
    
    // --- 初期化 ---
    function init() {
        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('mode');
        
        if (modeParam === 'stream') {
            state.mode = 'stream';
            document.getElementById('mode-stream').classList.add('selected');
            document.getElementById('mode-solo').classList.remove('selected');
            
            document.getElementById('row-players').classList.remove('hidden');
            document.getElementById('row-time').classList.remove('hidden');
            
            document.getElementById('howto-content').innerHTML = `
                <div class="key-guide">
                ・ デフォルトは黒です<br>
                ・ 「100」等の数字で塗る<br>
                ・ 左上が「1」右下が「400」
                または「900」<br>
                ・ 「赤」「青」で色変更<br>
                ・ 赤・青・黄・黒・白・紫・灰・水・茶・ピンク・橙
                </div>`;
            state.players = 4;
            state.timeLimit = 300;
        } else {
            state.mode = 'solo';
            document.getElementById('mode-solo').classList.add('selected');
            document.getElementById('mode-stream').classList.remove('selected');

            document.getElementById('row-players').classList.add('hidden');
            document.getElementById('row-time').classList.add('hidden');
            
            document.getElementById('howto-content').innerHTML = `
                <div class="key-guide">
                <span class="key-badge">マウス</span> ドラッグで塗る<br>
                <span class="key-badge">矢印</span> カーソル移動<br>
                <span class="key-badge">Z / Space</span> 塗る<br>
                <span class="key-badge">Ctrl+Z</span> 元に戻す
                </div>`;
            
            state.players = 1;
            state.timeLimit = 99999;
            document.getElementById('undo-btn').classList.remove('hidden');
            document.getElementById('manual-finish-btn').classList.remove('hidden');
            document.getElementById('time-display').textContent = "∞";
        }

        renderColorLegend();
        bindSettingsEvents();
        document.addEventListener('keydown', handleKeyDown);

        document.getElementById('bgm-toggle-btn').addEventListener('click', toggleSe);
        document.getElementById('undo-btn').addEventListener('click', undo);
        document.getElementById('next-btn').addEventListener('click', onSetupComplete);
        document.getElementById('back-to-setup').addEventListener('click', backToSetup);
        document.getElementById('start-game-btn').addEventListener('click', startGame);
        document.getElementById('manual-finish-btn').addEventListener('click', endGame);
        document.getElementById('save-img-btn').addEventListener('click', saveResultImage);
    }

    function bindSettingsEvents() {
        const bind = (id, group, val, cb) => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('click', () => {
                selectBtn(group, id);
                if(cb) cb(val);
            });
        };

        // SE設定
        bind('bgm-on', 'bgm', true, v => state.seEnabled = true);
        bind('bgm-off', 'bgm', false, v => state.seEnabled = false);

        bind('grid-20', 'grid', 20, v => state.gridSize = v);
        bind('grid-30', 'grid', 30, v => state.gridSize = v);

        bind('pl-1', 'pl', 1, v => state.players = v);
        bind('pl-2', 'pl', 2, v => state.players = v);
        bind('pl-3', 'pl', 3, v => state.players = v);
        bind('pl-4', 'pl', 4, v => state.players = v);

        bind('theme-none', 'theme', 'none', v => state.themeMode = v);
        bind('theme-common', 'theme', 'common', v => state.themeMode = v);

        bind('time-300', 'time', 300, v => state.timeLimit = v);
        bind('time-600', 'time', 600, v => state.timeLimit = v);
        bind('time-1200', 'time', 1200, v => state.timeLimit = v);
        bind('time-free', 'time', 99999, v => state.timeLimit = v);
    }

    function selectBtn(group, id) {
        const target = document.getElementById(id);
        if(!target) return;
        target.parentElement.querySelectorAll('.setup-btn').forEach(b => b.classList.remove('selected'));
        target.classList.add('selected');
    }

    function renderColorLegend() {
        colorLegend.innerHTML = '';
        COLOR_DEFINITIONS.forEach(def => {
            const item = document.createElement('div');
            item.className = 'color-item';
            if (state.mode === 'solo' && def.id === soloState.currentColorId) item.classList.add('active');
            item.onclick = () => {
                if (state.mode === 'solo') {
                    soloState.currentColorId = def.id;
                    updatePaletteSelection();
                }
            };
            item.innerHTML = `<div class="color-sample" style="background-color:${def.color}"></div>`;
            colorLegend.appendChild(item);
        });
    }

    function updatePaletteSelection() {
        const items = colorLegend.querySelectorAll('.color-item');
        items.forEach((item, index) => {
            if (COLOR_DEFINITIONS[index].id === soloState.currentColorId) item.classList.add('active');
            else item.classList.remove('active');
        });
    }

    function onSetupComplete() {
        document.getElementById('setup-modal').classList.add('hidden');
        const seBtn = document.getElementById('bgm-toggle-btn');
        seBtn.textContent = state.seEnabled ? "🔊 SE: ON" : "🔈 SE: OFF";

        setupGameLayout();

        drawGuideMap();

        if (state.mode === 'solo') {
            startGame();
        } else {
            document.getElementById('entry-modal').classList.remove('hidden');
            initEntryScreen();
            YOUTUBE_API_KEY = sessionStorage.getItem('youtube_api_key');
            TARGET_VIDEO_ID = sessionStorage.getItem('youtube_target_video_id');
            if (YOUTUBE_API_KEY && TARGET_VIDEO_ID) startYouTubeConnection();
        }
    }

    function setupGameLayout() {
        container.innerHTML = '';
        state.maps = [];
        soloState.history = [];

        const canvasCount = state.players;
        container.className = `canvases-grid grid-${canvasCount}`;

        for (let i = 0; i < canvasCount; i++) {
            let row = [];
            for(let y=0; y<state.gridSize; y++) row.push(new Array(state.gridSize).fill(0));
            state.maps.push(row);

            const wrapper = document.createElement('div');
            wrapper.className = 'canvas-wrapper';
            
            if (state.mode === 'solo') wrapper.classList.add('solo-border');
            else wrapper.classList.add(`p${i+1}-border`);

            if (state.mode === 'stream') {
                const header = document.createElement('div');
                header.className = 'canvas-header';
                const names = ["Pink Team", "Green Team", "Blue Team", "Yellow Team"];
                header.textContent = names[i];
                wrapper.appendChild(header);
            }

            const cvs = document.createElement('canvas');
            cvs.id = `cvs-${i}`;
            cvs.width = CANVAS_PIXEL_SIZE;
            cvs.height = CANVAS_PIXEL_SIZE;
            cvs.dataset.index = i;

            cvs.addEventListener('mousedown', onCanvasMouseDown);
            window.addEventListener('mouseup', onCanvasMouseUp);
            cvs.addEventListener('mousemove', onCanvasMouseMove);
            cvs.addEventListener('contextmenu', e => e.preventDefault());

            wrapper.appendChild(cvs);
            container.appendChild(wrapper);
        }

        const sb = document.getElementById('players-scoreboard');
        sb.innerHTML = '';
        if (state.mode === 'stream') {
            const names = ["Pink", "Green", "Blue", "Yellow"];
            for (let i = 1; i <= state.players; i++) {
                const pInfo = document.createElement('div');
                pInfo.className = `player-info p${i}-box`;
                pInfo.innerHTML = `<span class="p-name">${names[i-1]}</span><span class="p-score" id="score-${i}">0px</span>`;
                sb.appendChild(pInfo);
            }
        }

        if (state.themeMode !== 'none') document.getElementById('theme-display-area').classList.remove('hidden');
        else document.getElementById('theme-display-area').classList.add('hidden');
        // ★修正: 終了ボタンの表示ロジック
        const finishBtn = document.getElementById('manual-finish-btn');
        // 時間が無制限(>3600)なら、モードに関わらず表示する
        if (state.timeLimit > 3600) { 
            finishBtn.classList.remove('hidden');
            document.getElementById('time-display').textContent = "∞";
        } else {
            finishBtn.classList.add('hidden');
        }
    }

    function initEntryScreen() {
        const list = document.getElementById('entry-list');
        list.innerHTML = '';
        const names = ["Pink Team", "Green Team", "Blue Team", "Yellow Team"];
        const colors = ['#ff7675', '#55efc4', '#74b9ff', '#ffeaa7'];
        for(let i=0; i<state.players; i++) {
            const item = document.createElement('div');
            item.style.padding = '10px';
            item.style.border = `2px solid ${colors[i]}`;
            item.style.borderRadius = '8px';
            item.style.marginBottom = '5px';
            item.style.color = '#fff';
            item.textContent = `${names[i]} (募集中)`;
            item.id = `entry-slot-${i+1}`;
            list.appendChild(item);
        }
        totalEntries = 0;
        for(let key in playersMap) delete playersMap[key];
    }

    function startGame() {
        document.getElementById('entry-modal').classList.add('hidden');
        document.getElementById('setup-modal').classList.add('hidden');

        const overlay = document.getElementById('countdown-overlay');
        const text = document.getElementById('countdown-text');
        overlay.classList.remove('hidden');
        let count = 3;
        text.textContent = count;
        playSe('count');

        const cdInterval = setInterval(() => {
            count--;
            if(count > 0) {
                text.textContent = count;
                playSe('count');
            } else {
                clearInterval(cdInterval);
                text.textContent = "START!";
                playSe('start');
                
                // ★変更: 待機時間を1000msから200msに短縮してサクサク感を出す
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    if (state.themeMode !== 'none') {
                        startSlotMachine().then(startRealGame);
                    } else {
                        startRealGame();
                    }
                }, 200);
            }
        }, 1000);
    }

    function startSlotMachine() {
        return new Promise((resolve) => {
            const adjEl = document.getElementById('slot-adj');
            const nounEl = document.getElementById('slot-noun');
            let frames = 0;
            const slotInt = setInterval(() => {
                adjEl.textContent = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
                nounEl.textContent = NOUNS[Math.floor(Math.random() * NOUNS.length)];
                frames++;
                if (frames > 20) {
                    clearInterval(slotInt);
                    // ★変更: スロット停止音を再生
                    playSe('slot_stop'); 
                    resolve();
                }
            }, 60);
        });
    }

    function startRealGame() {
        state.isRunning = true;
        state.timeRemaining = state.timeLimit;
        // BGM再生ロジック削除

        if (state.timeLimit < 99999) {
            const tId = setInterval(() => {
                state.timeRemaining--;
                const m = Math.floor(state.timeRemaining / 60);
                const s = state.timeRemaining % 60;
                document.getElementById('time-display').textContent = `${m}:${s.toString().padStart(2, '0')}`;
                if (state.timeRemaining <= 0) endGame();
            }, 1000);
            intervals.push(tId);
        }
        renderLoop();
    }

    function renderLoop() {
        if (!state.isRunning) return;
        
        const count = state.players;
        for(let i=0; i<count; i++) {
            const cvs = document.getElementById(`cvs-${i}`);
            const ctx = cvs.getContext('2d');
            const map = state.maps[i];
            
            const size = cvs.width / state.gridSize;

            ctx.clearRect(0,0,cvs.width,cvs.height);

            // ドット描画
            for(let y=0; y<state.gridSize; y++){
                for(let x=0; x<state.gridSize; x++){
                    const val = map[y][x];
                    if(val > 0) {
                        ctx.fillStyle = COLORS[val] || '#000';
                        ctx.fillRect(x*size, y*size, size, size);
                    } else {
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(x*size, y*size, size, size);
                    }
                    ctx.strokeStyle = '#dfe6e9';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x*size, y*size, size, size);
                    
                    if(val === 0 && state.mode === 'stream' && state.gridSize <= 25) {
                        ctx.fillStyle = '#b2bec3';
                        const fontSize = Math.max(8, Math.floor(size * 0.4));
                        ctx.font = `${fontSize}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText((y*state.gridSize)+x+1, x*size+size/2, y*size+size/2);
                    }
                }
            }

            // カーソル描画 (ソロ)
            if (state.mode === 'solo' && i === 0) {
                const cx = soloState.cursor.x;
                const cy = soloState.cursor.y;
                ctx.strokeStyle = '#e17055'; 
                ctx.lineWidth = Math.max(2, size / 8); 
                ctx.strokeRect(cx*size, cy*size, size, size);
                
                ctx.fillStyle = COLORS[soloState.currentColorId];
                ctx.globalAlpha = 0.5;
                const pad = size * 0.2;
                ctx.fillRect(cx*size + pad, cy*size + pad, size - pad*2, size - pad*2);
                ctx.globalAlpha = 1.0;
            }
        }
        requestAnimationFrame(renderLoop);
    }

    function handleKeyDown(e) {
        if (state.mode !== 'solo' || !state.isRunning) return;

        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
            return;
        }

        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp' || e.key === 'w') dy = -1;
        if (e.key === 'ArrowDown' || e.key === 's') dy = 1;
        if (e.key === 'ArrowLeft' || e.key === 'a') dx = -1;
        if (e.key === 'ArrowRight' || e.key === 'd') dx = 1;

        if (dx !== 0 || dy !== 0) {
            e.preventDefault();
            let nx = soloState.cursor.x + dx;
            let ny = soloState.cursor.y + dy;
            if (nx < 0) nx = 0;
            if (nx >= state.gridSize) nx = state.gridSize - 1;
            if (ny < 0) ny = 0;
            if (ny >= state.gridSize) ny = state.gridSize - 1;
            
            soloState.cursor.x = nx;
            soloState.cursor.y = ny;
        }

        if (e.key === 'z' || e.key === ' ' || e.key === 'Enter') {
            if(!e.ctrlKey) { 
                e.preventDefault();
                paintAt(0, soloState.cursor.x, soloState.cursor.y, soloState.currentColorId, true);
            }
        }
    }

    function onCanvasMouseDown(e) {
        if (!state.isRunning || state.mode !== 'solo') return;
        soloState.isDrawing = true;
        soloState.currentStroke = [];
        handleMousePaint(e);
    }
    function onCanvasMouseMove(e) {
        if (!state.isRunning || state.mode !== 'solo' || !soloState.isDrawing) return;
        handleMousePaint(e);
    }
    function onCanvasMouseUp(e) {
        if (soloState.isDrawing) {
            soloState.isDrawing = false;
            if (soloState.currentStroke.length > 0) {
                soloState.history.push([...soloState.currentStroke]);
                if(soloState.history.length > 50) soloState.history.shift();
            }
        }
    }

    function handleMousePaint(e) {
        const cvs = e.target;
        const rect = cvs.getBoundingClientRect();
        const size = cvs.width / state.gridSize;
        const x = Math.floor((e.clientX - rect.left) / size);
        const y = Math.floor((e.clientY - rect.top) / size);
        
        if (x < 0 || x >= state.gridSize || y < 0 || y >= state.gridSize) return;

        soloState.cursor.x = x;
        soloState.cursor.y = y;

        paintAt(0, x, y, soloState.currentColorId, false);
    }

    function paintAt(mapIndex, x, y, colorId, isKeyAction) {
        const map = state.maps[mapIndex];
        const prevColor = map[y][x];
        
        if (prevColor !== colorId) {
            map[y][x] = colorId;
            playSe('paint');
            const action = { mapIndex, x, y, prevColor, newColor: colorId };
            if (isKeyAction) soloState.history.push([action]);
            else soloState.currentStroke.push(action);
            updateScore();
        }
    }

    function undo() {
        if (soloState.history.length === 0) return;
        const actions = soloState.history.pop();
        actions.reverse().forEach(a => {
            state.maps[a.mapIndex][a.y][a.x] = a.prevColor;
        });
        playSe('paint');
    }

    function endGame() {
        state.isRunning = false;
        intervals.forEach(clearInterval);
        playSe('finish');

        const container = document.getElementById('result-art-container');
        container.innerHTML = '';
        
        const count = state.players;
        for(let i=0; i<count; i++) {
            const map = state.maps[i];
            const cvs = document.createElement('canvas');
            cvs.className = 'result-canvas';
            cvs.width = 600; cvs.height = 600;
            const ctx = cvs.getContext('2d');
            const size = cvs.width / state.gridSize;

            ctx.fillStyle = '#fff';
            ctx.fillRect(0,0,600,600);

            for(let y=0; y<state.gridSize; y++){
                for(let x=0; x<state.gridSize; x++){
                    const val = map[y][x];
                    if(val>0) {
                        ctx.fillStyle = COLORS[val];
                        ctx.fillRect(x*size, y*size, size, size);
                    }
                }
            }
            container.appendChild(cvs);
        }

        const rankList = document.getElementById('ranking-list');
        rankList.innerHTML = '';
        if (state.mode === 'stream') {
             const scores = [];
             for(let i=1; i<=state.players; i++) {
                 scores.push({ id: i, score: parseInt(document.getElementById(`score-${i}`).textContent), name: getPlayerName(i) });
             }
             scores.sort((a,b) => b.score - a.score);
             const maxScore = state.gridSize * state.gridSize; 
             scores.forEach((p, index) => {
                 const div = document.createElement('div');
                 div.className = 'rank-item';
                 div.innerHTML = `<div class="rank-bar" style="width: ${(p.score/maxScore)*100}%; background:${COLORS[p.id]||'#fff'}"></div><div class="rank-text"><span class="rank-num">${index+1}.</span><span>${p.name}</span><span class="rank-score">${p.score} px</span></div>`;
                 rankList.appendChild(div);
             });
        }

        const themeDisp = document.getElementById('result-theme-display');
        if (state.themeMode === 'common') {
            themeDisp.textContent = `Theme: ${document.getElementById('slot-adj').textContent} ${document.getElementById('slot-noun').textContent}`;
        } else {
            themeDisp.textContent = "";
        }
        document.getElementById('result-modal').classList.remove('hidden');
    }

function saveResultImage() {
        const canvases = document.querySelectorAll('#result-art-container canvas');
        if (canvases.length === 0) return;

        const combinedCanvas = document.createElement('canvas');
        const ctx = combinedCanvas.getContext('2d');
        const padding = 20;

        const cols = canvases.length > 1 ? 2 : 1;
        const rows = Math.ceil(canvases.length / cols);
        
        const unitW = canvases[0].width;
        const unitH = canvases[0].height;

        combinedCanvas.width = (unitW * cols) + (padding * (cols + 1));
        combinedCanvas.height = (unitH * rows) + (padding * (rows + 1));

        // 背景色（ダークグレーにして隙間を分かりやすくする場合）
        // ctx.fillStyle = '#2d3436'; 
        ctx.fillStyle = '#ffffff'; // 白背景
        ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

        canvases.forEach((cvs, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const x = padding + (c * (unitW + padding));
            const y = padding + (r * (unitH + padding));
            
            ctx.drawImage(cvs, x, y);

            // ★追加: 枠線を描画して区切りを明確にする
            ctx.strokeStyle = '#e2e8f0'; // 薄いグレーの枠線
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, unitW, unitH);
        });

        const link = document.createElement('a');
        link.download = `pixel_art_${new Date().getTime()}.jpg`;
        link.href = combinedCanvas.toDataURL('image/jpeg', 0.9);
        link.click();
    }

    function processComment(msg, authorName, authorId) {
        if (!authorId) authorId = authorName;

        let newColorId = -1;
        for (const def of COLOR_DEFINITIONS) {
            if (msg.includes(def.name)) {
                newColorId = def.id;
                break;
            }
        }
        
        if (newColorId !== -1) {
            if (!playersMap[authorId]) {
                const groupID = (totalEntries % state.players) + 1;
                playersMap[authorId] = { group: groupID, colorId: newColorId, name: authorName };
                totalEntries++;
                playSe('join');
                const slot = document.getElementById(`entry-slot-${groupID}`);
                if(slot) slot.style.borderColor = COLORS[groupID];
            } else {
                playersMap[authorId].colorId = newColorId;
            }
            return;
        }

        if (msg.includes('参加') || msg.includes('join')) {
            if (playersMap[authorId]) return;
            const groupID = (totalEntries % state.players) + 1;
            playersMap[authorId] = { group: groupID, colorId: groupID, name: authorName };
            totalEntries++;
            playSe('join');
            return;
        }

        if (!state.isRunning) return;

        let playerInfo = playersMap[authorId];
        if (!playerInfo) return;

        const normalizeMsg = msg.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
        const match = normalizeMsg.match(/(\d+)/);
        
        if (match) {
            const cellNum = parseInt(match[1], 10);
            const index = cellNum - 1;
            const x = index % state.gridSize;
            const y = Math.floor(index / state.gridSize);

            const targetMapIndex = playerInfo.group - 1;

            tryPaint(targetMapIndex, x, y, playerInfo.colorId);
        }
    }

    function tryPaint(mapIndex, x, y, colorId) {
        if (!state.maps[mapIndex]) return;
        if (x < 0 || x >= state.gridSize || y < 0 || y >= state.gridSize) return;
        if (state.maps[mapIndex][y][x] === colorId) return;

        state.maps[mapIndex][y][x] = colorId;
        playSe('paint');
        updateScore();
    }

    function updateScore() {
        const counts = {}; 
        for(let i=1; i<=state.players; i++) counts[i] = 0;
        state.maps.forEach((map, index) => {
            const teamId = index + 1;
            for(let y=0; y<state.gridSize; y++){
                for(let x=0; x<state.gridSize; x++){
                    const val = map[y][x];
                    if(val > 0) counts[teamId]++;
                }
            }
        });
        for(let i=1; i<=state.players; i++) {
            const el = document.getElementById(`score-${i}`);
            if(el) el.textContent = counts[i] + " px";
        }
    }

    function toggleSe() {
        state.seEnabled = !state.seEnabled;
        const btn = document.getElementById('bgm-toggle-btn');
        btn.textContent = state.seEnabled ? "🔊 SE: ON" : "🔈 SE: OFF";
    }
    
    function backToSetup() {
        document.getElementById('entry-modal').classList.add('hidden');
        document.getElementById('setup-modal').classList.remove('hidden');
        intervals.forEach(clearInterval);
        intervals = [];
    }
    function playSe(name) { 
        if (state.seEnabled && audio[name]) { 
            audio[name].currentTime = 0; 
            audio[name].play().catch(()=>{}); 
        } 
    }
    function getPlayerName(id) {
        if (state.mode === 'solo') return `Canvas ${id}`;
        const names = ["Pink", "Green", "Blue", "Yellow"];
        return names[id-1] || `P${id}`;
    }

    // ★追加: ガイドマップ描画関数
    function drawGuideMap() {
        const cvs = document.getElementById('guide-canvas');
        if(!cvs) return;
        const ctx = cvs.getContext('2d');
        
        // サイズ情報更新
        document.getElementById('guide-size-info').textContent = `${state.gridSize} x ${state.gridSize}`;

        // クリア
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        const size = cvs.width / state.gridSize;

        // グリッド線 (薄く)
        ctx.strokeStyle = '#e2e8f0'; 
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= state.gridSize; i++) {
            ctx.moveTo(i * size, 0);
            ctx.lineTo(i * size, cvs.height);
            ctx.moveTo(0, i * size);
            ctx.lineTo(cvs.width, i * size);
        }
        ctx.stroke();

        // 数字描画設定
        ctx.fillStyle = '#2d3436';
        const fontSize = Math.max(14, Math.floor(size * 0.6)); // 少し大きめに
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 表示するターゲット座標リスト
        // 四隅 + 中央付近の数点
        const targets = [];
        const gs = state.gridSize;
        const last = gs - 1;
        const mid = Math.floor(gs / 2);

        // 四隅
        targets.push({x:0, y:0}); // 左上
        targets.push({x:last, y:0}); // 右上
        targets.push({x:0, y:last}); // 左下
        targets.push({x:last, y:last}); // 右下
        
        // 中央
        targets.push({x:mid, y:mid});
        targets.push({x:mid-1, y:mid}); // 中央付近補足
        targets.push({x:mid, y:mid-1}); 

        // 描画ループ
        targets.forEach(p => {
            const num = (p.y * gs) + p.x + 1;
            // 背景を白で抜いて見やすくする
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(p.x * size + 2, p.y * size + 2, size - 4, size - 4);
            
            ctx.fillStyle = '#000';
            ctx.fillText(num, p.x * size + size / 2, p.y * size + size / 2);
        });

        // 省略記号 (...) の描画 (簡易的)
        ctx.fillStyle = '#a0aec0';
        ctx.font = `bold ${fontSize}px Arial`;
        // 左上と右上の間
        ctx.fillText("...", (mid * size) + size/2, size/2);
        // 左上と左下の間
        ctx.fillText(":", size/2, (mid * size) + size/2);
        
        // 表示
        document.getElementById('guide-map-box').classList.remove('hidden');
    }

    async function startYouTubeConnection() {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${TARGET_VIDEO_ID}&key=${YOUTUBE_API_KEY}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId;
                pollYouTubeChat();
            } else {
                alert("エラー: ライブ配信が見つかりません。");
                location.reload();
            }
        } catch (e) { console.error(e); }
    }
    async function pollYouTubeChat() {
        if (!liveChatId) return;
        let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${YOUTUBE_API_KEY}`;
        if (nextPageToken) url += `&pageToken=${nextPageToken}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.nextPageToken) nextPageToken = data.nextPageToken;
            if (data.items) {
                data.items.forEach(item => {
                    processComment(item.snippet.displayMessage, item.authorDetails.displayName, item.authorDetails.channelId);
                });
            }
            const interval = Math.max(data.pollingIntervalMillis || 3000, 2000);
            intervals.push(setTimeout(pollYouTubeChat, interval));
        } catch (e) {
            intervals.push(setTimeout(pollYouTubeChat, 10000));
        }
    }

    init();
});