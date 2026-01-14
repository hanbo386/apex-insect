import './style.css';
import { Ant } from './game/Ant.js';
import { Environment } from './game/Environment.js';
import { Vec2 } from './game/Vec2.js';
import { Creep } from './game/Creep.js';
import { FloatingText } from './game/FloatingText.js';



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
}

// Input handling

const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false, Shift: false };
window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.key) || e.key === "Shift") keys[e.key] = true;
});
window.addEventListener('keyup', e => {
    if (keys.hasOwnProperty(e.key) || e.key === "Shift") keys[e.key] = false;
});

// Game Init
const ant = new Ant(width / 2, height / 2);
ant.onLevelUp = (lvl) => {
    texts.push(new FloatingText(ant.pos.x, ant.pos.y - 50, `LEVEL UP! (${lvl})`, '#00ff00', 40));
};
const env = new Environment();
let camera = new Vec2(0, 0);

const creeps = [];
const texts = []; // 浮动文字
const MAX_CREEPS = 30;

function spawnCreeps() {
    // 在蚂蚁周围一定范围内生成
    let angle = Math.random() * Math.PI * 2;
    let dist = 300 + Math.random() * 500; // 300-800 距离
    let spawnPos = ant.pos.add(new Vec2(Math.cos(angle), Math.sin(angle)).mult(dist));

    // 进化后，有概率生成竞争对手 (Rival Ant)
    // 简单起见，Rival 复用 Ant 类，但不受控
    if (ant.evolutionStage > 0 && Math.random() < 0.2) {
        let rival = new Ant(spawnPos.x, spawnPos.y);
        // Rival 属性调整
        rival.level = ant.level; // 与玩家同级
        rival.scale = ant.scale * (0.8 + Math.random() * 0.4);
        rival.isRival = true; // 标记
        rival.colors = { // 敌对颜色 - 譬如黑色
            head: '#111', thorax: '#222', abdomen: '#000',
            gradStart: '#333', gradEnd: '#000'
        };
        rival.initLegs();
        creeps.push(rival); // 放入同个池子或者单独池子，为了方便先放creeps
    } else {
        creeps.push(new Creep(spawnPos.x, spawnPos.y));
    }
}


function gameLoop() {
    let input = {
        up: keys.w || keys.ArrowUp,
        down: keys.s || keys.ArrowDown,
        left: keys.a || keys.ArrowLeft,
        right: keys.d || keys.ArrowRight,
        shift: keys.Shift
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

            creeps.splice(i, 1);
        }
    }

    // Update Texts
    for (let i = texts.length - 1; i >= 0; i--) {
        texts[i].update();
        if (texts[i].life <= 0) texts.splice(i, 1);
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

    // Draw Texts
    texts.forEach(t => t.draw(ctx));

    ctx.restore();


    requestAnimationFrame(gameLoop);
}

gameLoop();
