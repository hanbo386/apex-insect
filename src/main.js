import './style.css';
import { Ant } from './game/Ant.js';
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
    let evoText = ant.evolutionStage > 0 ? `MARK-${ant.evolutionStage}` : "原始种";
    statusText.innerHTML = `<strong>等级:</strong> ${ant.level} | <strong>XP:</strong> ${ant.xp}/${ant.xpToNext} | <strong>形态:</strong> ${evoText}`;

    const staminaFill = document.getElementById('stamina-bar-fill');
    if (staminaFill) {
        let pct = (ant.stamina / ant.maxStamina) * 100;
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


// Game Init
const ant = new Ant(width / 2, height / 2);
ant.onLevelUp = (lvl) => {
    texts.push(new FloatingText(ant.pos.x, ant.pos.y - 50, `LEVEL UP! (${lvl})`, '#00ff00', 40));
};
ant.onEvolve = (formName) => {
    // Large, prominent gold text
    texts.push(new FloatingText(ant.pos.x, ant.pos.y - 80, `进化成功: ${formName}!`, '#FFD700', 60, 4.0));
};
const env = new Environment();
let camera = new Vec2(0, 0);

const creeps = [];
const texts = []; // 浮动文字
const particles = []; // 粒子效果
const MAX_CREEPS = 30;


function spawnCreeps() {
    // 在蚂蚁周围一定范围内生成
    let angle = Math.random() * Math.PI * 2;
    let dist = 300 + Math.random() * 500; // 300-800 距离
    let spawnPos = ant.pos.add(new Vec2(Math.cos(angle), Math.sin(angle)).mult(dist));

    // 进化后，有概率生成竞争对手 (Rival Ant)
    // 简单起见，Rival 复用 Ant 类，但不受控
    // 进化后，生成低阶竞争对手
    if (ant.evolutionStage > 0 && Math.random() < 0.3) {
        let rival = new Ant(spawnPos.x, spawnPos.y);

        // 逻辑: 比玩家低 1-2 个形态
        // 形态 0: Lvl 1, 形态 1: Lvl 5, 形态 2: Lvl 10...
        // 公式: Level = Stage * 5 + 1

        let diff = 1 + Math.floor(Math.random() * 2); // 1 or 2 stages lower
        let targetStage = Math.max(0, ant.evolutionStage - diff);
        let targetLevel = targetStage * 5 + 1;

        rival.setLevel(targetLevel);
        rival.isRival = true;

        // 如果是同形态（极低概率或不可能），或者是只是低级但同形态，加点颜色区分
        // 但通常 targetStage < ant.evolutionStage，所以外观应该已经由 evolve() 决定了
        // 为了区分敌我，还是强制给个"敌对色"或者保留 evolve 的颜色但加深？
        // 用户的需求是 "新出现的npc应该比玩家的形态低1-2个"，所以如果玩家是红(Stage 1)，NPC是黑(Stage 0)。
        // Stage 0 默认是黑/棕色。Stage 1 是红色。
        // 我们只需要确保 .isRival 标记即可，颜色由 setLevel -> evolve 自动处理

        // 为了视觉区分 "Rival" 和普通 Creep，我们可以稍微调整颜色，或者就让它保持自然
        // 既然是 "竞争对手"，保持自然形态颜色最好。

        creeps.push(rival);
    } else {
        creeps.push(new Creep(spawnPos.x, spawnPos.y));
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

    ant.update(input);
    updateUI();

    // Creep Logic
    if (creeps.length < MAX_CREEPS) {
        if (Math.random() < 0.05) spawnCreeps();
    }

    for (let i = creeps.length - 1; i >= 0; i--) {
        let c = creeps[i];

        if (c.isRival) {
            // Rival AI Logic
            c.angle += (Math.random() - 0.5) * 0.2;
            c.vel = new Vec2(Math.cos(c.angle), Math.sin(c.angle)).mult(1.5);
            c.pos = c.pos.add(c.vel);

            // Update body parts
            c.thoraxPos = c.pos;
            c.headPos = c.pos.add(new Vec2(Math.cos(c.angle) * 5.5 * c.scale, Math.sin(c.angle) * 5.5 * c.scale));
            c.abdomenPos = c.pos.add(new Vec2(Math.cos(c.angle) * -7 * c.scale, Math.sin(c.angle) * -7 * c.scale));

            c.legs.forEach(l => l.update(c.thoraxPos, c.angle, c.vel, true));
        } else {
            c.update();
        }

        // 距离过远销毁
        if (c.pos.dist(ant.pos) > 1500) {
            creeps.splice(i, 1);
            continue;
        }

        // 碰撞/进食检测
        // 蚂蚁是个椭圆，简单用距离判断
        let eatDist = (10 * ant.scale) + (c.isRival ? 10 * c.scale : c.size);

        if (c.pos.dist(ant.pos) < eatDist) {
            // Eat!
            let xpGain = c.isRival ? 20 * (c.scale) : (1 + Math.floor(c.size));
            ant.gainXp(xpGain);

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


    let targetCamX = ant.pos.x - width / 2;
    let targetCamY = ant.pos.y - height / 2;
    camera.x += (targetCamX - camera.x) * 0.1;
    camera.y += (targetCamY - camera.y) * 0.1;

    ctx.fillStyle = '#e6dcc3';
    ctx.fillRect(0, 0, width, height);

    env.draw(ctx, camera, width, height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw Creeps
    creeps.forEach(c => c.draw(ctx));

    ant.draw(ctx);

    // Draw Particles
    particles.forEach(p => p.draw(ctx));

    // Draw Texts
    texts.forEach(t => t.draw(ctx));


    ctx.restore();


    requestAnimationFrame(gameLoop);
}

gameLoop();
