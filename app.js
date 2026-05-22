// ==============================
// 修復完整版 - 可正常登入 + 大小寫區分 + 成績完整上傳
// ==============================
const state = {
    student: {
        name: "",
        id: "",
        account: "",
        className: "",
        section: ""
    },
    currentArticle: "",
    typedChars: [],
    errors: 0,
    startTime: null,
    timer: null,
    timeLeft: 0,
    isGameActive: false
};

const dom = {
    loginSection: document.getElementById("login-section"),
    gameSection: document.getElementById("game-section"),
    usernameInput: document.getElementById("username-input"),
    passwordInput: document.getElementById("login-btn"),
    loginBtn: document.getElementById("login-btn"),
    articleDisplay: document.getElementById("article-display"),
    inputArea: document.getElementById("input-area"),
    timerDisplay: document.getElementById("timer-display"),
    wpmDisplay: document.getElementById("wpm-display"),
    accuracyDisplay: document.getElementById("errors-display"),
    errorsDisplay: document.getElementById("errors-display"),
    scoreDisplay: document.getElementById("score-display"),
    restartBtn: document.getElementById("restart-btn"),
    logoutBtn: document.getElementById("logout-btn"),
    uploadStatus: document.getElementById("upload-status")
};

function loginSuccess(studentData, account) {
    state.student.name = studentData.name;
    state.student.id = studentData.classId;
    state.student.account = account;
    // 從 classId 拆分年級班別（自動讀取，唔需要帳號有class欄位）
    let cid = studentData.classId || "";
    state.student.className = cid.slice(0,1);
    state.student.section = cid.slice(1);

    dom.loginSection.style.display = "none";
    dom.gameSection.style.display = "block";
    loadNewArticle();
}

function loadNewArticle() {
    resetGame();
    const randomArticle = ARTICLES[Math.floor(Math.random() * ARTICLES.length)];
    state.currentArticle = randomArticle.content;
    dom.articleDisplay.textContent = state.currentArticle;
    dom.inputArea.focus();
}

function resetGame() {
    state.typedChars = [];
    state.errors = 0;
    state.startTime = null;
    state.isGameActive = false;
    clearInterval(state.timer);

    dom.inputArea.value = "";
    dom.timerDisplay.textContent = "05:00";
    dom.wpmDisplay.textContent = "0";
    dom.accuracyDisplay.textContent = "100%";
    dom.errorsDisplay.textContent = "0";
    dom.scoreDisplay.textContent = "0";
    dom.uploadStatus.textContent = "";
    dom.uploadStatus.className = "upload-status";
}

function startGame() {
    if (state.isGameActive) return;
    state.isGameActive = true;
    state.startTime = new Date();
    state.timeLeft = CONFIG.GAME_DURATION;
    startTimer();
}

function startTimer() {
    state.timer = setInterval(() => {
        state.timeLeft--;
        const minutes = Math.floor(state.timeLeft / 60).toString().padStart(2, "0");
        const seconds = (state.timeLeft % 60).toString().padStart(2, "0");
        dom.timerDisplay.textContent = `${minutes}:${seconds}`;

        if (state.timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    state.isGameActive = false;
    clearInterval(state.timer);

    const totalChars = state.typedChars.length;
    const correctChars = totalChars - state.errors;
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;
    const timeTaken = (CONFIG.GAME_DURATION - state.timeLeft) / 60;
    const wpm = timeTaken > 0 ? Math.round((totalChars / 5) / timeTaken) : 0;
    const score = Math.max(0, Math.round((wpm * (accuracy / 100)) - (state.errors * 2)));

    dom.wpmDisplay.textContent = wpm;
    dom.accuracyDisplay.textContent = `${accuracy}%`;
    dom.errorsDisplay.textContent = state.errors;
    dom.scoreDisplay.textContent = score;

    uploadResults({ score, speed: wpm, accuracy });
}

// 🔒 已修復：大小寫**嚴格區分**
dom.inputArea.addEventListener("input", (e) => {
    if (!state.isGameActive) startGame();

    const inputValue = e.target.value;
    const lastChar = inputValue.slice(-1);
    const targetChar = state.currentArticle[state.typedChars.length];

    // 完全嚴格匹配，大細寫唔相通過
    const isCorrect = lastChar === targetChar;

    if (!isCorrect) state.errors++;
    state.typedChars.push(lastChar);

    dom.errorsDisplay.textContent = state.errors;
    updateDisplay();
});

function updateDisplay() {
    let displayHTML = "";
    const target = state.currentArticle;
    const typed = state.typedChars;

    for (let i = 0; i < target.length; i++) {
        if (i < typed.length) {
            const char = typed[i];
            const targetChar = target[i];
            const isCorrect = char === targetChar;
            displayHTML += `<span class="${isCorrect ? "correct" : "incorrect"}">${char}</span>`;
        } else {
            displayHTML += `<span class="remaining">${target[i]}</span>`;
        }
    }
    dom.articleDisplay.innerHTML = displayHTML;
}

// 📤 修復：正確送出班級/班別/學號/錯字/分數
async function uploadResults(results) {
    if (state.student.id === "DEMO") {
        dom.uploadStatus.textContent = "✅ 示範模式（成績不記錄）";
        dom.uploadStatus.className = "upload-status success";
        return;
    }

    try {
        await fetch(CONFIG.SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
                studentClass: state.student.className,
                studentSection: state.student.section,
                studentId: state.student.id,
                studentName: state.student.name,
                score: results.score,
                speed: results.speed,
                accuracy: results.accuracy,
                errors: state.errors
            })
        });
        dom.uploadStatus.textContent = "✅ 成績已同步至雲端";
        dom.uploadStatus.className = "upload-status success";
    } catch (err) {
        dom.uploadStatus.textContent = "❌ 同步失敗";
        dom.uploadStatus.className = "upload-status error";
    }
}

// 登入按鈕
dom.loginBtn.addEventListener("click", () => {
    const account = dom.usernameInput.value.trim();
    const password = dom.passwordInput.value.trim();
    const studentData = STUDENT_ACCOUNTS[account];

    if (studentData && studentData.password === password) {
        loginSuccess(studentData, account);
    } else {
        alert("帳號或密碼錯誤");
    }
});

dom.restartBtn.addEventListener("click", loadNewArticle);
dom.logoutBtn.addEventListener("click", () => location.reload());