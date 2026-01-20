
import { Vec2 } from './Vec2.js';

export const TARANTULA_SETTINGS = {
    spiderBlack: '#16100b',
    spiderBrown: '#3a2a1a',
    spiderFuzz: '#4a3a2a',
    spiderSpike: '#2a1a10',
    maxSpeed: 3.8,
    accel: 0.45,
    friction: 0.88,
    rotSpeed: 0.14,
    attackPower: 38,
    attackDuration: 60,
    attackWindup: 25,
    webSpeed: 25,
    webRange: 400
};

/**
 * 视觉特效类：用于扑击瞬间的视觉反馈
 */
export class AttackEffect {
    constructor(x, y, type, angle = 0, scale = 1.0) {
        this.pos = { x, y };
        this.type = type;
        this.timer = 0;
        this.maxTimer = type === 'shockwave' ? 24 : 15 + Math.random() * 15;
        this.active = true;
        this.scale = scale;

        if (type === 'dust' || type === 'spark') {
            const speed = ((type === 'spark' ? 10 : 5) + Math.random() * 10) * scale;
            this.vel = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };
            this.size = (type === 'spark' ? 1.5 : 2 + Math.random() * 3) * scale;
        }
    }

    update() {
        this.timer++;
        if (this.timer >= this.maxTimer) this.active = false;

        if (this.vel) {
            this.pos.x += this.vel.x;
            this.pos.y += this.vel.y;
            this.vel.x *= 0.92;
            this.vel.y *= 0.92;
        }
    }

    draw(ctx) {
        ctx.save();
        let life = 1 - (this.timer / this.maxTimer);
        let easedLife = Math.pow(life, 2);
        const s = this.scale;

        if (this.type === 'shockwave') {
            const radiusBase = (1 - easedLife) * 180 * s;

            // 1. 主扩散圈 - 增加亮度
            ctx.strokeStyle = `rgba(255, 255, 255, ${easedLife * 0.95})`;
            ctx.lineWidth = 12 * easedLife * s;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, radiusBase, 0, Math.PI * 2);
            ctx.stroke();

            // 2. 核心爆发光晕 - 金色
            ctx.fillStyle = `rgba(255, 240, 180, ${easedLife * 0.5})`;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, radiusBase * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // 3. 极速发光点
            ctx.fillStyle = `rgba(255, 255, 255, ${easedLife})`;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, 8 * easedLife * s, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'dust') {
            ctx.fillStyle = `rgba(255, 255, 255, ${life * 0.6})`;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'spark') {
            ctx.fillStyle = `rgba(255, 255, 255, ${life})`;
            ctx.fillRect(this.pos.x, this.pos.y, this.size * 3, this.size * 1.5);
        }
        ctx.restore();
    }
}

/**
 * 蛛丝弹体类
 */
export class WebProjectile {
    constructor(x, y, angle, scale = 1.0) {
        this.pos = { x, y };
        this.angle = angle;
        this.speed = TARANTULA_SETTINGS.webSpeed * scale;
        this.distTraveled = 0;
        this.active = true;
        this.isSplatted = false;
        this.splatTimer = 100;
        this.nodes = [];
        this.scale = scale;
    }

    update() {
        if (!this.active) return;
        if (this.isSplatted) {
            this.splatTimer--;
            if (this.splatTimer <= 0) this.active = false;
            return;
        }
        this.nodes.unshift({ ...this.pos });
        if (this.nodes.length > 8) this.nodes.pop();
        this.pos.x += Math.cos(this.angle) * this.speed;
        this.pos.y += Math.sin(this.angle) * this.speed;
        this.distTraveled += this.speed;
        if (this.distTraveled > TARANTULA_SETTINGS.webRange * this.scale) this.isSplatted = true;
    }

    draw(ctx) {
        if (!this.active) return;
        const s = this.scale;
        ctx.save();
        if (this.isSplatted) {
            ctx.globalAlpha = this.splatTimer / 100;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 1.5 * s;
            for (let i = 0; i < 6; i++) {
                const ang = (i / 6) * Math.PI * 2;
                ctx.beginPath(); ctx.moveTo(this.pos.x, this.pos.y);
                ctx.lineTo(this.pos.x + Math.cos(ang) * 25 * s, this.pos.y + Math.sin(ang) * 25 * s);
                ctx.stroke();
            }
            ctx.beginPath();
            for (let i = 0; i <= 6; i++) {
                const ang = (i / 6) * Math.PI * 2;
                ctx.lineTo(this.pos.x + Math.cos(ang) * 15 * s, this.pos.y + Math.sin(ang) * 15 * s);
            }
            ctx.stroke();
        } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
            ctx.lineWidth = 3 * s;
            ctx.beginPath();
            if (this.nodes.length > 0) {
                ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
                for (let i = 1; i < this.nodes.length; i++) ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
            } else ctx.moveTo(this.pos.x, this.pos.y);
            ctx.lineTo(this.pos.x + Math.cos(this.angle) * 10 * s, this.pos.y + Math.sin(this.angle) * 10 * s);
            ctx.stroke();
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, 4 * s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

export class TarantulaLeg {
    constructor(side, index, scale = 1.0) {
        this.side = side;
        this.index = index;
        this.scale = scale;

        // From snippet: 12 - index * 8, 8 * side
        this.shoulderOffset = new Vec2(12 - index * 8, 8 * side);
        this.worldShoulder = new Vec2(0, 0);
        this.footPos = new Vec2(0, 0);
        this.targetFootPos = new Vec2(0, 0);
        this.startFootPos = new Vec2(0, 0);
        this.isStepping = false;
        this.stepProgress = 1;

        // Grouping: (index + offset) % 2
        this.group = (index + (side > 0 ? 0 : 1)) % 2;

        this.initialized = false;

        this.fuzz = [];
        for (let s = 0; s < 2; s++) {
            let segFuzz = [];
            let hairCount = s === 0 ? 15 : 20;
            for (let j = 0; j < hairCount; j++) {
                segFuzz.push({ t: Math.random(), len: 2 + Math.random() * 6, isLong: Math.random() > 0.85, side: Math.random() > 0.5 ? 1 : -1, ang: (Math.random() - 0.5) * 0.8 });
            }
            this.fuzz.push(segFuzz);
        }
    }

    updateScale(s) {
        this.scale = s;
    }

    // Updated update signature to accept attack state
    // speed is passed as speed scalar (pixels/frame approx)
    update(bodyPos, bodyAngle, moving, speed, stepGroup, attackTimer = 0) {
        const s = this.scale;

        // Calculate World Shoulder
        const cos = Math.cos(bodyAngle);
        const sin = Math.sin(bodyAngle);
        this.worldShoulder.x = bodyPos.x + (this.shoulderOffset.x * cos - this.shoulderOffset.y * sin) * s;
        this.worldShoulder.y = bodyPos.y + (this.shoulderOffset.x * sin + this.shoulderOffset.y * cos) * s;

        // Init if needed
        if (!this.initialized) {
            // Initial simple placement
            const spreadAngle = bodyAngle + (this.side * (Math.PI / 2 - (this.index - 1.5) * 0.65));
            const reach = (85 + (this.index === 0 || this.index === 3 ? 15 : 0)) * s;
            this.footPos.x = this.worldShoulder.x + Math.cos(spreadAngle) * reach;
            this.footPos.y = this.worldShoulder.y + Math.sin(spreadAngle) * reach;
            this.initialized = true;
        }

        let isAttacking = attackTimer > 0;
        let attackFrames = TARANTULA_SETTINGS.attackDuration - attackTimer;

        const spreadAngle = bodyAngle + (this.side * (Math.PI / 2 - (this.index - 1.5) * 0.65));
        let baseReach = 85 + (this.index === 0 || this.index === 3 ? 15 : 0);
        let reach = baseReach; // We will scale at end

        // Attack stance logic
        if (isAttacking) {
            if (attackFrames < TARANTULA_SETTINGS.attackWindup) {
                let t = attackFrames / TARANTULA_SETTINGS.attackWindup;
                reach -= t * 45;
            } else {
                let t = (attackFrames - TARANTULA_SETTINGS.attackWindup) / (TARANTULA_SETTINGS.attackDuration - TARANTULA_SETTINGS.attackWindup);
                // Clamp t 0-1
                t = Math.max(0, Math.min(1, t));
                let factor = Math.sin(Math.pow(t, 0.5) * Math.PI);
                if (this.index < 2) reach += factor * 85;
                else reach -= 10 * (1 - t);
            }
        }

        // Scale reach
        reach *= s;

        // Ideal Pos
        // moving ? Math.cos(bodyAngle) * speed * 6 : 0
        // NOTE: speed input to this function might be normalized or scaled. 
        // In simulation, speed is pixels/frame (~0-4).
        // scale logic: lead amount needs to scale with size? 
        // If speed is actual pixels/frame, it already implies scale if physics is scaled.
        // Assuming speed is pixels/frame.

        let leadX = moving ? Math.cos(bodyAngle) * speed * 6 : 0;
        let leadY = moving ? Math.sin(bodyAngle) * speed * 6 : 0;

        const idealX = this.worldShoulder.x + Math.cos(spreadAngle) * reach + leadX;
        const idealY = this.worldShoulder.y + Math.sin(spreadAngle) * reach + leadY;

        const distToIdeal = Math.hypot(this.footPos.x - idealX, this.footPos.y - idealY);
        const stepThreshold = (moving ? (isAttacking ? 5 : 24) : 45) * s;

        if (distToIdeal > stepThreshold && !this.isStepping && (stepGroup === this.group || isAttacking)) {
            this.isStepping = true;
            this.stepProgress = 0;
            this.startFootPos = this.footPos.clone();
            this.targetFootPos = new Vec2(idealX, idealY);
        }

        if (this.isStepping) {
            // Speed factor
            // Snippet: 0.15 + (speed * 0.015)
            // But if speed is scaled, this might be too fast? Or too slow?
            // Assume speed is roughly similar range (0-5).
            let stepSpeed = 0.15 + (speed * 0.015);
            if (isAttacking) stepSpeed = (attackFrames < TARANTULA_SETTINGS.attackWindup) ? 0.05 : 0.35;

            this.stepProgress += stepSpeed;
            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                this.footPos = this.targetFootPos.clone();
            } else {
                // Lerp
                this.footPos.x = this.startFootPos.x + (this.targetFootPos.x - this.startFootPos.x) * this.stepProgress;
                this.footPos.y = this.startFootPos.y + (this.targetFootPos.y - this.startFootPos.y) * this.stepProgress;
            }
        }
    }

    draw(ctx, isShadow, attackTimer = 0) {
        const s = this.scale;
        let isAttacking = attackTimer > 0;
        let attackFrames = TARANTULA_SETTINGS.attackDuration - attackTimer;

        // Lift logic
        let liftAmount = (isAttacking && attackFrames >= TARANTULA_SETTINGS.attackWindup) ? 65 : 28;
        const lift = this.isStepping ? Math.sin(this.stepProgress * Math.PI) * liftAmount * s : 0;

        const dx = this.footPos.x - this.worldShoulder.x;
        const dy = this.footPos.y - this.worldShoulder.y;
        const distToFoot = Math.sqrt(dx * dx + dy * dy);
        const angleToFoot = Math.atan2(dy, dx);

        const elbowX = this.worldShoulder.x + Math.cos(angleToFoot) * distToFoot * 0.45;
        const elbowY = this.worldShoulder.y + Math.sin(angleToFoot) * distToFoot * 0.45 - lift - (18 * s);

        ctx.beginPath();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = (isShadow ? 10 : 7) * s;
        ctx.strokeStyle = isShadow ? 'rgba(0,0,0,0.15)' : TARANTULA_SETTINGS.spiderBlack;
        ctx.moveTo(this.worldShoulder.x, this.worldShoulder.y);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(this.footPos.x, this.footPos.y);
        ctx.stroke();

        if (!isShadow) {
            this.drawSegmentFuzz(ctx, this.worldShoulder, { x: elbowX, y: elbowY }, 0);
            this.drawSegmentFuzz(ctx, { x: elbowX, y: elbowY }, this.footPos, 1);
            this.drawJointTuft(ctx, elbowX, elbowY, angleToFoot);
        }
    }

    drawSegmentFuzz(ctx, p1, p2, fuzzIdx) {
        const s = this.scale;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        this.fuzz[fuzzIdx].forEach(f => {
            ctx.strokeStyle = f.isLong ? TARANTULA_SETTINGS.spiderSpike : TARANTULA_SETTINGS.spiderFuzz;
            ctx.lineWidth = (f.isLong ? 0.8 : 0.5) * s;

            // Lerp
            const x = p1.x + (p2.x - p1.x) * f.t;
            const y = p1.y + (p2.y - p1.y) * f.t;

            const fLen = (f.isLong ? f.len * 1.8 : f.len) * s;
            const fAngle = angle + (Math.PI / 2 * f.side) + f.ang;

            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(fAngle) * fLen, y + Math.sin(fAngle) * fLen); ctx.stroke();
        });
    }

    drawJointTuft(ctx, x, y, angle) {
        const s = this.scale;
        ctx.strokeStyle = TARANTULA_SETTINGS.spiderSpike; ctx.lineWidth = 0.7 * s;
        for (let i = 0; i < 6; i++) {
            const a = angle - Math.PI / 2 + (i / 5) * Math.PI;
            const l = (6 + Math.random() * 6) * s;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
        }
    }
}
