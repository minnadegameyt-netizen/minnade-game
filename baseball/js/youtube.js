import * as state from './state.js';
import { ui } from './ui.js';
// ★Twitchモジュールをインポート
import * as twitch from '../../twitch.js';

let nextPageToken = null;
let youtubeTimeoutId = null;

let isVoting = false;
let voteCounts = {};
let currentChoices = [];
let voteResolve = null;

let keywordCounts = {};
let isKeywordCounting = false;
let keywordResolve = null;

let currentSessionStartTime = null;

// --- 共通処理: メッセージ受信時の挙動 ---
function handleMessage(message, authorName, publishedAt = new Date()) {
    ui.addLiveComment(authorName, message);

    if (isVoting) {
        if (currentSessionStartTime && publishedAt < currentSessionStartTime) return;

        // 数字投票 (1, 2, 3...)
        // 全角数字も半角に変換してチェック
        const normalizeMsg = message.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
        const voteMatch = normalizeMsg.match(/^[1-9]$/);
        
        if (voteMatch) {
            const voteNumber = parseInt(voteMatch[0], 10);
            if (voteNumber > 0 && voteNumber <= currentChoices.length) {
                const choiceText = currentChoices[voteNumber - 1];
                voteCounts[choiceText] = (voteCounts[choiceText] || 0) + 1;
                ui.updateVoteDisplay(voteCounts);
            }
        }
    }
    
    if (isKeywordCounting) {
        if (currentSessionStartTime && publishedAt < currentSessionStartTime) return;

        let updated = false;
        for (const keyword in keywordCounts) {
            if (message.toLowerCase().includes(keyword)) {
                keywordCounts[keyword]++;
                updated = true;
            }
        }
        if (updated) {
            ui.updateShuttleRunScore(keywordCounts['run'] || 0);
        }
    }
}

// --- YouTube関連 ---
async function fetchYouTubeChat() {
    if (state.gameState.isGameOver || !state.streamSettings.apiKey || !state.streamSettings.liveChatId) return;

    let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${state.streamSettings.liveChatId}&part=snippet,authorDetails&key=${state.streamSettings.apiKey}`;
    if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("YouTube APIエラー:", data.error.message);
            // エラー時は少し待って再試行
            youtubeTimeoutId = setTimeout(fetchYouTubeChat, 10000);
            return;
        }

        if (data.items) {
            data.items.forEach(item => {
                const author = item.authorDetails.displayName;
                const message = item.snippet.displayMessage;
                const publishedAt = new Date(item.snippet.publishedAt);
                handleMessage(message, author, publishedAt);
            });
        }
        
        nextPageToken = data.nextPageToken;
        const pollingInterval = data.pollingIntervalMillis || 5000;
        youtubeTimeoutId = setTimeout(fetchYouTubeChat, pollingInterval);

    } catch (error) {
        console.error('YouTubeチャットの取得に失敗しました:', error);
        youtubeTimeoutId = setTimeout(fetchYouTubeChat, 10000); 
    }
}

export async function testYouTubeConnection(apiKey, videoId) {
    try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.items && data.items.length > 0 && data.items[0].liveStreamingDetails?.activeLiveChatId) {
            state.streamSettings.apiKey = apiKey;
            state.streamSettings.liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId;
            return true;
        } else {
            alert("ライブチャットが見つかりません。");
            return false;
        }
    } catch(e) {
        console.error(e);
        alert("接続エラー");
        return false;
    }
}

export function startYouTubeFetching(apiKey, liveChatId) {
    if (state.streamSettings.platform !== 'youtube') return; // YouTubeモード以外なら何もしない
    
    state.streamSettings.apiKey = apiKey;
    state.streamSettings.liveChatId = liveChatId;
    if (youtubeTimeoutId) clearTimeout(youtubeTimeoutId);
    fetchYouTubeChat();
}

export function stopYouTubeFetching() {
    if (youtubeTimeoutId) clearTimeout(youtubeTimeoutId);
    youtubeTimeoutId = null;
}

// --- Twitch関連 ---
export async function connectTwitch(channelId) {
    // Twitchからのメッセージを受け取るコールバック
    const onMessage = (message, authorName) => {
        handleMessage(message, authorName);
    };
    await twitch.connectTwitch(channelId, onMessage);
}

export function disconnectTwitch() {
    twitch.disconnectTwitch();
}


// --- 投票システム ---
export function startVote(choices) {
    return new Promise(resolve => {
        isVoting = true;
        voteResolve = resolve;
        currentChoices = choices;
        voteCounts = {};
        choices.forEach(cmd => { voteCounts[cmd] = 0; });
        
        currentSessionStartTime = new Date();

        ui.updateVoteDisplay(voteCounts);

        let timeLeft = state.streamSettings.voteDuration;

        const mainVoteTimer = ui.voteTimer;
        // const quizTimer = document.getElementById('quiz-timer'); // 必要なら

        if (mainVoteTimer) mainVoteTimer.textContent = timeLeft;

        const timerId = setInterval(() => {
            timeLeft--;
            if (mainVoteTimer) mainVoteTimer.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timerId);
                endVote();
            }
        }, 1000);
    });
}

function endVote() {
    if (!isVoting) return;
    
    let maxVotes = -1;
    let winners = [];
    for (const choice in voteCounts) {
        if (voteCounts[choice] > maxVotes) {
            maxVotes = voteCounts[choice];
            winners = [choice];
        } else if (voteCounts[choice] === maxVotes) {
            winners.push(choice);
        }
    }
    
    // 投票が0票ならランダム
    let finalWinner;
    if (maxVotes === 0) {
        finalWinner = currentChoices[Math.floor(Math.random() * currentChoices.length)];
    } else {
        finalWinner = winners[Math.floor(Math.random() * winners.length)];
    }

    isVoting = false;
    currentChoices = [];
    if (voteResolve) {
        voteResolve(finalWinner);
        voteResolve = null;
    }
}

// --- キーワードカウント (シャトルラン用) ---
export function startKeywordCount(keywords, duration) {
    return new Promise(resolve => {
        isKeywordCounting = true;
        keywordResolve = resolve;
        keywordCounts = {};
        keywords.forEach(kw => { keywordCounts[kw.toLowerCase()] = 0; });
        
        currentSessionStartTime = new Date();

        setTimeout(() => {
            isKeywordCounting = false;
            if(keywordResolve) {
                keywordResolve(keywordCounts);
                keywordResolve = null;
            }
        }, duration * 1000);
    });
}