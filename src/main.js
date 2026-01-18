import './style.css';
import { Insect } from './game/Insect.js';
import { Environment } from './game/Environment.js';
import { Vec2 } from './game/Vec2.js';
import { Creep } from './game/Creep.js';
import { FloatingText } from './game/FloatingText.js';
import { Particle } from './game/Particle.js';
import { checkCollision } from './game/Collision.js';




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
    let formNames = ["原始种 (Primitive)", "蚂蚁 (Ant)", "瓢虫 (Ladybug)", "潮虫 (Pillbug)", "蟑螂 (Cockroach)", "蜘蛛 (Spider)", "螳螂 (Mantis)", "蟋蟀 (Cricket)", "竹节虫 (Stick Insect)", "独角仙 (Rhino Beetle)", "狼蛛 (Tarantula)", "巨型蜈蚣 (Centipede)", "巨型毒蝎 (Scorpion)"];
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
player.onEvolve = (formName, stage) => {
    // Check for Stage 5 (Spider) -> World Reset
    // World Reset Logic (Prestige)
    // Occurs at Stage 5 (Spider) and Stage 9 (Rhino Beetle)
    if ((stage === 5 || stage === 9) && !player.hasResetWorld) {
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
            if (stage === 9) resetBaseScale = 50.0; // Stage 9 (Rhino Beetle)

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

        }, 100);

        return;
    }

    // Reset the flag if we are NOT 5 or 9
    // This allows it to trigger again for the next threshold
    if (stage !== 5 && stage !== 9) {
        player.hasResetWorld = false;
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
            // Scale speed with size so they don't look like they are crawling
            let npcSpeed = 1.5 * (c.scale || 1.0);
            c.vel = new Vec2(Math.cos(c.angle), Math.sin(c.angle)).mult(npcSpeed);
            c.pos = c.pos.add(c.vel);

            // Sync speed for animation
            c.speed = npcSpeed;
            c.updateVisuals();


            // Update body parts
            c.thoraxPos = c.pos;
            c.headPos = c.pos.add(new Vec2(Math.cos(c.angle) * 5.5 * c.scale, Math.sin(c.angle) * 5.5 * c.scale));
            c.abdomenPos = c.pos.add(new Vec2(Math.cos(c.angle) * -7 * c.scale, Math.sin(c.angle) * -7 * c.scale));

            if (c.form === 'SCORPION') {
                c.updateScorpion({});
            }
            // Standard Legs (Scorpion legs list is empty, so this is safe to leave or wrap)
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
        // 碰撞/进食检测
        // Replaced simple dist check with robust body checking
        if (checkCollision(player, c)) {
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
    // FIX: Spider legs are long, but if we account for full leg span (300), the camera zooms out too far (0.3).
    // We want Zoom ~1.0 for the New World. So treating it closer to standard size (e.g. 100-120) makes sense.
    // This lets legs clip off screen edges slightly but keeps the "Main Character" feel.
    if (player.form === 'SPIDER') baseRadius = 120;
    if (player.form === 'MANTIS') baseRadius = 130;
    if (player.form === 'CRICKET') baseRadius = 140;
    if (player.form === 'STICK_INSECT') baseRadius = 150;
    if (player.form === 'TARANTULA') baseRadius = 130;
    if (player.form === 'RHINO_BEETLE') baseRadius = 160;
    if (player.form === 'CENTIPEDE') baseRadius = 220;
    if (player.form === 'SCORPION') baseRadius = 180;

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
