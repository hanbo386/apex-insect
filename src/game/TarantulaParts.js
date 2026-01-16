
import { Vec2 } from './Vec2.js';

const SETTINGS = {
    spiderBlack: '#16100b',
    spiderBrown: '#3a2a1a',
    spiderFuzz: '#4a3a2a',
    spiderSpike: '#2a1a10'
};

export class TarantulaLeg {
    constructor(side, index, scale = 1.0) {
        this.side = side;
        this.index = index;
        this.scale = scale;

        this.baseShoulderOffset = new Vec2(12 - index * 8, 8 * side);
        this.worldShoulder = new Vec2(0, 0);

        this.footPos = new Vec2(0, 0);
        this.targetFootPos = new Vec2(0, 0);
        this.startFootPos = new Vec2(0, 0);
        this.isStepping = false;
        this.stepProgress = 1;

        this.group = (index + (side > 0 ? 0 : 1)) % 2;

        this.initialized = false;

        this.fuzz = [];
        for (let s = 0; s < 2; s++) {
            let segFuzz = [];
            let hairCount = (s === 0 ? 15 : 20);
            for (let j = 0; j < hairCount; j++) {
                segFuzz.push({
                    t: Math.random(),
                    len: 2 + Math.random() * 6,
                    isLong: Math.random() > 0.85,
                    side: Math.random() > 0.5 ? 1 : -1,
                    ang: (Math.random() - 0.5) * 0.8
                });
            }
            this.fuzz.push(segFuzz);
        }
    }

    updateScale(s) {
        this.scale = s;
    }

    update(bodyPos, bodyAngle, velocity, stepGroup) {
        const s = this.scale;

        // Calculate World Shoulder
        let offset = this.baseShoulderOffset.mult(s).rotate(bodyAngle);
        this.worldShoulder = bodyPos.add(offset);

        if (!this.initialized) {
            let spreadAngle = bodyAngle + (this.side * (Math.PI / 2 - (this.index - 1.5) * 0.65));
            let reach = (85 + (this.index === 0 || this.index === 3 ? 15 : 0)) * s;
            this.footPos = this.worldShoulder.add(new Vec2(Math.cos(spreadAngle), Math.sin(spreadAngle)).mult(reach));
            this.initialized = true;
        }

        let speed = velocity.mag();
        let moving = speed > 0.1;

        let spreadAngle = bodyAngle + (this.side * (Math.PI / 2 - (this.index - 1.5) * 0.65));
        let reach = (85 + (this.index === 0 || this.index === 3 ? 15 : 0)) * s;

        let leadAmount = moving ? speed * 6 : 0; // Snippet constant 6?
        // Note: speed in snippet is likely pixels/frame. Here velocity.mag() is also pixels/frame.
        // But our scale is distinct. 6 might need scaling?
        // Let's assume 6 * s? Or just 6 if speed is already generic?
        // Assuming velocity is pixels, then 6 is a time factor (frame lookahead).
        // So `speed * 6` is a distance. We should not strictly scale '6' but the distance is natural.

        let lead = new Vec2(Math.cos(bodyAngle), Math.sin(bodyAngle)).mult(leadAmount);
        let idealPos = this.worldShoulder.add(new Vec2(Math.cos(spreadAngle), Math.sin(spreadAngle)).mult(reach)).add(lead);

        let dist = this.footPos.dist(idealPos);
        let stepThreshold = (moving ? 24 : 45) * s;

        if (dist > stepThreshold && !this.isStepping && stepGroup === this.group) {
            this.isStepping = true;
            this.stepProgress = 0;
            this.startFootPos = this.footPos.clone();
            this.targetFootPos = idealPos;
        }

        if (this.isStepping) {
            this.stepProgress += 0.1 + (speed * 0.05); // Tuning
            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                this.footPos = this.targetFootPos.clone();
            } else {
                let t = this.stepProgress;
                let x = this.startFootPos.x + (this.targetFootPos.x - this.startFootPos.x) * t;
                let y = this.startFootPos.y + (this.targetFootPos.y - this.startFootPos.y) * t;
                this.footPos = new Vec2(x, y);
            }
        }
    }

    draw(ctx, isShadow = false) {
        const s = this.scale;

        let shoulder = this.worldShoulder;
        let foot = this.footPos;

        let lift = this.isStepping ? Math.sin(this.stepProgress * Math.PI) * (28 * s) : 0;

        // IK Elbow
        let v = foot.sub(shoulder);
        let len = v.mag();
        let angleToFoot = Math.atan2(v.y, v.x);

        // Simple elbow logic from snippet: 0.45 distance
        let elbowDist = len * 0.45;
        let elbowX = shoulder.x + Math.cos(angleToFoot) * elbowDist;
        let elbowY = shoulder.y + Math.sin(angleToFoot) * elbowDist - lift - (18 * s);

        let elbow = new Vec2(elbowX, elbowY);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = (isShadow ? 10 : 7) * s;
        ctx.strokeStyle = isShadow ? 'rgba(0,0,0,0.15)' : SETTINGS.spiderBlack;

        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(foot.x, foot.y);
        ctx.stroke();

        if (!isShadow) {
            this.drawSegmentFuzz(ctx, shoulder, elbow, 0);
            this.drawSegmentFuzz(ctx, elbow, foot, 1);
            this.drawJointTuft(ctx, elbowX, elbowY, angleToFoot);
        }
    }

    drawSegmentFuzz(ctx, p1, p2, fuzzIdx) {
        const s = this.scale;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x); // Vec2 angle

        this.fuzz[fuzzIdx].forEach(f => {
            ctx.strokeStyle = f.isLong ? SETTINGS.spiderSpike : SETTINGS.spiderFuzz;
            ctx.lineWidth = (f.isLong ? 0.8 : 0.5) * s;

            // Lerp
            let mx = p1.x + (p2.x - p1.x) * f.t;
            let my = p1.y + (p2.y - p1.y) * f.t;

            let fLen = (f.isLong ? f.len * 1.8 : f.len) * s;
            let fAngle = angle + (Math.PI / 2 * f.side) + f.ang;

            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(mx + Math.cos(fAngle) * fLen, my + Math.sin(fAngle) * fLen);
            ctx.stroke();
        });
    }

    drawJointTuft(ctx, x, y, angle) {
        const s = this.scale;
        ctx.strokeStyle = SETTINGS.spiderSpike;
        ctx.lineWidth = 0.7 * s;
        for (let i = 0; i < 6; i++) {
            const a = angle - Math.PI / 2 + (i / 5) * Math.PI;
            const l = (6 + Math.random() * 6) * s;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
            ctx.stroke();
        }
    }
}
