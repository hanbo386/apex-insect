import './style.css';
import { Insect } from './game/Insect.js';
import { Environment } from './game/Environment.js';
import { Vec2 } from './game/Vec2.js';
import { Creep } from './game/Creep.js';
import { FloatingText } from './game/FloatingText.js';
import { Particle, BodyPart } from './game/Particle.js';
import { checkCollision } from './game/Collision.js';
import { MobileControls } from './game/MobileControls.js';




const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const mobileControls = new MobileControls(); // Initialize Mobile Controls
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
statusText.id = 'status-display';
uiContainer.appendChild(statusText);

// Titan Quest Modal
const modal = document.createElement('div');
modal.id = 'titan-modal';
modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.85); display: none; flex-direction: column;
    justify-content: center; align-items: center; z-index: 1000; color: #ff3d00;
    font-family: 'Courier New', monospace; text-align: center; border: 2px solid #ff3d00;
`;
modal.innerHTML = `
    <h1 style="font-size: 40px; margin-bottom: 20px; text-shadow: 0 0 10px red;">⚠️ EVOLUTION WARNING ⚠️</h1>
    <h2 style="color: #fff; margin-bottom: 30px;">Titan Form Detected</h2>
    <p style="font-size: 18px; max-width: 600px; line-height: 1.6; color: #ccc; margin-bottom: 40px;">
        恭喜你进化为巨型毒蝎！距离虫群至尊 (Swarm Sovereign) 仅一步之遥。<br><br>
        <span style="color: #d4c490;">RITUAL REQUIRED:</span><br>
        Devour <strong style="color: #ff3d00">50 Scorpions</strong><br>
        Devour <strong style="color: #ff3d00">30 Centipedes</strong><br>
        Devour <strong style="color: #ff3d00">20 Tarantulas</strong>
    </p>
    <button id="start-quest-btn" style="
        padding: 15px 40px; font-size: 24px; background: #ff3d00; color: #000; 
        border: none; cursor: pointer; font-weight: bold; box-shadow: 0 0 20px red;
    ">INITIATE RITUAL</button>
`;
document.body.appendChild(modal);

document.getElementById('start-quest-btn').addEventListener('click', () => {
    modal.style.display = 'none';
    if (player.titanQuest) player.titanQuest.active = true;
});

function updateUI() {
    // 0: 原始种 (Primitive)
    // 1: 蚂蚁 (Ant)
    // 2: 瓢虫 (Ladybug)
    // 3: 潮虫 (Pillbug)
    // 4: 蟑螂 (Cockroach)
    // 5: 蜘蛛 (Spider)
    // 6: 螳螂 (Mantis)
    let formNames = ["原始种 (Primitive)", "蚂蚁 (Ant)", "瓢虫 (Ladybug)", "潮虫 (Pillbug)", "蟑螂 (Cockroach)", "蜘蛛 (Spider)", "螳螂 (Mantis)", "蟋蟀 (Cricket)", "大沙螽 (Giant Weta)", "竹节虫 (Stick Insect)", "狼蛛 (Tarantula)", "巨型蜈蚣 (Centipede)", "巨型毒蝎 (Scorpion)"];
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

    // Titan Quest UI
    if (player.titanQuest && player.titanQuest.active && !player.titanQuest.complete) {
        let questHTML = `<br><span style="color: #ff3d00; font-weight:bold;">TITAN QUEST:</span>
        <span style="color:${player.titanQuest.scorpions >= player.titanQuest.reqScorpions ? '#0f0' : '#aaa'}">Scorpions: ${player.titanQuest.scorpions}/${player.titanQuest.reqScorpions}</span> | 
        <span style="color:${player.titanQuest.centipedes >= player.titanQuest.reqCentipedes ? '#0f0' : '#aaa'}">Centipedes: ${player.titanQuest.centipedes}/${player.titanQuest.reqCentipedes}</span> | 
        <span style="color:${player.titanQuest.tarantulas >= player.titanQuest.reqTarantulas ? '#0f0' : '#aaa'}">Tarantulas: ${player.titanQuest.tarantulas}/${player.titanQuest.reqTarantulas}</span>`;
        statusText.innerHTML += questHTML;
    }
}

// Input handling
const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false, ShiftLeft: false, ShiftRight: false, Space: false, MouseDown: false };

window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
});
window.addEventListener('mousedown', () => { keys.MouseDown = true; });
window.addEventListener('mouseup', () => { keys.MouseDown = false; });
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
    const needed = player.xpToNext - player.xp;
    if (needed > 0) {
        player.gainXp(needed);
    }
    // Force focus back
    window.focus();
    if (document.getElementById('gameCanvas')) document.getElementById('gameCanvas').focus();
});



// Game Init
const player = new Insect(width / 2, height / 2);
player.onLevelUp = (lvl) => {
    texts.push(new FloatingText(player.pos.x, player.pos.y - 50, `LEVEL UP! (${lvl})`, '#00ff00', 40));
};
player.onGainXp = (amount) => {
    texts.push(new FloatingText(player.pos.x, player.pos.y - 40, `+${amount} XP`, '#ffff00', 12, 1.0));
};
player.onEvolve = (formName, stage) => {
    // Check for Stage 5 (Spider) -> World Reset
    // World Reset Logic (Prestige)
    // Occurs at Stage 5 (Spider) and Stage 9 (Rhino Beetle)
    if ((stage === 5 || stage === 8 || stage === 12) && !player.hasResetWorld) {
        player.hasResetWorld = true;

        // 1. Popup Prompt
        // Alert blocks thread, so let's do it.
        setTimeout(() => {
            alert("完成跃迁，将进入下一个世界");

            // 2. Clear World
            creeps.length = 0;
            particles.length = 0;
            texts.length = 0;

            // 3. Reset Player Logic
            // Calculate Scale Divisor. 
            // We want the player to visually reset to 1.0.
            // So we set the divisor to the canonical start scale of the current stage.
            let resetBaseScale = 6.5; // Default Stage 5 (Spider)
            if (stage === 8) resetBaseScale = 35.0; // Stage 8 (Giant Weta)
            if (stage === 12) resetBaseScale = 325.0; // Stage 12 (Scorpion)

            // Update Divisor (Absolute assignment)
            player.worldScaleDivisor = resetBaseScale;

            if (!player.worldTier) player.worldTier = 1.0;
            player.worldTier += 1.0; // Increment Tier

            player.worldScaleModifier = 1.0 / player.worldScaleDivisor;

            // Update internal scale immediately to prevent 1-frame jump
            player.scale = 1.0;

            // Re-init legs at new scale 1.0
            player.initLegs();

            // Reset Position (Center)
            player.pos = new Vec2(0, 0);

            // 4. Reset Zoom
            window.gameScale = 1.0;

            texts.push(new FloatingText(player.pos.x, player.pos.y - 80, `新世界开启! (Tier ${player.worldTier})`, '#FFD700', 60, 5.0));

            // Restore Titan Quest Prompt for Scorpion
            if (stage === 12 && !player.titanQuest.active && !player.titanQuest.complete) {
                document.getElementById('titan-modal').style.display = 'flex';
            }
        }, 100);

        return;
    }

    // Reset the flag if we are NOT 5 or 9
    // This allows it to trigger again for the next threshold
    if (stage !== 5 && stage !== 8 && stage !== 12) {
        player.hasResetWorld = false;
    }

    // Check for Titan Quest Initiation
    if (stage === 12 && !player.titanQuest.active && !player.titanQuest.complete) {
        document.getElementById('titan-modal').style.display = 'flex';
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
const corpses = []; // Dead bodies
const texts = []; // 浮动文字
const particles = []; // 粒子效果
const ripples = []; // 地面震波
const MAX_CREEPS = 4;

function createParticles(x, y, color, size = 4, count = 8) {
    for (let k = 0; k < count; k++) {
        // Vary size slightly
        let s = size * (0.5 + Math.random());
        particles.push(new Particle(x, y, color, s));
    }
}

// Visual Effects Classes from Reference
class GroundRipple {
    constructor(x, y, maxRadius, color) {
        this.x = x; this.y = y; this.radius = 0;
        this.maxRadius = maxRadius; this.life = 1.0; this.color = color;
        this.phases = [0, -0.2, -0.4];
    }
    update(dt) { this.life -= dt * 1.5; }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        const coreAlpha = Math.max(0, this.life * 0.8);
        const coreGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.maxRadius * 0.5 * (1 - this.life));
        coreGrad.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha})`);
        coreGrad.addColorStop(0.2, `rgba(255, 200, 0, ${coreAlpha})`);
        coreGrad.addColorStop(1, 'rgba(255, 61, 0, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.maxRadius * (1 - this.life), 0, Math.PI * 2); ctx.fill();

        this.phases.forEach((p, i) => {
            const currentLife = this.life + p;
            if (currentLife <= 0 || currentLife > 1) return;
            const progress = 1 - Math.pow(currentLife, 2);
            const r = this.maxRadius * progress;
            const alpha = currentLife * 0.6;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = (3 - i) * currentLife * 3;
            ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.stroke();
        });
        ctx.restore();
    }
}

// Hook for Titan Leg Impact
// The Insect instance needs access to this.
// Since 'player' is created as new Insect(), let's attach this method to the game instance or expose it global/player.
player.game = {
    triggerImpact: (x, y, power, shouldShake) => {
        // power ~5. Scale ~ player.scale?
        ripples.push(new GroundRipple(x, y, 120 + power * 5 * player.scale, '#ff3d00'));
        // Ignore shake for now or implement camera shake logic
        if (shouldShake) {
            // implemented via camera offset in draw loop if desired
            cameraShake = Math.min(10, cameraShake + power * 0.6);
        }
    }
};
let cameraShake = 0;

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
        if (r < 0.67) {
            targetStage = player.evolutionStage - 1;
        } else if (r < 0.77) {
            targetStage = player.evolutionStage - 2;
        } else if (r < 0.87) {
            targetStage = player.evolutionStage;
        } else if (r < 0.97) {
            targetStage = player.evolutionStage + 1;
        } else {
            targetStage = player.evolutionStage + 2; // 3% Chance
        }
    }

    // --- Unique Titan & Boss Logic ---
    // If player is TITAN, they are the Sovereign. NO higher or equal stage NPCs can spawn.
    // Titan is Stage 13.
    // If Player is Titan, Max spawn stage is 12 (Scorpion).
    if (player.form === 'TITAN') {
        if (targetStage >= 13) {
            targetStage = 12; // Downgrade to Scorpion
        }
    }

    // Also keep the previous rule: If target is TITAN (13), and player is SCORPION (12), downgrade.
    if (targetStage === 13) {
        if (player.evolutionStage >= 12) {
            targetStage = 12;
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
        // --- Scale Scaling for World Reset ---
        // New NPCs must match the player's "Shrunk" world scale
        if (player.worldScaleDivisor && player.worldScaleDivisor > 1.0) {
            let shrinkFactor = 1.0 / player.worldScaleDivisor;
            rival.scale *= shrinkFactor;
            rival.baseScale *= shrinkFactor;
            rival.targetScale *= shrinkFactor;

            // Also need to boost their stats to match the "Tier"?
            // If they are physically small, but "Stage X", they should have normal stats?
            // Actually, if player has 20x stats (via worldTier), and enemies have 1x stats, player OPs them.
            // If they are physically small, but "Stage X", they should have normal stats?
            // Actually, if player has 20x stats (via worldTier), and enemies have 1x stats, player OPs them.
            // If "World Reset" implies "Ascension", enemies should definitely be harder.
            // So we should multiply their stats by worldScaleDivisor too? 
            // Or use worldTier (which counts Resets).
            // Let's stick to worldTier for Stats, but worldScaleDivisor for Size.
            // rival.worldTier = player.worldTier;
            // For now, let's just make their size correct. The complexity of stats can be tuned later.
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
            if (player.worldScaleDivisor && player.worldScaleDivisor > 1.0) {
                food.size /= player.worldScaleDivisor;
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
        shift: keys.ShiftLeft || keys.ShiftRight,
        attack: keys.Space,
        mouseDown: keys.MouseDown
    };

    // Integrate Mobile Controls
    if (mobileControls.isActive()) {
        const joy = mobileControls.getMoveVector();
        if (joy.x !== 0 || joy.y !== 0) {
            input.moveVector = joy;
        }
        if (mobileControls.isSprinting()) input.shift = true;
        if (mobileControls.isAttacking()) input.attack = true;
    }

    player.update(input);

    // --- OBSTACLE COLLISION LOGIC ---
    // 1. LEAVES: Only Primitive(0) and Ant(1) blocked.
    // 2. PUDDLES: ALL creatures in Scene 1 blocked.
    // "Scene 1" implies Tier 1 (no world scale divisor / or low scaler).
    // Assuming standard world = Scene 1.
    // Even High Stages (Titans) can't cross puddles in Scene 1.

    // Check type of collision
    let currentTier = (player.worldScaleModifier && player.worldScaleModifier <= 0.5) ? 2 : 1;
    let obstacleHit = env.checkObstacleCollision(player.pos.x, player.pos.y, 1.0, player.evolutionStage <= 1, true, currentTier);

    if (obstacleHit) {
        let obsPos = new Vec2(obstacleHit.x, obstacleHit.y);
        let pushDir = player.pos.sub(obsPos).normalize();
        if (pushDir.mag() === 0) pushDir = new Vec2(Math.random() - 0.5, Math.random() - 0.5).normalize();

        let overlap = (obstacleHit.radius + 10 * player.scale) - player.pos.dist(obsPos);
        if (overlap > 0) {
            player.pos = player.pos.add(pushDir.mult(overlap));
            // Optional: Bounce velocity
            // player.vel = player.vel.add(pushDir.mult(5));
        }
    }

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
    if (player.evolutionStage === 0) limitBase = MAX_CREEPS * 2; // Double for primitive
    if (player.form === 'MANTIS') limitBase = 6; // Hard cap for Mantis to avoid clutter
    let dynamicLimit = Math.min(15, Math.floor(limitBase / Math.sqrt(currentScale)));

    if (creeps.length < dynamicLimit) {
        // Double spawn rate for primitive to fill the increased limit faster
        let spawnChance = player.evolutionStage === 0 ? 0.2 : 0.1;
        if (Math.random() < spawnChance) spawnCreeps();
    }

    for (let i = creeps.length - 1; i >= 0; i--) {
        let c = creeps[i];

        if (c.isRival) {
            // Rival AI Logic
            if (player.form === 'TITAN') {
                // Swarm Logic: Follow the Sovereign
                // Smoothly steer towards player but keep distance
                let diff = player.pos.sub(c.pos);
                let dist = diff.mag();
                let desiredDist = 150 * player.scale;

                let targetPos = player.pos; // Default to player center

                // If too close, circle or back away?
                // Simple flocking: Move towards player
                let angleToPlayer = Math.atan2(diff.y, diff.x);

                // Steer angle smoothly
                let currentAngle = c.angle;
                let angleDiff = angleToPlayer - currentAngle;
                // Normalize angle
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                c.angle += Math.max(-0.05, Math.min(0.05, angleDiff));

                let npcSpeed = 3.0 * (c.scale || 1.0); // Faster to keep up
                if (dist < desiredDist) npcSpeed *= 0.5; // Slow down if close

                c.vel = new Vec2(Math.cos(c.angle), Math.sin(c.angle)).mult(npcSpeed);
                c.pos = c.pos.add(c.vel);
                c.speed = npcSpeed;

                c.update(c.pos, c.angle, c.vel); // Update legs
            } else {
                // --- RIVAL AI LOGIC ---
                let distToPlayer = c.pos.dist(player.pos);
                let visionRange = (c.visionRadius || 400) * (c.scale || 1.0);
                let isFocused = false;

                // 0. PRIORITY FLEE (From Attack)
                if (c.isFleeing && c.fleeTimer > 0) {
                    isFocused = true;
                    c.fleeTimer--;
                    if (c.fleeTimer <= 0) c.isFleeing = false;

                    // Flee from player
                    let angleAway = Math.atan2(c.pos.y - player.pos.y, c.pos.x - player.pos.x);
                    let angleDiff = angleAway - c.angle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    c.angle += Math.max(-0.15, Math.min(0.15, angleDiff)); // Fast turn

                    let speed = 4.0 * (c.scale || 1.0);
                    c.vel = new Vec2(Math.cos(c.angle), Math.sin(c.angle)).mult(speed);
                }

                // 1. PREDATOR BEHAVIOR (Higher Stage)
                // Initialize Timers if undefined
                if (c.chaseTimer === undefined) c.chaseTimer = 0;
                if (c.chaseCooldown === undefined) c.chaseCooldown = 0;

                // Handle Cooldown
                if (c.chaseCooldown > 0) {
                    c.chaseCooldown--;
                    // Must wander if cooling down
                    isFocused = false;
                } else if (c.evolutionStage > player.evolutionStage && distToPlayer < visionRange * 0.6) {
                    // Chase Logic
                    isFocused = true;

                    // Increment Timer
                    c.chaseTimer++;
                    if (c.chaseTimer > 180) { // > 3 Seconds (assuming 60fps)
                        // Stop Chasing!
                        isFocused = false;
                        c.chaseCooldown = 180; // 3 Second Cooldown
                        c.chaseTimer = 0;
                    } else {
                        // Actual Movement
                        let angleToPlayer = Math.atan2(player.pos.y - c.pos.y, player.pos.x - c.pos.x);
                        let angleDiff = angleToPlayer - c.angle;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        c.angle += Math.max(-0.1, Math.min(0.1, angleDiff));

                        let chaseSpeed = 3.5 * (c.scale || 1.0);
                        c.vel = new Vec2(Math.cos(c.angle), Math.sin(c.angle)).mult(chaseSpeed);

                        if (distToPlayer < 40 * c.scale) {
                            // CAUGHT!
                            if (player.evolutionStage <= 1) {
                                // Game Over if Ant(1) or Primitive(0)
                                alert("游戏失败！你被捕食了。");
                                location.reload();
                                return;
                            }

                            if (player.evolutionStage > 0) {
                                player.devolve();
                                createParticles(player.pos.x, player.pos.y, '#ff0000', 30 * player.scale, 20);
                                let pushDir = player.pos.sub(c.pos).normalize();
                                player.pos = player.pos.add(pushDir.mult(150));
                            }
                        }
                    }
                } else {
                    // Not Chasing (Out of range or cooldown just started in else block logic? No, covered by isFocused reset)
                    // Reset chase timer if we lost interest naturally
                    c.chaseTimer = 0;
                }
                if (c.isDead) continue; // Skip updates for doomed creeps
                // 2. PREY BEHAVIOR (Lower Stage)
                else if (c.evolutionStage < player.evolutionStage && distToPlayer < visionRange) {
                    // Flee!
                    isFocused = true;
                    let angleAway = Math.atan2(c.pos.y - player.pos.y, c.pos.x - player.pos.x);
                    let angleDiff = angleAway - c.angle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    c.angle += Math.max(-0.1, Math.min(0.1, angleDiff));

                    let fleeSpeed = 3.8 * (c.scale || 1.0);
                    c.vel = new Vec2(Math.cos(c.angle), Math.sin(c.angle)).mult(fleeSpeed);
                }

                // 3. WANDER (Default)
                if (!isFocused) {
                    // Guard against overriding Attack Lunge Velocity
                    if (!(c.form === 'TARANTULA' && c.predationState === 'attacking')) {
                        c.angle += (Math.random() - 0.5) * 0.2;
                        let wanderSpeed = 1.5 * (c.scale || 1.0);
                        c.vel = new Vec2(Math.cos(c.angle), Math.sin(c.angle)).mult(wanderSpeed);
                    }
                }

                if (c.form === 'TARANTULA') {
                    // Tarantula uses advanced physics (friction/lunge) handles its own pos integration
                    c.updateTarantula({});
                } else {
                    // Standard Integration
                    c.pos = c.pos.add(c.vel);
                }

                c.speed = c.vel.mag();

                c.thoraxPos = c.pos;
                c.headPos = c.pos.add(new Vec2(Math.cos(c.angle) * 5.5 * c.scale, Math.sin(c.angle) * 5.5 * c.scale));
                c.abdomenPos = c.pos.add(new Vec2(Math.cos(c.angle) * -7 * c.scale, Math.sin(c.angle) * -7 * c.scale));

                c.updateVisuals();

                // Manual Leg Updates
                if (c.legs) {
                    c.legs.forEach(l => {
                        if (l.update) l.update(c.pos, c.angle, c.vel, true);
                    });
                }
                if (c.form === 'SCORPION') c.updateScorpion({});
                // Tarantula update called above
                if (c.form === 'GIANT_WETA') {
                    if (c.wetaLegs) c.wetaLegs.forEach(leg => leg.update(c.pos, c.angle, c.vel, c.maxSpeed, c.scale));
                    if (c.wetaAntennae) c.wetaAntennae.forEach((ant, i) => {
                        let side = (i === 0) ? -1 : 1;
                        ant.update(c.pos, c.angle, side);
                    });
                }
            }
            c.updateVisuals();


            // Update body parts
            c.thoraxPos = c.pos;
            c.headPos = c.pos.add(new Vec2(Math.cos(c.angle) * 5.5 * c.scale, Math.sin(c.angle) * 5.5 * c.scale));
            c.abdomenPos = c.pos.add(new Vec2(Math.cos(c.angle) * -7 * c.scale, Math.sin(c.angle) * -7 * c.scale));

            if (c.form === 'SCORPION') {
                c.updateScorpion({});
            } else if (c.form === 'GIANT_WETA') {
                if (c.wetaLegs) c.wetaLegs.forEach(leg => leg.update(c.pos, c.angle, c.vel, c.maxSpeed, c.scale));
                if (c.wetaAntennae) c.wetaAntennae.forEach((ant, i) => {
                    let side = (i === 0) ? -1 : 1;
                    ant.update(c.pos, c.angle, side);
                });
            } else if (c.form === 'STICK_INSECT') {
                c.updateStickInsect({});
            } else if (c.form === 'COCKROACH') {
                c.updateCockroach({});
            } else if (c.form === 'MANTIS') {
                c.updateMantis({});
            }
            // Standard Legs (Scorpion legs list is empty, so this is safe to leave or wrap)
            c.legs.forEach(l => l.update(c.thoraxPos, c.angle, c.vel, true));
        } else {
            // Food Logic
            c.update();
        }

        // --- NPC OBSTACLE COLLISION ---
        // NPCs must also go around puddles.
        // Leaf logic for NPCs: Assuming same rule (Low stage < 2 blocked).
        let npcStage = c.evolutionStage || 0;
        let npcRadius = (c.size || 10) * (c.scale || 1.0);
        let nTier = currentTier; // Use same tier as player environment

        let npcObs = env.checkObstacleCollision(c.pos.x, c.pos.y, npcRadius, npcStage <= 1, true, nTier);
        if (npcObs) {
            let obsPos = new Vec2(npcObs.x, npcObs.y);
            let pushDir = c.pos.sub(obsPos).normalize();
            if (pushDir.mag() === 0) pushDir = new Vec2(Math.random() - 0.5, Math.random() - 0.5).normalize();

            let overlap = (npcObs.radius + npcRadius) - c.pos.dist(obsPos);
            if (overlap > 0) {
                c.pos = c.pos.add(pushDir.mult(overlap));
                // Add avoidance force to velocity to help them steer around
                // c.vel = c.vel.add(pushDir.mult(0.5)); 
                // But simplified pos update is cleaner for now.

                // If standard update logic is used, changing pos is fine.
            }
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
        // Replaced simple dist check with robust body checking OR Attack Range for Lunge
        let eatRange = player.getEatRange ? player.getEatRange() : 50 * player.scale;
        // Use generic distance check for trigger to allow Mantis Lunge to start early
        let distToCreep = player.pos.dist(c.pos);
        // Debug Log for Mantis Trigger
        if (player.form === 'MANTIS' && distToCreep < eatRange) {
            console.log(`[Main] MANTIS TRIGGER! Dist: ${distToCreep.toFixed(1)} < EatRange: ${eatRange.toFixed(1)}`);
        }

        // Collision OR In Range (for Mantis/Spider)
        if (checkCollision(player, c) || ((player.form === 'MANTIS' || player.form === 'GIANT_WETA') && distToCreep < eatRange)) {

            // Restriction Logic:
            // 1. Stage Comparison First
            if (c.isRival) {
                // TITAN Swarm Leader Logic: No eating, no attacking for TITAN
                if (player.form === 'TITAN') {
                    // Do nothing (don't eat, don't get hurt)
                    // Just push gently to avoid clipping
                    let pushDir = c.pos.sub(player.pos).normalize();
                    c.pos = c.pos.add(pushDir.mult(5));
                    continue;
                }

                if (c.evolutionStage > player.evolutionStage) {
                    // Enemy Stage is Higher: CANNOT EAT. Bounce.
                    let pushDir = c.pos.sub(player.pos).normalize();
                    c.pos = c.pos.add(pushDir.mult(5));
                    continue;
                } else if (c.evolutionStage < player.evolutionStage || (player.titanQuest && player.titanQuest.active && c.evolutionStage === 12 && player.evolutionStage === 12)) {
                    // Enemy Stage is Lower (OR it's a Scorpion vs Scorpion Quest Kill)
                    // Normally equal stage can't eat, but for the Titan ritual, the Scorpion must cannibalize other Scorpions.
                    // This creates a loophole where Player Scorpion can eat NPC Scorpion if Quest is active.

                    if (player.titanQuest && player.titanQuest.active && c.evolutionStage === 12 && player.evolutionStage === 12) {
                        // Special check: Is it actually safe to eat? Or should we check Level?
                        // Let's allow it regardless of level for the "Ritual" feel, or keep level logic?
                        // If we want it strictly "Lower", this block wouldn't be entered.
                        // But since we are here due to OR condition:
                        if (c.level > player.level) {
                            // Still respect level hierarchy? The prompt implies "Eating 50 Scorpions".
                            // Usually you can only eat lower level.
                            // If we fail level check, we bounce.
                            let pushDir = c.pos.sub(player.pos).normalize();
                            c.pos = c.pos.add(pushDir.mult(5));
                            continue;
                        }
                    }

                    // THIS IS WHERE PREY DEATH HAPPENS for RIVALS lower than player.

                    // Counting moved to consumeCallback to prevent collision spam

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
                // Remove creep from world NOW (delayed).
                let idx = creeps.indexOf(c);
                if (idx !== -1) {
                    creeps.splice(idx, 1);

                    // --- Shattering Effect (Body Parts) ---
                    if (typeof c.shatter === 'function') {
                        const parts = c.shatter();
                        parts.forEach(p => {
                            particles.push(new BodyPart(p.x, p.y, p.part, p.type, p.scale, p.vel, p.props));
                        });
                    } else if (c.headPos && c.colors && c.colors.head) {
                        // Fallback for objects with headPos but no shatter() ?? (Shouldn't happen if Insect)
                        // But keep old logic just in case? No, Insect should have shatter.
                        // Let's assume Insect has shatter.
                        // If it's a simple Creep, it goes to else.
                        createParticles(c.pos.x, c.pos.y, c.color || '#00aa00', (c.size || 5), 8);
                    } else {
                        // Simple Creep Shatter
                        createParticles(c.pos.x, c.pos.y, c.color || '#00aa00', (c.size || 5), 8);
                    }
                }

                // XP Calculation Fixed
                let stagePower = c.evolutionStage !== undefined ? Math.pow(1.5, c.evolutionStage) : 0;
                let xpGain = c.isRival ? Math.floor(20 * stagePower) : (1 + Math.floor(c.size * (c.scale || 1)));
                player.gainXp(xpGain);

                // Removed Particle Explosion ("Residue") as requested, since we now keep the corpse.

                // --- TITAN QUEST TRACKING (Moved Here) ---
                if (player.titanQuest && player.titanQuest.active && !player.titanQuest.complete) {
                    if (c.evolutionStage === 12) player.titanQuest.scorpions++;
                    else if (c.evolutionStage === 11) player.titanQuest.centipedes++;
                    else if (c.evolutionStage === 10) player.titanQuest.tarantulas++;

                    // Check Completion
                    if (player.titanQuest.scorpions >= player.titanQuest.reqScorpions &&
                        player.titanQuest.centipedes >= player.titanQuest.reqCentipedes &&
                        player.titanQuest.tarantulas >= player.titanQuest.reqTarantulas) {
                        player.titanQuest.complete = true;
                        // TRIGGER EVOLUTION
                        setTimeout(() => {
                            createParticles(player.pos.x, player.pos.y, '#ff3d00', 50 * player.scale, 50); // Big explosion
                            player.evolve(); // This will bump to Stage 13 (Titan)
                        }, 500);
                    }
                }
            })) {
                // Animation started successfully.
                // Remove creep from world immediately.
                // For spider, it's visually held. For lunge, it's abstractly "doomed" or we could hide it?
                // For lunge, simple splice is fine, it disappears and then particles appear at apex.
                // creeps.splice(i, 1); 
                // EDIT: Do NOT remove immediately. Let consumeCallback handle removal or rely on visual cues.
                // Actually, if we don't remove it, it stays in the list and might collide again?
                // But startPredation returns FALSE if busy.
                // The issue is: If we don't splice here, it renders.
                // If we splice here, it disappears.
                // For Tarantula, we WANT it to stay rendered until the LUNGE hits.
                // So we must splice INSIDE the callback. 
                // But splice requires index 'i'. 'i' changes if other things die.
                // Robust solution: Mark creep as 'dead/eaten' and filter later? Or splicing object directly?
                // creeps is an array. creeps.indexOf(c) is safer.

                // We will move the splice to the callback.
                // BUT we must effectively disable the creep so it doesn't move or collide again.
                c.isDead = true; // Flag it.
            }
            continue;
        }
    }

    // Update Texts & Particles & Corpses
    for (let i = corpses.length - 1; i >= 0; i--) {
        let c = corpses[i];
        c.corpseTimer--;
        if (c.corpseTimer <= 0) {
            corpses.splice(i, 1);
        }
    }
    for (let i = texts.length - 1; i >= 0; i--) {
        texts[i].update();
        if (texts[i].life <= 0) texts.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].update(0.016);
        if (ripples[i].life <= 0) ripples.splice(i, 1);
    }

    // Titan Particle Logic
    if (player.form === 'TITAN' && player.vel.mag() > 50 * player.scale) {
        if (particles.length < 100) {
            particles.push(new Particle(
                player.pos.x + (Math.random() - 0.5) * 300 * player.scale,
                player.pos.y + (Math.random() - 0.5) * 300 * player.scale,
                '#ff3d00', // Titan dust color
                Math.random() * 5 * player.scale // size
            ));
            // Override velocity in particle specific handling? 
            // Existing Particle class is simple. Let's rely on default behavior or tweak.
            // Reference: vx = -vel.x * 0.05
            let p = particles[particles.length - 1];
            p.vel.x = -player.vel.x * 0.05;
            p.vel.y = -player.vel.y * 0.05;
        }
    }

    cameraShake = Math.max(0, cameraShake - 0.5);


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
    // FIX: Spider legs are long, but if we account for full leg span (300), the camera zooms out too far (0.3).
    // We want Zoom ~1.0 for the New World. So treating it closer to standard size (e.g. 100-120) makes sense.
    // This lets legs clip off screen edges slightly but keeps the "Main Character" feel.
    if (player.form === 'SPIDER') baseRadius = 120;
    if (player.form === 'MANTIS') baseRadius = 130;
    if (player.form === 'CRICKET') baseRadius = 140;
    if (player.form === 'STICK_INSECT') baseRadius = 150;
    if (player.form === 'TARANTULA') baseRadius = 130;
    if (player.form === 'RHINO_BEETLE') baseRadius = 160;
    if (player.form === 'GIANT_WETA') baseRadius = 240; // Force zoom out
    if (player.form === 'CENTIPEDE') baseRadius = 220;
    if (player.form === 'SCORPION') baseRadius = 180;
    if (player.form === 'TITAN') baseRadius = 450;

    let visualSize = player.scale * baseRadius;
    let desiredZoom = (minDimension * 0.15) / visualSize;

    // 3. Normal Zoom Logic




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

    if (cameraShake > 0) {
        ctx.translate((Math.random() - 0.5) * cameraShake, (Math.random() - 0.5) * cameraShake);
    }

    // Environment: No scale trickery needed. Just draw.
    // Use worldTier to scale texture density if we want? 

    // Draw Ripples (Under environment or on top?) Reference draws ripples AFTER background but BEFORE insect.
    ripples.forEach(r => r.draw(ctx));

    // Actually, since player shrunk, the existing grid (500px) NOW looks huge (rel to player).
    // So we don't need to change environment drawing AT ALL.
    // The "Giant Grid" effect happens naturally because the player is tiny!
    // Pass currentTier to draw function
    env.draw(ctx, camera, width, height, window.gameScale, currentTier);

    // Draw Corpses (Fade out)
    corpses.forEach(c => {
        ctx.save();
        let alpha = Math.max(0, c.corpseTimer / c.maxCorpseTimer);
        ctx.globalAlpha = alpha;
        // Draw without Health Bar or Debug
        // We call drawInternal directly if possible, or just draw and rely on isDead/Player checks to skip logic
        // But draw() calls drawDebugHitboxes which we might not want.
        // Actually debugging outlines on corpses might be annoying.
        // But Insect.js draw() calls drawInternal + drawDebugHitboxes.
        // We can just rely on alpha to fade it all.
        c.draw(ctx);
        ctx.restore();
    });

    // Draw Creeps
    creeps.forEach(c => c.draw(ctx));

    // Draw Particles (Residue/Debris) - BEFORE Player to prevent covering
    particles.forEach(p => p.draw(ctx));

    // Draw Player (On Top)
    player.draw(ctx);

    // Draw Texts
    texts.forEach(t => t.draw(ctx));

    ctx.restore();


    ctx.restore();


    requestAnimationFrame(gameLoop);
}

gameLoop();
