import { Vec2 } from './Vec2.js';

export class Particle {
    constructor(x, y, color, size) {
        this.pos = new Vec2(x, y);
        let angle = Math.random() * Math.PI * 2;
        // Random offset for debris
        let offsetDist = Math.random() * size * 2;
        this.pos = this.pos.add(new Vec2(Math.cos(angle), Math.sin(angle)).mult(offsetDist));

        this.vel = new Vec2(0, 0); // Static
        this.color = color;
        this.size = size * (0.3 + Math.random() * 0.5); // Random fragment size
        this.life = 1.0;
        this.decay = 0.003 + Math.random() * 0.005; // Slow decay (long life)
    }

    update() {
        // No movement
        this.life -= this.decay;
        // No shrinking until very end? Or just slow fade. 
        // Let's keep size constant to look like "crumbs"
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}
