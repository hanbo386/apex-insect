import { Vec2 } from './Vec2.js';

export class Particle {
    constructor(x, y, color, size, type = 'circle', props = {}) {
        this.pos = new Vec2(x, y);
        let angle = Math.random() * Math.PI * 2;
        // Random offset for debris
        let offsetDist = Math.random() * size * 0.5;
        this.pos = this.pos.add(new Vec2(Math.cos(angle), Math.sin(angle)).mult(offsetDist));

        this.vel = props.vel || new Vec2(0, 0);
        this.color = color;
        this.size = size;
        this.life = 1.0;
        this.decay = (props.decay || 0.003) + Math.random() * 0.005; // Slow decay (long life)

        this.type = type; // 'circle', 'ellipse', 'leg'
        this.angle = props.angle || Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.2;
        this.dims = props.dims || { w: size, h: size }; // For ellipse/leg
    }

    update() {
        this.pos = this.pos.add(this.vel);
        this.angle += this.rotSpeed;
        this.life -= this.decay;
        this.vel = this.vel.mult(0.95); // Friction
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;

        if (this.type === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(0, 0, this.dims.w, this.dims.h, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'leg') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.dims.w; // Thickness
            ctx.beginPath();
            ctx.moveTo(-this.dims.h / 2, 0); // Length along X (rotated)
            ctx.lineTo(this.dims.h / 2, 0);
            ctx.stroke();
        }

        ctx.restore();
        ctx.globalAlpha = 1.0;
    }
}
export class BodyPart {
    constructor(x, y, part, type, scale, vel, props) {
        this.pos = new Vec2(x, y);
        this.part = part;
        this.type = type; // 'leg', 'claw', 'mantis_leg', 'segment'
        this.scale = scale;
        this.vel = vel;
        this.life = 1.0;
        this.angle = (props && props.angle !== undefined) ? props.angle : 0;
        // Accept props for rotSpeed, or default to slow tumble
        this.rotSpeed = (props && props.rotSpeed !== undefined) ? props.rotSpeed : (Math.random() - 0.5) * 0.1;
        this.decay = 0.003;
    }

    update() {
        this.pos = this.pos.add(this.vel);
        this.angle += this.rotSpeed;
        this.life -= this.decay;
        this.vel = this.vel.mult(0.95);
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);

        if (this.type === 'leg') {
            this.part.leg.currentPos = this.part.relFoot;
            this.part.leg.draw(ctx, this.part.relHip);
        } else if (this.type === 'mantis_leg') {
            this.part.leg.rootX = this.part.root.x;
            this.part.leg.rootY = this.part.root.y;
            this.part.leg.kneeX = this.part.knee.x;
            this.part.leg.kneeY = this.part.knee.y;
            this.part.leg.renderFootX = this.part.foot.x;
            this.part.leg.renderFootY = this.part.foot.y;
            this.part.leg.draw(ctx);
        } else if (this.type === 'claw') {
            this.part.claw.draw(ctx);
        } else if (this.type === 'segment') {
            this.part.draw(ctx);
        }

        ctx.restore();
        ctx.globalAlpha = 1.0;
    }
}
