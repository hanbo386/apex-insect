import './style.css';
import { Insect } from './game/Insect.js';
import { Environment } from './game/Environment.js';
import { Vec2 } from './game/Vec2.js';
import { Creep } from './game/Creep.js';
import { FloatingText } from './game/FloatingText.js';
import { Particle } from './game/Particle.js';




const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// UI Elements
const uiContainer = document.getElementById('status-container');
const statusText = document.createElement('span'); // Use span for inline
statusText.id = 'status-display';
uiContainer.appendChild(statusText);

function updateUI() {
    // 0: 原始种 (Primitive)
    // 1: 蚂蚁 (Ant)
    // 2: 瓢虫 (Ladybug)
    // 3: 潮虫 (Pillbug)
    // 4: 蟑螂 (Cockroach)
    // 5: 蜘蛛 (Spider)
    // 6: 螳螂 (Mantis)
    let formNames = ["原始种 (Primitive)", "蚂蚁 (Ant)", "瓢虫 (Ladybug)", "潮虫 (Pillbug)", "蟑螂 (Cockroach)", "蜘蛛 (Spider)", "螳螂 (Mantis)"];
    let displayForm = formNames[player.evolutionStage] || `MARK-${player.evolutionStage}`;

    // Relative Level Calculation
    // Level is now ALWAYS 1-5 per stage logic in Ant.js
    let displayLevel = player.level;

    // DEBUG INFO
    let debugInfo = `
    <br><span style="font-size: 12px; color: #aaa;">
    Debug: Form=${player.form} | Stage=${player.evolutionStage} | Scale=${player.scale?.toFixed(2)} | Zoom=${window.gameScale?.toFixed(3)}
    </span>`;

    statusText.innerHTML = `<strong>形态:</strong> ${displayForm} | <strong>等级:</strong> ${displayLevel} / 5 | <strong>XP:</strong> ${Math.floor(player.xp)}/${Math.floor(player.xpToNext)}` + debugInfo;


    const staminaFill = document.getElementById('stamina-bar-fill');
    if (staminaFill) {
        let pct = (player.stamina / player.maxStamina) * 100;
        staminaFill.style.width = `${pct}%`;
        staminaFill.style.background = pct < 20 ? '#ff0000' : '#00ff00';
    }
}

// Input handling
const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false, ShiftLeft: false, ShiftRight: false };

window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
});
window.addEventListener('keyup', e => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});
// Reset keys on focus loss to prevent stuck inputs
window.addEventListener('blur', () => {
    Object.keys(keys).forEach(k => keys[k] = false);
});

// Debug Button - Now "Cheat Level Up"
document.getElementById('evolve-btn').innerText = "Cheat: Evolve";
document.getElementById('evolve-btn').addEventListener('click', () => {
    console.log("DEBUG: Cheat Evolve clicked.");
    // Force immediate evolution to next stage
    player.evolve();

    // Force focus back
    window.focus();
    if (document.getElementById('gameCanvas')) document.getElementById('gameCanvas').focus();
});

document.getElementById('xp-btn').addEventListener('click', () => {
    console.log("DEBUG: Cheat XP clicked.");
    player.gainXp(500);
    // Force focus back
    window.focus();
    if (document.getElementById('gameCanvas')) document.getElementById('gameCanvas').focus();
});



// Game Init
const player = new Insect(width / 2, height / 2);
player.onLevelUp = (lvl) => {
    texts.push(new FloatingText(player.pos.x, player.pos.y - 50, `LEVEL UP! (${lvl})`, '#00ff00', 40));
};
player.onEvolve = (formName, stage) => {
    // Check for Stage 5 (Spider) -> World Reset
    if (stage === 5) {
        // 1. Popup Prompt
        // Use setTimeout to allow the render loop to maybe show the spider for a split second? 
        // Or just block immediately. User said "Before reset".
        // Alert blocks thread, so let's do it.
        setTimeout(() => {
            alert("完成跃迁，将进入下一个世界");

            // 2. Clear World
            creeps.length = 0;
            particles.length = 0;
            texts.length = 0;

            // 3. Reset Player Logic
            // Start as Level 1 Spider (Level is already set to 1 by evolve())
            // Reset Scale to 1
            player.scale = 1.0;
            player.baseScale = 1.0;
            player.targetScale = 1.0;
            // Optionally increase world tier for difficulty scaling if desired, 
            // but user request was specific about resetting scale/zoom.
            if (!player.worldTier) player.worldTier = 1.0;
            player.worldTier += 1.0; // Increment Tier

            // Re-init legs at new scale 1.0
            player.initLegs();

            // Reset Position (Safe spawn)
            // Keep relative position or center? Center is safer for new world.
            // player.pos = new Vec2(width/2, height/2); // Maybe keeping position is fun? 
            // Let's keep position to avoid jarring jump, or center? 
            // User said "Create a new world", implied fresh start.
            // Let's centering.
            // player.pos = new Vec2(0, 0); // Assuming world 0,0 is fine.

            // 4. Reset Zoom
            window.gameScale = 1.0;

            texts.push(new FloatingText(player.pos.x, player.pos.y - 80, `新世界开启! (Tier ${player.worldTier})`, '#FFD700', 60, 5.0));

        }, 100);

        return;
    }

    // Large, prominent gold text
    texts.push(new FloatingText(player.pos.x, player.pos.y - 80, `进化成功: ${formName}!`, '#FFD700', 60, 4.0));

    // Cleanup obsolete creeps immediately
    cleanupCreeps();
};

function cleanupCreeps() {
    // Remove any creep (Insect) that is too low stage
    for (let i = creeps.length - 1; i >= 0; i--) {
        let c = creeps[i];
        // Treat undefined stage (basic Creep/Food) as -1
        let stage = c.evolutionStage !== undefined ? c.evolutionStage : -1;

        if (stage < player.evolutionStage - 2) {
            // console.log("Evolve Cleanup: Removing stage", stage);
            createParticles(c.pos.x, c.pos.y, c.color || '#999', (c.size || 5), 5); // Poof effect
            creeps.splice(i, 1);
        }
    }
    console.log("Cleanup complete. Active creeps:", creeps.length);
}
const env = new Environment();
let camera = new Vec2(0, 0);

const creeps = [];
const texts = []; // 浮动文字
const particles = []; // 粒子效果
const MAX_CREEPS = 4;

function createParticles(x, y, color, size = 4, count = 8) {
    for (let k = 0; k < count; k++) {
        // Vary size slightly
        let s = size * (0.5 + Math.random());
        particles.push(new Particle(x, y, color, s));
    }
}

function spawnCreeps() {
    // Dynamic Spawn Range based on Zoom
    let scale = window.gameScale || 1.0;
    // Calculate visible world radius (approximate)
    let visibleRadius = Math.max(width, height) / scale / 2;

    // Spawn just outside visible area
    let angle = Math.random() * Math.PI * 2;
    let dist = visibleRadius + 100 + Math.random() * 400;
    let spawnPos = player.pos.add(new Vec2(Math.cos(angle), Math.sin(angle)).mult(dist));

    // Weighted Spawning Logic
    // FIX: Maintain constant ratio of Rivals vs Food regardless of player level
    // 70% Food, 30% Chance for Rival Logic
    let isFood = Math.random() < 0.70;
    let targetStage = -1;

    if (!isFood) {
        // Attempt to spawn a Rival
        let r = Math.random();
        if (r < 0.70) {
            targetStage = player.evolutionStage - 1;
        } else if (r < 0.80) {
            targetStage = player.evolutionStage - 2;
        } else if (r < 0.95) {
            targetStage = player.evolutionStage;
        } else {
            targetStage = player.evolutionStage + 1;
        }
    }

    // If target stage is valid (>= 0), spawn NPC Insect
    if (targetStage >= 0) {
        let rival = new Insect(spawnPos.x, spawnPos.y);

        // Always Level 1
        try {
            rival.setLevel(targetStage, 1);
        } catch (err) {
            console.error("Error setting level:", err);
            return; // Skip spawn
        }

        // DOUBLE CHECK: Ensure we didn't spawn a weakling due to bug
        if (rival.evolutionStage < player.evolutionStage - 2) {
            console.warn(`Spawn Logic attempted to spawn Stage ${rival.evolutionStage} (Target: ${targetStage}) when Player is ${player.evolutionStage}. Aborting.`);
            return;
        }

        // --- Scale Scaling for World Reset ---
        // New NPCs must match the player's "Shrunk" world scale
        if (player.worldTier && player.worldTier > 1.0) {
            let shrinkFactor = 1.0 / player.worldTier;
            rival.scale *= shrinkFactor;
            rival.baseScale *= shrinkFactor;
            rival.targetScale *= shrinkFactor;

            // Also need to boost their stats to match the "Tier"?
            // If they are physically small, but "Stage X", they should have normal stats?
            // Actually, if player has 20x stats (via worldTier), and enemies have 1x stats, player OPs them.
            // If "World Reset" implies "Ascension", enemies should definitely be harder.
            // So we should multiply their stats by worldTier too?
            // Yes.
            rival.worldTier = player.worldTier;
            // We need to ensure logic in Insect uses worldTier for damage/hp

            // CRITICAL: Re-init legs so they pick up the new shrunk scale!
            rival.initLegs();
        }

        rival.isRival = true;
        creeps.push(rival);
    } else {
        // Target stage < 0 (Low level food / Creep)
        // Only spawn food if player is still low level (Stage 0 or 1)
        // If player is Stage 2 (Ladybug), -1 (Food) is < 2 - 2 (0)? No. 0 is threshold.
        // Wait, rule is "Lower than Player - 2".
        // If Player 2. Threshold 0. Food (-1) < 0. YES. Food should stop at Stage 2.

        if (player.evolutionStage < 2) {
            let food = new Creep(spawnPos.x, spawnPos.y);
            // Optional: Scale food size slightly for bigger ants
            if (scale < 1.0) food.size *= (1 / scale) * 0.5;

            // Apply World Shrink
            if (player.worldTier && player.worldTier > 1.0) {
                food.size /= player.worldTier;
            }

            creeps.push(food);
        }
    }
}


function gameLoop() {
    let input = {
        up: keys.KeyW || keys.ArrowUp,
        down: keys.KeyS || keys.ArrowDown,
        left: keys.KeyA || keys.ArrowLeft,
        right: keys.KeyD || keys.ArrowRight,
        shift: keys.ShiftLeft || keys.ShiftRight
    };

    player.update(input);
    updateUI();

    // Creep Logic
    // Dynamic generation count based on zoom
    // Base: 30. If scale 0.15 => 30 / 0.15 = 200. Cap at 150 to prevent lag.
    let currentScale = window.gameScale || 1.0;

    // We want density to remain somewhat constant. Area scales with 1/scale^2.
    // However, linear scaling (1/scale) explodes at low zoom (Spider).
    // Use sqrt scaling for a softer curve, and cap absolute max.
    // At scale 0.1 (Spider): 8 / 0.1 = 80 (Too many).
    // 8 / sqrt(0.1) = 8 / 0.31 = 25 (Better).
    // Let's also hard cap it to avoid performance issues.
    let limitBase = MAX_CREEPS;
    if (player.form === 'MANTIS') limitBase = 6; // Hard cap for Mantis to avoid clutter
    let dynamicLimit = Math.min(15, Math.floor(limitBase / Math.sqrt(currentScale)));

    if (creeps.length < dynamicLimit) {
        if (Math.random() < 0.1) spawnCreeps(); // Increased spawn rate slightly
    }

    for (let i = creeps.length - 1; i >= 0; i--) {
        let c = creeps[i];

        if (c.isRival) {
            // Rival AI Logic
            c.angle += (Math.random() - 0.5) * 0.2;
            c.vel = new Vec2(Math.cos(c.angle), Math.sin(c.angle)).mult(1.5);
            c.pos = c.pos.add(c.vel);

            // Sync speed for animation
            c.speed = 1.5;
            c.updateVisuals();


            // Update body parts
            c.thoraxPos = c.pos;
            c.headPos = c.pos.add(new Vec2(Math.cos(c.angle) * 5.5 * c.scale, Math.sin(c.angle) * 5.5 * c.scale));
            c.abdomenPos = c.pos.add(new Vec2(Math.cos(c.angle) * -7 * c.scale, Math.sin(c.angle) * -7 * c.scale));

            c.legs.forEach(l => l.update(c.thoraxPos, c.angle, c.vel, true));
        } else {
            c.update();
        }

        // 距离过远销毁
        // Dynamic Despawn Range
        let scale = window.gameScale || 1.0;
        // Strict cull for Mantis to keep performance
        let cullMult = player.form === 'MANTIS' ? 1.5 : 2.5;
        let visibleRadius = Math.max(width, height) / scale / 2;
        // Despawn if further than 2x visible radius (give some buffer)
        if (c.pos.dist(player.pos) > visibleRadius * cullMult) {
            creeps.splice(i, 1);
            continue;
        }

        // Despawn if too weak (Old stage creeps)
        // Keep world clean of low level trash
        // Treat undefined (Food) as -1
        let stage = c.evolutionStage !== undefined ? c.evolutionStage : -1;
        if (stage < player.evolutionStage - 2) {
            creeps.splice(i, 1);
            continue;
        }

        // 碰撞/进食检测
        let eatDist = player.getEatRange() + (c.isRival ? 10 * c.scale : c.size);

        if (c.pos.dist(player.pos) < eatDist) {
            // Restriction Logic:
            // 1. Stage Comparison First
            if (c.isRival) {
                if (c.evolutionStage > player.evolutionStage) {
                    // Enemy Stage is Higher: CANNOT EAT. Bounce.
                    let pushDir = c.pos.sub(player.pos).normalize();
                    c.pos = c.pos.add(pushDir.mult(5));
                    continue;
                } else if (c.evolutionStage < player.evolutionStage) {
                    // Enemy Stage is Lower: EAT.
                    // (Proceed to eat logic below)
                } else {
                    // Stages are EQUAL: Compare Level
                    if (c.level > player.level) {
                        // Enemy Level is Higher: CANNOT EAT. Bounce.
                        let pushDir = c.pos.sub(player.pos).normalize();
                        c.pos = c.pos.add(pushDir.mult(5));
                        continue;
                    }
                    // Else (Level <= Player): EAT.
                }
            }

            // Eat!
            // Eat!
            // Unified Predation Logic (Spider & Generic)
            // Attempt to start predation animation
            if (player.startPredation(c, (pos) => {
                // Callback when eat logic triggers (Apex of lunge or Mouth reach)
                let xpGain = c.isRival ? 20 * (c.scale) : (1 + Math.floor(c.size));
                player.gainXp(xpGain);
                if (pos) {
                    // Juicy particles at the bite location
                    let pSize = (c.size || 5) * (c.scale || 1) * 1.5;
                    let pCount = 15;
                    createParticles(pos.x, pos.y, c.color, pSize, pCount);
                }
            })) {
                // Animation started successfully.
                // Remove creep from world immediately.
                // For spider, it's visually held. For lunge, it's abstractly "doomed" or we could hide it?
                // For lunge, simple splice is fine, it disappears and then particles appear at apex.
                creeps.splice(i, 1);
            }
            continue;
        }
    }

    // Update Texts & Particles
    for (let i = texts.length - 1; i >= 0; i--) {
        texts[i].update();
        if (texts[i].life <= 0) texts.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }


    let targetCamX = player.pos.x - width / 2;
    let targetCamY = player.pos.y - height / 2;
    camera.x += (targetCamX - camera.x) * 0.1;
    camera.y += (targetCamY - camera.y) * 0.1;

    // --- Dynamic Zoom ---
    // Maintain Player Size below 20% of screen min dimension
    // Visual Radius approx = scale * 50 (based on rough rendering sizes)
    // Target: (scale * 50 * zoom) < (minDim * 0.20)
    // => zoom < (minDim * 0.20) / (scale * 50)

    let minDimension = Math.min(width, height);
    let baseRadius = 60;
    if (player.form === 'COCKROACH') baseRadius = 140; // Legs + Antennae
    if (player.form === 'SPIDER') baseRadius = 300; // Very long legs (120*2 diameter approx)
    if (player.form === 'MANTIS') baseRadius = 1200; // Scythes are huge. Force extreme zoom out.

    // DEBUG ZOOM
    if (Math.random() < 0.01) console.log("Zoom Debug:", player.form, baseRadius, player.scale, window.gameScale);

    // --- True World Reset Logic ---

    // 1. Calculate Desired Zoom based on current physical size
    let visualSize = player.scale * baseRadius;
    let desiredZoom = (minDimension * 0.15) / visualSize;

    // 2. Check for Reset Trigger
    if (desiredZoom < 0.05) {
        console.log("TRIGGERING WORLD RESET!");

        // --- PERFORM RESET ---

        // Dynamic Reset Factor: forces the new scale to result in EXACTLY Zoom 1.0
        // Formula: 1.0 = (minDimension * 0.15) / (newScale * baseRadius)
        // newScale = (minDimension * 0.15) / baseRadius

        // Safeguard to prevent division by zero or weirdness
        if (baseRadius <= 0) baseRadius = 60;

        let idealNewScale = (minDimension * 0.15) / baseRadius;
        let RESET_FACTOR = player.scale / idealNewScale;

        // Sanity check: Factor should be large (e.g. > 15). If it's small, maybe we shouldn't reset?
        // But trigger was desiredZoom < 0.05.
        // desiredZoom = (min * 0.15) / (scale * radius) < 0.05
        // (min * 0.15) / scale / radius < 0.05
        // (min * 0.15) / radius < 0.05 * scale
        // scale > (min * 0.15) / radius / 0.05 = idealNewScale / 0.05 = 20 * idealNewScale.
        // Thus scale / idealNewScale > 20.
        // So RESET_FACTOR will be > 20. Correct.

        // 1. Shrink Player
        player.scale /= RESET_FACTOR;
        player.baseScale /= RESET_FACTOR;
        player.targetScale /= RESET_FACTOR;

        // CRITICAL: Re-init legs so they pick up the new scale!
        player.initLegs();

        // 2. Boost Power Tier (So stats don't drop)
        player.worldTier *= RESET_FACTOR;

        // 3. Reset Zoom Variable
        window.gameScale = 1.0;

        // 4. Force Camera Update (Prevent Glitch)
        // Camera position logic handles itself (follows player).

        // 5. Clear Old World (They are now microscopic)
        // We could shrink them too? No, user wants a "New Canvas".
        creeps.length = 0; // Wipe array
        particles.length = 0;
        texts.length = 0;

        // 6. Spawn New Enemies immediately?
        // spawnCreeps() will run next frame.

        // 7. Visual Notification
        texts.push(new FloatingText(player.pos.x, player.pos.y - 100, "DIMENSION ASCENSION!", '#FFD700', 60, 5.0));
    }

    // 3. Normal Zoom Logic
    // Allow zooming down to 0.05 (Limit)
    let autoTargetZoom = Math.max(0.05, Math.min(1.0, desiredZoom));

    // Smooth Zoom
    if (!window.gameScale) window.gameScale = 1.0;
    window.gameScale += (autoTargetZoom - window.gameScale) * 0.1;


    ctx.fillStyle = '#e6dcc3';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Center Screen
    ctx.translate(width / 2, height / 2);
    // Draw World normally at gameScale
    ctx.scale(window.gameScale, window.gameScale);
    ctx.translate(-width / 2, -height / 2);
    // Camera
    ctx.translate(-camera.x, -camera.y);

    // Environment: No scale trickery needed. Just draw.
    // Use worldTier to scale texture density if we want? 
    // Actually, since player shrunk, the existing grid (500px) NOW looks huge (rel to player).
    // So we don't need to change environment drawing AT ALL.
    // The "Giant Grid" effect happens naturally because the player is tiny!
    env.draw(ctx, camera, width, height, window.gameScale);

    // Draw Creeps
    creeps.forEach(c => c.draw(ctx));

    player.draw(ctx);

    // Draw Particles
    particles.forEach(p => p.draw(ctx));

    // Draw Texts
    texts.forEach(t => t.draw(ctx));

    ctx.restore();


    ctx.restore();


    requestAnimationFrame(gameLoop);
}

gameLoop();
