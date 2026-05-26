// ============================================
// State
// ============================================
const state = {
    targetText: CONFIG.DEFAULT_TEXT,
    userInput: '',
    timerInterval: null,
    gameActive: false,
    isPaused: false,
    errors: 0,
    totalKeysPressed: 0,
    correctKeys: 0,
    currentStreak: 0,
    bestStreak: 0,
    startTime: null,
    pausedTime: 0,
    student: { name: '', id: '', account: '' }
};

// ============================================
// DOM Elements
// ============================================
const dom = {
    textDisplay: document.getElementById('textDisplay'),
    hiddenInput: document.getElementById('hiddenInput'),
    timerDisplay: document.getElementById('timer'),
    speedDisplay: document.getElementById('speedDisplay'),
    accuracyDisplay: document.getElementById('accuracyDisplay'),
    errorDisplay: document.getElementById('errorDisplay'),
    progressDisplay: document.getElementById('progressDisplay'),
    comboDisplay: document.getElementById('comboDisplay'),
    progressBar: document.getElementById('progressBar'),
    studentInfoDisplay: document.getElementById('studentInfoDisplay'),
    resultModal: document.getElementById('resultModal'),
    articleModal: document.getElementById('articleModal'),
    articleGrid: document.getElementById('articleGrid'),
    uploadStatus: document.getElementById('uploadStatus'),
    resultStats: document.getElementById('resultStats'),
    resultTitle: document.getElementById('resultTitle'),
    resultGrade: document.getElementById('resultGrade'),
    keyboard: document.getElementById('keyboard'),
    loginModal: document.getElementById('loginModal'),
    loginAccount: document.getElementById('loginAccount'),
    loginPassword: document.getElementById('loginPassword'),
    loginBtn: document.getElementById('loginBtn'),
    loginError: document.getElementById('loginError'),
    loggedInInfo: document.getElementById('loggedInInfo'),
    loggedInName: document.getElementById('loggedInName'),
    userAvatar: document.getElementById('userAvatar'),
    logoutBtn: document.getElementById('logoutBtn'),
    openLoginBtn: document.getElementById('openLoginBtn'),
    actionBtnText: document.getElementById('actionBtnText'),
    pauseBtn: document.getElementById('pauseBtn'),
    pauseOverlay: document.getElementById('pauseOverlay'),
    resumeBtn: document.getElementById('resumeBtn'),
    restartBtn: document.getElementById('restartBtn'),
    countdownOverlay: document.getElementById('countdownOverlay'),
    countdownNumber: document.getElementById('countdownNumber'),
    confettiCanvas: document.getElementById('confettiCanvas')
};

// ============================================
// Audio System
// ============================================
const AudioSystem = {
    ctx: null,
    init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },
    play(type) {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        switch(type) {
            case 'correct':
                osc.frequency.value = 600 + Math.random() * 200;
                gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
                gain.gain.exponentialDecayTo && gain.gain.exponentialDecayTo(0.01, this.ctx.currentTime + 0.1);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.08);
                break;
            case 'error':
                osc.frequency.value = 150;
                osc.type = 'square';
                gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.12);
                break;
            case 'combo':
                osc.frequency.value = 800 + state.currentStreak * 50;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.1);
                break;
            case 'start':
                osc.frequency.value = 440;
                gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.15);
                break;
            case 'end':
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.3);
                break;
        }
    }
};

// ============================================
// Confetti System
// ============================================
const ConfettiSystem = {
    particles: [],
    ctx: null,
    init() {
        this.ctx = dom.confettiCanvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },
    resize() {
        this.ctx.canvas.width = window.innerWidth;
        this.ctx.canvas.height = window.innerHeight;
    },
    burst() {
        const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
        for (let i = 0; i < 150; i++) {
            this.particles.push({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20 - 10,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                gravity: 0.3
            });
        }
        this.animate();
    },
    animate() {
        if (this.particles.length === 0) return;
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.rotation += p.rotationSpeed;
            
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation * Math.PI / 180);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            this.ctx.restore();
            
            return p.y < window.innerHeight + 50;
        });
        
        requestAnimationFrame(() => this.animate());
    }
};

// ============================================
// Login Functions
// ============================================
function handleLogin() {
    const account = dom.loginAccount.value.replace(/\s+/g, '').toLowerCase();
    const password = dom.loginPassword.value.replace(/\s+/g, '');

    if (!account || !password) {
        dom.loginError.textContent = '請輸入帳號和密碼';
        dom.loginError.classList.add('show');
        return;
    }

    const studentData = STUDENT_ACCOUNTS[account];
    if (!studentData) {
        const lowerAccount = account.toLowerCase();
        for (const key in STUDENT_ACCOUNTS) {
            if (key.toLowerCase() === lowerAccount) {
                const data = STUDENT_ACCOUNTS[key];
                if (data.password === password) {
                    loginSuccess(key, data);
                    return;
                } else {
                    dom.loginError.textContent = '密碼錯誤';
                    dom.loginError.classList.add('show');
                    return;
                }
            }
        }
        dom.loginError.textContent = '帳號不存在';
        dom.loginError.classList.add('show');
        return;
    }

    if (studentData.password !== password) {
        dom.loginError.textContent = '密碼錯誤';
        dom.loginError.classList.add('show');
        return;
    }

    loginSuccess(account, studentData);
}

function loginSuccess(account, studentData) {
    state.student.name = studentData.name;
    state.student.id = studentData.classId;
    state.student.account = account;

    dom.loginError.classList.remove('show');
    dom.studentInfoDisplay.textContent = `${studentData.name} (${studentData.classId})`;

    dom.loggedInName.textContent = studentData.name;
    dom.userAvatar.textContent = studentData.name.charAt(0);
    dom.loggedInInfo.classList.remove('hidden');
    dom.openLoginBtn.classList.add('hidden');
    dom.actionBtnText.textContent = '選擇文章 📚';

    dom.loginAccount.value = '';
    dom.loginPassword.value = '';

    // 先關閉登入彈窗
    dom.loginModal.classList.add('hidden');
    
    // 隱藏文章預覽提示
    const previewEl = document.getElementById('textPreview');
    if (previewEl) previewEl.classList.add('hidden');
    
    // 登入後自動載入預設文章
    state.targetText = CONFIG.DEFAULT_ARTICLE;
    state.userInput = '';
    renderText();
    updateHint();
    
    // 重置遊戲狀態
    dom.timerDisplay.textContent = '05:00';
    dom.speedDisplay.textContent = '0.00';
    dom.accuracyDisplay.textContent = '100%';
    dom.errorDisplay.textContent = '0';
    dom.progressDisplay.textContent = '0%';
    dom.comboDisplay.textContent = '0';
    dom.pauseBtn.classList.add('hidden');
    
    // 延遲後聚焦輸入框
    setTimeout(() => {
        dom.hiddenInput.focus();
    }, 100);
}

function handleLogout() {
    state.student = { name: '', id: '', account: '' };
    dom.studentInfoDisplay.textContent = '未登錄';
    dom.loggedInInfo.classList.add('hidden');
    dom.openLoginBtn.classList.remove('hidden');
    dom.loginAccount.value = '';
    dom.loginPassword.value = '';
    dom.loginError.classList.remove('show');
    dom.actionBtnText.textContent = '自訂文章';
    dom.pauseBtn.classList.add('hidden');
    
    // 登出後顯示預設歡迎文字
    state.targetText = CONFIG.DEFAULT_TEXT;
    initGame();
}

// ============================================
// Article Selection
// ============================================
function renderArticleModal() {
    dom.articleGrid.innerHTML = ARTICLES.map(article => {
        const catClass = article.category === 'P2' ? 'p2' : 'p3plus';
        return `
            <div class="article-card ${catClass}" data-id="${article.id}">
                <div class="article-card-category">${article.category}</div>
                <div class="article-card-title">${article.title}</div>
                <div class="article-card-desc">${article.description}</div>
                <div class="article-card-chars">${article.content.length} 字</div>
            </div>
        `;
    }).join('');
}

function openArticleModal() {
    if (!state.student.name) {
        dom.loginModal.classList.remove('hidden');
        dom.loginAccount.focus();
        return;
    }
    renderArticleModal();
    dom.articleModal.classList.remove('hidden');
}

function selectArticle(articleId) {
    const article = ARTICLES.find(a => a.id === articleId);
    if (!article) return;

    state.targetText = article.content;
    state.userInput = '';
    state.gameActive = false;
    state.isPaused = false;
    state.errors = 0;
    state.totalKeysPressed = 0;
    state.correctKeys = 0;
    state.currentStreak = 0;
    state.bestStreak = 0;
    state.startTime = null;
    state.pausedTime = 0;
    clearInterval(state.timerInterval);
    state.timerInterval = null;

    dom.timerDisplay.textContent = '05:00';
    dom.speedDisplay.textContent = '0.00';
    dom.accuracyDisplay.textContent = '100%';
    dom.errorDisplay.textContent = '0';
    dom.progressDisplay.textContent = '0%';
    dom.comboDisplay.textContent = '0';
    dom.pauseBtn.classList.add('hidden');

    dom.articleModal.classList.add('hidden');
    renderText();
    updateHint();
    dom.hiddenInput.focus();
}

// ============================================
// Keyboard Rendering
// ============================================
function renderKeyboard() {
    dom.keyboard.innerHTML = KEYBOARD_LAYOUT.map(row => {
        const keys = row.map(key => {
            const widthClass = key.width ? `key-${key.width}` : '';
            return `<div class="key ${key.finger} ${widthClass}" id="${key.id}">${key.label}</div>`;
        }).join('');
        return `<div class="kb-row">${keys}</div>`;
    }).join('');
}

// ============================================
// Core Functions
// ============================================
function initGame() {
    state.gameActive = false;
    state.isPaused = false;
    state.userInput = '';
    state.errors = 0;
    state.totalKeysPressed = 0;
    state.correctKeys = 0;
    state.currentStreak = 0;
    state.bestStreak = 0;
    state.startTime = null;
    state.pausedTime = 0;
    clearInterval(state.timerInterval);
    state.timerInterval = null;

    dom.timerDisplay.textContent = '05:00';
    dom.speedDisplay.textContent = '0.00';
    dom.accuracyDisplay.textContent = '100%';
    dom.errorDisplay.textContent = '0';
    dom.progressDisplay.textContent = '0%';
    dom.comboDisplay.textContent = '0';
    dom.hiddenInput.value = '';
    dom.pauseBtn.classList.add('hidden');

    renderText();
    updateHint();
}

function startCountdown(callback) {
    dom.countdownOverlay.classList.remove('hidden');
    let count = 3;
    dom.countdownNumber.textContent = count;
    
    const tick = setInterval(() => {
        count--;
        if (count > 0) {
            dom.countdownNumber.textContent = count;
            dom.countdownNumber.style.animation = 'none';
            void dom.countdownNumber.offsetWidth;
            dom.countdownNumber.style.animation = 'pulse 0.3s ease-out';
        } else {
            clearInterval(tick);
            dom.countdownNumber.textContent = 'GO!';
            AudioSystem.play('start');
            setTimeout(() => {
                dom.countdownOverlay.classList.add('hidden');
                callback();
            }, 500);
        }
    }, 800);
}

function scrollToCurrentChar() {
    const textContent = dom.textDisplay.querySelector('.text-content');
    const currentChar = dom.textDisplay.querySelector('.current');
    if (!textContent || !currentChar) return;

    const currentLine = currentChar.closest('.line-block');
    if (!currentLine) return;

    const lineTop = currentLine.offsetTop;
    const lineHeight = currentLine.offsetHeight;
    const containerTop = textContent.scrollTop;
    const containerHeight = textContent.clientHeight;

    // Scroll so current line is at top, showing one line below for context
    if (lineTop < containerTop) {
        textContent.scrollTop = lineTop - 40;
    } else if (lineTop + lineHeight > containerTop + containerHeight - lineHeight) {
        // Keep current line visible with one extra line below
        textContent.scrollTop = lineTop - lineHeight - 40;
    }
}

function renderText() {
    dom.textDisplay.innerHTML = '';

    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-bar-container';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.id = 'progressBar';
    progressContainer.appendChild(progressBar);
    dom.textDisplay.appendChild(progressContainer);

    const textContent = document.createElement('div');
    textContent.className = 'text-content';

    const lines = state.targetText.split('\n');
    let index = 0;

    lines.forEach((lineText, lineIdx) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'line-block';

        // Group characters into words (continuous non-space characters)
        let currentWord = [];
        let i = 0;

        function flushWord() {
            if (currentWord.length > 0) {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'word-span';
                currentWord.forEach(charData => {
                    const span = createCharSpan(charData.char, charData.index, false);
                    wordSpan.appendChild(span);
                });
                lineDiv.appendChild(wordSpan);
                currentWord = [];
            }
        }

        while (i < lineText.length) {
            const char = lineText[i];

            if (char === ' ') {
                flushWord();
                const spaceSpan = createCharSpan(' ', index, false);
                lineDiv.appendChild(spaceSpan);
                index++;
                i++;
            } else {
                currentWord.push({ char, index });
                index++;
                i++;
            }
        }
        flushWord();

        if (lineIdx < lines.length - 1) {
            const newlineSpan = createCharSpan('\n', index, true);
            lineDiv.appendChild(newlineSpan);
            index++;
        }

        textContent.appendChild(lineDiv);
    });

    dom.textDisplay.appendChild(textContent);
    dom.progressBar = document.getElementById('progressBar');

    // Auto-scroll to current character position
    requestAnimationFrame(() => scrollToCurrentChar());
}

function createCharSpan(char, index, isNewline = false) {
    const span = document.createElement('span');
    span.className = 'char' + (isNewline ? ' newline' : '');
    span.textContent = isNewline ? '' : char;

    if (index < state.userInput.length) {
        const inputChar = state.userInput[index];
        // 移除 toLowerCase()，嚴格匹配大小寫
        const isCorrect = inputChar === char; 
        span.classList.add(isCorrect ? 'correct' : 'incorrect');
    } else if (index === state.userInput.length) {
        span.classList.add('current');
    }

    return span;
}

function updateHint() {
    document.querySelectorAll('.key').forEach(k => k.classList.remove('active-hint'));

    if (state.userInput.length >= state.targetText.length) return;

    const nextChar = state.targetText[state.userInput.length];

    if (nextChar === '\n') {
        getKey('key-enter')?.classList.add('active-hint');
        return;
    }

    if (nextChar === '\t') {
        getKey('key-tab')?.classList.add('active-hint');
        return;
    }

    let keyId;
    if (nextChar === ' ') {
        keyId = 'key-space';
    } else {
        keyId = PUNC_MAP[nextChar] || PUNC_MAP[nextChar.toLowerCase()] || `key-${nextChar.toLowerCase()}`;
    }

    const keyEl = getKey(keyId);
    if (keyEl) keyEl.classList.add('active-hint');

    if (nextChar === nextChar.toUpperCase() && nextChar !== nextChar.toLowerCase()) {
        const shiftKeyId = 'key-shift-l'; // 統一提示左 Shift（也可根據習慣改右 Shift）
        getKey(shiftKeyId)?.classList.add('active-hint');
    }
}

function getKey(id) {
    return document.getElementById(id);
}

function updateStats() {
    const progress = state.targetText.length > 0 
        ? Math.round((state.userInput.length / state.targetText.length) * 100) 
        : 0;
    dom.progressDisplay.textContent = `${progress}%`;
    if (dom.progressBar) {
        dom.progressBar.style.width = `${progress}%`;
    }
    
    dom.comboDisplay.textContent = state.currentStreak;
    const comboCard = dom.comboDisplay.closest('.stat-card');
    if (comboCard) {
        if (state.currentStreak >= 10) {
            comboCard.classList.add('streak-hot');
        } else {
            comboCard.classList.remove('streak-hot');
        }
    }
    
    const accuracy = state.totalKeysPressed > 0 
        ? Math.round((state.correctKeys / state.totalKeysPressed) * 100) 
        : 100;
    dom.accuracyDisplay.textContent = `${accuracy}%`;
}

function handleInput(char) {
    if (state.userInput.length >= state.targetText.length) return;
    if (state.isPaused) return;

    if (!state.gameActive) {
        state.gameActive = true;
        dom.pauseBtn.classList.remove('hidden');
        startTimer();
    }

    state.totalKeysPressed++;
    const targetChar = state.targetText[state.userInput.length];

    // Handle Tab character specially
    if (char === '\t') {
        state.totalKeysPressed++;
        if (targetChar === '\t') {
            state.correctKeys++;
            state.currentStreak++;
            if (state.currentStreak > state.bestStreak) {
                state.bestStreak = state.currentStreak;
            }
            if (state.currentStreak % 10 === 0) {
                AudioSystem.play('combo');
            } else {
                AudioSystem.play('correct');
            }
        } else {
            state.errors++;
            state.currentStreak = 0;
            AudioSystem.play('error');
            dom.errorDisplay.textContent = state.errors;
        }
        state.userInput += char;
        renderText();
        updateHint();
        updateStats();

        if (state.userInput.length >= state.targetText.length) {
            endGame();
        }
        return;
    }

    const isCorrect = char === targetChar;

    if (isCorrect) {
        state.correctKeys++;
        state.currentStreak++;
        if (state.currentStreak > state.bestStreak) {
            state.bestStreak = state.currentStreak;
        }
        if (state.currentStreak % 10 === 0) {
            AudioSystem.play('combo');
        } else {
            AudioSystem.play('correct');
        }
    } else {
        state.errors++;
        state.currentStreak = 0;
        AudioSystem.play('error');
        dom.errorDisplay.textContent = state.errors;
    }

    state.userInput += char;
    renderText();
    updateHint();
    updateStats();

    if (state.userInput.length >= state.targetText.length) {
        endGame();
    }
}

function startTimer() {
    if (state.timerInterval) return;
    state.startTime = Date.now() - state.pausedTime * 1000;

    state.timerInterval = setInterval(() => {
        if (state.isPaused) return;
        
        const elapsed = (Date.now() - state.startTime) / 1000;
        const remain = Math.max(0, CONFIG.GAME_DURATION - elapsed);

        dom.timerDisplay.textContent = formatTime(remain);

        if (state.userInput.length > 0) {
            dom.speedDisplay.textContent = (state.userInput.length / elapsed).toFixed(2);
        }

        if (remain <= 0) endGame();
    }, 100);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function calculateScore(speed) {
    if (speed >= 1.0) return Math.max(0, 100 - state.errors);
    const base = speed >= 0.1 ? 40 + Math.floor((speed - 0.1) * 60 / 0.9) : 0;
    return Math.max(0, base - state.errors);
}

function getGrade(score, accuracy) {
    if (score >= 90 && accuracy >= 95) return { grade: 'S', color: '#ffd700', message: '完美表現！🌟' };
    if (score >= 80) return { grade: 'A', color: '#10b981', message: '太棒了！💪' };
    if (score >= 70) return { grade: 'B', color: '#3b82f6', message: '做得很好！👏' };
    if (score >= 60) return { grade: 'C', color: '#f59e0b', message: '繼續加油！💪' };
    if (score >= 40) return { grade: 'D', color: '#ef4444', message: '需要多練習📝' };
    return { grade: 'F', color: '#6b7280', message: '別放棄！🔥' };
}

function endGame() {
    state.gameActive = false;
    state.isPaused = false;
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    dom.pauseBtn.classList.add('hidden');

    const duration = (Date.now() - state.startTime) / 1000;
    const finalSpeed = (state.userInput.length / duration).toFixed(2);
    const finalAcc = state.totalKeysPressed > 0
        ? Math.round(((state.totalKeysPressed - state.errors) / state.totalKeysPressed) * 100)
        : 0;
    const finalScore = calculateScore(parseFloat(finalSpeed));
    const gradeInfo = getGrade(finalScore, finalAcc);

    dom.resultTitle.textContent = `🏆 ${gradeInfo.message}`;
    
    dom.resultStats.innerHTML = `
        <div class="result-stats">
            <div class="result-hero">
                <div class="result-student">${state.student.name} (${state.student.id})</div>
                <div class="result-score" style="color: ${gradeInfo.color}">${finalScore}</div>
                <div class="result-score-label">總分</div>
            </div>
            <div class="result-details">
                <div class="result-detail speed">
                    <div class="result-detail-value">${finalSpeed}</div>
                    <div class="result-detail-label">字/秒</div>
                </div>
                <div class="result-detail accuracy">
                    <div class="result-detail-value">${finalAcc}%</div>
                    <div class="result-detail-label">準確度</div>
                </div>
                <div class="result-detail errors">
                    <div class="result-detail-value">${state.errors}</div>
                    <div class="result-detail-label">錯字數</div>
                </div>
                <div class="result-detail combo">
                    <div class="result-detail-value">${state.bestStreak}</div>
                    <div class="result-detail-label">最佳連續</div>
                </div>
            </div>
        </div>
    `;
    
    dom.resultGrade.innerHTML = `<span class="grade-badge" style="background: ${gradeInfo.color}">${gradeInfo.grade}</span>`;

    AudioSystem.play('end');
    if (finalScore >= 70) {
        ConfettiSystem.burst();
    }
    
    dom.resultModal.classList.remove('hidden');
    uploadResults({ score: finalScore, speed: finalSpeed, accuracy: finalAcc, errors: state.errors, bestStreak: state.bestStreak });
}

function togglePause() {
    if (!state.gameActive) return;
    
    if (state.isPaused) {
        state.isPaused = false;
        state.startTime = Date.now() - state.pausedTime * 1000;
        dom.pauseOverlay.classList.add('hidden');
        dom.pauseBtn.querySelector('span:first-child').textContent = '⏸️';
        dom.pauseBtn.querySelector('span:last-child').textContent = '暫停';
    } else {
        state.isPaused = true;
        const elapsed = (Date.now() - state.startTime) / 1000;
        state.pausedTime = elapsed;
        dom.pauseOverlay.classList.remove('hidden');
        dom.pauseBtn.querySelector('span:first-child').textContent = '▶️';
        dom.pauseBtn.querySelector('span:last-child').textContent = '繼續';
    }
}

function uploadResult(stats, grade) {
    const uploadStatus = document.getElementById('uploadStatus');
    if (!uploadStatus) return;

    uploadStatus.textContent = '正在同步成績至雲端...';
    uploadStatus.className = 'upload-status uploading';

    // 這裡對應您要的資料，從登入的學生資料(state.student)和這次的成績(stats)中抓取
    const payload = {
        className: state.student.class || '',     // 學生班級 (例如: pl)
        classLetter: state.student.section || '', // 學生班別 (例如: a)
        studentNumber: state.student.number || '',// 學生學號 (例如: 1)
        accuracy: stats.accuracy,                 // 準確率
        speed: stats.wpm,                         // 打字速度
        errors: stats.errors,                     // 錯誤字數
        score: stats.score                        // 分數 (依照您的網頁計分規則)
    };

    // 發送給 Google 試算表後台通道
    fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // 配合 Google Apps Script 的特殊網路模式
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(() => {
        // 因為使用了 no-cors 模式，只要沒有斷網，通常代表傳送成功了
        uploadStatus.textContent = '✅ 成績同步成功！';
        uploadStatus.className = 'upload-status success';
    })
    .catch(error => {
        console.error('上傳失敗:', error);
        uploadStatus.textContent = '❌ 同步失敗，請聯繫老師';
        uploadStatus.className = 'upload-status error';
    });
}

// ============================================
// Event Handlers
// ============================================
function setupEventListeners() {
    // Login event listeners
    dom.loginBtn.addEventListener('click', handleLogin);
    dom.logoutBtn.addEventListener('click', handleLogout);
    dom.openLoginBtn.addEventListener('click', () => {
        dom.loginModal.classList.remove('hidden');
        dom.loginAccount.focus();
    });

    // Login modal cannot be closed by clicking outside - students must login
    // Only close via successful login or logout

    dom.loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    dom.loginAccount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') dom.loginPassword.focus();
    });

    // Prevent focus jumping in login modal - ensure clicks work properly
    dom.loginAccount.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.target.focus();
    });

    dom.loginPassword.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.target.focus();
    });

    // Article modal
    document.getElementById('articleModalClose').addEventListener('click', () => {
        dom.articleModal.classList.add('hidden');
    });

    dom.articleModal.addEventListener('click', (e) => {
        if (e.target === dom.articleModal) dom.articleModal.classList.add('hidden');
    });

    dom.articleGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.article-card');
        if (card) selectArticle(card.dataset.id);
    });

    document.getElementById('openArticleBtn').addEventListener('click', openArticleModal);

    dom.resultModal.addEventListener('click', (e) => {
        if (e.target === dom.resultModal) {
            // Don't close result modal by clicking outside - results should be acknowledged
        }
    });

    // Pause button
    dom.pauseBtn.addEventListener('click', togglePause);
    dom.resumeBtn.addEventListener('click', togglePause);

    // Keyboard event listeners
    window.addEventListener('keydown', (e) => {
        // Visual feedback for key press
        const keyId = e.key === ' ' ? 'key-space' :
                      e.key === 'Enter' ? 'key-enter' :
                      e.key === 'Backspace' ? 'key-backspace' :
                      e.key === 'Tab' ? 'key-tab' :
                      PUNC_MAP[e.key] || `key-${e.key.toLowerCase()}`;
        const keyEl = document.getElementById(keyId);
        if (keyEl) {
            keyEl.classList.add('pressed');
            setTimeout(() => keyEl.classList.remove('pressed'), 100);
        }

        if (!dom.articleModal.classList.contains('hidden') ||
            !dom.resultModal.classList.contains('hidden') ||
            !dom.loginModal.classList.contains('hidden')) return;

        // Space to resume
        if (e.key === ' ' && state.isPaused) {
            togglePause();
            e.preventDefault();
            return;
        }

        // Escape to pause
        if (e.key === 'Escape' && state.gameActive && !state.isPaused) {
            togglePause();
            return;
        }

        if (state.isPaused) return;

        if (e.key === 'Backspace') {
            if (state.userInput.length > 0) {
                state.userInput = state.userInput.slice(0, -1);
                renderText();
                updateHint();
            }
            e.preventDefault();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            handleInput('\n');
            // Block hiddenInput from processing Enter
            dom.hiddenInput.dataset.blocked = 'true';
            setTimeout(() => { dom.hiddenInput.dataset.blocked = ''; }, 100);
            return;
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            handleInput('\t');
            dom.hiddenInput.dataset.blocked = 'true';
            setTimeout(() => { dom.hiddenInput.dataset.blocked = ''; }, 100);
            return;
        }
    });

    dom.hiddenInput.addEventListener('input', (e) => {
        // Skip if blocked by keydown handler
        if (dom.hiddenInput.dataset.blocked === 'true') return;

        if (e.data) {
            // Handle multi-character input (e.g., paste, IME commit)
            for (const ch of e.data) {
                if (ch) handleInput(ch);
            }
        } else if (e.inputType === 'insertFromPaste' && dom.hiddenInput.value) {
            // Fallback: handle pasted content
            for (const ch of dom.hiddenInput.value) {
                handleInput(ch);
            }
        }
        dom.hiddenInput.value = '';

        // Check if completed
        if (state.userInput.length >= state.targetText.length && state.gameActive) {
            endGame();
        }
    });

    dom.restartBtn.addEventListener('click', () => {
        dom.resultModal.classList.add('hidden');
        initGame();
    });

    // Focus management - only allow game focus if logged in
    window.addEventListener('click', (e) => {
        // Don't redirect focus when clicking on input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Always prioritize login modal
        if (!dom.loginModal.classList.contains('hidden')) {
            dom.loginAccount.focus();
            return;
        }
        if (dom.articleModal.classList.contains('hidden') &&
            dom.resultModal.classList.contains('hidden') &&
            !state.isPaused && state.student.name) {
            dom.hiddenInput.focus();
        }
    });
}

// ============================================
// Initialization
// ============================================
function init() {
    try {
        renderKeyboard();
        ConfettiSystem.init();
        setupEventListeners();
        initGame();

        // Show login modal on page load - login is required
        // Only show if not already logged in
        setTimeout(() => {
            if (state.student.name) return; // Already logged in, skip
            
            const loginModal = document.getElementById('loginModal');
            const openLoginBtn = document.getElementById('openLoginBtn');
            const loginAccount = document.getElementById('loginAccount');

            if (loginModal) {
                loginModal.classList.remove('hidden');
            }
            if (openLoginBtn) {
                openLoginBtn.classList.add('hidden');
            }
            if (loginAccount) {
                loginAccount.focus();
            }
        }, 100);
    } catch (e) {
        console.error('初始化錯誤:', e);
    }
}

init();
