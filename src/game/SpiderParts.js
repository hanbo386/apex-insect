import { Vec2 } from './Vec2.js';

// Configuration specific to the Daddy Longlegs
export const SPIDER_CONFIG = {
    bodySize: 8,
    abdomenSize: 12,
    legCount: 8,
    legLength: 120, // Base length, will be scaled
    stepDistance: 60,
    stepHeight: 25,
    stepSpeed: 0.15
};

// Math Helpers
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const angleBetween = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

export class SpiderLeg {
    constructor(parent, index, side, scale = 1.0) {
        this.parent = parent; // The Insect instance
        this.index = index;
        this.side = side; // -1 for left, 1 for right
        this.scale = scale;

        this.currentPos = new Vec2(0, 0);
        this.targetPos = new Vec2(0, 0);
        this.idealPos = new Vec2(0, 0);
        this.overrideTarget = null;

        this.isStepping = false;

        this.isStepping = false;
        this.stepProgress = 0;

        // Init position relative to parent immediately to avoid 0,0 jump
        this.init();
    }

    updateScale(s) {
        this.scale = s;
    }

    init() {
        // Initial placement
        const parentAngle = this.parent.angle || 0;
        const parentX = this.parent.pos.x;
        const parentY = this.parent.pos.y;

        // Exact formula from user code init()
        const a = parentAngle + (this.side * (Math.PI / 3 + this.index * 0.2));

        const len = SPIDER_CONFIG.legLength * 0.8 * this.scale;

        this.currentPos.x = parentX + Math.cos(a) * len;
        this.currentPos.y = parentY + Math.sin(a) * len;
        this.targetPos = this.currentPos.clone();
    }

    update() {
        const parentAngle = this.parent.angle;
        const parentX = this.parent.pos.x;
        const parentY = this.parent.pos.y;
        const scale = this.scale;
        const stepGroup = this.parent.stepGroup; // 0 or 1

        // Animation Override
        if (this.overrideTarget) {
            this.targetPos.x = this.overrideTarget.x;
            this.targetPos.y = this.overrideTarget.y;
            // Simple ease towards target
            this.currentPos.x = lerp(this.currentPos.x, this.targetPos.x, 0.1);
            this.currentPos.y = lerp(this.currentPos.y, this.targetPos.y, 0.1);
            return;
        }

        // Calculate Ideal Position
        const spread = 0.8 + (this.index * 0.1);
        const angle = parentAngle + (this.side * (Math.PI / 2.5 + this.index * 0.3));
        const reach = SPIDER_CONFIG.legLength * scale * spread;

        this.idealPos.x = parentX + Math.cos(angle) * reach;
        this.idealPos.y = parentY + Math.sin(angle) * reach;

        // Gait Logic
        // group 0: Left even (0,2), Right odd (1,3)
        // group 1: Left odd (1,3), Right even (0,2)
        const myGroup = (this.index + (this.side === 1 ? 1 : 0)) % 2;
        const canStep = (myGroup === stepGroup);

        const d = dist(this.currentPos.x, this.currentPos.y, this.idealPos.x, this.idealPos.y);
        const stepDist = SPIDER_CONFIG.stepDistance * scale;

        if (d > stepDist && !this.isStepping && canStep) {
            this.isStepping = true;
            this.stepProgress = 0;

            // Predict future position (User algorithm: fixed 30 unit prediction)
            // We scale the 30 by `scale` to handle game growth
            const predDist = 30 * scale;
            const futureX = this.idealPos.x + Math.cos(parentAngle) * predDist;
            const futureY = this.idealPos.y + Math.sin(parentAngle) * predDist;
            this.targetPos.x = futureX;
            this.targetPos.y = futureY;
        }

        if (this.isStepping) {
            this.stepProgress += SPIDER_CONFIG.stepSpeed; // 0.15
            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                // Trigger parent toggle
                if (typeof this.parent.toggleGait === 'function') {
                    this.parent.toggleGait();
                }
            }

            this.currentPos.x = lerp(this.currentPos.x, this.targetPos.x, this.stepProgress);
            this.currentPos.y = lerp(this.currentPos.y, this.targetPos.y, this.stepProgress);
        }
    }

    draw(ctx) {
        const parentAngle = this.parent.angle;
        const parentX = this.parent.pos.x;
        const parentY = this.parent.pos.y;
        const scale = this.scale;

        // Body Attachment Point
        const attachDist = 5 * scale;
        const attachAngle = parentAngle + (this.side * 0.1);
        const bodyAttachX = parentX + Math.cos(attachAngle) * attachDist;
        const bodyAttachY = parentY + Math.sin(attachAngle) * attachDist;

        // IK Draw
        // 3-point IK: Start -> Knee -> End
        const d = dist(bodyAttachX, bodyAttachY, this.currentPos.x, this.currentPos.y);
        const midX = (bodyAttachX + this.currentPos.x) / 2;
        const midY = (bodyAttachY + this.currentPos.y) / 2;
        const ang = angleBetween(bodyAttachX, bodyAttachY, this.currentPos.x, this.currentPos.y);

        const legLength = SPIDER_CONFIG.legLength * scale;
        // Step height scaled
        const stepH = SPIDER_CONFIG.stepHeight * scale;

        // Lift
        const lift = Math.max(0, (legLength - d) * 0.8);
        const stepLift = (this.isStepping ? Math.sin(this.stepProgress * Math.PI) * stepH : 0);

        const kneeX = midX + Math.cos(ang - Math.PI / 2) * (lift + stepLift);
        const kneeY = midY + Math.sin(ang - Math.PI / 2) * (lift + stepLift);

        // Draw Leg
        ctx.beginPath();
        ctx.moveTo(bodyAttachX, bodyAttachY);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(this.currentPos.x, this.currentPos.y);
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 1.2 * scale;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Draw Foot
        ctx.beginPath();
        ctx.arc(this.currentPos.x, this.currentPos.y, 2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(62, 39, 35, 0.5)';
        ctx.fill();
    }
}
