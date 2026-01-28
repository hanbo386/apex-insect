
import { Vec2 } from './Vec2.js';

const SETTINGS = {
    legSpeed: 0.14 // Matches 'stepProgress += 0.14' in reference
};

export class StickInsectLeg {
    constructor(side, offsetIndex, lengthCombined, scale = 1.0) {
        this.side = side;
        this.offsetIndex = offsetIndex;
        this.baseLengthCombined = lengthCombined;

        // --- Segment Binding Logic ---
        // 0: Front leg -> Head (Segment 0)
        // 1: Mid leg -> Thorax mid (Segment 3)
        // 2: Back leg -> Thorax/Abdomen junction (Segment 6)
        // Segments indices based on 12-segment body in reference
        if (offsetIndex === 0) this.segmentIdx = 0;
        else if (offsetIndex === 1) this.segmentIdx = 3;
        else if (offsetIndex === 2) this.segmentIdx = 6; // Reference said 5 for index 2? "后腿挂在第6节" -> Index 5? 
        // Reference code: `else if (offsetIndex === 2) this.segmentIdx = 5;` 
        // Let's stick to 5 to match reference behavior exactly.
        if (offsetIndex === 2) this.segmentIdx = 5;


        // Local Mount Offset (Width)
        // Reference: `new Vec2(0, side * 3)`
        this.baseLocalMountOffset = new Vec2(0, side * 3);

        // Lengths
        // Reference: femur 0.45, tibia 0.55
        this.femurRatio = 0.45;
        this.tibiaRatio = 0.55;

        // Attack State
        this.isAttacking = false;
        this.attackProgress = 0;
        this.attackPath = [];

        // Pos State
        this.footPos = new Vec2(0, 0);
        this.targetPos = new Vec2(0, 0);
        this.nextStepPos = new Vec2(0, 0);
        this.isStepping = false;
        this.stepProgress = 0;

        this.scale = scale;
        this.initialized = false;
    }

    updateScale(s) {
        this.scale = s;
    }

    // Helper: Get segment properties from the main StickInsect body
    getSegmentPosAndAngle(stickInsect) {
        if (!stickInsect.stickSegments || stickInsect.stickSegments.length <= this.segmentIdx) {
            return { pos: stickInsect.pos, angle: stickInsect.angle };
        }

        let segPos = stickInsect.stickSegments[this.segmentIdx];
        let nextIdx = this.segmentIdx + 1;
        let nextPos = stickInsect.stickSegments[nextIdx];
        let angle = stickInsect.angle;

        if (nextPos) {
            angle = Math.atan2(nextPos.y - segPos.y, nextPos.x - segPos.x) + Math.PI;
        } else {
            let prevPos = stickInsect.stickSegments[this.segmentIdx - 1];
            if (prevPos) {
                angle = Math.atan2(segPos.y - prevPos.y, segPos.x - prevPos.x) + Math.PI;
            }
        }
        return { pos: segPos, angle: angle };
    }

    getMountWorldPos(stickInsect) {
        let { pos, angle } = this.getSegmentPosAndAngle(stickInsect);
        let scaledOffset = this.baseLocalMountOffset.mult(this.scale);
        let worldOffset = scaledOffset.rotate(angle);
        return pos.add(worldOffset);
    }

    calculateIdealPos(stickInsect) {
        let mountWorld = this.getMountWorldPos(stickInsect);
        let { angle } = this.getSegmentPosAndAngle(stickInsect);

        let totalLen = this.baseLengthCombined * this.scale;
        let spread = totalLen * 0.7;

        let forwardOffset = 0;
        if (this.offsetIndex === 0) forwardOffset = totalLen * 0.6;
        else if (this.offsetIndex === 1) forwardOffset = -10 * this.scale;
        else if (this.offsetIndex === 2) forwardOffset = -totalLen * 0.5;

        let idealLocal = new Vec2(forwardOffset, this.side * spread);
        let idealWorldOffset = idealLocal.rotate(angle);

        return mountWorld.add(idealWorldOffset);
    }

    update(stickInsect) {
        const s = this.scale;
        let totalLen = this.baseLengthCombined * s;

        if (this.isAttacking) {
            let inc = 0.01;
            if (this.attackProgress > 0.4 && this.attackProgress < 0.5) inc = 0.09; // Burst
            if (this.attackProgress > 0.5 && this.attackProgress < 0.6) inc = 0.005; // Hit Pause
            if (this.attackProgress >= 0.6) inc = 0.025;

            this.attackProgress += inc;

            if (this.attackProgress >= 1) {
                this.isAttacking = false;
                this.attackProgress = 0;
                this.attackPath = [];
            } else {
                let t = this.attackProgress;
                let mount = this.getMountWorldPos(stickInsect);
                // Attack Direction is Insect Head Angle usually
                let attackAngle = stickInsect.angle;

                let thrust = 0;
                let spread = this.side * 25 * s;

                if (t < 0.4) {
                    // Windup
                    let mt = t / 0.4;
                    thrust = -40 * s * mt;
                    spread = this.side * (25 * s + 20 * s * mt);
                } else if (t < 0.5) {
                    // Thrust
                    let mt = (t - 0.4) / 0.1;
                    let maxThrust = totalLen * 1.5;
                    thrust = -40 * s + (maxThrust + 40 * s) * mt;
                    spread = this.side * 45 * s * (1 - mt);
                    this.attackPath.push(this.footPos.clone());
                    if (this.attackPath.length > 6) this.attackPath.shift();
                } else if (t < 0.6) {
                    // Pause
                    thrust = totalLen * 1.5;
                    spread = 0;
                } else {
                    // Return
                    let mt = (t - 0.6) / 0.4;
                    let endPos = this.calculateIdealPos(stickInsect);
                    let strikePos = mount.add(new Vec2(totalLen * 1.5, 0).rotate(attackAngle));
                    this.footPos = new Vec2(
                        strikePos.x + (endPos.x - strikePos.x) * mt,
                        strikePos.y + (endPos.y - strikePos.y) * mt
                    );
                    return;
                }

                let localStrike = new Vec2(thrust, spread);
                this.footPos = mount.add(localStrike.rotate(attackAngle));
                return;
            }
        }

        if (!this.initialized) {
            this.footPos = this.calculateIdealPos(stickInsect);
            this.initialized = true;
        }

        let idealPos = this.calculateIdealPos(stickInsect);
        let dist = this.footPos.dist(idealPos);
        let stepThreshold = totalLen * 0.45;

        // Step Trigger Logic
        let speed = stickInsect.vel ? stickInsect.vel.mag() : 0; // Safe check

        if (!this.isStepping && dist > stepThreshold && speed > 0.1) {
            let myGroupID = ((this.side === -1 ? 0 : 1) + this.offsetIndex) % 2;
            let canStep = true;

            if (stickInsect.stickLegs) {
                stickInsect.stickLegs.forEach(l => {
                    if (l !== this && l.isStepping) {
                        let otherGroupID = ((l.side === -1 ? 0 : 1) + l.offsetIndex) % 2;
                        if (otherGroupID === myGroupID) {
                            canStep = false;
                        }
                    }
                });
            }

            if (canStep || Math.random() > 0.8) {
                this.startStep(idealPos, stickInsect);
            }
        }

        if (this.isStepping) {
            this.stepProgress += SETTINGS.legSpeed;
            if (this.stepProgress >= 1) {
                this.stepProgress = 1;
                this.isStepping = false;
                this.footPos = this.nextStepPos;
            } else {
                let t = this.stepProgress;
                let smoothT = t * t * (3 - 2 * t);
                this.footPos = new Vec2(
                    this.targetPos.x + (this.nextStepPos.x - this.targetPos.x) * smoothT,
                    this.targetPos.y + (this.nextStepPos.y - this.targetPos.y) * smoothT
                );
            }
        }
    }

    startStep(target, stickInsect) {
        this.isStepping = true;
        this.stepProgress = 0;
        this.targetPos = this.footPos.clone();
        let moveDir = new Vec2(Math.cos(stickInsect.angle), Math.sin(stickInsect.angle));
        this.nextStepPos = target.add(moveDir.mult(25 * this.scale));
    }

    draw(ctx, stickInsect) {
        const s = this.scale;

        let mount = this.getMountWorldPos(stickInsect);
        let foot = this.footPos;

        // Attack Ghost Trail
        if (this.isAttacking && this.attackPath.length > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
            ctx.lineWidth = 4 * s;
            ctx.lineCap = 'round';
            this.attackPath.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
            ctx.restore();
        }

        let v_base_to_foot = foot.sub(mount);
        let dist = v_base_to_foot.mag();

        let femurLen = this.baseLengthCombined * this.femurRatio * s;
        let tibiaLen = this.baseLengthCombined * this.tibiaRatio * s;

        let maxReach = (femurLen + tibiaLen) * 0.98;
        if (dist > maxReach) {
            v_base_to_foot = v_base_to_foot.normalize().mult(maxReach);
            dist = maxReach;
        }

        let cosAlpha = (femurLen ** 2 + dist ** 2 - tibiaLen ** 2) / (2 * femurLen * dist);
        let alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha))) || 0;

        let baseAngle = Math.atan2(v_base_to_foot.y, v_base_to_foot.x);
        let bending = (this.side === 1) ? -1 : 1;
        let femurAngle = baseAngle + alpha * bending;

        let knee = new Vec2(
            mount.x + Math.cos(femurAngle) * femurLen,
            mount.y + Math.sin(femurAngle) * femurLen
        );

        let lift = this.isStepping ? Math.sin(this.stepProgress * Math.PI) * (30 * s) : 0;
        if (this.isAttacking) lift = 70 * s * Math.sin(this.attackProgress * Math.PI);

        // Shadow
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.moveTo(mount.x + 8 * s, mount.y + 8 * s);
        ctx.lineTo(knee.x + 8 * s, knee.y + 8 * s);
        ctx.lineTo(foot.x + 8 * s, foot.y + 8 * s);
        ctx.stroke();

        // Leg parts
        let colorA = "#5D4037";
        let colorB = "#8D6E63";
        if (this.isAttacking) {
            let r = Math.floor(93 + 120 * Math.sin(this.attackProgress * Math.PI));
            colorA = `rgb(${r}, 64, 55)`;
            colorB = `rgb(${r + 40}, 110, 99)`;
        }

        ctx.lineWidth = 4 * s; // Thicker logic override from draw
        ctx.strokeStyle = colorA;
        ctx.beginPath();
        ctx.moveTo(mount.x, mount.y);
        ctx.lineTo(knee.x, knee.y - lift);
        ctx.stroke();

        ctx.strokeStyle = colorB;
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.moveTo(knee.x, knee.y - lift);
        ctx.lineTo(foot.x, foot.y - lift * 0.5);
        ctx.stroke();

        ctx.fillStyle = "#3E2723";
        ctx.beginPath();
        ctx.arc(mount.x, mount.y, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // --- Shockwave FX ---
        if (this.isAttacking && this.attackProgress > 0.48 && this.attackProgress < 0.75) {
            let atkBaseT = (this.attackProgress - 0.48) / 0.27; // 0-1

            ctx.save();
            ctx.translate(foot.x, foot.y);

            if (atkBaseT < 0.4) {
                let flashSize = 25 * s * (1 - atkBaseT / 0.4);
                ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                ctx.beginPath();
                ctx.arc(0, 0, flashSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "white";
                ctx.lineWidth = 2 * s;
                ctx.beginPath();
                ctx.moveTo(-flashSize * 1.5, 0); ctx.lineTo(flashSize * 1.5, 0);
                ctx.moveTo(0, -flashSize * 1.5); ctx.lineTo(0, flashSize * 1.5);
                ctx.stroke();
            }

            const ringCount = 3;
            for (let i = 0; i < ringCount; i++) {
                let ringT = Math.max(0, Math.min(1, atkBaseT * (1.2 + i * 0.2) - i * 0.1));
                if (ringT > 0 && ringT < 1) {
                    let radius = (15 + ringT * (60 + i * 20)) * s;
                    let alpha = 0.8 * (1 - ringT);
                    let width = 4 * s * (1 - ringT);

                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255, 250, 200, ${alpha})`;
                    ctx.lineWidth = width;
                    // ctx.shadowBlur = 10 * (1 - ringT); // REMOVED
                    // ctx.shadowColor = "white";
                    ctx.arc(0, 0, radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            if (atkBaseT < 0.6) {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                ctx.lineWidth = 1.5 * s;
                ctx.shadowBlur = 0;
                for (let j = 0; j < 8; j++) {
                    let ang = (j / 8) * Math.PI * 2;
                    let l1 = (10 + atkBaseT * 30) * s;
                    let l2 = (20 + atkBaseT * 60) * s;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(ang) * l1, Math.sin(ang) * l1);
                    ctx.lineTo(Math.cos(ang) * l2, Math.sin(ang) * l2);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }
    }
}
