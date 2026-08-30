// List of available food items
const food = ["Juice", "Apple", "Donut", "Jelly", "Grape", "IceCream", "Mango", "Orange", "Watermelon"];
let ChoosenFood = "";

// Timer variables
let timerInterval;
let timeLeft = 100;
const baseDuration = 6000; // Starting duration of the round (6 seconds)
let currentDuration = 6000; // Will decrease dynamically as player succeeds
const timeStep = 50; // High resolution tick frequency for super-smooth progress depletion

// Player life system
let CurrentLife = 3;
const MaxLife = 3;

// Score & Scaling systems
let currentScore = 0;
let highScore = 0;
let ordersServed = 0; // Tracks successful orders in the current run for scaling difficulty

// Game state flags
let canClick = false;
let gameActive = false;

// --- Cat Animation System Setup ---
let currentCatState = "Idle";
let catFrame = 0;
let catAnimInterval = null;
const frameCounts = { "Idle": 8, "Happy": 8, "Jamp": 8, "Pointing": 8 };

window.onload = function() {
    // Retrieve high score from LocalStorage
    highScore = parseInt(localStorage.getItem("julia_high_score")) || 0;
    UpdateHighScoreDisplay();

    // Initialize cat animation system right away
    InitCatAnimation();

    // Link Start pop-up interface buttons
    const startBtn = document.getElementById("StartBtn");
    const startScreen = document.getElementById("StartScreen");

    if (startBtn && startScreen) {
        startBtn.addEventListener("click", function() {
            startScreen.style.display = "none"; // Hide start menu pop-up
            StartGame();
        });
    } else {
        // Safe fallback if StartScreen elements are not in HTML
        StartGame();
    }

    // Restart buttons (both Game Over and standard)
    const restartBtn = document.getElementById("RestartBtn");
    if (restartBtn) {
        restartBtn.addEventListener("click", StartGame);
    }

    const playAgainBtn = document.getElementById("PlayAgainBtn");
    if (playAgainBtn) {
        playAgainBtn.addEventListener("click", function() {
            const endScreen = document.getElementById("EndScreen");
            if (endScreen) endScreen.style.display = "none";
            StartGame();
        });
    }

    // Bind click events to food ingredient buttons
    food.forEach(function(item) {
        const btn = document.getElementById(item);
        if (btn) {
            btn.addEventListener("click", GiveObject);
        }
    });
};

// Starts the game loop
function StartGame() {
    CurrentLife = MaxLife;
    currentScore = 0;
    ordersServed = 0;
    currentDuration = baseDuration;
    gameActive = true;
    
    // Reset Score Display
    UpdateScoreDisplay();
    UpdateHeartsDisplay();
    
    const resultEl = document.getElementById("Result");
    if (resultEl) {
        resultEl.innerHTML = "Préparez la commande !";
        resultEl.style.color = "#f7d070"; // Cozy yellow glow chalk color
    }

    const endScreen = document.getElementById("EndScreen");
    if (endScreen) {
        endScreen.style.display = "none";
    }

    setCatState("Jamp"); // Excited jump entry animation
    NewOrder();
}

// Cat animation core engine
function InitCatAnimation() {
    const catImg = document.getElementById("CatCharacter");
    if (!catImg) return;

    // Error safety filter: self-corrects frame counts if directory folders differ
    catImg.onerror = function() {
        console.log(`Frame ${catFrame} not found for state \"${currentCatState}\". Adjusting frame limit.`);
        if (catFrame > 0) {
            frameCounts[currentCatState] = catFrame; // Cap limits dynamically
            catFrame = 0;
            if (currentCatState !== "Idle/") {
                setCatState("Idle/");
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
            // Loop back to idle once temporary movements conclude
            if (currentCatState !== "Idle") {
                currentCatState = "Idle";
            }
        }
        updateCatFrame();
    }, 130);
}

// Generates a new customer order with Waddle Dee Café transition style
function NewOrder() {
    if (CurrentLife <= 0 || !gameActive) return;

    canClick = true; // Unlock clicks

    // --- Dynamic Difficulty Scaling ---
    // Decrease duration by 250ms for each order completed successfully
    // Capped at a super-fast 1.5 seconds (1500ms) to keep it humanly playable
    currentDuration = Math.max(1500, baseDuration - (ordersServed * 250));
    console.log(`Dynamic Timer - Speed: ${currentDuration}ms (Orders Served: ${ordersServed})`);

    StartTimer();

    const num = Math.floor(Math.random() * food.length);
    ChoosenFood = food[num];

    const choiceImg = document.getElementById("CustomerChoice");
    if (choiceImg) {
        // Set image source
        choiceImg.src = "Food/" + food[num] + ".png";

        // --- Waddle Dee Café Style Random Transition Math ---
        // Transitions must take exactly 2/3 of the dynamic total time
        const revealDurationMs = Math.round((currentDuration * 2) / 3);
        choiceImg.style.setProperty('--reveal-duration', `${revealDurationMs}ms`);

        // Clear existing reveal class triggers
        const revealClasses = ["reveal-unblur", "reveal-slide-top", "reveal-slide-bottom", "reveal-silhouette"];
        revealClasses.forEach(cls => choiceImg.classList.remove(cls));

        // Reflow browser paint cycle to restart animation cleanly
        void choiceImg.offsetWidth;

        // Pick a random fancy reveal animation
        const randomTransition = revealClasses[Math.floor(Math.random() * revealClasses.length)];
        choiceImg.classList.add(randomTransition);
    }

    setCatState("Pointing"); // Cat points to declare customer wish
}

// Action button click handler
function GiveObject() {
    if (CurrentLife <= 0 || !canClick || !gameActive) return;
    
    canClick = false; // Block spam clicking
    clearInterval(timerInterval); // Halt current countdown

    const clickedFood = this.id;

    if (clickedFood === ChoosenFood) {
        // Increment successfully served orders for scaling up difficulty
        ordersServed++;

        // --- Calculate points based on rapidity (timeLeft) ---
        // timeLeft goes from 100 to 0. 
        // Max points: 1000 (at 100% time), Min points: 100
        let pointsEarned = Math.round(timeLeft * 10);
        if (pointsEarned < 100) pointsEarned = 100;

        currentScore += pointsEarned;
        UpdateScoreDisplay();

        // Visual point splash effect
        ShowFloatingPoints(pointsEarned);

        // Feedback text with custom "Speed Up" warning when pace gets hectic
        const resultEl = document.getElementById("Result");
        if (resultEl) {
            let feedbackMsg = `Success! +${pointsEarned} pts 🎉`;
            if (ordersServed > 0 && ordersServed % 3 === 0) {
                feedbackMsg += `<br><span style="font-size: 1.1rem; color: #ffb703; text-shadow: 0 0 8px rgba(255, 183, 3, 0.6); animation: pulse 0.8s infinite alternate;">SPEED UP! ⚡</span>`;
            }
            resultEl.innerHTML = feedbackMsg;
            resultEl.style.color = "#2ecc71"; // Nice neon green
        }

        setCatState("Happy"); // Excited reaction
    } else {
        Failed();
    }

    // Settle animation before serving next customer
    if (CurrentLife > 0) {
        setTimeout(NewOrder, 1500);
    }
}

// Dynamic floating points popup above the customer bubble
function ShowFloatingPoints(pts) {
    const bubble = document.getElementById("Customer");
    if (!bubble) return;

    const splash = document.createElement("div");
    splash.className = "points-splash";
    splash.innerHTML = `+${pts}`;
    bubble.appendChild(splash);

    // Remove element after animation completes
    setTimeout(() => {
        splash.remove();
    }, 1000);
}

// Countdown progress bar controller
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

        // Dynamic warning color thresholds
        if (timeLeft <= 30) {
            timerBar.style.backgroundColor = "#ff4d6d"; // Warning neon red
        } else if (timeLeft <= 60) {
            timerBar.style.backgroundColor = "#ffb703"; // Warn amber yellow
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            TimeOut();
        }
    }, timeStep);
}

// Timeout handler
function TimeOut() {
    canClick = false; // Restrict clicks
    document.getElementById("Result").innerHTML = "Too slow! ⏰";
    Failed(); // Count as mistake

    if (CurrentLife > 0) {
        setTimeout(NewOrder, 1500);
    }
}

// Handles mistimed/wrong clicks and reduces life points
function Failed() {
    document.getElementById("Result").style.color = "#ff4d6d"; // Soft chalk red
    
    if (document.getElementById("Result").innerHTML !== "Too slow! ⏰") {
        document.getElementById("Result").innerHTML = "Failed ! ❌";
    }

    CurrentLife -= 1;
    UpdateHeartsDisplay();
    setCatState("Idle"); // Resets cat pose

    if (CurrentLife <= 0) {
        GameOver();
    }
}

// Visually update the heart containers inside the red zone
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

// Update score dashboard
function UpdateScoreDisplay() {
    const scoreVal = document.getElementById("ScoreVal");
    if (scoreVal) {
        scoreVal.innerHTML = currentScore;
    }
}

function UpdateHighScoreDisplay() {
    const hsVal = document.getElementById("HighScoreVal");
    if (hsVal) {
        hsVal.innerHTML = highScore;
    }
}

// Handles Game Over procedures
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

    // Check highscore
    let isNewRecord = false;
    if (currentScore > highScore) {
        highScore = currentScore;
        localStorage.setItem("julia_high_score", highScore);
        UpdateHighScoreDisplay();
        isNewRecord = true;
    }

    // Display final scoreboard
    setTimeout(function() {
        ShowScoreBoard(isNewRecord);
    }, 1200);
}

// Display final overlay comparing current score to high score
function ShowScoreBoard(isNewRecord) {
    const endScreen = document.getElementById("EndScreen");
    const finalScoreVal = document.getElementById("FinalScoreVal");
    const recordLabel = document.getElementById("RecordLabel");

    if (finalScoreVal) finalScoreVal.innerHTML = currentScore;
    
    if (recordLabel) {
        if (isNewRecord) {
            recordLabel.innerHTML = "🎉 NEW HIGH SCORE ! 👑";
            recordLabel.style.display = "block";
            recordLabel.className = "record-banner pulse-animation";
        } else {
            recordLabel.innerHTML = `High Score: ${highScore}`;
            recordLabel.className = "high-score-label";
            recordLabel.style.display = "block";
        }
    }

    if (endScreen) {
        endScreen.style.display = "flex";
    }
}
