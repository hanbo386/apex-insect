
import { Vec2 } from './Vec2.js';

/**
 * Visual Effect Class for Cockroach
 */
export class CockroachEffect {
    constructor(x, y, type, angle = 0, scale = 1.0) {
        this.pos = new Vec2(x, y);
        this.type = type; // 'shockwave', 'line'
        this.scale = scale;
        this.life = 1.0;
        this.dead = false;

        if (type === 'shockwave') {
            this.radius = 5 * scale;
            this.maxRadius = 60 * scale;
            this.decay = 0.06;
            this.width = 15 * scale;
        } else if (type === 'line') {
            this.decay = 0.08 + Math.random() * 0.05;
            this.angle = angle + (Math.random() - 0.5) * 1.0;
            this.speed = (15 + Math.random() * 15) * scale;
            this.length = (10 + Math.random() * 20) * scale;
        }
    }

    update() {
        this.life -= this.decay;
        if (this.life <= 0) {
            this.dead = true;
            return;
        }

        if (this.type === 'shockwave') {
            this.radius += (this.maxRadius - this.radius) * 0.25;
        } else if (this.type === 'line') {
            this.pos.x += Math.cos(this.angle) * this.speed;
            this.pos.y += Math.sin(this.angle) * this.speed;
        }
    }

    draw(ctx) {
        if (this.dead) return;

        ctx.save();
        if (this.type === 'shockwave') {
            ctx.shadowBlur = 20 * this.scale;
            ctx.shadowColor = "rgba(255, 255, 255, 0.8)";

            ctx.strokeStyle = `rgba(255, 255, 240, ${this.life})`;
            ctx.lineWidth = this.width * this.life;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 200, 100, ${this.life * 0.8})`;
            ctx.lineWidth = 2 * this.scale;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius * 0.8, 0, Math.PI * 2);
            ctx.stroke();

        } else if (this.type === 'line') {
            ctx.strokeStyle = `rgba(255, 255, 255, ${this.life})`;
            ctx.lineWidth = 3 * this.life * this.scale;
            ctx.beginPath();
            let tailX = this.pos.x - Math.cos(this.angle) * this.length;
            let tailY = this.pos.y - Math.sin(this.angle) * this.length;
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
        }
        ctx.restore();
    }
}

/**
 * Cockroach Leg Class
 */
export class CockroachLeg {
    constructor(side, index, anchorOffset, idealLength, stepThreshold, scale = 1.0) {
        this.side = side;
        this.index = index;
        this.anchorOffset = anchorOffset; // Vec2 relative to body center (unscaled)
        this.idealLength = idealLength; // Unscaled
        this.scale = scale;

        this.footPos = new Vec2(0, 0);
        this.targetPos = new Vec2(0, 0);
        this.stepStartPos = new Vec2(0, 0);

        this.stepThreshold = stepThreshold; // Unscaled base
        this.isStepping = false;
        this.stepProgress = 0;
        this.stepSpeed = 0.15;
        this.liftHeight = 0;

        this.thickness = (index === 2) ? 3 : 2;

        // Initial init flag
        this.initialized = false;
    }

    updateScale(s) {
        this.scale = s;
    }

    calculateTarget(bodyPos, bodyAngle, velocity) {
        let rad = bodyAngle;
        let s = this.scale;

        // Body Anchor World Pos
        // anchorOffset is LOCAL unscaled.
        let worldAnchorX = bodyPos.x + (this.anchorOffset.x * s * Math.cos(rad) - this.anchorOffset.y * s * Math.sin(rad));
        let worldAnchorY = bodyPos.y + (this.anchorOffset.x * s * Math.sin(rad) + this.anchorOffset.y * s * Math.cos(rad));
        let worldAnchor = new Vec2(worldAnchorX, worldAnchorY);

        let spread = (18 + (this.index * 5)) * s;
        let forwardOffsets = [28 * s, -5 * s, -45 * s];
        let forwardOffset = forwardOffsets[this.index];

        // Velocity Prediction
        let prediction = velocity.mult(5);

        let idealOffset = new Vec2(forwardOffset, this.side * spread);
        let rotatedOffset = idealOffset.rotate(rad);

        return worldAnchor.add(rotatedOffset).add(prediction);
    }

    update(bodyPos, bodyAngle, velocity, forceStep = false) {
        let s = this.scale;

        if (!this.initialized) {
            this.footPos = this.calculateTarget(bodyPos, bodyAngle, new Vec2(0, 0));
            this.initialized = true;
        }

        let desired = this.calculateTarget(bodyPos, bodyAngle, velocity);
        let dist = this.footPos.dist(desired);

        let thresh = this.stepThreshold * s;

        if (!this.isStepping && (dist > thresh || forceStep)) {
            this.isStepping = true;
            this.stepStartPos = this.footPos.clone();
            this.targetPos = desired;
            this.stepProgress = 0;
        }

        if (this.isStepping) {
            this.stepProgress += this.stepSpeed;
            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                this.footPos = this.targetPos.clone();
            } else {
                let v = this.targetPos.sub(this.stepStartPos);
                this.footPos = this.stepStartPos.add(v.mult(this.stepProgress));
                this.liftHeight = Math.sin(this.stepProgress * Math.PI) * (15 * s);
            }
        } else {
            this.liftHeight = 0;
        }
    }

    draw(ctx, bodyPos, bodyAngle) {
        let s = this.scale;
        let rad = bodyAngle;

        let shoulder = new Vec2(
            bodyPos.x + (this.anchorOffset.x * s * Math.cos(rad) - this.anchorOffset.y * s * Math.sin(rad)),
            bodyPos.y + (this.anchorOffset.x * s * Math.sin(rad) + this.anchorOffset.y * s * Math.cos(rad))
        );

        let femurRatio = (this.index === 0) ? 0.45 : 0.28;
        let tibiaRatio = 1 - femurRatio;

        let totalLen = this.idealLength * s;
        let femurLen = totalLen * femurRatio;
        let tibiaLen = totalLen * tibiaRatio;

        let dist = shoulder.dist(this.footPos);
        if (dist >= totalLen * 0.99) dist = totalLen * 0.99;
        if (dist <= Math.abs(femurLen - tibiaLen)) dist = Math.abs(femurLen - tibiaLen) + 1;

        let x = (femurLen * femurLen - tibiaLen * tibiaLen + dist * dist) / (2 * dist);
        let h = Math.sqrt(Math.max(0, femurLen * femurLen - x * x));

        let forwardVec = new Vec2(Math.cos(bodyAngle), Math.sin(bodyAngle));
        let rightVec = new Vec2(-Math.sin(bodyAngle), Math.cos(bodyAngle));
        let outward = (this.side === 1) ? rightVec : rightVec.mult(-1);

        let biasDir = outward.clone();
        if (this.index === 0) biasDir = biasDir.add(forwardVec.mult(1.5));
        else if (this.index === 1) biasDir = biasDir.sub(forwardVec.mult(0.3));
        else if (this.index === 2) biasDir = biasDir.sub(forwardVec.mult(1.2));
        biasDir = biasDir.normalize();

        let chord = this.footPos.sub(shoulder);
        let chordDir = chord.normalize();
        let basePoint = shoulder.add(chordDir.mult(x));

        let perp = new Vec2(-chordDir.y, chordDir.x);
        if (perp.dot(biasDir) < 0) perp = perp.mult(-1);

        let knee = basePoint.add(perp.mult(h));

        let thick = this.thickness * s;

        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = thick;
        ctx.lineJoin = "bevel";
        ctx.beginPath();
        let shOff = 5 * s;
        ctx.moveTo(shoulder.x + shOff, shoulder.y + shOff);
        ctx.lineTo(knee.x + shOff, knee.y + shOff);
        ctx.lineTo(this.footPos.x + shOff, this.footPos.y + shOff);
        ctx.stroke();

        let grad = ctx.createLinearGradient(shoulder.x, shoulder.y, this.footPos.x, this.footPos.y);
        grad.addColorStop(0, "#1a0f0a");
        grad.addColorStop(0.5, "#3e2723");
        grad.addColorStop(1, "#5d4037");

        ctx.strokeStyle = grad;
        ctx.lineWidth = thick;
        ctx.lineCap = "round";
        ctx.lineJoin = "bevel";

        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(knee.x, knee.y - this.liftHeight);
        ctx.lineTo(this.footPos.x, this.footPos.y);
        ctx.stroke();

        if (this.index > 0) {
            ctx.fillStyle = "#110b09";
            let kneeLifted = new Vec2(knee.x, knee.y - this.liftHeight);
            let tibiaVec = this.footPos.sub(kneeLifted);
            let tibiaLenReal = tibiaVec.mag();
            let tibiaDir = tibiaVec.normalize();

            let spikeStep = 6 * s;
            for (let d = 5 * s; d < tibiaLenReal - 5 * s; d += spikeStep) {
                let p = kneeLifted.add(tibiaDir.mult(d));
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5 * s, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.fillStyle = "#0f0500";
        ctx.beginPath();
        ctx.arc(knee.x, knee.y - this.liftHeight, thick, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Antenna Physics Class
 */
export class CockroachAntenna {
    constructor(length, segmentCount, side, scale = 1.0) {
        this.segments = [];
        this.baseLength = length;
        this.segmentCount = segmentCount;
        this.side = side;
        this.scale = scale;

        for (let i = 0; i < segmentCount; i++) {
            this.segments.push(new Vec2(0, 0));
        }
    }

    updateScale(s) {
        this.scale = s;
    }

    update(rootPos, rootAngle, velocity, isAttacking) {
        this.segments[0] = rootPos.clone();

        let s = this.scale;
        let segLen = (this.baseLength / this.segmentCount) * s;

        for (let i = 1; i < this.segments.length; i++) {
            let prev = this.segments[i - 1];
            let curr = this.segments[i];

            let dir = curr.sub(prev);
            let dist = dir.mag();
            let correction = dir.normalize().mult(segLen);
            let physicsPos = prev.add(correction);

            let localAngle = (this.side * 0.4) - (this.side * (i * 0.04));
            let targetAngle = rootAngle + localAngle;

            if (isAttacking) {
                targetAngle += Math.sin(Date.now() * 0.05 + i) * 1.5;
            }

            let restOffset = new Vec2(Math.cos(targetAngle), Math.sin(targetAngle)).mult(segLen);
            let restPos = prev.add(restOffset);

            let speed = velocity.mag();
            let physicsWeight = Math.min(1, speed * 0.15);
            let restWeight = 0.1;

            if (i > 2) {
                physicsPos.x -= velocity.x * (i * 0.05);
                physicsPos.y -= velocity.y * (i * 0.05);
            }

            curr.x = physicsPos.x + (restPos.x - physicsPos.x) * restWeight;
            curr.y = physicsPos.y + (restPos.y - physicsPos.y) * restWeight;

            let twitchFactor = isAttacking ? 0.3 : 0.03;
            if (Math.random() < twitchFactor) {
                curr.x += (Math.random() - 0.5) * 4 * s;
                curr.y += (Math.random() - 0.5) * 4 * s;
            }

            this.segments[i] = curr;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.segments[0].x, this.segments[0].y);

        for (let i = 1; i < this.segments.length - 2; i++) {
            let xc = (this.segments[i].x + this.segments[i + 1].x) / 2;
            let yc = (this.segments[i].y + this.segments[i + 1].y) / 2;
            ctx.quadraticCurveTo(this.segments[i].x, this.segments[i].y, xc, yc);
        }
        let n = this.segments.length;
        if (n > 2) {
            ctx.quadraticCurveTo(
                this.segments[n - 2].x, this.segments[n - 2].y,
                this.segments[n - 1].x, this.segments[n - 1].y
            );
        }

        ctx.strokeStyle = "rgba(40, 20, 10, 0.9)";
        ctx.lineWidth = 1 * this.scale;
        ctx.stroke();
    }
}
