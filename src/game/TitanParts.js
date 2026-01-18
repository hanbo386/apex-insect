
import { Vec2 } from './Vec2.js';

export const TitanUtils = {
    lerp: (a, b, t) => a + (b - a) * t,
    clamp: (val, min, max) => Math.min(Math.max(val, min), max),
    dist: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
    angleDiff: (a, b) => {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    },
    randomRange: (min, max) => Math.random() * (max - min) + min,

    drawOrganicPoly: (ctx, x, y, radius, sides, options = {}) => {
        const {
            spike = 0, detail = 1, rotation = 0, color = '#444',
            gloss = 0, textureSeed = 0, glow = null
        } = options;

        ctx.beginPath();
        const points = [];
        const totalSteps = sides * detail;

        for (let i = 0; i <= totalSteps; i++) {
            const t = i / totalSteps;
            const theta = t * Math.PI * 2 + rotation;
            let r = radius + Math.sin(theta * 3 + textureSeed) * (radius * 0.1);
            r += Math.cos(theta * sides) * spike;
            if (i % detail === 0) r += spike * 0.5;

            const px = x + Math.cos(theta) * r;
            const py = y + Math.sin(theta) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            points.push({ x: px, y: py, r: r, theta: theta });
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.save();
        ctx.clip();

        const grad = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 1.1);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = grad;
        ctx.fill();

        if (glow) {
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = glow;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const ang = (i / 6) * Math.PI * 2 + textureSeed;
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.cos(ang) * radius, y + Math.sin(ang) * radius);
            }
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        }

        if (gloss > 0) {
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = `rgba(255, 255, 255, ${gloss * 0.2})`;
            ctx.beginPath();
            points.forEach((p, idx) => {
                if (Math.sin(p.theta - Math.PI / 4) > 0) {
                    const r = p.r * 0.7;
                    const px = x + Math.cos(p.theta) * r;
                    const py = y + Math.sin(p.theta) * r;
                    if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
            });
            ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.stroke();
    }
};

export class TitanLeg {
    constructor(insect, config) {
        this.insect = insect;
        this.config = config;
        this.shoulder = { x: 0, y: 0 };
        this.knee = { x: 0, y: 0 };
        this.foot = { x: 0, y: 0 };
        this.targetFoot = { x: 0, y: 0 };
        this.stepStart = { x: 0, y: 0 };
        this.stepProgress = 1.0;
        this.isStepping = false;

        // Adapt: use insect.pos if available, else insect.x
        const ix = this.insect.pos ? this.insect.pos.x : this.insect.x;
        const iy = this.insect.pos ? this.insect.pos.y : this.insect.y;

        this.foot.x = ix;
        this.foot.y = iy;
    }

    // Check for updateScale support just in case, though user code didn't have it. 
    // The main engine might call leg.updateScale(s).
    updateScale(s) {
        // User's code doesn't explicitly store scale in leg, 
        // it seems to rely on drawing scaling or just config values?
        // User code: config.length * 0.7. If insect scales, config should probably reference insect scale?
        // User's Leg.update doesn't reference insect.scale explicitly for length, just config.length.
        // But the main engine `scale` affects everything.
        // We will assume the passed `config` values might need scaling or `ctx` scaling.
        // Logic check: User's insect hardcoded sizes. Game insect grows.
        // We must multiply config values by `this.insect.scale` during calculation.
        this.currentScale = s;
    }

    update(dt, velocity) {
        // Adapt: use insect properties
        const insectAngle = this.insect.angle;
        const ix = this.insect.pos ? this.insect.pos.x : this.insect.x;
        const iy = this.insect.pos ? this.insect.pos.y : this.insect.y;
        const iSpeed = this.insect.speed || (velocity ? Math.sqrt(velocity.x ** 2 + velocity.y ** 2) : 0);

        // Scale factor: User's code didn't have dynamic growth scaling in the leg logic explicitly,
        // but our game does. We must apply this.insect.scale.
        const s = this.insect.scale || 1.0;

        const cos = Math.cos(insectAngle), sin = Math.sin(insectAngle);

        // Scale offsets
        const rx = (this.config.offsetX * s) * cos - (this.config.offsetY * s) * sin;
        const ry = (this.config.offsetX * s) * sin + (this.config.offsetY * s) * cos;
        this.shoulder.x = ix + rx;
        this.shoulder.y = iy + ry;

        const stanceX = (this.config.bendDir === 1 ? 80 : -40) * s;
        const stanceY = (this.config.side * this.config.length * 0.7) * s;

        const idealX = this.shoulder.x + (stanceX * cos - stanceY * sin) + velocity.x * 0.25;
        const idealY = this.shoulder.y + (stanceX * sin + stanceY * cos) + velocity.y * 0.25;

        const dist = TitanUtils.dist(this.foot.x, this.foot.y, idealX, idealY);
        const len = this.config.length * s;

        if (!this.isStepping && dist > len * 0.6) {
            this.isStepping = true;
            this.stepProgress = 0;
            this.stepStart = { ...this.foot };
            this.targetFoot = { x: idealX + cos * 40 * s, y: idealY + sin * 40 * s };
        }

        if (this.isStepping) {
            this.stepProgress += dt * (12 + iSpeed / 12);
            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                // Impact trigger if available
                if (this.insect.game && this.insect.game.triggerImpact) {
                    this.insect.game.triggerImpact(this.foot.x, this.foot.y, 5 * s, this.config.isHeavy);
                }
            }
            const t = this.stepProgress;
            const st = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            this.foot.x = TitanUtils.lerp(this.stepStart.x, this.targetFoot.x, st);
            this.foot.y = TitanUtils.lerp(this.stepStart.y, this.targetFoot.y, st);
        }
        this.solveIK(s);
    }

    solveIK(s) {
        const dx = this.foot.x - this.shoulder.x, dy = this.foot.y - this.shoulder.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const L = (this.config.length * s) * 0.55;
        const midX = (this.shoulder.x + this.foot.x) / 2, midY = (this.shoulder.y + this.foot.y) / 2;
        let px = -dy, py = dx;
        const len = Math.sqrt(px * px + py * py);
        if (len > 0) { px /= len; py /= len; }
        // Bend
        const bend = Math.sqrt(Math.max(0, L * L - (dist / 2) * (dist / 2)));
        this.knee.x = midX + px * bend * (this.config.side * this.config.bendDir);
        this.knee.y = midY + py * bend * (this.config.side * this.config.bendDir);
    }

    draw(ctx) {
        const s = this.insect.scale || 1.0;
        const lift = this.isStepping ? Math.sin(this.stepProgress * Math.PI) * 50 * s : 0;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        const dx = this.knee.x - this.shoulder.x, dy = (this.knee.y - lift) - this.shoulder.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        // --- 1. Thigh Spikes ---
        if (len > 5) {
            const nx = -dy / len, ny = dx / len;
            ctx.fillStyle = '#050505';
            for (let i = 1; i < 4; i++) {
                const px = this.shoulder.x + dx * (i / 4), py = this.shoulder.y + dy * (i / 4);
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + nx * 20 * this.config.side * s, py + ny * 20 * this.config.side * s); ctx.lineTo(px - ny * 5 * s, py + nx * 5 * s); ctx.fill();
            }
        }
        // Thigh Bone
        ctx.lineWidth = this.config.width * s; ctx.strokeStyle = '#3e2723';
        ctx.beginPath(); ctx.moveTo(this.shoulder.x, this.shoulder.y); ctx.lineTo(this.knee.x, this.knee.y - lift); ctx.stroke();

        // --- 2. Tibia ---
        const tibiaX = this.foot.x - (this.knee.x), tibiaY = this.foot.y - (this.knee.y - lift);
        const tibiaLen = Math.sqrt(tibiaX * tibiaX + tibiaY * tibiaY);
        if (tibiaLen < 1) return;
        const tnx = -tibiaY / tibiaLen, tny = tibiaX / tibiaLen;

        // Segments
        const segCount = 4;
        for (let j = 0; j < segCount; j++) {
            const t1 = j / segCount, t2 = (j + 1) / segCount;
            const x1 = this.knee.x + tibiaX * t1, y1 = (this.knee.y - lift) + tibiaY * t1;
            const x2 = this.knee.x + tibiaX * t2, y2 = (this.knee.y - lift) + tibiaY * t2;

            const w1 = this.config.width * s * 0.7 * (1 - t1 * 0.4);
            const w2 = this.config.width * s * 0.7 * (1 - t2 * 0.4);

            ctx.fillStyle = j % 2 === 0 ? '#4e342e' : '#3e2723';
            ctx.beginPath();
            ctx.moveTo(x1 + tnx * w1, y1 + tny * w1);
            ctx.lineTo(x2 + tnx * w2, y2 + tny * w2);
            ctx.lineTo(x2 - tnx * w2, y2 - tny * w2);
            ctx.lineTo(x1 - tnx * w1, y1 - tny * w1);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();

            if (j > 0) {
                ctx.fillStyle = '#0a0a0a';
                ctx.beginPath();
                ctx.moveTo(x1 + tnx * w1 * this.config.side, y1 + tny * w1 * this.config.side);
                ctx.lineTo(x1 + tnx * w1 * 2.5 * this.config.side + tibiaX * 0.1, y1 + tny * w1 * 2.5 * this.config.side + tibiaY * 0.1);
                ctx.lineTo(x1 + tibiaX * 0.1, y1 + tibiaY * 0.1);
                ctx.fill();
            }
        }

        // --- 3. Foot ---
        ctx.save();
        ctx.translate(this.foot.x, this.foot.y);
        const footAngle = Math.atan2(tibiaY, tibiaX);
        ctx.rotate(footAngle);

        ctx.fillStyle = '#1a0a05';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2 * s;

        // Scale locally
        ctx.scale(s, s);

        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(15, -10, 35, 0, 45, 0); ctx.lineTo(30, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, -5); ctx.quadraticCurveTo(15, -20, 25, -15); ctx.lineTo(10, -5); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, 5); ctx.quadraticCurveTo(15, 20, 25, 15); ctx.lineTo(10, 5); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1; // reset line width for detail
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(30, 0); ctx.stroke();

        ctx.restore();
    }
}
