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
        this.followSpeed = 0.1; // For front arms

        this.scale = 1.0;

        this.rootX = 0;
        this.rootY = 0;
        this.renderFootX = 0;
        this.renderFootY = 0;
    }

    updateScale(s) {
        this.scale = s;
        // Adjust threshold by scale
        this.stepThreshold = (this.isFrontArm ? 9999 : 60) * s;
    }

    update(bodyX, bodyY, bodyAngle, velocityMag, attackTarget = null) {
        const s = this.scale;
        const offX = this.offsetX * s;
        const offY = this.offsetY * s;
        const L1 = this.l1 * s;
        const L2 = this.l2 * s;

        const cosA = Math.cos(bodyAngle);
        const sinA = Math.sin(bodyAngle);

        const rootX = bodyX + (offX * cosA - offY * sinA);
        const rootY = bodyY + (offX * sinA + offY * cosA);

        // --- Calculate Ideal Foot Position ---
        let idealOffsetX, idealOffsetY;
        let idealX, idealY;

        if (this.isFrontArm) {
            if (attackTarget) {
                // Attack Mode: Cross Claws
                const crossAmount = 10 * s;

                const attackDx = attackTarget.x - bodyX;
                const attackDy = attackTarget.y - bodyY;
                const attackDist = Math.sqrt(attackDx * attackDx + attackDy * attackDy);

                // Perpendicular vector
                const perpX = -attackDy / (attackDist || 1);
                const perpY = attackDx / (attackDist || 1);

                const offsetSide = -this.side * crossAmount;

                idealX = attackTarget.x + perpX * offsetSide;
                idealY = attackTarget.y + perpY * offsetSide;
            } else {
                // Idle Mode: Hover
                idealOffsetX = offX + (40 * s);
                idealOffsetY = offY + (this.side * 25 * s);
            }
        } else {
            // Walking Legs
            const legLen = L1 + L2;
            if (this.offsetX < -20) { // Check unscaled
                // Back
                idealOffsetX = offX - (20 * s);
                idealOffsetY = offY + (this.side * legLen * 0.7);
            } else {
                // Mid
                idealOffsetX = offX + (15 * s);
                idealOffsetY = offY + (this.side * legLen * 0.6);
            }
        }

        // Calculate ideal world pos if not already set by attackTarget
        if (!this.isFrontArm || !attackTarget) {
            idealX = bodyX + (idealOffsetX * cosA - idealOffsetY * sinA);
            idealY = bodyY + (idealOffsetX * sinA + idealOffsetY * cosA);
        }

        // --- State Update ---
        if (!this.isFrontArm) {
            // Walking Leg Logic
            const lead = velocityMag * 5;
            const distToIdeal = MathUtils.dist(this.footX, this.footY, idealX, idealY);

            if (distToIdeal > this.stepThreshold && this.stepProgress >= 1) {
                this.stepProgress = 0;
                this.stepStartX = this.footX;
                this.stepStartY = this.footY;
                this.targetX = idealX + Math.cos(bodyAngle) * lead;
                this.targetY = idealY + Math.sin(bodyAngle) * lead;
            }

            if (this.stepProgress < 1) {
                this.stepProgress += this.stepSpeed;
                if (this.stepProgress > 1) this.stepProgress = 1;
                this.footX = MathUtils.lerp(this.stepStartX, this.targetX, this.stepProgress);
                this.footY = MathUtils.lerp(this.stepStartY, this.targetY, this.stepProgress);
            }
        } else {
            // Front Arm Logic
            this.targetX = idealX;
            this.targetY = idealY;

            // Dynamic follow speed
            this.footX = MathUtils.lerp(this.footX, this.targetX, this.followSpeed);
            this.footY = MathUtils.lerp(this.footY, this.targetY, this.followSpeed);

            // Idle Sway
            if (!attackTarget) {
                const sway = Math.sin(Date.now() / 800) * 1.5 * s;
                this.footX += Math.cos(bodyAngle + Math.PI / 2) * sway;
                this.footY += Math.sin(bodyAngle + Math.PI / 2) * sway;
            }
        }

        // --- IK Solver ---
        const distRootToFoot = MathUtils.dist(rootX, rootY, this.footX, this.footY);
        const maxReach = (L1 + L2) * 0.999;

        let actualFootX = this.footX;
        let actualFootY = this.footY;

        if (distRootToFoot > maxReach) {
            const angle = Math.atan2(this.footY - rootY, this.footX - rootX);
            actualFootX = rootX + Math.cos(angle) * maxReach;
            actualFootY = rootY + Math.sin(angle) * maxReach;
        }

        const dx = actualFootX - rootX;
        const dy = actualFootY - rootY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);

        let arg = L1 * L1 - a * a;
        if (arg < 0) arg = 0;
        const h = Math.sqrt(arg);

        const x2 = rootX + a * (dx / d);
        const y2 = rootY + a * (dy / d);

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

        ctx.lineWidth = (this.isFrontArm ? 8 : 5) * s;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#5D8A40';

        ctx.beginPath();
        ctx.moveTo(this.rootX, this.rootY);
        ctx.lineTo(this.kneeX, this.kneeY);
        ctx.stroke();

        ctx.lineWidth = (this.isFrontArm ? 6 : 3) * s;
        ctx.strokeStyle = this.isFrontArm ? '#8BC34A' : '#7CAF54';

        ctx.beginPath();
        ctx.moveTo(this.kneeX, this.kneeY);
        ctx.lineTo(this.renderFootX, this.renderFootY);
        ctx.stroke();

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
