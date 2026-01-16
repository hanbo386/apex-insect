
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

        // State
        this.footPos = new Vec2(0, 0);
        this.targetPos = new Vec2(0, 0);
        this.nextStepPos = new Vec2(0, 0);
        this.isStepping = false;
        this.stepProgress = 0;

        // Scale
        this.scale = scale;

        // Initialized?
        this.initialized = false;
    }

    updateScale(s) {
        this.scale = s;
    }

    // Helper: Get segment properties from the main StickInsect body
    getSegmentPosAndAngle(stickInsect) {
        // Safe access
        if (!stickInsect.stickSegments || stickInsect.stickSegments.length <= this.segmentIdx) {
            return { pos: stickInsect.pos, angle: stickInsect.angle };
        }

        let segPos = stickInsect.stickSegments[this.segmentIdx];

        // Angle logic from reference:
        // `let seg = this.insect.segments[this.segmentIdx];`
        // `let next = this.insect.segments[this.segmentIdx + 1] || ...`
        // `Math.atan2(next.y - seg.y, next.x - seg.x) + Math.PI;` (Facing forward)

        // We need 'next' segment to determine local angle
        let nextIdx = this.segmentIdx + 1;
        let nextPos = stickInsect.stickSegments[nextIdx];

        let angle = stickInsect.angle; // Fallback

        if (nextPos) {
            // "Forward" is opposite to the segment chain direction (Back->Front or Front->Back?)
            // In reference: segments[0] is HEAD. segments[i] is further back.
            // So vector (next - curr) points BACKWARDS.
            // atan2(dy, dx) gives angle pointing BACK.
            // Adding PI flips it to point FORWARD.
            angle = Math.atan2(nextPos.y - segPos.y, nextPos.x - segPos.x) + Math.PI;
        } else {
            // Last segment fallback
            let prevPos = stickInsect.stickSegments[this.segmentIdx - 1];
            if (prevPos) {
                // (curr - prev) points BACKWARDS.
                angle = Math.atan2(segPos.y - prevPos.y, segPos.x - prevPos.x) + Math.PI;
            }
        }

        return { pos: segPos, angle: angle };
    }

    getMountWorldPos(stickInsect) {
        let { pos, angle } = this.getSegmentPosAndAngle(stickInsect);

        // Reference: `let worldOffset = this.localMountOffset.rotate(this.insect.angle);`
        // Wait, reference uses `rotation(this.insect.angle)` (Global Angle) or Segment Angle?
        // Reference: `let worldOffset = this.localMountOffset.rotate(this.insect.angle);` -> Uses INSECT global angle for mount offset rotation.
        // BUT `getSegmentAngle` exists. 
        // Let's re-read reference `getMountWorldPos`:
        // `let worldOffset = this.localMountOffset.rotate(this.insect.angle);`
        // It uses `this.insect.angle` (Head angle) for the offset direction.
        // This keeps shoulders aligned with head, even if body bends? 
        // Or maybe simplified.
        // Let's use Segment Angle for reliability if the body bends deeply.

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
        // Rotate by Segment Angle
        let idealWorldOffset = idealLocal.rotate(angle);

        return mountWorld.add(idealWorldOffset);
    }

    update(stickInsect) {
        const s = this.scale;

        if (!this.initialized) {
            this.footPos = this.calculateIdealPos(stickInsect);
            this.initialized = true;
        }

        let idealPos = this.calculateIdealPos(stickInsect);
        let dist = this.footPos.dist(idealPos);

        let totalLen = this.baseLengthCombined * s;
        let stepThreshold = totalLen * 0.45;

        // Step Trigger Logic
        // Reference: `speed > 0.1` check.
        let speed = stickInsect.vel.mag();

        if (!this.isStepping && dist > stepThreshold && speed > 0.1) {
            // Group Logic (Tripod)
            // Group 0: L1, R2, L3 (Indices: 0,-1; 1,1; 2,-1) -> Wait inputs are (Side, index).
            // My class args: (side, offsetIndex).
            // Group ID: (side==-1?0:1) + offsetIndex
            // L(-1), 0 -> 0.
            // R(1), 0 -> 1.
            // L(-1), 1 -> 1.
            // R(1), 1 -> 2 -> 0 (mod 2).

            // Reference GroupID: `(this.side === -1 ? 0 : 1) + this.offsetIndex;`
            // L0(-1,0)=0. R0(1,0)=1.
            // L1(-1,1)=1. R1(1,1)=2%2=0.
            // L2(-1,2)=2%2=0. R2(1,2)=3%2=1.

            // So Group A (0): L0, R1, L2.
            // Group B (1): R0, L1, R2.
            // Perfect Tripod.

            let myGroupID = ((this.side === -1 ? 0 : 1) + this.offsetIndex) % 2;

            let canStep = true;

            // Check other legs
            if (stickInsect.stickLegs) {
                stickInsect.stickLegs.forEach(l => {
                    if (l !== this && l.isStepping) {
                        let otherGroupID = ((l.side === -1 ? 0 : 1) + l.offsetIndex) % 2;
                        if (otherGroupID === myGroupID) {
                            canStep = false; // Someone in my group is already stepping?
                            // Wait, usually we want strict alternation.
                            // Reference: `if (..., l.isStepping && ... % 2 === groupID % 2)` -> Block if SAME group is stepping?
                            // That seems wrong for Tripod. Usually you block if OPPOSITE group is stepping?
                            // Or maybe it ensures only one leg PER group steps at a time (prevent sliding)?
                            // "Only when same group leg is moving, I cannot move?" -> Synchronization?
                            // Actually, if Group A moves together, they should ALL move.
                            // Reference code says: `canStep = false` if same group is stepping.
                            // This implies SEQUENTIAL steps within a group?
                            // NO, `l !== this`. 
                            // If `l` is in my group and `l` is stepping, I CANNOT step?
                            // Then they would never move together.
                            // Let's re-read carefully: `if (l !== this && l.isStepping && ((groupID) % 2 === groupID % 2))`
                            // YES. It blocks simultaneous steps in same group.
                            // This creates a ripple/wave gait rather than tripod?
                            // Or maybe Random + Check?
                            // `if (canStep || Math.random() > 0.8)` -> 20% chance to ignore rule. 
                            // Because of random ignore, it allows multiple to start eventually.
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
        // Lead the target by Velocity component
        // Reference: `target.add(moveDir.mult(25))` -> Hardcoded lead.
        // We should scale this lead.
        this.nextStepPos = target.add(moveDir.mult(25 * this.scale));
    }

    draw(ctx, stickInsect) {
        const s = this.scale;

        let mount = this.getMountWorldPos(stickInsect);
        let foot = this.footPos;

        let v_base_to_foot = foot.sub(mount);
        let dist = v_base_to_foot.mag();

        let femurLen = this.baseLengthCombined * this.femurRatio * s;
        let tibiaLen = this.baseLengthCombined * this.tibiaRatio * s;

        let maxReach = (femurLen + tibiaLen) * 0.98;
        if (dist > maxReach) {
            v_base_to_foot = v_base_to_foot.normalize().mult(maxReach);
            dist = maxReach;
            // Clamped foot
            // foot = mount.add(v_base_to_foot); // Optional: Visual clamp
        }

        let cosAlpha = (femurLen ** 2 + dist ** 2 - tibiaLen ** 2) / (2 * femurLen * dist);
        // Safety clamp for acos
        let alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha))) || 0;

        let baseAngle = Math.atan2(v_base_to_foot.y, v_base_to_foot.x);
        let bending = (this.side === 1) ? -1 : 1;
        let femurAngle = baseAngle + alpha * bending;

        let knee = new Vec2(
            mount.x + Math.cos(femurAngle) * femurLen,
            mount.y + Math.sin(femurAngle) * femurLen
        );

        let lift = this.isStepping ? Math.sin(this.stepProgress * Math.PI) * (30 * s) : 0;

        // Shadow
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.moveTo(mount.x + 8 * s, mount.y + 8 * s);
        ctx.lineTo(knee.x + 8 * s, knee.y + 8 * s);
        ctx.lineTo(foot.x + 8 * s, foot.y + 8 * s);
        ctx.stroke();

        // Leg parts
        ctx.lineWidth = 3 * s;
        ctx.strokeStyle = "#5D4037";
        ctx.beginPath();
        ctx.moveTo(mount.x, mount.y);
        ctx.lineTo(knee.x, knee.y - lift);
        ctx.stroke();

        ctx.strokeStyle = "#8D6E63";
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(knee.x, knee.y - lift);
        ctx.lineTo(foot.x, foot.y - lift * 0.5);
        ctx.stroke();

        ctx.fillStyle = "#3E2723";
        ctx.beginPath();
        ctx.arc(mount.x, mount.y, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
    }
}
