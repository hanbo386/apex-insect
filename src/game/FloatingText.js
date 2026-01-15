import { Vec2 } from './Vec2.js';

export class FloatingText {
    constructor(x, y, text, color = '#ff0000', size = 20, duration = 1.0) {
        this.pos = new Vec2(x, y);
        this.text = text;
        this.color = color;
        this.size = size;
        this.startTime = Date.now();
        this.duration = duration * 1000; // to ms
        this.vel = new Vec2(0, -2); // Floats up
    }

    update() {
        let elapsed = Date.now() - this.startTime;
        this.life = 1.0 - (elapsed / this.duration);
        this.pos = this.pos.add(this.vel);
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.font = `bold ${this.size}px Arial`;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';

        ctx.strokeText(this.text, this.pos.x, this.pos.y);
        ctx.fillText(this.text, this.pos.x, this.pos.y);

        ctx.restore();
    }
}
