/* game-v8.js */

// Food items matching your HTML button IDs exactly
const food = ["Juice", "Apple", "Donut", "Jelly", "Grape", "IceCream", "Mango", "Orange", "Watermelon"];
let ChoosenFood = "";

// Dynamic Image mapping that resolves correct folder paths, spaces, and spelling differences!
const imageMap = {
    "Juice": "Food/Juice.png",
    "Apple": "Food/Apple.png",
    "Donut": "Food/Donut.png",
    "Jelly": "Food/Jelly.png",
    "Grape": "Food/Grape.png",
    "IceCream": "Food/IceCream.png",       // Resolves space in filename
    "Mango": "Food/Mango.png",
    "Orange": "Food/Orange.png",
    "Watermelon": "Food/Watermelon.png"    // Resolves spelling of watermelone.png
};

// Timer variables
let timerInterval;
let timeLeft = 100;
const baseDuration = 6000; // Base round duration (6 seconds)
let currentDuration = 6000;
const timeStep = 50; // Smooth tick interval

// Player life system
let CurrentLife = 3;
const MaxLife = 3;

// Score and Stats
let currentScore = 0;
let highScore = 0;
let ordersServed = 0; // Number of orders served (used to ramp difficulty!)

// Game state flags
let canClick = false;
let gameActive = false;

// --- Cat Animation System Setup ---
let currentCatState = "Idle";
let catFrame = 0;
let catAnimInterval = null;
const frameCounts = { "Idle": 8, "Happy": 8, "Jamp": 8, "Pointing": 8 };

window.onload = function() {
    // Retrieve persistent high score
    highScore = parseInt(localStorage.getItem("julia_high_score")) || 0;
    UpdateHighScoreDisplay();

    // Start background cat animation
    InitCatAnimation();

    // Set up Start popup interface handler
    const startBtn = document.getElementById("StartBtn");
    const startScreen = document.getElementById("StartScreen");

    if (startBtn && startScreen) {
        startBtn.addEventListener("click", function() {
            startScreen.style.display = "none"; // Dismiss popup
            StartGame();
        });
    } else {
        // Fallback if elements aren't present
        StartGame();
    }

    // Play again button handler on end screen
    const playAgainBtn = document.getElementById("PlayAgainBtn");
    if (playAgainBtn) {
        playAgainBtn.addEventListener("click", function() {
            const endScreen = document.getElementById("EndScreen");
            if (endScreen) endScreen.style.display = "none";
            StartGame();
        });
    }

    // Attach click listeners to ingredient buttons
    food.forEach(function(item) {
        const btn = document.getElementById(item);
        if (btn) {
            btn.addEventListener("click", GiveObject);
        }
    });
};

// Initializes a fresh game session
function StartGame() {
    CurrentLife = MaxLife;
    currentScore = 0;
    ordersServed = 0;
    currentDuration = baseDuration;
    gameActive = true;
    
    UpdateScoreDisplay();
    UpdateHeartsDisplay();
    
    const resultEl = document.getElementById("Result");
    if (resultEl) {
        resultEl.innerHTML = "Préparez la commande !";
        resultEl.style.color = "#f7d070"; // Chalkboard yellow
    }

    const endScreen = document.getElementById("EndScreen");
    if (endScreen) {
        endScreen.style.display = "none";
    }

    setCatState("Jamp"); // Happy entry animation
    NewOrder();
}

// Cat Sprite Animation Core Engine
function InitCatAnimation() {
    const catImg = document.getElementById("CatCharacter");
    if (!catImg) return;

    // Safety fallback: prevents broken images if frames differ
    catImg.onerror = function() {
        if (catFrame > 0) {
            frameCounts[currentCatState] = catFrame;
            catFrame = 0;
            if (currentCatState !== "Idle") {
                setCatState("Idle");
            } else {
                updateCatFrame();
            }
        }
    };

    setCatState("Idle");
    startCatLoop();
}

function setCatState(state) {
    currentCatState = state;
    catFrame = 0;
    updateCatFrame();
}

function updateCatFrame() {
    const catImg = document.getElementById("CatCharacter");
    if (!catImg) return;
    catImg.src = `Cat/${currentCatState}/${currentCatState}_${catFrame}.png`;
}

function startCatLoop() {
    clearInterval(catAnimInterval);
    catAnimInterval = setInterval(function() {
        catFrame++;
        if (catFrame >= frameCounts[currentCatState]) {
            catFrame = 0;
            if (currentCatState !== "Idle") {
                currentCatState = "Idle";
            }
        }
        updateCatFrame();
    }, 130);
}

// Generates and triggers next customer order
function NewOrder() {
    if (CurrentLife <= 0 || !gameActive) return;

    canClick = true; // Allow user interaction

    // --- Dynamic Scaling Difficulty Formula ---
    // Every order decreases the time by 250ms, with a minimum threshold of 1.5 seconds!
    currentDuration = Math.max(1500, baseDuration - (ordersServed * 250));
    console.log(`Current Speed: ${currentDuration}ms`);

    StartTimer();

    const num = Math.floor(Math.random() * food.length);
    ChoosenFood = food[num];

    const choiceImg = document.getElementById("CustomerChoice");
    if (choiceImg && imageMap[ChoosenFood]) {
        choiceImg.src = imageMap[ChoosenFood];

        // --- Waddle Dee Café Style Reveal Transition ---
        // Animation scales dynamically to exactly 2/3 of current time
        const revealDurationMs = Math.round((currentDuration * 2) / 3);
        choiceImg.style.setProperty('--reveal-duration', `${revealDurationMs}ms`);

        // Reset class animations
        const revealClasses = ["reveal-unblur", "reveal-slide-top", "reveal-slide-bottom", "reveal-silhouette"];
        revealClasses.forEach(cls => choiceImg.classList.remove(cls));

        // Reflow browser paint
        void choiceImg.offsetWidth;

        // Choose random visual reveal pattern
        const randomTransition = revealClasses[Math.floor(Math.random() * revealClasses.length)];
        choiceImg.classList.add(randomTransition);
    }

    setCatState("Pointing"); // Cat points to declare order
}

// Handles ingredient button selections
function GiveObject() {
    if (CurrentLife <= 0 || !canClick || !gameActive) return;
    
    canClick = false; // Block button spamming during outcome presentation
    clearInterval(timerInterval); // Stop timer countdown

    const clickedFood = this.id;

    if (clickedFood === ChoosenFood) {
        // --- Calculate score based on clicking speed ---
        let pointsEarned = Math.round(timeLeft * 10);
        if (pointsEarned < 100) pointsEarned = 100; // Guaranteed minimum floor points

        currentScore += pointsEarned;
        ordersServed++;
        UpdateScoreDisplay();

        // Spawn a point splash element
        ShowFloatingPoints(pointsEarned);

        // Display success banner. Every 3 orders, tease the player with a Speed-Up alert!
        const resultEl = document.getElementById("Result");
        if (ordersServed > 0 && ordersServed % 3 === 0) {
            resultEl.innerHTML = `SPEED UP ! ⚡ +${pointsEarned} pts`;
            resultEl.style.color = "#ffb703"; // Alert yellow
        } else {
            resultEl.innerHTML = `Success ! +${pointsEarned} pts 🎉`;
            resultEl.style.color = "#2ecc71"; // Success neon green
        }

        setCatState("Happy"); // Delightful cat response
    } else {
        Failed();
    }

    if (CurrentLife > 0) {
        setTimeout(NewOrder, 1500);
    }
}

// Floating points popup above the customer bubble
function ShowFloatingPoints(pts) {
    const bubble = document.getElementById("Customer");
    if (!bubble) return;

    const splash = document.createElement("div");
    splash.className = "points-splash";
    splash.innerHTML = `+${pts}`;
    bubble.appendChild(splash);

    setTimeout(() => {
        splash.remove();
    }, 1000);
}

// Controls timer countdown mechanics
function StartTimer() {
    clearInterval(timerInterval);
    timeLeft = 100;
    
    const timerBar = document.getElementById("FillBar");
    if (!timerBar) return;

    timerBar.style.width = "100%";
    timerBar.style.backgroundColor = "#2ecc71";

    const decrement = (timeStep / currentDuration) * 100;

    timerInterval = setInterval(function() {
        if (!gameActive) {
            clearInterval(timerInterval);
            return;
        }

        timeLeft -= decrement;
        timerBar.style.width = Math.max(0, timeLeft) + "%";

        // Warnings colors based on thresholds
        if (timeLeft <= 30) {
            timerBar.style.backgroundColor = "#ff4d6d"; // Neon Red
        } else if (timeLeft <= 60) {
            timerBar.style.backgroundColor = "#ffb703"; // Amber Yellow
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            TimeOut();
        }
    }, timeStep);
}

// Timeout event handler
function TimeOut() {
    canClick = false;
    document.getElementById("Result").innerHTML = "Too slow! ⏰";
    Failed();

    if (CurrentLife > 0) {
        setTimeout(NewOrder, 1500);
    }
}

// Handles wrong ingredient matching or timeout penalties
function Failed() {
    document.getElementById("Result").style.color = "#ff4d6d"; // Red alert chalk
    
    if (document.getElementById("Result").innerHTML !== "Too slow! ⏰") {
        document.getElementById("Result").innerHTML = "Failed ! ❌";
    }

    CurrentLife -= 1;
    UpdateHeartsDisplay();
    setCatState("Idle");

    if (CurrentLife <= 0) {
        GameOver();
    }
}

// Updates heart containers
function UpdateHeartsDisplay() {
    const heartsContainer = document.getElementById("Hearts");
    if (!heartsContainer) return;

    let heartsStr = "";
    for (let i = 0; i < MaxLife; i++) {
        if (i < CurrentLife) {
            heartsStr += "❤";
        } else {
            heartsStr += "🖤";
        }
    }
    heartsContainer.innerHTML = heartsStr;
}

function UpdateScoreDisplay() {
    const scoreVal = document.getElementById("ScoreVal");
    if (scoreVal) {
        scoreVal.innerHTML = currentScore;
    }
}

function UpdateHighScoreDisplay() {
    const hsLabel = document.getElementById("RecordLabel");
    if (hsLabel && highScore > 0) {
        hsLabel.innerHTML = `High Score: ${highScore}`;
    }
}

// Triggers game-over sequence
function GameOver() {
    gameActive = false;
    clearInterval(timerInterval);
    document.getElementById("Result").innerHTML = "💥 Game Over ! 💥";
    document.getElementById("Result").style.color = "#ff4d6d";
    
    const timerBar = document.getElementById("FillBar");
    if (timerBar) {
        timerBar.style.width = "0%";
    }

    setCatState("Idle");

    // Manage highscore record checks
    let isNewRecord = false;
    if (currentScore > highScore) {
        highScore = currentScore;
        localStorage.setItem("julia_high_score", highScore);
        isNewRecord = true;
    }

    // Display scoreboard after delay
    setTimeout(function() {
        ShowScoreBoard(isNewRecord);
    }, 1200);
}

// Overlays game statistics
function ShowScoreBoard(isNewRecord) {
    const endScreen = document.getElementById("EndScreen");
    const finalScoreVal = document.getElementById("FinalScoreVal");
    const recordLabel = document.getElementById("RecordLabel");

    if (finalScoreVal) finalScoreVal.innerHTML = currentScore;
    
    if (recordLabel) {
        if (isNewRecord) {
            recordLabel.innerHTML = "🎉 NEW HIGH SCORE ! 👑";
            recordLabel.className = "record-banner pulse-animation";
        } else {
            recordLabel.innerHTML = `High Score: ${highScore}`;
            recordLabel.className = "high-score-label";
        }
    }

    if (endScreen) {
        endScreen.style.display = "flex";
    }
}
