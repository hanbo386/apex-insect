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
    let formNames = ["原始种 (Primitive)", "蚂蚁 (Ant)", "瓢虫 (Ladybug)", "潮虫 (Pillbug)", "蟑螂 (Cockroach)"];
    let displayForm = formNames[player.evolutionStage] || `MARK-${player.evolutionStage}`;

    // Relative Level Calculation
    // Level is now ALWAYS 1-5 per stage logic in Ant.js
    let displayLevel = player.level;

    statusText.innerHTML = `<strong>形态:</strong> ${displayForm} | <strong>等级:</strong> ${displayLevel} / 5 | <strong>XP:</strong> ${Math.floor(player.xp)}/${Math.floor(player.xpToNext)}`;



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
player.onEvolve = (formName) => {
    // Large, prominent gold text
    texts.push(new FloatingText(player.pos.x, player.pos.y - 80, `进化成功: ${formName}!`, '#FFD700', 60, 4.0));
};
const env = new Environment();
let camera = new Vec2(0, 0);

const creeps = [];
const texts = []; // 浮动文字
const particles = []; // 粒子效果
const MAX_CREEPS = 15;


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
        rival.setLevel(targetStage, 1);

        // Ensure visual form matches the stage
        // setLevel might do it, but let's be safe if logic depends on explicit evolve calls
        // Actually setLevel(stage, 1) in our refactor does loop evolve(), so it handles form.

        rival.isRival = true;
        creeps.push(rival);
    } else {
        // Target stage < 0 (Low level food / Creep)
        let food = new Creep(spawnPos.x, spawnPos.y);
        // Optional: Scale food size slightly for bigger ants
        if (scale < 1.0) food.size *= (1 / scale) * 0.5;
        creeps.push(food);
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
    // But we don't want 30 * 36 = 1000 creeps. 
    // Let's scale linearly with view diameter (1/scale).
    let dynamicLimit = Math.min(75, Math.floor(MAX_CREEPS / currentScale));

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
        let visibleRadius = Math.max(width, height) / scale / 2;
        // Despawn if further than 2x visible radius (give some buffer)
        if (c.pos.dist(player.pos) > visibleRadius * 2.5) {
            creeps.splice(i, 1);
            continue;
        }

        // 碰撞/进食检测
        // 蚂蚁是个椭圆，简单用距离判断
        // Increased range: 25 * scale (was 10)
        let eatDist = (25 * player.scale) + (c.isRival ? 10 * c.scale : c.size);

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
            let xpGain = c.isRival ? 20 * (c.scale) : (1 + Math.floor(c.size));
            player.gainXp(xpGain);

            // Note: XP overhead text removed as requested

            // Debris Particles
            // Debris Particles
            let pColor, pSize;
            if (c.isRival) {
                pColor = c.colors.thorax;
                pSize = c.scale * 6; // Ant size approximation
            } else {
                pColor = c.color;
                pSize = c.size;
            }

            // Spawn particles
            let count = c.isRival ? 15 : 5; // More for rivals
            for (let k = 0; k < count; k++) {
                particles.push(new Particle(c.pos.x, c.pos.y, pColor, pSize));
            }

            creeps.splice(i, 1);
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
    let visualSize = player.scale * 60; // Estimated visual radius
    let desiredZoom = (minDimension * 0.10) / visualSize; // Allow up to 10% screen coverage before zooming

    // Clamp zoom: Max 1.0 (Normal), Min 0.1 (Max Zoom Out)
    let targetZoom = Math.max(0.1, Math.min(1.0, desiredZoom));

    // Smooth zoom
    if (!window.gameScale) window.gameScale = 1.0;
    window.gameScale += (targetZoom - window.gameScale) * 0.02;


    ctx.fillStyle = '#e6dcc3';
    ctx.fillRect(0, 0, width, height);

    // Draw Environment with scale? 
    // Environment.draw usually handles its own or world coords. 
    // To scale everything correctly, we should apply scale to the context transformation

    ctx.save();

    // Center of screen
    ctx.translate(width / 2, height / 2);
    ctx.scale(window.gameScale, window.gameScale);
    ctx.translate(-width / 2, -height / 2);

    // Existing camera translation
    // Note: camera is top-left, so we translate opposite
    ctx.translate(-camera.x, -camera.y);

    env.draw(ctx, camera, width, height, window.gameScale); // Pass scale for correct culling/generation

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
