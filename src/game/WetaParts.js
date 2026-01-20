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
        this.isStepping = false;
        this.gaitOffset = Math.random();
    }

    solveIK(bodyPos, bodyAngle, scale = 1.0) {
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

        let bendDir = this.side;
        if (this.index === 0) {
            bendDir = this.side;
        } else {
            bendDir = -this.side;
        }

        let kneeAngle = baseAngle + angle1 * bendDir;

        let kneeX = shoulder.x + Math.cos(kneeAngle) * scaledL1;
        let kneeY = shoulder.y + Math.sin(kneeAngle) * scaledL1;

        return { shoulder, knee: new Vec2(kneeX, kneeY), foot: this.footPos };
    }

    // New Update Signature to accept attack state
    update(bodyPos, bodyAngle, velocity, speed, scale, attackInfo) {
        // 1. Attack Overrides
        if (attackInfo) {
            if (attackInfo.isAttacking && this.index === 2) {
                this.handleKick(bodyPos, bodyAngle, attackInfo.progress, scale);
                return;
            }
            if (attackInfo.isBiting && this.index === 0) {
                this.handleBiteGrapple(bodyPos, bodyAngle, attackInfo.biteProgress, scale);
                return;
            }
        }

        let speedFactor = velocity.mag() * 15 * scale;
        if (speedFactor > 60 * scale) speedFactor = 60 * scale;

        let targetLocal = new Vec2(0, 0);

        if (this.index === 0) {
            targetLocal = new Vec2(65 * scale + speedFactor, this.side * 25 * scale);
        } else if (this.index === 1) {
            targetLocal = new Vec2(-25 * scale, this.side * 80 * scale);
        } else if (this.index === 2) {
            targetLocal = new Vec2(-140 * scale, this.side * 60 * scale);
        }

        let idealGlobal = bodyPos.add(targetLocal.rotate(bodyAngle));
        let distToTarget = this.footPos.dist(idealGlobal);

        let stepThreshold = (this.index === 2 ? 60 : 45) * scale;

        let scaledOffset = this.anchorOffset.mult(scale);
        let shoulderOffset = scaledOffset.rotate(bodyAngle);
        let shoulderPos = bodyPos.add(shoulderOffset);
        let currentLegLength = this.footPos.dist(shoulderPos);
        let maxLegLength = (this.l1 + this.l2) * scale;
        let isStretched = currentLegLength > maxLegLength * 0.90;

        if (!this.isStepping && (distToTarget > stepThreshold || isStretched)) {
            this.isStepping = true;
            this.stepProgress = 0;
            this.startStepPos = this.footPos.copy();

            let predFactor = this.index === 2 ? 1.0 : 0.8;
            let prediction = velocity.mag() > 0.1 ? velocity.normalize().mult(stepThreshold * predFactor) : new Vec2(0, 0);

            this.targetPos = idealGlobal.add(prediction);
            this.targetPos.x += (Math.random() - 0.5) * 2 * scale;
            this.targetPos.y += (Math.random() - 0.5) * 2 * scale;
        }

        if (this.isStepping) {
            this.stepProgress += 0.25;
            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                this.footPos = this.targetPos;
            } else {
                let t = this.stepProgress;
                let liftHeight = (this.index === 2 ? 40 : 20) * scale;
                let lift = Math.sin(t * Math.PI) * liftHeight; // Not used in top-down pos but logic kept

                let currentX = this.startStepPos.x + (this.targetPos.x - this.startStepPos.x) * t;
                let currentY = this.startStepPos.y + (this.targetPos.y - this.startStepPos.y) * t;
                this.footPos = new Vec2(currentX, currentY);
            }
        }
    }

    handleKick(bodyPos, bodyAngle, progress, s) {
        this.isStepping = false;
        let localTarget;

        if (progress < 0.3) {
            let t = progress / 0.3;
            t = 1 - Math.pow(1 - t, 2);
            localTarget = new Vec2(-80 * s, this.side * 40 * s);
        } else if (progress < 0.5) {
            let t = (progress - 0.3) / 0.2;
            t = 1 - Math.pow(1 - t, 3);
            localTarget = new Vec2(-280 * s, this.side * 120 * s);
        } else {
            let t = (progress - 0.5) / 0.5;
            let kickEndPos = new Vec2(-280 * s, this.side * 120 * s);
            let normalStandPos = new Vec2(-140 * s, this.side * 60 * s); // Matches idle
            let lx = kickEndPos.x + (normalStandPos.x - kickEndPos.x) * t;
            let ly = kickEndPos.y + (normalStandPos.y - kickEndPos.y) * t;
            localTarget = new Vec2(lx, ly);
        }
        this.footPos = bodyPos.add(localTarget.rotate(bodyAngle));
    }

    handleBiteGrapple(bodyPos, bodyAngle, progress, s) {
        this.isStepping = false;
        let localTarget;

        if (progress < 0.4) {
            // Prepare / Open
            let prepX = 90 * s;
            let prepY = this.side * 45 * s;
            localTarget = new Vec2(prepX, prepY);
        } else if (progress < 0.6) {
            // Grab
            localTarget = new Vec2(70 * s, this.side * 10 * s);
        } else {
            // Return
            let t = (progress - 0.6) / 0.4;
            let grappleEnd = new Vec2(70 * s, this.side * 10 * s);
            let normalPos = new Vec2(65 * s, this.side * 25 * s);
            let lx = grappleEnd.x + (normalPos.x - grappleEnd.x) * t;
            let ly = grappleEnd.y + (normalPos.y - grappleEnd.y) * t;
            localTarget = new Vec2(lx, ly);
        }

        this.footPos = bodyPos.add(localTarget.rotate(bodyAngle));
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

    // Extract State
    const isAttacking = insect.wetaState === 'attacking';
    const isBiting = insect.wetaState === 'biting';
    const attackProgress = insect.wetaAttackTimer ? (1.0 - insect.wetaAttackTimer / 20) : 0; // Approx
    // Wait, Insect.js will manage timers. WetaParts should just Receive state.
    // We'll read these from insect object, assuming they are added in Insect.js update.
    const biteVal = insect.wetaBiteProgress || 0;
    const lungeOffset = insect.wetaLungeOffset || 0;

    ctx.save();

    // Draw Legs
    // Legs need to be drawn relative to effective body pos if lunging
    // Note: Insect.js updateGiantWeta calls leg.update with effectivePos.
    // The leg.draw needs the same effectivePos or standard bodyPos?
    // User ref: leg.draw(ctx, effectivePos, angle).
    // So we must calculate effectivePos here too.

    let lungeVec = new Vec2(lungeOffset, 0).rotate(insect.angle);
    let effectivePos = insect.pos.add(lungeVec);

    if (insect.wetaLegs) {
        insect.wetaLegs.forEach(leg => leg.draw(ctx, effectivePos, insect.angle, s));
    }

    // Antennae
    if (insect.wetaAntennae) {
        insect.wetaAntennae.forEach(ant => ant.draw(ctx));
    }

    // Body Transformation
    ctx.translate(insect.pos.x, insect.pos.y);
    ctx.rotate(insect.angle);

    // Apply Lunge Translation
    ctx.translate(lungeOffset, 0);

    ctx.scale(s, s);

    drawBodyInternal(ctx, isAttacking, attackProgress, isBiting, biteVal);

    ctx.restore();
}

function drawBodyInternal(ctx, isAttacking, attackProgress, isBiting, biteProgress) {
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
    let squeeze = 0;
    if (isAttacking && attackProgress < 0.3) {
        squeeze = Math.sin(attackProgress / 0.3 * Math.PI) * 3;
    }
    if (isBiting) {
        squeeze = -Math.sin(biteProgress * Math.PI) * 2;
    }

    for (let i = 0; i < 7; i++) {
        let xOff = -15 - (i * 10) + squeeze;
        let width = 26 - (i * 2.5);
        let height = 32 - (i * 3);

        ctx.fillStyle = colorSegment;
        ctx.beginPath();
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

    // --- Mandibles Logic ---
    let mandibleAngle = 0;
    if (isBiting) {
        // 0-0.4: Open
        if (biteProgress < 0.4) {
            let t = biteProgress / 0.4;
            mandibleAngle = -Math.PI * 0.4 * t;
        }
        // 0.4-0.5: Snap
        else if (biteProgress < 0.5) {
            mandibleAngle = Math.PI * 0.2;
        }
        // Recover
        else {
            let t = (biteProgress - 0.5) / 0.5;
            mandibleAngle = Math.PI * 0.2 * (1 - t);
        }
    }

    // Left Mandible
    ctx.save();
    ctx.translate(56, -3);
    ctx.rotate(mandibleAngle);
    ctx.fillStyle = '#1a100e';
    ctx.beginPath();
    ctx.moveTo(0, -3); ctx.lineTo(20, 2); ctx.lineTo(0, 5);
    ctx.fill();
    // Highlight
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.lineTo(16, 2);
    ctx.stroke();
    ctx.restore();

    // Right Mandible
    ctx.save();
    ctx.translate(56, 3);
    ctx.rotate(-mandibleAngle);
    ctx.fillStyle = '#1a100e';
    ctx.beginPath();
    ctx.moveTo(0, 3); ctx.lineTo(20, -2); ctx.lineTo(0, -5);
    ctx.fill();
    // Highlight
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.lineTo(16, -2);
    ctx.stroke();
    ctx.restore();

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

/**
 * Weta Effect (Shockwaves, Dust, debris)
 */
export class WetaEffect {
    constructor(pos, vel, life, size, color, type = 'dust') {
        this.pos = pos;
        this.vel = vel;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.color = color;
        this.type = type;
        this.active = true;
    }

    update() {
        this.pos = this.pos.add(this.vel);
        this.life--;

        if (this.type === 'dust') {
            this.vel = this.vel.mult(0.9);
            this.size *= 0.96;
        } else if (this.type === 'line') {
            this.vel = this.vel.mult(0.95);
            this.size *= 0.8;
        } else if (this.type === 'shockwave') {
            this.size += 2;
        } else if (this.type === 'bite_debris') {
            this.vel = this.vel.mult(0.92);
            this.size *= 0.95;
        } else if (this.type === 'impact_flash') {
            this.size += 5;
            this.life -= 2;
        }

        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);

        if (this.type === 'line') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            let tail = this.pos.sub(this.vel.mult(3));
            ctx.lineTo(tail.x, tail.y);
            ctx.stroke();
        } else if (this.type === 'shockwave') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === 'impact_flash') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
