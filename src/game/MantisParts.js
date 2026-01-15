
const MathUtils = {
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (x1, y1, x2, y2) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2),
    angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    clamp: (val, min, max) => Math.min(Math.max(val, min), max),
    normalizeAngle: (a) => {
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
    }
};

export class MantisLeg {
    constructor(side, offsetX, offsetY, length1, length2, isFrontArm = false) {
        this.side = side; // 1 for right, -1 for left
        this.offsetX = offsetX; // Body relative position
        this.offsetY = offsetY;
        this.l1 = length1; // Thigh
        this.l2 = length2; // Shin
        this.isFrontArm = isFrontArm; // Is scythe

        // Current foot position (World)
        this.footX = 0;
        this.footY = 0;

        // Target position
        this.targetX = 0;
        this.targetY = 0;

        // Joint position
        this.kneeX = 0;
        this.kneeY = 0;

        // Gait variables
        this.stepProgress = 1; // 0 = start, 1 = landed
        this.stepStartX = 0;
        this.stepStartY = 0;

        this.stepThreshold = isFrontArm ? 9999 : 60; // Distance to trigger step
        this.stepSpeed = 0.15;

        this.scale = 1.0;
    }

    updateScale(s) {
        this.scale = s;
        // Adjust threshold by scale? User code used hardcoded 60. 
        // We should scale inputs in update/draw, or scale properties here.
        // Let's scale threshold.
        this.stepThreshold = (this.isFrontArm ? 9999 : 60) * s;
    }

    update(bodyX, bodyY, bodyAngle, velocityMag) {
        // Apply Scaling to offsets and lengths for calculation
        const s = this.scale;
        const offX = this.offsetX * s;
        const offY = this.offsetY * s;
        const L1 = this.l1 * s;
        const L2 = this.l2 * s;

        // Calculate root (Shoulder/Hip)
        const cosA = Math.cos(bodyAngle);
        const sinA = Math.sin(bodyAngle);

        const rootX = bodyX + (offX * cosA - offY * sinA);
        const rootY = bodyY + (offX * sinA + offY * cosA);

        // Ideal Foot Position
        // Predict forward based on speed
        const lead = velocityMag * 5;

        let idealOffsetX, idealOffsetY;

        if (this.isFrontArm) {
            // Scythe: Hover in front
            idealOffsetX = offX + (40 * s);
            idealOffsetY = offY + (this.side * 25 * s);
        } else {
            // Walking legs
            const legLen = L1 + L2;

            if (this.offsetX < -20) { // Check original unscaled offset for logic
                // Back legs
                idealOffsetX = offX - (20 * s);
                idealOffsetY = offY + (this.side * legLen * 0.7);
            } else {
                // Mid legs
                idealOffsetX = offX + (15 * s);
                idealOffsetY = offY + (this.side * legLen * 0.6);
            }
        }

        const idealX = bodyX + (idealOffsetX * cosA - idealOffsetY * sinA);
        const idealY = bodyY + (idealOffsetX * sinA + idealOffsetY * cosA);

        // Gait Logic
        if (!this.isFrontArm) {
            const distToIdeal = MathUtils.dist(this.footX, this.footY, idealX, idealY);

            // Trigger step
            if (distToIdeal > this.stepThreshold && this.stepProgress >= 1) {
                this.stepProgress = 0;
                this.stepStartX = this.footX;
                this.stepStartY = this.footY;
                this.targetX = idealX + Math.cos(bodyAngle) * lead;
                this.targetY = idealY + Math.sin(bodyAngle) * lead;
            }
        } else {
            // Scythe follows smoothly with lag
            this.targetX = idealX;
            this.targetY = idealY;
            this.footX = MathUtils.lerp(this.footX, this.targetX, 0.1);
            this.footY = MathUtils.lerp(this.footY, this.targetY, 0.1);

            // Idle sway
            const sway = Math.sin(Date.now() / 400) * 5 * s;
            this.footX += Math.cos(bodyAngle + Math.PI / 2) * sway;
            this.footY += Math.sin(bodyAngle + Math.PI / 2) * sway;
        }

        // Step Animation
        if (this.stepProgress < 1) {
            this.stepProgress += this.stepSpeed;
            if (this.stepProgress > 1) this.stepProgress = 1;

            this.footX = MathUtils.lerp(this.stepStartX, this.targetX, this.stepProgress);
            this.footY = MathUtils.lerp(this.stepStartY, this.targetY, this.stepProgress);
        }

        // --- IK Solver ---
        const distRootToFoot = MathUtils.dist(rootX, rootY, this.footX, this.footY);
        const maxReach = (L1 + L2) * 0.99;

        let actualFootX = this.footX;
        let actualFootY = this.footY;

        if (distRootToFoot > maxReach) {
            const angle = Math.atan2(this.footY - rootY, this.footX - rootX);
            actualFootX = rootX + Math.cos(angle) * maxReach;
            actualFootY = rootY + Math.sin(angle) * maxReach;
        }

        // Calculate Knee
        const dx = actualFootX - rootX;
        const dy = actualFootY - rootY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));

        const x2 = rootX + a * (dx / d);
        const y2 = rootY + a * (dy / d);

        // Knee Direction
        // Right legs (side 1) -> Knee out. Left legs (side -1) -> Knee out. 
        // User code: kneeDir = isFront ? -side : side.
        const kneeDir = this.isFrontArm ? -this.side : this.side;

        this.kneeX = x2 + h * (dy / d) * kneeDir;
        this.kneeY = y2 - h * (dx / d) * kneeDir;

        this.rootX = rootX;
        this.rootY = rootY;
        this.renderFootX = actualFootX;
        this.renderFootY = actualFootY;
    }

    draw(ctx) {
        const s = this.scale;

        // Thigh
        ctx.lineWidth = (this.isFrontArm ? 8 : 5) * s;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#5D8A40'; // Dark Green

        ctx.beginPath();
        ctx.moveTo(this.rootX, this.rootY);
        ctx.lineTo(this.kneeX, this.kneeY);
        ctx.stroke();

        // Shin
        ctx.lineWidth = (this.isFrontArm ? 6 : 3) * s;
        ctx.strokeStyle = this.isFrontArm ? '#8BC34A' : '#7CAF54';

        ctx.beginPath();
        ctx.moveTo(this.kneeX, this.kneeY);
        ctx.lineTo(this.renderFootX, this.renderFootY);
        ctx.stroke();

        // Scythe Hook
        if (this.isFrontArm) {
            ctx.beginPath();
            ctx.moveTo(this.renderFootX, this.renderFootY);
            const hookLen = 15 * s;
            const angle = Math.atan2(this.renderFootY - this.kneeY, this.renderFootX - this.kneeX);
            ctx.lineTo(
                this.renderFootX + Math.cos(angle + Math.PI * 0.8 * this.side) * hookLen,
                this.renderFootY + Math.sin(angle + Math.PI * 0.8 * this.side) * hookLen
            );
            ctx.lineWidth = 2 * s;
            ctx.strokeStyle = '#4e6e34';
            ctx.stroke();
        }
    }
}
