
import { Vec2 } from './Vec2.js';

// Game Settings for Cricket Leg Logic
const SETTINGS = {
    legSpeed: 0.25 // Step speed
};

export class CricketLeg {
    constructor(offsetX, offsetY, length1, length2, side, isRearLeg = false) {
        this.offsetX = offsetX; // Relative to body center
        this.offsetY = offsetY;
        this.length1 = length1; // Thigh
        this.length2 = length2; // Shin
        this.side = side;       // 1 for right, -1 for left
        this.isRearLeg = isRearLeg;

        // Target position (Ideal foot placement)
        this.target = new Vec2(0, 0);
        // Current position (Actual foot on ground)
        this.current = new Vec2(0, 0);
        // Next step target
        this.nextStep = new Vec2(0, 0);

        this.isMoving = false;
        this.moveProgress = 0;

        // Knee bending direction
        this.bend = this.isRearLeg ? -1 : 1;

        // Scale support
        this.scale = 1.0;
    }

    updateScale(s) {
        this.scale = s;
    }

    // Logic: Determine where the foot should be and animate towards it
    update(bodyPos, bodyAngle, velocity, stepThreshold = 40) {
        const s = this.scale;

        // Adjust threshold by scale
        let scaledThreshold = stepThreshold * s;

        // Calculate Shoulder World Position
        // Offset is rotated by body angle
        let shoulderOffset = new Vec2(this.offsetX * s, this.offsetY * s).rotate(bodyAngle);
        let shoulderPos = bodyPos.add(shoulderOffset);

        // Calculate Ideal Rest Position relative to body
        // Rest distances scaled
        let restDistX = (this.isRearLeg ? -20 : (this.offsetX > 0 ? 40 : 20)) * s;
        let restDistY = this.side * (this.isRearLeg ? 30 : 45) * s;

        // Velocity Anticipation (Predict where body will be)
        // Only anticipate if moving significantly
        let prediction = velocity.mult(8);

        let idealOffset = new Vec2(restDistX, restDistY).rotate(bodyAngle);
        let idealPos = shoulderPos.add(idealOffset).add(prediction);

        // Initialization check (if current is 0,0)
        if (this.current.mag() === 0) {
            this.current = idealPos.clone();
        }

        // Trigger Step Logic
        if (!this.isMoving && this.current.dist(idealPos) > scaledThreshold) {
            this.isMoving = true;
            this.moveProgress = 0;
            this.nextStep = idealPos.clone();
            // Add randomness for natural look
            this.nextStep = this.nextStep.add(new Vec2((Math.random() - 0.5) * 5 * s, (Math.random() - 0.5) * 5 * s));
        }

        // Animate Step
        if (this.isMoving) {
            this.moveProgress += SETTINGS.legSpeed; // Can be scaled or fixed
            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.isMoving = false;
                this.current = this.nextStep.clone();
            } else {
                // Linear Lerp
                let start = this.current;
                let end = this.nextStep;

                let lx = start.x + (end.x - start.x) * this.moveProgress;
                let ly = start.y + (end.y - start.y) * this.moveProgress;

                this.current = new Vec2(lx, ly);
            }
        }

        // Calculated lifting height (for drawing)
        let lift = 0;
        if (this.isMoving) {
            lift = Math.sin(this.moveProgress * Math.PI) * (this.isRearLeg ? 20 : 10) * s;
        }

        // Store for drawing
        this.shoulderPos = shoulderPos;
        this.lift = lift;
    }

    draw(ctx) {
        // IK Solver and Drawing
        const s = this.scale;

        let shoulder = this.shoulderPos;
        let foot = this.current; // This is the contact point without lift? 
        // No, visual foot position should include lift?
        // Usually 2D top down, lift is simulated by converting Y or creating shadow.
        // The snippet draws shadow from 'foot' and then draws leg to 'foot' ?
        // Snippet:
        // ctx.moveTo(shoulder...); ctx.lineTo(knee...); ctx.lineTo(foot...); -> SHADOW
        // Then draws leg parts.
        // It doesn't seem to apply 'lift' to the xy coordinates directly in the snippet's draw function 
        // EXCEPT usually top-down games shift the 'visual' leg up by Y-axis or scale.
        // IN THE SNIPPET: `draw(ctx, shoulder, foot, lift)` is called.
        // But inside `draw`, `lift` is NOT USED in the snippet provide! 
        // Wait, looking closely at snippet:
        // `draw(ctx, shoulder, foot, lift) { ...`
        // `lift` is argument but never referenced in standard leg drawing?
        // Ah, maybe it was intended for fake 3D but not implemented in the simple version.
        // Whatever, I will stick to 2D IK for now as per snippet.

        if (!shoulder) return; // Not updated yet

        // Layout Parameters
        let l1 = this.length1 * s;
        let l2 = this.length2 * s;

        // IK Solve
        let dx = foot.x - shoulder.x;
        let dy = foot.y - shoulder.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Limit reach
        let reach = l1 + l2;
        if (dist > reach - 0.1) {
            dist = reach - 0.1; // Minus epsilon to prevent acos domain error
            let angle = Math.atan2(dy, dx);
            foot = new Vec2(
                shoulder.x + Math.cos(angle) * dist,
                shoulder.y + Math.sin(angle) * dist
            );
        }

        // Cosine Law
        // c^2 = a^2 + b^2 - 2ab cos(C)
        // angleA = acos( (b^2 + c^2 - a^2) / (2bc) ) ? No.
        // We want angle at Shoulder. 
        // Triangle sides: a=l1, b=dist(shoulder to foot), c=l2 ? No.
        // Triangle sides: A=l1, B=l2, C=dist.
        // Angle at Shoulder (between C and A): alpha
        // B^2 = A^2 + C^2 - 2AC cos(alpha)
        // cos(alpha) = (A^2 + C^2 - B^2) / (2AC)

        let a = l1;
        let b = l2;
        let c = dist;

        let angleAC = Math.atan2(dy, dx);
        let angleA_cos = (a * a + c * c - b * b) / (2 * a * c);

        // Clamp
        if (angleA_cos < -1) angleA_cos = -1;
        if (angleA_cos > 1) angleA_cos = 1;

        let angleA = Math.acos(angleA_cos);

        // Knee Direction
        let kneeAngle = angleAC + angleA * this.side * this.bend;

        let kneeX = shoulder.x + Math.cos(kneeAngle) * l1;
        let kneeY = shoulder.y + Math.sin(kneeAngle) * l1;

        // --- Drawing ---

        // Shadow
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.lineWidth = 4 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(shoulder.x + 5 * s, shoulder.y + 5 * s);
        ctx.lineTo(kneeX + 5 * s, kneeY + 5 * s);
        ctx.lineTo(foot.x, foot.y); // Foot doesn't move with shadow? Reference snippet: `lineTo(foot.x, foot.y)`
        ctx.stroke();

        // 1. Femur (Upper Leg)
        if (this.isRearLeg) {
            // Muscular Rear Leg
            let thighDx = kneeX - shoulder.x;
            let thighDy = kneeY - shoulder.y;
            let thighLen = Math.sqrt(thighDx * thighDx + thighDy * thighDy);
            let thighAngle = Math.atan2(thighDy, thighDx);

            ctx.save();
            ctx.translate(shoulder.x, shoulder.y);
            ctx.rotate(thighAngle);

            // Draw Ellipse for muscle
            ctx.fillStyle = "#3e2723";
            ctx.beginPath();
            ctx.ellipse(thighLen / 2, 0, thighLen / 2, 12 * s, 0, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.strokeStyle = "rgba(255,255,255,0.15)";
            ctx.lineWidth = 2 * s;
            ctx.beginPath();
            ctx.moveTo(thighLen * 0.2, -5 * s);
            ctx.lineTo(thighLen * 0.7, -5 * s);
            ctx.stroke();

            ctx.restore();
        } else {
            // Standard Leg
            ctx.strokeStyle = "#4e342e";
            ctx.lineWidth = 4 * s;
            ctx.beginPath();
            ctx.moveTo(shoulder.x, shoulder.y);
            ctx.lineTo(kneeX, kneeY);
            ctx.stroke();

            // Highlight
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.lineWidth = 1 * s;
            ctx.beginPath();
            ctx.moveTo(shoulder.x, shoulder.y);
            let hx = kneeX - (kneeX - shoulder.x) * 0.3;
            let hy = kneeY - (kneeY - shoulder.y) * 0.3;
            ctx.lineTo(hx, hy);
            ctx.stroke();
        }

        // 2. Tibia (Lower Leg)
        ctx.strokeStyle = "#5d4037";
        ctx.lineWidth = (this.isRearLeg ? 4 : 2) * s;
        ctx.beginPath();
        ctx.moveTo(kneeX, kneeY);
        ctx.lineTo(foot.x, foot.y);
        ctx.stroke();

        // 3. Joint (Knee)
        ctx.fillStyle = "#271c19";
        ctx.beginPath();
        ctx.arc(kneeX, kneeY, (this.isRearLeg ? 4 : 2) * s, 0, Math.PI * 2);
        ctx.fill();
    }
}
