/* game-v9.js */

// Food items matching your HTML button IDs exactly
const food = ["Juice", "Apple", "Donut", "Jelly", "Grape", "IceCream", "Mango", "Orange", "Watermelon"];
let ChoosenFood = "";

// Dynamic Image mapping that resolves spaces and spelling differences in your files
const imageMap = {
    "Juice": "Food/Juice.png",
    "Apple": "Food/Apple.png",
    "Donut": "Food/Donut.png",
    "Jelly": "Food/Jelly.png",
    "Grape": "Food/Grape.png",
    "IceCream": "Food/ice cream.png",       // Resolves space in filename
    "Mango": "Food/Mango.png",
    "Orange": "Food/Orange.png",
    "Watermelon": "Food/watermelone.png"    // Resolves spelling of watermelone.png
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

// --- BULLETPROOF CASE-SENSITIVITY AUTO-RESOLVER FOR GITHUB PAGES ---
// Caches the successful naming casing found on startup to prevent future 404s
const resolvedCasing = {
    "Idle": "Cat/Idle/Idle_{frame}.png",
    "Happy": "Cat/Happy/Happy_{frame}.png",
    "Jamp": "Cat/Jamp/Jamp_{frame}.png",
    "Pointing": "Cat/Pointing/Pointing_{frame}.png"
};

// Test-loads paths with different cases to find the one working on the server
function resolveAnimationPaths(callback) {
    const states = ["Idle", "Happy", "Jamp", "Pointing"];
    let resolvedCount = 0;

    states.forEach(state => {
        const variations = [
            `Cat/${state}/${state}_0.png`,
            `Cat/${state}/${state}_0.PNG`,
            `Cat/${state.toUpperCase()}/${state.toUpperCase()}_0.png`,
            `Cat/${state.toUpperCase()}/${state.toUpperCase()}_0.PNG`,
            `Cat/${state.toLowerCase()}/${state.toLowerCase()}_0.png`,
            `Cat/${state.toLowerCase()}/${state.toLowerCase()}_0.PNG`,
            `Cat/${state}/${state.toLowerCase()}_0.png`,
            `Cat/${state}/${state.toLowerCase()}_0.PNG`
        ];

        let found = false;

        function testVariation(index) {
            if (index >= variations.length) {
                // If all fails, default to standard path
                resolvedCasing[state] = `Cat/${state}/${state}_{frame}.png`;
                checkAllResolved();
                return;
            }

            const img = new Image();
            img.onload = function() {
                resolvedCasing[state] = variations[index].replace("_0.", "_{frame}.");
                console.log(`Resolved casing for animation [${state}]:`, resolvedCasing[state]);
                checkAllResolved();
            };
            img.onerror = function() {
                testVariation(index + 1);
            };
            img.src = variations[index];
        }

        testVariation(0);
    });

    function checkAllResolved() {
        resolvedCount++;
        if (resolvedCount === states.length) {
            callback();
        }
    }
}

// Pre-test food image paths to handle .png vs .PNG or lowercase extensions
function getFoodImagePath(foodName, callback) {
    const defaultPath = imageMap[foodName] || `Food/${foodName}.png`;
    const variations = [
        defaultPath,
        defaultPath.replace(".png", ".PNG"),
        defaultPath.toLowerCase(),
        defaultPath.toLowerCase().replace(".png", ".PNG")
    ];

    let index = 0;
    function testNext() {
        if (index >= variations.length) {
            callback(defaultPath);
            return;
        }
        const tempImg = new Image();
        tempImg.onload = function() {
            callback(variations[index]);
        };
        tempImg.onerror = function() {
            index++;
            testNext();
        };
        tempImg.src = variations[index];
    }
    testNext();
}

window.onload = function() {
    // Retrieve persistent high score
    highScore = parseInt(localStorage.getItem("julia_high_score")) || 0;
    UpdateHighScoreDisplay();

    // Dynamically detect server file casing to fix GitHub Pages bugs
    resolveAnimationPaths(function() {
        console.log("All animation paths resolved successfully!");
        InitCatAnimation();
    });

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
    const resolvedPath = resolvedCasing[currentCatState].replace("{frame}", catFrame);
    catImg.src = resolvedPath;
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
    if (choiceImg) {
        // Resolve path to handle file spelling differences safely
        getFoodImagePath(ChoosenFood, function(workingPath) {
            choiceImg.src = workingPath;

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
        });
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
