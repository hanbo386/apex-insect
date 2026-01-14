import { Vec2 } from './Vec2.js';

/**
 * 腿部类 - 处理反向动力学(IK)和步态逻辑
 */
export class Leg {
    constructor(id, side, offsetX, offsetY, scale) {
        this.id = id;
        this.side = side; // -1 左, 1 右

        this.side = side; // -1 左, 1 右

        this.baseOffsetX = offsetX;
        this.baseOffsetY = offsetY;
        this.offset = new Vec2(offsetX, offsetY);

        this.currentPos = new Vec2(0, 0);
        this.targetPos = new Vec2(0, 0);
        this.isMoving = false;
        this.moveProgress = 0;
        this.liftHeight = 0;

        this.updateScale(scale);
    }

    updateScale(scale) {
        this.scale = scale;

        // --- 修正理想落脚点 (Ideal Foot Position) ---
        // 腿进一步缩短 (原值 * 0.66)
        let splayX = 0; // 前后张开程度
        let spanY = 11 * scale; // 左右张开宽度 (16.5 -> 11)

        if (this.id === 0 || this.id === 3) { // 前腿
            splayX = 6 * scale; // 9 -> 6
            spanY = 8 * scale;  // 12 -> 8
        }
        if (this.id === 2 || this.id === 5) { // 后腿
            splayX = -6 * scale; // -9 -> -6
            spanY = 9 * scale;   // 13.5 -> 9
        }

        this.idealOffset = new Vec2(this.baseOffsetX + splayX, this.baseOffsetY + (this.side * spanY));

        // IK 骨骼长度 (再缩短 1/3)
        this.femurLen = 7 * scale;     // 大腿 (10.5 -> 7)
        this.tibiaLen = 9.5 * scale;   // 小腿 (14.25 -> 9.5)

        // 步态参数
        this.stepThreshold = 11 * scale; // 步幅阈值 (16.5 -> 11)
        this.stepSpeed = 0.5; // 腿短了，迈步速度稍快一点点看起来更灵活
    }

    /**
     * 更新腿部逻辑
     */
    update(bodyPos, angle, velocity, canMove) {
        let hipWorldPos = this.offset.rotate(angle).add(bodyPos);

        // 预测量 (腿短，预测距离减少)
        let prediction = velocity.mult(3.5);
        let idealWorldPos = this.idealOffset.rotate(angle).add(bodyPos).add(prediction);

        let dist = this.currentPos.dist(idealWorldPos);

        let forcedMove = dist > (this.stepThreshold * 1.8);

        if (!this.isMoving && (canMove || forcedMove)) {
            if (dist > this.stepThreshold || forcedMove) {
                this.isMoving = true;
                this.moveProgress = 0;
                let variance = new Vec2((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
                this.targetPos = idealWorldPos.add(variance);
            }
        }

        if (this.isMoving) {
            this.moveProgress += this.stepSpeed;
            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.isMoving = false;
            }

            let t = this.moveProgress;
            let vDiff = this.targetPos.sub(this.currentPos);
            this.currentPos = this.currentPos.add(vDiff.mult(0.6)); // 响应更快

            // 抬脚高度
            this.liftHeight = Math.sin(t * Math.PI) * (4 * this.scale);

            if (this.currentPos.dist(this.targetPos) < 1) {
                this.currentPos = this.targetPos;
                this.isMoving = false;
            }
        } else {
            this.liftHeight = 0;
        }

        return hipWorldPos;
    }

    /**
     * 绘制腿部 (IK Solver)
     */
    draw(ctx, hipPos) {
        let footPos = this.currentPos;
        let HtoF = footPos.sub(hipPos);
        let dist = HtoF.mag();

        let totalLen = this.femurLen + this.tibiaLen;
        if (dist >= totalLen - 0.1) {
            HtoF = HtoF.normalize().mult(totalLen - 0.1);
            dist = totalLen - 0.1;
        }

        let a = this.femurLen;
        let b = this.tibiaLen;
        let c = dist;

        let angleHipToFoot = Math.atan2(HtoF.y, HtoF.x);

        let cosAngleKnee = (a * a + b * b - c * c) / (2 * a * b);
        cosAngleKnee = Math.max(-1, Math.min(1, cosAngleKnee));
        let angleKneeInternal = Math.acos(cosAngleKnee);

        let cosAngleFemur = (a * a + c * c - b * b) / (2 * a * c);
        cosAngleFemur = Math.max(-1, Math.min(1, cosAngleFemur));
        let angleFemurOffset = Math.acos(cosAngleFemur);

        let kneeDir = this.side;
        let angleFemur = angleHipToFoot + angleFemurOffset * kneeDir;

        let kneePos = new Vec2(
            hipPos.x + Math.cos(angleFemur) * this.femurLen,
            hipPos.y + Math.sin(angleFemur) * this.femurLen
        );

        let liftFactor = 1 + (this.liftHeight / 8);

        ctx.strokeStyle = '#2a1a0a';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 腿变细一点
        ctx.lineWidth = 1.6 * this.scale * liftFactor;
        ctx.beginPath();
        ctx.moveTo(hipPos.x, hipPos.y);
        ctx.lineTo(kneePos.x, kneePos.y);
        ctx.stroke();

        ctx.lineWidth = 1.1 * this.scale * liftFactor;
        ctx.strokeStyle = '#3d2612';
        ctx.beginPath();
        ctx.moveTo(kneePos.x, kneePos.y);
        ctx.lineTo(footPos.x, footPos.y);
        ctx.stroke();
    }
}
