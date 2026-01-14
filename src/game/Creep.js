import { Vec2 } from './Vec2.js';

/**
 * 爬虫类 - 简单的被捕食者
 */
export class Creep {
    constructor(x, y) {
        this.pos = new Vec2(x, y);
        this.size = 2 + Math.random() * 3; // 随机大小
        this.vel = new Vec2(0, 0);
        this.speed = 0.5 + Math.random() * 0.5;
        this.wanderAngle = Math.random() * Math.PI * 2;

        // 随机颜色 (偏绿色/虫子色)
        let r = 50 + Math.random() * 100;
        let g = 100 + Math.random() * 100;
        let b = 50 + Math.random() * 50;
        this.color = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
    }

    update() {
        // 随机游走
        this.wanderAngle += (Math.random() - 0.5) * 0.5;
        this.vel = new Vec2(Math.cos(this.wanderAngle), Math.sin(this.wanderAngle)).mult(this.speed);

        this.pos = this.pos.add(this.vel);

        // 边界限制 (简单的反弹，假设地图很大，用 1024x1024 的一部分做活动区域，或者跟随主视口)
        // 这里简单处理：不做强制边界，跑远了会被 despawn 逻辑处理
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // 简单的身体节
        let tailPos = this.pos.sub(this.vel.normalize().mult(this.size));
        ctx.beginPath();
        ctx.arc(tailPos.x, tailPos.y, this.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
}
