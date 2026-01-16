
import { Vec2 } from './Vec2.js';

/**
 * Insect Leg Class using Inverse Kinematics (IK)
 * Specialized for Cockroach
 */
export class CockroachLeg {
    constructor(side, index, anchorOffset, idealLength, stepThreshold, scale = 1.0) {
        this.side = side; // -1 for left, 1 for right
        this.index = index; // 0: front, 1: middle, 2: back
        this.baseAnchorOffset = anchorOffset; // Attachment point relative to body center (unscaled)
        this.baseIdealLength = idealLength;
        this.baseStepThreshold = stepThreshold;

        this.scale = scale;

        // IK Targets
        this.footPos = new Vec2(0, 0); // Current actual foot position
        this.targetPos = new Vec2(0, 0); // Where the foot wants to be
        this.stepStartPos = new Vec2(0, 0);

        // Step Logic
        this.isStepping = false;
        this.stepProgress = 0;
        this.stepSpeed = 0.2; // Speed of the step animation
        this.liftHeight = 0;

        // Visuals
        this.thickness = (index === 2) ? 3 : 2;
    }

    updateScale(s) {
        this.scale = s;
    }

    // Calculate where the foot "should" be based on body position and rotation
    calculateTarget(bodyPos, bodyAngle, velocity) {
        let rad = bodyAngle;

        // Scale offsets
        let currentAnchorOffset = this.baseAnchorOffset.mult(this.scale);

        let worldAnchor = new Vec2(
            bodyPos.x + (currentAnchorOffset.x * Math.cos(rad) - currentAnchorOffset.y * Math.sin(rad)),
            bodyPos.y + (currentAnchorOffset.x * Math.sin(rad) + currentAnchorOffset.y * Math.cos(rad))
        );

        // Spread & Offset
        let spread = (18 + (this.index * 5)) * this.scale;
        let forwardOffsets = [28, -5, -45];
        let forwardOffset = forwardOffsets[this.index] * this.scale;

        // Velocity Prediction
        let prediction = velocity.mult(5);

        let idealOffset = new Vec2(forwardOffset, this.side * spread);
        let rotatedOffset = idealOffset.rotate(rad);

        return worldAnchor.add(rotatedOffset).add(prediction);
    }

    update(bodyPos, bodyAngle, velocity, forceStep = false) {
        let desired = this.calculateTarget(bodyPos, bodyAngle, velocity);
        let dist = this.footPos.dist(desired);

        let currentThreshold = this.baseStepThreshold * this.scale;

        if (!this.isStepping && (dist > currentThreshold || forceStep)) {
            this.isStepping = true;
            this.stepStartPos = this.footPos.copy();
            this.targetPos = desired;
            this.stepProgress = 0;
        }

        if (this.isStepping) {
            this.stepProgress += this.stepSpeed;
            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                this.footPos = this.targetPos.copy();
            } else {
                let v = this.targetPos.sub(this.stepStartPos);
                this.footPos = this.stepStartPos.add(v.mult(this.stepProgress));
                this.liftHeight = Math.sin(this.stepProgress * Math.PI) * (15 * this.scale);
            }
        } else {
            this.liftHeight = 0;
        }
    }

    draw(ctx, bodyPos, bodyAngle) {
        let rad = bodyAngle;
        let currentAnchorOffset = this.baseAnchorOffset.mult(this.scale);

        let shoulder = new Vec2(
            bodyPos.x + (currentAnchorOffset.x * Math.cos(rad) - currentAnchorOffset.y * Math.sin(rad)),
            bodyPos.y + (currentAnchorOffset.x * Math.sin(rad) + currentAnchorOffset.y * Math.cos(rad))
        );

        // IK Calculation
        let femurRatio = (this.index === 0) ? 0.45 : 0.28;
        let tibiaRatio = 1 - femurRatio;

        let totalLen = this.baseIdealLength * this.scale;
        let femurLen = totalLen * femurRatio;
        let tibiaLen = totalLen * tibiaRatio;

        let dist = shoulder.dist(this.footPos);
        if (dist >= totalLen * 0.99) dist = totalLen * 0.99;
        // Fix NaN if dist is too short
        let minReach = Math.abs(femurLen - tibiaLen);
        if (dist <= minReach) dist = minReach + 0.1;

        let x = (femurLen * femurLen - tibiaLen * tibiaLen + dist * dist) / (2 * dist);
        let h = Math.sqrt(Math.max(0, femurLen * femurLen - x * x));

        let forwardVec = new Vec2(Math.cos(bodyAngle), Math.sin(bodyAngle));
        let rightVec = new Vec2(-Math.sin(bodyAngle), Math.cos(bodyAngle));
        let outward = (this.side === 1) ? rightVec : rightVec.mult(-1);

        let biasDir = outward.copy();
        if (this.index === 0) biasDir = biasDir.add(forwardVec.mult(1.5));
        else if (this.index === 1) biasDir = biasDir.sub(forwardVec.mult(0.3));
        else if (this.index === 2) biasDir = biasDir.sub(forwardVec.mult(1.2));
        biasDir = biasDir.normalize();

        let chord = this.footPos.sub(shoulder);
        let chordDir = chord.normalize();
        let basePoint = shoulder.add(chordDir.mult(x));

        let perp = new Vec2(-chordDir.y, chordDir.x);
        if (perp.dot(biasDir) < 0) perp = perp.mult(-1);

        // Apply lift with 3D perspective illusion (y-shift)
        // Just offset Y relative to rotation? simpler to just modify drawing coords?
        // Let's assume 2D top down, lift creates parallax or scale change?
        // Actually the original code just calculated liftHeight but didn't use it in draw except maybe logic?
        // Wait, the original code had `this.liftHeight` but didn't use it in `draw`.
        // Let's implement visual lift by shifting "knee" and "foot" slightly towards camera (scale up?) or just shadow offset.
        // For now, stick to original logic.

        let knee = basePoint.add(perp.mult(h));

        let currentThickness = this.thickness * this.scale;

        // Draw shadow
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = currentThickness;
        ctx.lineJoin = "bevel";
        ctx.beginPath();
        // Shadow is offset by absolute pixels usually
        ctx.moveTo(shoulder.x + 5, shoulder.y + 5);
        ctx.lineTo(knee.x + 5, knee.y + 5);
        ctx.lineTo(this.footPos.x + 5, this.footPos.y + 5);
        ctx.stroke();

        // Draw Leg Segments
        let grad = ctx.createLinearGradient(shoulder.x, shoulder.y, this.footPos.x, this.footPos.y);
        grad.addColorStop(0, "#1a0f0a"); // 极深棕
        grad.addColorStop(0.5, "#3e2723"); // 深棕
        grad.addColorStop(1, "#5d4037"); // 腿尖稍亮

        ctx.strokeStyle = grad;
        ctx.lineWidth = currentThickness;
        ctx.lineCap = "round";
        ctx.lineJoin = "bevel";

        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(knee.x, knee.y);
        ctx.lineTo(this.footPos.x, this.footPos.y);
        ctx.stroke();

        // Spikes on Tibia (刺)
        if (this.index > 0) {
            ctx.fillStyle = "#110b09"; // 黑色刺
            let tibiaVec = this.footPos.sub(knee);
            let tibiaLenReal = tibiaVec.mag();
            let tibiaDir = tibiaVec.normalize();

            // Adjust spike spacing and size by scale
            let spikeStep = 6 * this.scale;
            for (let d = 5 * this.scale; d < tibiaLenReal - 5 * this.scale; d += spikeStep) {
                let p = knee.add(tibiaDir.mult(d));
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5 * this.scale, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 关节球
        ctx.fillStyle = "#0f0500";
        ctx.beginPath();
        ctx.arc(knee.x, knee.y, currentThickness, 0, Math.PI * 2);
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
        this.side = side; // -1 Left, 1 Right
        this.scale = scale;

        for (let i = 0; i < segmentCount; i++) {
            this.segments.push(new Vec2(0, 0));
        }
    }

    updateScale(s) {
        this.scale = s;
    }

    update(rootPos, rootAngle, velocity) {
        this.segments[0] = rootPos;

        let currentSegmentLen = (this.baseLength * this.scale) / this.segmentCount;

        for (let i = 1; i < this.segments.length; i++) {
            let prev = this.segments[i - 1];
            let curr = this.segments[i];

            // 1. Drag
            let dir = curr.sub(prev);
            // Handling zero length
            if (dir.mag() === 0) dir = new Vec2(1, 0);

            let correction = dir.normalize().mult(currentSegmentLen);
            let physicsPos = prev.add(correction);

            // 2. Rest Pose
            let localAngle = (this.side * 0.4) - (this.side * (i * 0.04));
            let targetAngle = rootAngle + localAngle;

            let restOffset = new Vec2(Math.cos(targetAngle), Math.sin(targetAngle)).mult(currentSegmentLen);
            let restPos = prev.add(restOffset);

            // 3. Blend
            let speed = velocity.mag();
            let physicsWeight = Math.min(1, speed * 0.15);
            let restWeight = 0.1;

            if (i > 2) {
                // Apply 'wind' / drag opposite to velocity
                physicsPos.x -= velocity.x * (i * 0.05);
                physicsPos.y -= velocity.y * (i * 0.05);
            }

            curr.x = physicsPos.x + (restPos.x - physicsPos.x) * restWeight;
            curr.y = physicsPos.y + (restPos.y - physicsPos.y) * restWeight;

            // Twitch
            if (Math.random() < 0.03) {
                curr.x += (Math.random() - 0.5) * 2 * this.scale;
                curr.y += (Math.random() - 0.5) * 2 * this.scale;
            }

            this.segments[i] = curr;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        // Check valid segments
        if (this.segments[0]) ctx.moveTo(this.segments[0].x, this.segments[0].y);

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

    reset(rootPos, rootAngle) {
        this.segments[0] = rootPos.copy();
        let currentSegmentLen = (this.baseLength * this.scale) / this.segmentCount;

        for (let i = 1; i < this.segments.length; i++) {
            let localAngle = (this.side * 0.4) - (this.side * (i * 0.04));
            let targetAngle = rootAngle + localAngle;

            let prev = this.segments[i - 1];
            let offset = new Vec2(Math.cos(targetAngle), Math.sin(targetAngle)).mult(currentSegmentLen);
            this.segments[i] = prev.add(offset);
        }
    }
}
