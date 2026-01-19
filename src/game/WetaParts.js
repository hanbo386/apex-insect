import { Vec2 } from './Vec2.js';

export class WetaAntenna {
    constructor(segmentCount, length, stiffness) {
        this.segments = [];
        this.length = length;
        this.stiffness = stiffness;
        for (let i = 0; i < segmentCount; i++) {
            this.segments.push(new Vec2(0, 0));
        }
    }

    update(headPos, headAngle, offsetSide) {
        let offset = new Vec2(52, offsetSide * 8).rotate(headAngle);
        let rootPos = headPos.add(offset);
        this.segments[0] = rootPos;

        for (let i = 1; i < this.segments.length; i++) {
            let prev = this.segments[i - 1];
            let curr = this.segments[i];

            let curveAngle = headAngle + (offsetSide * 0.3) + (offsetSide * i * 0.03);
            let idealDir = new Vec2(Math.cos(curveAngle), Math.sin(curveAngle));
            let idealPos = prev.add(idealDir.mult(this.length));

            curr.x += (idealPos.x - curr.x) * this.stiffness;
            curr.y += (idealPos.y - curr.y) * this.stiffness;

            let dir = curr.sub(prev);
            let dist = dir.mag();
            if (dist > 0) {
                let corrected = dir.normalize().mult(this.length);
                this.segments[i] = prev.add(corrected);
            }
        }
    }

    draw(ctx) {
        ctx.beginPath();
        if (this.segments.length > 0) {
            ctx.moveTo(this.segments[0].x, this.segments[0].y);
            for (let i = 1; i < this.segments.length; i++) {
                ctx.lineTo(this.segments[i].x, this.segments[i].y);
            }
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#3E2723';
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#6D4C41';
        ctx.stroke();
    }
}

export class WetaLeg {
    constructor(side, index, anchorOffset, legLength1, legLength2) {
        this.side = side; // 1 = right, -1 = left
        this.index = index;
        this.anchorOffset = anchorOffset;
        this.l1 = legLength1;
        this.l2 = legLength2;

        this.footPos = new Vec2(0, 0);
        this.targetPos = new Vec2(0, 0);
        this.startStepPos = new Vec2(0, 0);
        this.stepProgress = 0;
        this.isStepping = false;
        this.gaitOffset = Math.random();
    }

    solveIK(bodyPos, bodyAngle, scale = 1.0) {
        // Adjust for scale
        let scaledOffset = this.anchorOffset.mult(scale);
        let scaledL1 = this.l1 * scale;
        let scaledL2 = this.l2 * scale;

        let shoulder = bodyPos.add(scaledOffset.rotate(bodyAngle));
        let dir = this.footPos.sub(shoulder);
        let dist = dir.mag();

        if (dist > scaledL1 + scaledL2) {
            dist = scaledL1 + scaledL2;
            this.footPos = shoulder.add(dir.normalize().mult(dist));
        }

        let c_dist = Math.min(dist, scaledL1 + scaledL2 - 0.01);
        let cosAngle1 = (scaledL1 * scaledL1 + c_dist * c_dist - scaledL2 * scaledL2) / (2 * scaledL1 * c_dist);
        let angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle1)));

        let baseAngle = Math.atan2(this.footPos.y - shoulder.y, this.footPos.x - shoulder.x);

        // --- Bend Direction ---
        let bendDir = this.side;

        if (this.index === 0) {
            // Front Leg: Bend forward
            bendDir = this.side;
        } else {
            // Mid/Back Leg: Bend backward
            bendDir = -this.side;
        }

        let kneeAngle = baseAngle + angle1 * bendDir;

        let kneeX = shoulder.x + Math.cos(kneeAngle) * scaledL1;
        let kneeY = shoulder.y + Math.sin(kneeAngle) * scaledL1;

        return { shoulder, knee: new Vec2(kneeX, kneeY), foot: this.footPos };
    }

    update(bodyPos, bodyAngle, velocity, speed, scale = 1.0) {
        let speedFactor = velocity.mag() * 15 * scale;
        // Cap speedFactor to prevent legs exploding out
        if (speedFactor > 60 * scale) speedFactor = 60 * scale;

        let targetLocal = new Vec2(0, 0);

        // --- Configuration ---
        if (this.index === 0) {
            targetLocal = new Vec2(65 * scale + speedFactor, this.side * 25 * scale);
        } else if (this.index === 1) {
            // Move mid legs slightly forward prevent drag look
            targetLocal = new Vec2(-25 * scale, this.side * 80 * scale);
        } else if (this.index === 2) {
            // Move back legs slightly forward
            targetLocal = new Vec2(-140 * scale, this.side * 60 * scale);
        }

        let idealGlobal = bodyPos.add(targetLocal.rotate(bodyAngle));
        let distToTarget = this.footPos.dist(idealGlobal);

        // --- Movement Logic ---

        // 1. Thresholds - Reduced by ~20%
        let stepThreshold = 45 * scale;
        if (this.index === 2) stepThreshold = 60 * scale;

        // 2. Check Stretch
        let scaledOffset = this.anchorOffset.mult(scale);
        let shoulderOffset = scaledOffset.rotate(bodyAngle);
        let shoulderPos = bodyPos.add(shoulderOffset);
        let currentLegLength = this.footPos.dist(shoulderPos);
        let maxLegLength = (this.l1 + this.l2) * scale;

        // Stricter stretch check (0.96 -> 0.90) to force step before full extend
        let isStretched = currentLegLength > maxLegLength * 0.90;

        if (!this.isStepping && (distToTarget > stepThreshold || isStretched)) {
            this.isStepping = true;
            this.stepProgress = 0;
            this.startStepPos = this.footPos.copy();

            // 3. Prediction
            let predFactor = this.index === 2 ? 1.0 : 0.8;

            let prediction = velocity.mag() > 0.1 ? velocity.normalize().mult(stepThreshold * predFactor) : new Vec2(0, 0);

            this.targetPos = idealGlobal.add(prediction);
            // Randomness
            this.targetPos.x += (Math.random() - 0.5) * 2 * scale;
            this.targetPos.y += (Math.random() - 0.5) * 2 * scale;
        }

        if (this.isStepping) {
            // 4. Step Progress
            this.stepProgress += 0.25;

            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                this.footPos = this.targetPos;
            } else {
                let t = this.stepProgress;
                // Lift is calculated but ignored in 2D top-down reference logic for actual position
                let liftHeight = (this.index === 2 ? 40 : 20) * scale;
                let lift = Math.sin(t * Math.PI) * liftHeight;

                let currentX = this.startStepPos.x + (this.targetPos.x - this.startStepPos.x) * t;
                let currentY = this.startStepPos.y + (this.targetPos.y - this.startStepPos.y) * t;

                this.footPos = new Vec2(currentX, currentY);
            }
        }
    }

    draw(ctx, bodyPos, bodyAngle, scale = 1.0) {
        let ik = this.solveIK(bodyPos, bodyAngle, scale);

        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineCap = 'round';

        ctx.lineWidth = (this.index === 2 ? 22 : 8) * scale;
        ctx.beginPath();
        ctx.moveTo(ik.shoulder.x + 5 * scale, ik.shoulder.y + 5 * scale);
        ctx.lineTo(ik.knee.x + 5 * scale, ik.knee.y + 5 * scale);
        ctx.stroke();

        ctx.lineWidth = (this.index === 2 ? 7 : 5) * scale;
        ctx.beginPath();
        ctx.moveTo(ik.knee.x + 5 * scale, ik.knee.y + 5 * scale);
        ctx.lineTo(ik.foot.x + 5 * scale, ik.foot.y + 5 * scale);
        ctx.stroke();

        ctx.strokeStyle = '#4E342E';
        ctx.lineWidth = (this.index === 2 ? 20 : 8) * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ik.shoulder.x, ik.shoulder.y);
        ctx.lineTo(ik.knee.x, ik.knee.y);
        ctx.stroke();

        this.drawSpikes(ctx, ik.shoulder, ik.knee, 3, scale);

        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = (this.index === 2 ? 6 : 5) * scale;
        ctx.beginPath();
        ctx.moveTo(ik.knee.x, ik.knee.y);
        ctx.lineTo(ik.foot.x, ik.foot.y);
        ctx.stroke();

        this.drawSpikes(ctx, ik.knee, ik.foot, 5, scale);
    }

    drawSpikes(ctx, start, end, count, scale = 1.0) {
        ctx.strokeStyle = '#271915';
        ctx.lineWidth = 1.5 * scale;
        let dir = end.sub(start);
        let len = dir.mag();
        let normal = new Vec2(-dir.y, dir.x).normalize();

        for (let i = 1; i < count; i++) {
            let t = i / count;
            let pos = start.add(dir.mult(t));
            let spikeTip = pos.add(normal.mult((i % 2 === 0 ? 1 : -1) * 6 * scale));
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(spikeTip.x, spikeTip.y);
            ctx.stroke();
        }
    }
}

export function drawGiantWeta(ctx, insect) {
    const s = insect.scale;

    ctx.save();

    // Draw Legs (Handled by main draw loop calling leg.draw? Or here?)
    // In the User Reference: weta.draw() calls legs.draw() then body then antennae.
    // In Insect.js draw loop: we usually delegate to specific draw functions.
    // Let's do it here to follow reference structure.

    if (insect.wetaLegs) {
        insect.wetaLegs.forEach(leg => leg.draw(ctx, insect.pos, insect.angle, s));
    }

    // Antennae (Global draw, not affected by body rotation)
    if (insect.wetaAntennae) {
        insect.wetaAntennae.forEach(ant => ant.draw(ctx));
    }

    // Body
    ctx.translate(insect.pos.x, insect.pos.y);
    ctx.rotate(insect.angle);
    ctx.scale(s, s);

    drawBodyInternal(ctx);

    ctx.restore();
}

function drawBodyInternal(ctx) {
    const colorShell = '#3E2723';
    const colorHighlight = '#5D4037';
    const colorSegment = '#271915';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(-10, 5, 80, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Ovipositor (Tail Spike) ---
    ctx.fillStyle = '#1a0f0a';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-75, -5);
    ctx.quadraticCurveTo(-100, -2, -125, 0);
    ctx.quadraticCurveTo(-100, 2, -75, 5);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-78, 0);
    ctx.lineTo(-115, 0);
    ctx.stroke();

    // --- Abdomen ---
    for (let i = 0; i < 7; i++) {
        let xOff = -15 - (i * 10);
        let width = 26 - (i * 2.5);
        let height = 32 - (i * 3);

        ctx.fillStyle = colorSegment;
        ctx.beginPath();
        // ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle)
        ctx.ellipse(xOff, 0, width + 1, height + 1, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = i % 2 === 0 ? colorShell : colorHighlight;
        ctx.beginPath();
        ctx.ellipse(xOff, 0, width, height, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- Thorax ---
    ctx.fillStyle = colorShell;
    ctx.beginPath();
    // RoundRect shim or usage
    if (ctx.roundRect) {
        ctx.roundRect(-20, -24, 30, 48, 6);
    } else {
        ctx.rect(-20, -24, 30, 48);
    }
    ctx.fill();
    ctx.strokeStyle = '#1a100e';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = colorHighlight;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(-5, -22, 32, 44, 8);
    } else {
        ctx.rect(-5, -22, 32, 44);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4E342E';
    ctx.beginPath();
    ctx.ellipse(28, 0, 22, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // --- Head ---
    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.ellipse(50, 0, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.ellipse(50, -3, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mandibles
    ctx.fillStyle = '#1a100e';
    ctx.beginPath();
    ctx.moveTo(56, -5);
    ctx.lineTo(64, -2);
    ctx.lineTo(56, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(56, 5);
    ctx.lineTo(64, 2);
    ctx.lineTo(56, 0);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(52, -7, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(52, 7, 2.5, 0, Math.PI * 2); ctx.fill();

    // Pronotum Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.ellipse(28, -6, 12, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
}
