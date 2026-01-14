import './style.css';
import { Ant } from './game/Ant.js';
import { Environment } from './game/Environment.js';
import { Vec2 } from './game/Vec2.js';

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
const env = new Environment();
let camera = new Vec2(0, 0);

function gameLoop() {
    let input = {
        up: keys.w || keys.ArrowUp,
        down: keys.s || keys.ArrowDown,
        left: keys.a || keys.ArrowLeft,
        right: keys.d || keys.ArrowRight,
        shift: keys.Shift
    };

    ant.update(input);

    let targetCamX = ant.pos.x - width / 2;
    let targetCamY = ant.pos.y - height / 2;
    camera.x += (targetCamX - camera.x) * 0.1;
    camera.y += (targetCamY - camera.y) * 0.1;

    ctx.fillStyle = '#e6dcc3';
    ctx.fillRect(0, 0, width, height);

    env.draw(ctx, camera, width, height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ant.draw(ctx);
    ctx.restore();

    requestAnimationFrame(gameLoop);
}

gameLoop();
