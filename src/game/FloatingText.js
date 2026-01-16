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

        let scale = window.gameScale || 1.0;
        let fontSize = this.size;

        // Enforce minimum screen size for readability (e.g. 14px)
        let minScreenSize = 14;
        let currentScreenSize = fontSize * scale;

        if (currentScreenSize < minScreenSize) {
            fontSize = minScreenSize / scale;
        }

        ctx.font = `bold ${Math.floor(fontSize)}px Arial`;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = 'black'; // Better contrast than white on bright sand
        ctx.lineWidth = Math.max(2, 2 / scale); // Scale stroke too
        ctx.textAlign = 'center';

        ctx.strokeText(this.text, this.pos.x, this.pos.y);
        ctx.fillText(this.text, this.pos.x, this.pos.y);

        ctx.restore();
    }
}
