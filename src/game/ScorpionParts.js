
import { Vec2 } from './Vec2.js';

/**
 * Scorpion Claw IK System
 * Copied and adapted from user reference.
 */
export class ScorpionClaw {
    constructor(side, scale = 1.0) {
        this.side = side;
        this.scale = scale;

        // [Reference]
        // this.upperArmLen = 35;
        // this.foreArmLen = 40;
        this.upperArmLenBase = 35;
        this.foreArmLenBase = 40;

        // [Reference] this.shoulderOffset = new Vector(side * 8, -10);
        this.shoulderOffsetBase = new Vec2(side * 8, -10);

        this.shoulder = new Vec2(0, 0);
        this.elbow = new Vec2(0, 0);
        this.wrist = new Vec2(0, 0);
        this.angle = 0;
        this.open = 0;
    }

    updateScale(s) {
        this.scale = s;
    }

    // Note: User reference 'update' args: (bodyPos, bodyAngle, isAttacking, velocity)
    // Modified to accept attackState string
    update(bodyPos, bodyAngle, velocity, attackState = 'none') {
        const s = this.scale;

        // --- Reference Logic Translation ---
        // Reference uses Angle 0 = Up (Move forward with W -> y = -1).
        // My engine uses Angle = direction of Velocity.
        // If moving Up (0, -1), My Angle is -PI/2.
        // Ref Angle should be 0.
        // So RefAngle = MyAngle + PI/2.
        const refAngle = bodyAngle + Math.PI / 2;

        const cos = Math.cos(refAngle);
        const sin = Math.sin(refAngle);

        // Manually implementing the rotate similar to reference to be sure
        const off = this.shoulderOffsetBase.mult(s);
        const shoulderWorldX = off.x * cos - off.y * sin;
        const shoulderWorldY = off.x * sin + off.y * cos;
        this.shoulder = new Vec2(bodyPos.x + shoulderWorldX, bodyPos.y + shoulderWorldY);

        // [Reference] const time = Date.now() / 800;
        const time = Date.now() / 800;
        // [Reference] const idleX = Math.cos(time + this.side) * 2;
        // [Reference] const idleY = Math.sin(time * 1.5) * 2;
        const idleX = Math.cos(time + this.side) * 2 * s;
        const idleY = Math.sin(time * 1.5) * 2 * s;

        // 攻击动作逻辑
        let forwardReach = 60 * s;
        let sideSpread = 40 * s;
        let targetOpen = 0.0; // Default closed/slight open

        if (attackState === 'windup') {
            forwardReach = 40 * s;
            sideSpread = 55 * s;
            targetOpen = 1.0;
        } else if (attackState === 'strike') {
            forwardReach = 90 * s;
            sideSpread = 30 * s;
            targetOpen = 0.0;
        } else if (attackState === 'recover') {
            forwardReach = 70 * s;
            sideSpread = 45 * s;
            targetOpen = 0.2;
        }

        // [Reference]
        // const fwd = new Vector(Math.sin(bodyAngle), -Math.cos(bodyAngle));
        // const right = new Vector(Math.cos(bodyAngle), Math.sin(bodyAngle));
        const fwd = new Vec2(Math.sin(refAngle), -Math.cos(refAngle));
        const right = new Vec2(Math.cos(refAngle), Math.sin(refAngle));

        let targetPos = this.shoulder
            .add(fwd.mult(forwardReach + idleY))
            .add(right.mult(this.side * sideSpread + idleX));

        // Inertia Drag
        if (velocity) {
            targetPos = targetPos.sub(velocity.mult(3));
        }

        this.wrist = targetPos;
        const dist = this.shoulder.dist(this.wrist);

        const upperArmLen = this.upperArmLenBase * s;
        const foreArmLen = this.foreArmLenBase * s;
        const maxLen = upperArmLen + foreArmLen;

        // [Reference] if (dist > maxLen) ... apply drag/limit
        if (dist > maxLen) {
            const dir = this.wrist.sub(this.shoulder).normalize();
            this.wrist = this.shoulder.add(dir.mult(maxLen - 0.1));
        }

        const d = this.shoulder.dist(this.wrist);
        const a = upperArmLen;
        const b = foreArmLen;
        const c = d;

        // [Reference] Law of Cosines
        const cosAngle = (a * a + c * c - b * b) / (2 * a * c);
        const angleOffset = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
        const baseAngle = Math.atan2(this.wrist.y - this.shoulder.y, this.wrist.x - this.shoulder.x);

        // [Reference] const elbowAngle = baseAngle + (this.side * angleOffset);
        const elbowAngle = baseAngle + (this.side * angleOffset);

        this.elbow = new Vec2(
            this.shoulder.x + Math.cos(elbowAngle) * upperArmLen,
            this.shoulder.y + Math.sin(elbowAngle) * upperArmLen
        );

        // [Reference] const bodyForwardAngle = bodyAngle - Math.PI/2;
        // User Ref: bodyAngle is 0 (Up). forwardAngle is -90 (-1.57).
        // My Engine: refAngle is 0 (Up). Same math.
        const bodyForwardAngle = refAngle - Math.PI / 2;

        // [Reference] const naturalAngle = bodyForwardAngle + (this.side * -0.3);
        const naturalAngle = bodyForwardAngle + (this.side * -0.3);

        this.angle = naturalAngle;

        // Open Speed
        let openSpeed = 0.2;
        if (attackState === 'strike') openSpeed = 0.8;

        this.open += (targetOpen - this.open) * openSpeed;
    }

    draw(ctx) {
        const s = this.scale;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.strokeStyle = '#3e2b1d';
        ctx.lineWidth = 7 * s;
        ctx.beginPath();
        ctx.moveTo(this.shoulder.x, this.shoulder.y);
        ctx.lineTo(this.elbow.x, this.elbow.y);
        ctx.stroke();

        ctx.lineWidth = 6 * s;
        ctx.beginPath();
        ctx.moveTo(this.elbow.x, this.elbow.y);
        ctx.lineTo(this.wrist.x, this.wrist.y);
        ctx.stroke();

        ctx.fillStyle = '#2a1a10';
        ctx.beginPath();
        ctx.arc(this.elbow.x, this.elbow.y, 4 * s, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(this.wrist.x, this.wrist.y);
        ctx.rotate(this.angle);

        // [Reference] const scale = 1.5;
        const scale = 1.5 * s;

        ctx.fillStyle = '#2d1e10';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8 * scale, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        const openVal = 2 + (this.open * 8);

        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2 * s; // 2 in ref is likely 2 pixels.
        ctx.fillStyle = '#1a1109';

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(15 * scale, (-6 - openVal) * scale, 22 * scale, (-2 - openVal) * scale);
        ctx.lineTo(18 * scale, 0);
        ctx.lineTo(5 * scale, 4 * scale);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(15 * scale, (-6 - openVal) * scale, 22 * scale, (-2 - openVal) * scale);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(15 * scale, (6 + openVal) * scale, 22 * scale, (2 + openVal) * scale);
        ctx.lineTo(18 * scale, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(15 * scale, (6 + openVal) * scale, 22 * scale, (2 + openVal) * scale);
        ctx.stroke();

        ctx.restore();
    }
}

/**
 * Scorpion Leg IK System
 * Copied and adapted from user reference.
 */
export class ScorpionLeg {
    constructor(side, index, scale = 1.0) {
        this.side = side;
        this.index = index;
        this.scale = scale;

        // [Reference]
        // const spacingY = 14; 
        // const startY = 15;
        // this.shoulderOffset = new Vector(side * (12 + index * 4), startY + index * spacingY);
        // this.stepThreshold = 40 + (index * 5);

        const spacingY = 14;
        const startY = 15;
        this.shoulderOffsetBase = new Vec2(side * (12 + index * 4), startY + index * spacingY);
        this.stepThresholdBase = 40 + (index * 5);

        // [Reference]
        // const spreadX = 40 + (index * 10); 
        // const spreadY = -20 + (index * 25); 
        // this.restOffset = new Vector(side * spreadX, spreadY);

        const spreadX = 40 + (index * 10);
        const spreadY = -20 + (index * 25);
        this.restOffsetBase = new Vec2(side * spreadX, spreadY);

        this.currentPos = new Vec2(0, 0); // Need to init cleanly
        this.nextPos = new Vec2(0, 0);
        this.isStepping = false;
        this.stepProgress = 0;
        this.shoulderPos = new Vec2(0, 0);

        this.initialized = false;
    }

    updateScale(s) {
        this.scale = s;
    }

    update(bodyPos, bodyAngle, velocity) {
        const s = this.scale;
        const refAngle = bodyAngle + Math.PI / 2;

        const cos = Math.cos(refAngle);
        const sin = Math.sin(refAngle);

        // [Reference]
        // const shoulderWorldX = this.shoulderOffset.x * cos - this.shoulderOffset.y * sin;
        // const shoulderWorldY = this.shoulderOffset.x * sin + this.shoulderOffset.y * cos;
        // this.shoulderPos = new Vector(bodyPos.x + shoulderWorldX, bodyPos.y + shoulderWorldY);
        const off = this.shoulderOffsetBase.mult(s);
        const shoulderWorldX = off.x * cos - off.y * sin;
        const shoulderWorldY = off.x * sin + off.y * cos;
        this.shoulderPos = new Vec2(bodyPos.x + shoulderWorldX, bodyPos.y + shoulderWorldY);

        // [Reference]
        // const restWorldX = this.restOffset.x * cos - this.restOffset.y * sin;
        // const restWorldY = this.restOffset.x * sin + this.restOffset.y * cos;
        const restOff = this.restOffsetBase.mult(s);
        const restWorldX = restOff.x * cos - restOff.y * sin;
        const restWorldY = restOff.x * sin + restOff.y * cos;

        // [Reference] const prediction = velocity.mult(8);
        const prediction = velocity ? velocity.mult(8) : new Vec2(0, 0);

        // [Reference]
        // const idealPos = new Vector(
        //    bodyPos.x + restWorldX + prediction.x,
        //    bodyPos.y + restWorldY + prediction.y
        // );
        const idealPos = new Vec2(
            bodyPos.x + restWorldX + prediction.x,
            bodyPos.y + restWorldY + prediction.y
        );

        if (!this.initialized) {
            this.currentPos = idealPos.clone();
            this.initialized = true;
        }

        const stepThreshold = this.stepThresholdBase * s;
        const dist = this.currentPos.dist(idealPos);

        if (!this.isStepping && dist > stepThreshold) {
            this.isStepping = true;
            this.stepProgress = 0;
            this.nextPos = idealPos.clone();
            // [Reference] Jitter
            this.nextPos.x += (Math.random() - 0.5) * 5 * s;
            this.nextPos.y += (Math.random() - 0.5) * 5 * s;
        }

        if (this.isStepping) {
            // [Reference] this.stepProgress += config.legSpeed; (0.18)
            this.stepProgress += 0.18;
            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                this.currentPos = this.nextPos.clone();
                // Particle spawn omitted for now
            } else {
                // [Reference]
                // this.currentPos.x = this.currentPos.x + (this.nextPos.x - this.currentPos.x) * config.legSpeed; 
                // this.currentPos.y = this.currentPos.y + (this.nextPos.y - this.currentPos.y) * config.legSpeed;
                // Asymptotic ease toward target
                const spd = 0.18;
                this.currentPos.x = this.currentPos.x + (this.nextPos.x - this.currentPos.x) * spd;
                this.currentPos.y = this.currentPos.y + (this.nextPos.y - this.currentPos.y) * spd;
            }
        }
    }

    draw(ctx) {
        const s = this.scale;
        const shoulder = this.shoulderPos;
        const foot = this.currentPos;
        const midX = (shoulder.x + foot.x) / 2;
        const midY = (shoulder.y + foot.y) / 2;
        const angle = Math.atan2(foot.y - shoulder.y, foot.x - shoulder.x);
        const dist = shoulder.dist(foot);

        // [Reference]
        // let lift = 0;
        // if (this.isStepping) lift = Math.sin(this.stepProgress * Math.PI) * 15;
        let lift = 0;
        if (this.isStepping) lift = Math.sin(this.stepProgress * Math.PI) * 15 * s;

        // [Reference]
        // let kneeOffset = 30; 
        // if (dist > this.stepThreshold * 1.5) kneeOffset = 15;
        let kneeOffset = 30 * s;
        if (dist > (this.stepThresholdBase * s) * 1.5) kneeOffset = 15 * s;

        // [Reference]
        // const kneeX = midX + Math.cos(angle - Math.PI/2 * this.side) * kneeOffset;
        // const kneeY = midY + Math.sin(angle - Math.PI/2 * this.side) * kneeOffset - lift;
        const kneeX = midX + Math.cos(angle - Math.PI / 2 * this.side) * kneeOffset;
        const kneeY = midY + Math.sin(angle - Math.PI / 2 * this.side) * kneeOffset - lift;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#2d1e10';
        ctx.lineWidth = 4 * s;
        ctx.beginPath(); ctx.moveTo(shoulder.x, shoulder.y); ctx.lineTo(kneeX, kneeY); ctx.stroke();

        ctx.strokeStyle = '#4a3625';
        ctx.lineWidth = 3 * s;
        ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(foot.x, foot.y); ctx.stroke();

        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(foot.x, foot.y, 2 * s, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#1a0f05';
        ctx.beginPath(); ctx.arc(kneeX, kneeY, 2.5 * s, 0, Math.PI * 2); ctx.fill();
    }
}

/**
 * Scorpion Effect (Shockwave/Particles)
 */
export class ScorpionEffect {
    constructor(x, y, scale = 1.0) {
        this.pos = new Vec2(x, y);
        this.scale = scale;
        this.radius = 5 * scale;
        this.maxRadius = 50 * scale;
        this.life = 1.0;
        this.color = '220, 20, 20';
        this.active = true;
    }

    update() {
        this.radius += (this.maxRadius - this.radius) * 0.2;
        this.life -= 0.06;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        // 1. Core Flash
        if (this.life > 0.5) {
            const flashAlpha = (this.life - 0.5) * 2;
            ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Main Wave
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${this.color}, ${this.life})`;
        ctx.lineWidth = 12 * this.life * this.scale;
        ctx.stroke();

        // 3. Secondary Wave
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius * 0.75, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${this.color}, ${this.life * 0.6})`;
        ctx.lineWidth = 8 * this.life * this.scale;
        ctx.stroke();

        // 4. Inner Ring
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 100, 100, ${this.life * 0.8})`;
        ctx.lineWidth = 3 * this.life * this.scale;
        ctx.stroke();

        ctx.restore();
    }
}
