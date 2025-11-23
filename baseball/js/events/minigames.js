// js/minigames.js

import * as state from '../state.js';
import { ui } from '../ui.js';
import { playSfx, playLoopSfx, stopLoopSfx } from '../sound.js';
import { generalQuizzes, baseballQuizzes } from './events-data.js';
import * as youtube from '../youtube.js'; 

export async function runSenkyuganChallenge() {
    return new Promise(async resolve => {
        const kanjiList = ["速", "力", "技", "心", "体", "守", "走", "打", "投", "捕"];
        const challengeKanji = [];
        for (let i = 0; i < 4; i++) {
            challengeKanji.push(kanjiList[Math.floor(Math.random() * kanjiList.length)]);
        }

        ui.eventChoicesWindow.innerHTML = `<div id="senkyugan-display" style="font-size: 4em; font-weight: bold;"></div>`;
        const display = document.getElementById('senkyugan-display');

        await ui.typeWriter("集中しろ…！");
        await ui.waitForUserAction();

        for (let i = 0; i < 4; i++) {
            await new Promise(r => setTimeout(r, 250));
            display.textContent = challengeKanji[i];
            await new Promise(r => setTimeout(r, 1000));
            display.textContent = "";
        }

        await ui.typeWriter("表示された4つの漢字の中から、正しくないものを一つ選べ");
        await ui.waitForUserAction(); 

        const dummyKanji = kanjiList.filter(k => !challengeKanji.includes(k))[0];
        const choices = [...challengeKanji, dummyKanji].sort(() => 0.5 - Math.random());
        
        const answer = await ui.waitForChoice(choices);

        if (answer === dummyKanji) {
            resolve(true);
        } else {
            resolve(false);
        }
    });
}

export async function runRoulette(options) {
    return new Promise(resolve => {
        ui.eventChoicesWindow.innerHTML = "";
        const display = document.createElement("div");
        display.className = "roulette-display";
        ui.eventChoicesWindow.appendChild(display);

        let spinCount = 0;
        
        playLoopSfx('roulette');

        const spinInterval = setInterval(() => {
            display.textContent = options[spinCount % options.length];
            spinCount++;
        }, 80);

        setTimeout(() => {
            clearInterval(spinInterval);
            
            stopLoopSfx('roulette');
            playSfx('roulette_stop');

            const resultIndex = Math.floor(Math.random() * options.length);
            const result = options[resultIndex];
            display.textContent = result;
            display.classList.add("roulette-result");
            setTimeout(() => resolve(result), 1500);
        }, 2500);
    });
}


export async function runShuttleRun() {
    if (state.gameState.gameMode === 'streamer' && state.gameState.isAudienceMode) {
        return new Promise(async resolve => {
            const TIME_LIMIT = state.youtubeSettings.voteDuration || 12;
            
            await ui.typeWriter("シャトルラン勝負！<br>制限時間内に 'run' とコメントしまくれ！");
            
            ui.eventChoicesWindow.innerHTML = `
                <div class="shuttle-run-ui">
                    <div id="shuttle-timer" style="font-size: 2em; color: #ecc94b;">TIME: ${TIME_LIMIT}</div>
                    <div id="shuttle-score" style="font-size: 2.5em; font-weight: bold; margin: 20px 0;">SCORE: 0</div>
                    <p>コメント欄に "run" と入力！</p>
                </div>
            `;

            let timeLeft = TIME_LIMIT;
            const timerDisplay = document.getElementById('shuttle-timer');
            const timerInterval = setInterval(() => {
                timeLeft--;
                if(timerDisplay) timerDisplay.textContent = `TIME: ${timeLeft}`;
                if (timeLeft <= 0) clearInterval(timerInterval);
            }, 1000);

            const result = await youtube.startKeywordCount(['run'], TIME_LIMIT);
            
            clearInterval(timerInterval);
            if(timerDisplay) timerDisplay.textContent = "FINISH!";
            
            const score = result['run'] || 0;
            await new Promise(r => setTimeout(r, 1500));
            
            resolve(score);
        });
    }

    return new Promise(resolve => {
        const TIME_LIMIT = 12;
        let timeLeft = TIME_LIMIT;
        let score = 0;

        ui.eventChoicesWindow.innerHTML = `
            <div class="shuttle-run-ui">
                <div id="shuttle-timer" style="font-size: 2em; color: #ecc94b;">TIME: ${timeLeft}</div>
                <div id="shuttle-score" style="font-size: 1.5em;">SCORE: 0</div>
                <input type="text" id="shuttle-input" placeholder="ここに 'run' と入力！" autocomplete="off" />
            </div>
        `;

        const timerDisplay = document.getElementById('shuttle-timer');
        const scoreDisplay = document.getElementById('shuttle-score');
        const inputField = document.getElementById('shuttle-input');
        
        setTimeout(() => inputField.focus(), 100);

        inputField.addEventListener('input', () => {
            if (inputField.value.toLowerCase() === 'run') {
                score++;
                scoreDisplay.textContent = `SCORE: ${score}`;
                inputField.value = '';
            }
        });

        const timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = `TIME: ${timeLeft}`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
            }
        }, 1000);

        setTimeout(() => {
            inputField.disabled = true;
            inputField.placeholder = "終了！";
            timerDisplay.textContent = "FINISH!";
            setTimeout(() => {
                resolve(score);
            }, 1500);
        }, TIME_LIMIT * 1000);
    });
}

export async function runSelectionQuiz(quizType, maxQuestions) {
    const quizSet = quizType === 'general' ? generalQuizzes : baseballQuizzes;
    let correctAnswers = 0;
    const shuffledQuizzes = [...quizSet].sort(() => 0.5 - Math.random());

    for (let i = 0; i < maxQuestions; i++) {
        const currentQuiz = shuffledQuizzes[i];
        if (!currentQuiz) break;
        const isCorrect = await showSingleQuiz(currentQuiz, i + 1, maxQuestions);
        if (isCorrect) {
            correctAnswers++;
            if (i < maxQuestions - 1) {
                await ui.typeWriter("次の問題！");
                await ui.waitForUserAction();
            }
        } else {
            break;
        }
    }
    return correctAnswers;
}

function showSingleQuiz(quiz, currentQuestionNum, totalQuestions) {
    return new Promise(async resolve => {
        let timeLimit = 10;
        
        if (state.gameState.gameMode === 'streamer') {
            timeLimit = state.youtubeSettings.voteDuration || 15;
        } else {
            timeLimit = 20; 
        }

        let timeLeft = timeLimit;
        let timerInterval = null;
        let resolved = false;

        ui.eventChoicesWindow.innerHTML = `
            <div class="selection-quiz-ui">
                <div class="quiz-header">第${currentQuestionNum}問 / 全${totalQuestions}問</div>
                <div class="quiz-question">${quiz.question}</div>
                <div id="quiz-timer" class="quiz-timer">TIME: ${timeLeft}</div>
                <div id="quiz-choices" class="quiz-choices-container"></div>
            </div>
        `;
        
        const timerDisplay = document.getElementById('quiz-timer');
        const choicesContainer = document.getElementById('quiz-choices');

        const handleAnswer = (selectedAnswer) => {
            if (resolved) return;
            resolved = true;
            clearInterval(timerInterval);
            
            const allButtons = Array.from(choicesContainer.children);
            allButtons.forEach(b => b.disabled = true);
            const clickedButton = allButtons.find(b => b.textContent.includes(selectedAnswer));

            const isCorrect = selectedAnswer === quiz.answer;

            if (isCorrect) {
                playSfx('quiz_correct');
                if (clickedButton) clickedButton.style.backgroundColor = '#48bb78';
                timerDisplay.textContent = "正解！";
            } else {
                playSfx('quiz_incorrect');
                if (clickedButton) clickedButton.style.backgroundColor = '#f56565';
                const correctButton = allButtons.find(b => b.textContent.includes(quiz.answer));
                if (correctButton) correctButton.style.backgroundColor = '#48bb78';
                timerDisplay.textContent = "不正解…";
            }
            setTimeout(() => resolve(isCorrect), 1500);
        };

        if (state.gameState.gameMode === 'streamer' && state.gameState.isAudienceMode) {
             quiz.choices.forEach((choice, index) => {
                const btn = document.createElement('button');
                btn.className = 'choice-btn is-voting';
                btn.innerHTML = `<span class="choice-number">${index + 1}.</span> ${choice}`;
                choicesContainer.appendChild(btn);
            });
            const winnerChoice = await youtube.startVote(quiz.choices);
            handleAnswer(winnerChoice);
        } else {
            quiz.choices.forEach((choice, index) => {
                const btn = document.createElement('button');
                btn.className = 'choice-btn';
                btn.innerHTML = `<span class="choice-number">${index + 1}.</span> ${choice}`;
                btn.onclick = () => handleAnswer(choice);
                choicesContainer.appendChild(btn);
            });
        }

        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = `TIME: ${timeLeft}`;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);

                if (state.gameState.gameMode === 'streamer' && state.gameState.isAudienceMode) {
                    timerDisplay.textContent = "集計中...";
                    return;
                }

                if(resolved) return;
                resolved = true;
                playSfx('quiz_incorrect');
                timerDisplay.textContent = "時間切れ！";
                Array.from(choicesContainer.children).forEach(b => b.disabled = true);
                setTimeout(() => resolve(false), 1500);
            }
        }, 1000);
    });
}

export async function runTestRoulette(playerIntelligence) {
    return new Promise(resolve => {
        let redMarkCount = 0;
        if (playerIntelligence >= 80) redMarkCount = 0;
        else if (playerIntelligence >= 50) redMarkCount = 1;
        else if (playerIntelligence >= 35) redMarkCount = 2;
        else if (playerIntelligence >= 25) redMarkCount = 3;
        else if (playerIntelligence >= 10) redMarkCount = 5;
        else redMarkCount = 8;

        const options = [];
        for (let i = 0; i < 10; i++) {
            options.push(i < redMarkCount ? '赤点' : 'セーフ');
        }
        options.sort(() => Math.random() - 0.5);

        const reelItems = [...options, ...options, ...options];
        ui.eventChoicesWindow.innerHTML = `
            <div class="test-roulette-container">
                <div class="test-roulette-reel">
                    ${reelItems.map(item => `
                        <div class="test-roulette-cell ${item === '赤点' ? 'cell-akaten' : 'cell-safe'}">
                            ${item}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const reel = document.querySelector('.test-roulette-reel');
        const cellWidth = 60;
        
        playLoopSfx('roulette');

        const randomIndex = 10 + Math.floor(Math.random() * 10);
        const finalPosition = -((randomIndex * cellWidth) - (reel.parentElement.clientWidth / 2) + (cellWidth / 2));
        
        reel.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)';
        reel.style.transform = `translateX(${finalPosition}px)`;

        setTimeout(() => {
            stopLoopSfx('roulette');
            playSfx('roulette_stop');
            resolve(reelItems[randomIndex]);
        }, 3500);
    });
}

export async function runJanken() {
    if (state.gameState.gameMode === 'streamer' && state.gameState.isAudienceMode) {
        return new Promise(async resolve => {
            await ui.typeWriter("じゃんけん勝負！コメントで投票してください！<br>1. グー, 2. チョキ, 3. パー");
            const choices = ["グー", "チョキ", "パー"];
            const cpuChoice = choices[Math.floor(Math.random() * 3)];
            let result;

            const playerChoice = await youtube.startVote(choices);
            
            if (playerChoice === cpuChoice) result = 'draw';
            else if ((playerChoice === "グー" && cpuChoice === "チョキ") || (playerChoice === "チョキ" && cpuChoice === "パー") || (playerChoice === "パー" && cpuChoice === "グー")) result = 'win';
            else result = 'lose';

            await ui.typeWriter(`みんなの選択は「${playerChoice}」、相手は「${cpuChoice}」！<br>${result === 'win' ? 'あなたの勝ち！' : result === 'lose' ? 'あなたの負け...' : 'あいこ！'}`);
            resolve(result);
        });
    }

    return new Promise(resolve => {
        ui.eventChoicesWindow.innerHTML = `
            <div id="janken-ui" style="text-align: center; width: 100%;">
                <p id="janken-result-text" style="min-height: 2em; margin-bottom: 15px;"></p>
                <div id="janken-choices" class="command-choices-container">
                    <button class="choice-btn">グー</button>
                    <button class="choice-btn">チョキ</button>
                    <button class="choice-btn">パー</button>
                </div>
            </div>
        `;

        const resultText = document.getElementById('janken-result-text');
        const choiceContainer = document.getElementById('janken-choices');
        
        const playGame = async (playerChoice) => {
            const choices = ["グー", "チョキ", "パー"];
            const cpuChoice = choices[Math.floor(Math.random() * 3)];
            let result;

            if (playerChoice === cpuChoice) {
                result = 'draw';
            } else if ( (playerChoice === "グー" && cpuChoice === "チョキ") || (playerChoice === "チョキ" && cpuChoice === "パー") || (playerChoice === "パー" && cpuChoice === "グー") ) {
                result = 'win';
            } else {
                result = 'lose';
            }
            
            resultText.innerHTML = `相手は${cpuChoice}を出した！<br>${result === 'win' ? 'あなたの勝ち！' : result === 'lose' ? 'あなたの負け...' : 'あいこ！もう一回！'}`;
            playSfx(result === 'draw' ? 'select' : result === 'win' ? 'point' : 'negative');
            
            if (result !== 'draw') {
                choiceContainer.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
                await new Promise(r => setTimeout(r, 1500));
                resolve(result);
            }
        };

        choiceContainer.querySelectorAll('.choice-btn').forEach(btn => {
            btn.onclick = () => playGame(btn.textContent);
        });
    });
}