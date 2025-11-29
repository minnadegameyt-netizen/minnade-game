// js/youtube.js

import * as state from './state.js';
import { ui } from './ui.js';

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

function processChatItems(items) {
    items.forEach(item => {
        const author = item.authorDetails.displayName;
        const message = item.snippet.displayMessage;
        
        const publishedAt = new Date(item.snippet.publishedAt);
        
        ui.addLiveComment(author, message);

        if (isVoting) {
            if (currentSessionStartTime && publishedAt < currentSessionStartTime) {
                return; 
            }

            const voteMatch = message.match(/^[1-9]$/);
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
            if (currentSessionStartTime && publishedAt < currentSessionStartTime) {
                return;
            }

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
    });
}

async function fetchYouTubeChat() {
    if (state.gameState.isGameOver || !state.youtubeSettings.apiKey || !state.youtubeSettings.liveChatId) return;

    let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${state.youtubeSettings.liveChatId}&part=snippet,authorDetails&key=${state.youtubeSettings.apiKey}`;
    if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("YouTube APIエラー:", data.error.message);
            if (data.error.code === 404 || data.error.code === 403) {
                 ui.typeWriter("YouTube連携エラー。APIキーまたはチャットIDを確認してください。");
                 return;
            }
        }

        if (data.items) {
            processChatItems(data.items);
        }
        
        nextPageToken = data.nextPageToken;
        const pollingInterval = data.pollingIntervalMillis || 5000;
        youtubeTimeoutId = setTimeout(fetchYouTubeChat, pollingInterval);

    } catch (error) {
        console.error('YouTubeチャットの取得に失敗しました:', error);
        youtubeTimeoutId = setTimeout(fetchYouTubeChat, 10000); 
    }
}

export function startYouTubeFetching(apiKey, liveChatId) {
    state.youtubeSettings.apiKey = apiKey;
    state.youtubeSettings.liveChatId = liveChatId;
    if (youtubeTimeoutId) clearTimeout(youtubeTimeoutId);
    fetchYouTubeChat();
}

export function stopYouTubeFetching() {
    if (youtubeTimeoutId) clearTimeout(youtubeTimeoutId);
    youtubeTimeoutId = null;
}

export function startVote(choices) {
    return new Promise(resolve => {
        isVoting = true;
        voteResolve = resolve;
        currentChoices = choices;
        voteCounts = {};
        choices.forEach(cmd => { voteCounts[cmd] = 0; });
        
        currentSessionStartTime = new Date();

        ui.updateVoteDisplay(voteCounts);

        // --- ▼▼▼ ここから修正 ▼▼▼ ---
        let timeLeft = state.youtubeSettings.voteDuration;

        // 両方のタイマー要素を取得
        const mainVoteTimer = ui.voteTimer;
        const quizTimer = document.getElementById('quiz-timer');

        // 初期表示
        if (mainVoteTimer) mainVoteTimer.textContent = timeLeft;
        if (quizTimer) quizTimer.textContent = `TIME: ${timeLeft}`;

        const timerId = setInterval(() => {
            timeLeft--;
            // 両方のタイマーが存在すれば更新
            if (mainVoteTimer) mainVoteTimer.textContent = timeLeft;
            if (quizTimer) quizTimer.textContent = `TIME: ${timeLeft}`;
            
            if (timeLeft <= 0) {
                clearInterval(timerId);
                endVote();
            }
        }, 1000);
        // --- ▲▲▲ 修正ここまで ▲▲▲ ---
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
    
    const finalWinner = winners[Math.floor(Math.random() * winners.length)];

    isVoting = false;
    currentChoices = [];
    if (voteResolve) {
        voteResolve(finalWinner);
        voteResolve = null;
    }
}

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