import { Vec2 } from './Vec2.js';
import { Leg } from './Leg.js';
import { CockroachLeg, CockroachAntenna } from './CockroachParts.js';
import { SpiderLeg, SPIDER_CONFIG } from './SpiderParts.js';
import { MantisLeg } from './MantisParts.js';
import { CricketLeg } from './CricketParts.js';

// --- Standardized Size Configuration ---
// Defines the scale range for each evolution stage.
export const STAGE_CONFIG = {
    0: { name: 'PRIMITIVE', startScale: 0.8, endScale: 1.2 },
    1: { name: 'ANT', startScale: 1.2, endScale: 1.8 },
    2: { name: 'LADYBUG', startScale: 1.8, endScale: 2.6 },
    3: { name: 'PILLBUG', startScale: 2.6, endScale: 4.0 },
    4: { name: 'COCKROACH', startScale: 4.5, endScale: 6.0 },
    5: { name: 'SPIDER', startScale: 6.5, endScale: 10.0 },
    5: { name: 'SPIDER', startScale: 6.5, endScale: 10.0 },
    6: { name: 'MANTIS', startScale: 12.0, endScale: 18.0 },
    7: { name: 'CRICKET', startScale: 14.0, endScale: 20.0 }
};

/**
 * 昆虫主体类 (Insect)
 * Base class for the player creature and NPCs.
 */
export class Insect {
    constructor(x, y) {
        this.pos = new Vec2(x, y);
        this.vel = new Vec2(0, 0);
        this.angle = 0;
        this.speed = 0;
        this.maxSpeed = 2.0; // Primitive (Stage 0) is slower

        // --- Stamina ---
        this.stamina = 100;
        this.maxStamina = 100;
        this.canSprint = true;

        // --- 成长属性 ---
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 5; // 升级所需初始 XP
        this.evolutionStage = 0; // 0: Primitive, 1: Ant, 2: Ladybug...

        // Size Init
        const config = STAGE_CONFIG[0];
        this.baseScale = config.startScale;
        this.targetScale = config.startScale;
        this.scale = config.startScale;

        // --- Prestige / World Reset Multiplier ---
        this.worldTier = 1.0;
        // Used to shrink the entity physically when the world resets,
        // without affecting its "Canonical" base scale.
        this.worldScaleModifier = 1.0;


        this.flashTimer = 0; // Visual effect for leveling up

        // 颜色配置
        this.colors = {
            head: '#cccccc', // Primitive: Grey/Pale
            thorax: '#cccccc',
            abdomen: '#b3b3b3',
            gradStart: '#e0e0e0',
            gradEnd: '#999999'
        };

        this.thoraxPos = this.pos.clone();
        this.abdomenPos = this.pos.clone();
        this.headPos = this.pos.clone();

        this.legs = [];
        this.initLegs();
        this.gaitState = 0;

        // --- Form Vars ---
        this.form = 'PRIMITIVE';
        this.walkCycle = 0;
        this.antennaTimer = 0;

        // --- Pill Bug Vars ---
        this.pillBugSegments = [];

        // --- Cockroach Vars ---
        this.cockroachLegs = [];
        this.leftCockroachAntenna = null;
        this.rightCockroachAntenna = null;
        this.gaitClock = 0;

        // --- Spider Vars ---
        this.spiderLegs = [];
        this.stepGroup = 0;
        this.lastStepChange = 0;
        this.heldPrey = null;
        this.predationState = 'idle'; // idle, reaching, retracting
        this.predationTimer = 0;
        this.onConsumePrey = null; // Callback for particles

        // Generic Predation (Lunge)
        this.lungeTimer = 0;
        this.lungeOffset = new Vec2(0, 0);

        // --- Cricket Properties ---
        this.cricketLegs = [];
        this.cricketAntennaTimer = 0;
    }

    initLegs() {
        this.legs = [];

        // Primitive Legs: Tiny and simple
        // Stage 0: Primitive (Larva - Mite)
        // Stage 0: Primitive (Larva - Mite)
        // Stage 1: Ant

        if (this.form === 'MANTIS') {
            this.mantisLegs = [
                // Back Legs
                new MantisLeg(-1, -45, 12, 40, 50),
                new MantisLeg(1, -45, 12, 40, 50),
                // Mid Legs
                new MantisLeg(-1, 0, 15, 25, 35),
                new MantisLeg(1, 0, 15, 25, 35),
                // Front Arms (Scythes)
                new MantisLeg(-1, 20, 10, 30, 40, true),
                new MantisLeg(1, 20, 10, 30, 40, true)
            ];
            // Init feet positions to current pos
            this.mantisLegs.forEach(leg => {
                leg.update(this.thoraxPos.x, this.thoraxPos.y, this.angle, this.vel.mag());
            });
            this.legs = []; // Clear standard legs
        }
        else if (this.form === 'CRICKET') {
            this.cricketLegs = [
                // Right side
                new CricketLeg(35, 10, 25, 30, 1),      // Front
                new CricketLeg(10, 15, 30, 35, 1),      // Middle
                new CricketLeg(-40, 10, 50, 60, 1, true), // Rear (Jumping leg)

                // Left side
                new CricketLeg(35, -10, 25, 30, -1),
                new CricketLeg(10, -15, 30, 35, -1),
                new CricketLeg(-40, -10, 50, 60, -1, true) // Rear
            ];
            // Init
            this.cricketLegs.forEach(leg => {
                leg.updateScale(this.scale);
                leg.update(this.pos, this.angle, this.vel);
            });
            this.legs = [];
        }
        else if (this.form === 'SPIDER') {
            this.spiderLegs = [];
            // Init 8 legs (4 pairs)
            for (let i = 0; i < 4; i++) {
                this.spiderLegs.push(new SpiderLeg(this, i, -1, this.scale));
                this.spiderLegs.push(new SpiderLeg(this, i, 1, this.scale));
            }
            this.legs = [];
        }
        else if (this.form === 'COCKROACH') {
            this.cockroachLegs = [];

            // Front (Index 0)
            this.cockroachLegs.push(new CockroachLeg(-1, 0, new Vec2(22, -16), 28, 25, this.scale));
            this.cockroachLegs.push(new CockroachLeg(1, 0, new Vec2(22, 16), 28, 25, this.scale));

            // Mid (Index 1)
            this.cockroachLegs.push(new CockroachLeg(-1, 1, new Vec2(5, -22), 40, 30, this.scale));
            this.cockroachLegs.push(new CockroachLeg(1, 1, new Vec2(5, 22), 40, 30, this.scale));

            // Back (Index 2)
            this.cockroachLegs.push(new CockroachLeg(-1, 2, new Vec2(-15, -20), 48, 35, this.scale));
            this.cockroachLegs.push(new CockroachLeg(1, 2, new Vec2(-15, 20), 48, 35, this.scale));

            this.leftCockroachAntenna = new CockroachAntenna(130, 12, -1, this.scale);
            this.rightCockroachAntenna = new CockroachAntenna(130, 12, 1, this.scale);

            this.legs = [];

            // --- Snap to Initial Position (Fix for black lines Glitch) ---
            this.cockroachLegs.forEach(leg => {
                let target = leg.calculateTarget(this.pos, this.angle, this.vel);
                leg.footPos = target;
                leg.targetPos = target.clone();
            });

            // Initial Head Position for Antennae
            let headBase = this.pos.add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(35 * this.scale));
            if (this.leftCockroachAntenna) this.leftCockroachAntenna.reset(headBase, this.angle);
            if (this.rightCockroachAntenna) this.rightCockroachAntenna.reset(headBase, this.angle);
        }
        else {
            // Default Primitive/Ant/Ladybug/Pillbug Legs

            let legConfigs = [];

            if (this.evolutionStage === 1) { // ANT (Stage 1)
                legConfigs = [
                    { id: 0, side: -1, x: 5 },
                    { id: 1, side: -1, x: 0 },
                    { id: 2, side: -1, x: -5 },
                    { id: 3, side: 1, x: 5 },
                    { id: 4, side: 1, x: 0 },
                    { id: 5, side: 1, x: -5 }
                ];
                legConfigs.forEach(cfg => {
                    this.legs.push(new Leg(cfg.id, cfg.side, cfg.x, cfg.side * 2.5, this.scale));
                });
            } else if (this.evolutionStage === 0) { // Primitive (Stage 0)
                legConfigs = [
                    { id: 0, side: -1, x: 3 },
                    { id: 1, side: -1, x: 0 },
                    { id: 2, side: -1, x: -3 },
                    { id: 3, side: 1, x: 3 },
                    { id: 4, side: 1, x: 0 },
                    { id: 5, side: 1, x: -3 }
                ];
                legConfigs.forEach(cfg => {
                    this.legs.push(new Leg(cfg.id, cfg.side, cfg.x, cfg.side * 1.5, this.scale));
                });
            }
            // Higher stages (Ladybug/Pillbug) might not use standard legs or use different logic.
            // Assuming Ant-like legs are fine for now or handled elsewhere.

            this.legs.forEach(leg => {
                leg.currentPos = leg.idealOffset.add(this.pos);
                leg.targetPos = leg.currentPos.clone();
            });

            // Callback
            this.onLevelUp = null;
        }
    }

    gainXp(amount) {
        this.xp += amount;

        // Check for Level Up or Evolution
        if (this.xp >= this.xpToNext) {
            if (this.level < 5) {
                this.levelUp();
            } else {
                // Level is 5 (Max for current stage) -> Evolve
                this.evolve();
            }
        }
    }

    levelUp() {
        this.xp -= this.xpToNext;
        this.level++;
        this.xpToNext = Math.floor(this.xpToNext * 1.5);
        this.flashTimer = 30;

        // Growth: Interpolate between start and end scale for this stage
        const config = STAGE_CONFIG[this.evolutionStage];
        if (config) {
            // Level 1 -> StartScale
            // Level 5 -> EndScale
            // Progress = (Level - 1) / 4.0
            // (1-1)/4 = 0. (5-1)/4 = 1.0. 
            // Cap at 1.0 if level > 5 (though max is 5 normally)
            let progress = Math.min(1.0, Math.max(0.0, (this.level - 1) / 4.0));

            // Fix for World Reset scaling:
            // If we have a worldScaleDivisor (meaning we are in a 'Reset' world), 
            // we must apply it to the CONFIG values before interpolating.
            // Otherwise, levelUp will try to jump us back to the original huge size (e.g. 6.5 -> 10.0).
            let divisor = this.worldScaleModifier || 1.0;
            // Note: worldScaleModifier is used in current codebase for this purpose? 
            // Wait, In main.js we set player.scale /= RESET_FACTOR. And player.worldScaleDivisor.
            // But Insect.js has `this.worldScaleModifier`.
            // Let's check where `worldScaleModifier` is used.
            // It is used in update(): `let effectiveTarget = this.targetScale * this.worldScaleModifier;`
            // So `this.targetScale` IS the canonical scale (6.5 - 10.0).
            // AND `worldScaleModifier` shrinks it to 1.0.

            // So the math IS: targetScale = (start + diff * progress).
            // Then effective = targetScale * modifier.

            // IN MAIN.JS RESET LOGIC:
            // player.scale /= RESET_FACTOR;
            // player.baseScale /= RESET_FACTOR;
            // player.targetScale /= RESET_FACTOR;
            // AND player.worldTier *= RESET_FACTOR;
            // BUT WE DID NOT UPDATE `player.worldScaleModifier`.

            // The issue is likely that `levelUp` RE-CALCULATES `baseScale` from `config` directly!
            // `this.baseScale = config.startScale + ...`
            // This overwrites the "shrunk" baseScale we set in main.js.

            // FIX: We need to persist the shrink factor in `worldScaleModifier` so that `levelUp` calculations work.
            // In main.js, instead of dividing `player.scale` directly, we should set `player.worldScaleModifier`.

            // HOWEVER, main.js logic was: `player.scale /= RESET_FACTOR`.
            // If we want to fix it HERE in `levelUp` without changing main.js broadly:
            // We need to know if we are in a reset world.
            // We can infer it or use a property.
            // The `main.js` reset logic modifies `player.scale` etc, but `levelUp` resets it from config.

            // Let's use `this.worldScaleModifier` correctly.
            // If `main.js` sets `this.worldScaleModifier = 1.0 / worldScaleDivisor`, then this code works:
            // `this.baseScale = (start + ...)`.
            // `this.scale = this.baseScale * this.worldScaleModifier`.

            // BUT currently `main.js` manages manual division.
            // Let's patch it here to respect the current "shrink state" if possible, 
            // OR better, update `main.js` to use `worldScaleModifier` properly.
            // But I cannot easily edit `main.js` simultaneous with this thought process without multiple steps?
            // Actually I am in `Insect.js`.

            // Let's assume we want to support the "Manual Division" approach for now.
            // We need to apply the same reduction that happened to `this.scale`.
            // But `this.scale` changes.

            // Correct approach: Use `worldScaleModifier`.
            // I will assume `main.js` will be updated (or I will update it) to set `worldScaleModifier`.
            // BUT for now, I can check if `this.scale` is drastically smaller than `config.startScale`? No.

            // Let's rely on `this.worldScaleModifier`. 
            // I will Initialize it to 1.0.
            // And in `levelUp`, we do NOT apply it to `baseScale`. `baseScale` is CANONICAL.
            // `baseScale` should be 6.5 -> 10.0.
            // `effectiveTarget` in update applies the modifier.

            // Code currently:
            // `this.baseScale = config.startScale + ...` (Canonical)
            // `this.targetScale = this.baseScale;`

            // In `update()`:
            // `let effectiveTarget = this.targetScale * this.worldScaleModifier;`

            // So, if `worldScaleModifier` is set correctly (e.g. 0.15), then `effectiveTarget` will be 1.0 -> 1.5.
            // The problem described by the user is that it grows FAST.
            // This implies `worldScaleModifier` is likely 1.0 (default), so it jumps to 6.5.

            // So the fix is indeed to use `worldScaleModifier`.

            this.baseScale = config.startScale + (config.endScale - config.startScale) * progress;
            this.targetScale = this.baseScale;
            // The scaling happens in `update()` via `worldScaleModifier`. 
            // Use that.
        }

        this.initLegs(); // Re-init legs for size

        if (this.onLevelUp) this.onLevelUp(this.level);
    }

    setLevel(targetStage, targetLevel) {
        // Temporarily disable callbacks
        let originalOnLevelUp = this.onLevelUp;
        let originalOnEvolve = this.onEvolve;
        this.onLevelUp = null;
        this.onEvolve = null;

        // Reset
        this.evolutionStage = 0;
        this.level = 1;
        this.xp = 0;

        // 1. Advance Stages DIRECTLY
        // We can jump straight to the target stage and call evolve once per step to set properties
        // Or better, just loop and call evolve logic.
        // Actually, calling evolve() sets the baseScale correctly from config now.
        while (this.evolutionStage < targetStage) {
            this.evolve(true); // Loops until stage matched.
        }

        // 2. Set Level within stage
        // Just set the level property, then manually trigger the size calculation
        this.level = targetLevel;
        // Recalculate scale based on new level
        const config = STAGE_CONFIG[this.evolutionStage];
        if (config) {
            // Same math as levelUp
            let progress = Math.min(1.0, Math.max(0.0, (this.level - 1) / 4.0));
            this.baseScale = config.startScale + (config.endScale - config.startScale) * progress;
            this.targetScale = this.baseScale;
            this.scale = this.targetScale * this.worldScaleModifier;
        }

        // Restore callbacks
        this.onLevelUp = originalOnLevelUp;
        this.onEvolve = originalOnEvolve;

        // Re-init legs for final form
        this.initLegs();
    }

    evolve(isInstant = false) {
        this.evolutionStage++;
        this.level = 1; // RESET Level to 1
        this.xp = 0;    // Reset XP

        // Structural Evolution Growth
        // STRICT SIZE UPDATE from Config
        const config = STAGE_CONFIG[this.evolutionStage];
        if (config) {
            this.baseScale = config.startScale;
            this.targetScale = config.startScale;
        } else {
            // Fallback if config missing
            this.baseScale *= 1.5;
            this.targetScale = this.baseScale;
        }

        // Immediately apply if instant, but respecting modifier will happen in update loop
        // If instant, we might want to force it
        if (isInstant) {
            this.scale = this.targetScale * this.worldScaleModifier;
        }

        // Increase difficulty for next stage
        // Base XP requirement for Level 1 of new stage should be higher
        this.xpToNext = 5 * Math.pow(2.5, this.evolutionStage);
        this.xpToNext = Math.floor(this.xpToNext);

        let formName = "";

        // Evolution Shift Logic
        if (this.evolutionStage === 1) {
            this.form = 'ANT';
            this.maxSpeed = 3.2;
            this.colors = {
                head: '#4a331c',
                thorax: '#4a331c',
                abdomen: '#3d2612',
                gradStart: '#755430',
                gradEnd: '#1a1108'
            };
            // Re-init legs for Ant size
            this.initLegs();
            // Fix legs for Ant manually if needed or update initLegs to handle forms
            // For now, let's just make initLegs aware of scale which grew? 
            // Better: Re-define legs forcefully for Ant.
            this.legs = [];
            let legConfigs = [
                { id: 0, side: -1, x: 5 },
                { id: 1, side: -1, x: 0 },
                { id: 2, side: -1, x: -5 },
                { id: 3, side: 1, x: 5 },
                { id: 4, side: 1, x: 0 },
                { id: 5, side: 1, x: -5 }
            ];
            legConfigs.forEach(cfg => {
                this.legs.push(new Leg(cfg.id, cfg.side, cfg.x, cfg.side * 2.5, this.scale));
            });
            this.legs.forEach(leg => {
                leg.currentPos = leg.idealOffset.add(this.pos);
                leg.targetPos = leg.currentPos.clone();
            });

            formName = "蚂蚁 (ANT)";

        } else if (this.evolutionStage === 2) {
            this.form = 'LADYBUG';
            this.maxSpeed *= 1.2;
            formName = "瓢虫 (LADYBUG)";
        } else if (this.evolutionStage === 3) {
            this.form = 'PILLBUG';
            this.maxSpeed *= 1.1;
            this.pillBugSegments = [];
            for (let i = 0; i < 9; i++) {
                this.pillBugSegments.push({ x: this.pos.x, y: this.pos.y, angle: this.angle });
            }
            formName = "潮虫 (PILLBUG)";

        } else if (this.evolutionStage === 4) {
            this.form = 'COCKROACH';
            this.maxSpeed *= 1.3;

            this.initLegs();

            formName = "蟑螂 (COCKROACH)";
        } else if (this.evolutionStage === 5) {
            this.form = 'SPIDER';
            this.maxSpeed *= 1.2; // Fast

            // Compensation for BaseRadius jump (140 -> 300)
            // Shrink scale so visual size remains steady
            // REMOVED: No longer needed with new Scale Config system. 
            // We want canonical size 6.5 from config.
            // let shrink = 0.5;
            // this.baseScale *= shrink;
            // this.targetScale *= shrink;
            // this.scale *= shrink;

            this.spiderLegs = [];
            // Init 8 legs (4 pairs)
            // Left (-1)
            for (let i = 0; i < 4; i++) {
                this.spiderLegs.push(new SpiderLeg(this, i, -1, this.scale));
                this.spiderLegs.push(new SpiderLeg(this, i, 1, this.scale));
            }

            formName = "细脚长腿蛛 (SPIDER)";
        } else if (this.evolutionStage === 6) {
            this.form = 'MANTIS';
            this.maxSpeed *= 1.25;

            // Compensation for BaseRadius jump (300 -> 1200)
            // Huge jump. Shrink significantly.
            // REMOVED: Legacy logic. We want canonical size.
            // let shrink = 0.25;
            // this.baseScale *= shrink;
            // this.targetScale *= shrink;
            // this.scale *= shrink;

            this.initLegs();

            formName = "螳螂 (MANTIS)";
        } else if (this.evolutionStage === 7) {
            this.form = 'CRICKET';
            this.maxSpeed *= 1.2;

            this.initLegs();
            formName = "蟋蟀 (CRICKET)";
        }

        if (this.onEvolve) this.onEvolve(formName, this.evolutionStage);
    }

    // Manual Evolution Trigger



    update(input) {
        // --- Update Predation Logic (Spider / Mantis) ---
        this.updatePredation();

        // Immobilize if eating (Spider / Mantis Grapple)
        if ((this.form === 'SPIDER' || this.form === 'MANTIS') && this.predationState !== 'idle') {
            input = { up: false, down: false, left: false, right: false, shift: false };
        }

        // --- Walk Cycle ---
        if (this.vel.mag() > 0.1) {
            this.walkCycle += 0.2; // Adjust speed as needed
        } else {
            // Decay directly to nearest 0 or just stop
            // this.walkCycle = 0; // Optional reset
        }

        // --- Smooth Growth ---
        let effectiveTarget = this.targetScale * this.worldScaleModifier;
        if (Math.abs(this.scale - effectiveTarget) > 0.01) {
            this.scale += (effectiveTarget - this.scale) * 0.05;
            // Update legs scale without resetting them
            this.legs.forEach(leg => leg.updateScale(this.scale));
            this.cockroachLegs.forEach(leg => leg.updateScale(this.scale));
            if (this.leftCockroachAntenna) this.leftCockroachAntenna.updateScale(this.scale);
            if (this.rightCockroachAntenna) this.rightCockroachAntenna.updateScale(this.scale);
            this.spiderLegs.forEach(leg => leg.updateScale(this.scale));
            this.spiderLegs.forEach(leg => leg.updateScale(this.scale));
            if (this.mantisLegs) this.mantisLegs.forEach(leg => leg.updateScale(this.scale));
            if (this.cricketLegs) this.cricketLegs.forEach(leg => leg.updateScale(this.scale));
        } else {
            this.scale = effectiveTarget;
        }

        if (this.flashTimer > 0) this.flashTimer--;

        let dx = 0;
        let dy = 0;
        if (input.up) dy -= 1;
        if (input.down) dy += 1;
        if (input.left) dx -= 1;
        if (input.right) dx += 1;

        let targetSpeed = 0;
        let isSprinting = input.shift && this.stamina > 0;

        if (dx !== 0 || dy !== 0) {
            // Scale speed with size so larger forms don't feel slow when zoomed out
            targetSpeed = this.maxSpeed * this.scale * (isSprinting ? 1.8 : 1.0);

            // Stamina Logic
            if (isSprinting) {
                this.stamina -= 0.8; // Drain
                if (this.stamina <= 0) this.stamina = 0;
            } else {
                this.stamina += 0.3; // Regen while moving but not sprinting
                if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
            }

            let targetAngle = Math.atan2(dy, dx);
            let diff = targetAngle - this.angle;
            while (diff <= -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * 0.15;
        } else {
            targetSpeed = 0;
            // Regen faster when standing still
            this.stamina += 0.4;
            if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
        }

        // Increased friction/deceleration (0.2 -> 0.15 for accel, faster decay for stopping)
        if (targetSpeed === 0) {
            this.speed += (targetSpeed - this.speed) * 0.3; // Stop faster (Higher val = faster stop)
        } else {
            this.speed += (targetSpeed - this.speed) * 0.1; // Accel slower
        }

        this.vel = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(this.speed);
        this.vel = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(this.speed);
        this.pos = this.pos.add(this.vel);

        this.updateVisuals();


        this.thoraxPos = this.pos;

        // --- 身体跟随 ---
        let headTarget = this.pos.add(new Vec2(Math.cos(this.angle) * 5.5 * this.scale, Math.sin(this.angle) * 5.5 * this.scale));
        this.headPos = this.headPos.add(headTarget.sub(this.headPos).mult(0.5));

        let abTarget = this.pos.add(new Vec2(Math.cos(this.angle) * -7 * this.scale, Math.sin(this.angle) * -7 * this.scale));
        this.abdomenPos = this.abdomenPos.add(abTarget.sub(this.abdomenPos).mult(0.4));

        if (this.legs.length < 6) return; // Guard: Logic below assumes 6 legs (0-5)

        let groupAMoving = this.legs[0].isMoving || this.legs[4].isMoving || this.legs[2].isMoving;
        let groupBMoving = this.legs[3].isMoving || this.legs[1].isMoving || this.legs[5].isMoving;

        let canGroupAMove = !groupBMoving;
        let canGroupBMove = !groupAMoving;

        this.legs.forEach(leg => {
            let canMove = false;
            if ([0, 4, 2].includes(leg.id)) canMove = canGroupAMove;
            else canMove = canGroupBMove;
            leg.update(this.thoraxPos, this.angle, this.vel, canMove);
        });
    }

    draw(ctx) {
        // --- Growth Flash Effect ---
        if (this.flashTimer > 0) {
            ctx.save();
            ctx.translate(this.pos.x, this.pos.y);
            let alpha = this.flashTimer / 30;
            ctx.beginPath();
            ctx.arc(0, 0, 30 * this.scale * (2 - alpha), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.6})`; // Gold glow
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        if (this.form === 'LADYBUG') {
            this.drawLadybug(ctx);
            return;
        } else if (this.form === 'PILLBUG') {
            this.drawPillBug(ctx);
            return;
        } else if (this.form === 'COCKROACH') {
            this.drawCockroach(ctx);
            return;
        } else if (this.form === 'SPIDER') {
            this.drawSpider(ctx);
            return;
        } else if (this.form === 'MANTIS') {
            this.drawMantis(ctx);
            return;
        } else if (this.form === 'PRIMITIVE') {
            this.drawPrimitive(ctx);
            return;
        } else if (this.form === 'CRICKET') {
            this.drawCricket(ctx);
            return;
        }

        // Default: Ant Form (or any other fallback)
        this.legs.forEach(leg => {
            let hipWorldPos = leg.offset.rotate(this.angle).add(this.thoraxPos);
            leg.draw(ctx, hipWorldPos);
        });

        // --- 身体 (保持微型尺寸，随 scale 变化) ---
        // 腹部
        this.drawSegment(ctx, this.abdomenPos, 6 * this.scale, 9 * this.scale, this.angle, this.colors.abdomen);
        // 胸部
        this.drawSegment(ctx, this.thoraxPos, 4 * this.scale, 6 * this.scale, this.angle, this.colors.thorax);
        // 头部
        this.drawSegment(ctx, this.headPos, 3.5 * this.scale, 5 * this.scale, this.angle, this.colors.head);


        // 眼睛
        let eyeOffsetL = new Vec2(1.5, -2).rotate(this.angle).add(this.headPos);
        let eyeOffsetR = new Vec2(1.5, 2).rotate(this.angle).add(this.headPos);
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(eyeOffsetL.x, eyeOffsetL.y, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeOffsetR.x, eyeOffsetR.y, 1, 0, Math.PI * 2); ctx.fill();

        // 触角
        this.drawAntenna(ctx, this.headPos, this.angle, -1);
        this.drawAntenna(ctx, this.headPos, this.angle, 1);

        // 大颚
        this.drawMandibles(ctx, this.headPos, this.angle);
    }

    drawPrimitive(ctx) {
        // Draw Simple Larva/Mite
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.scale(this.scale, this.scale);

        // Head: Small circle (Fixed at front: +X)
        let headX = 6;

        // Head Wiggle (minimal Y sway)
        let headWiggle = 0;
        if (this.vel.mag() > 0.1) headWiggle = Math.sin(this.walkCycle) * 1;

        ctx.fillStyle = this.colors.head;
        ctx.beginPath();
        ctx.arc(headX, headWiggle, 4, 0, Math.PI * 2);
        ctx.fill();

        // Eyes on Head (Front facing)
        ctx.fillStyle = '#000';
        // Top eye (-Y), Bottom eye (+Y)
        ctx.beginPath(); ctx.arc(headX + 2, headWiggle - 2, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(headX + 2, headWiggle + 2, 1, 0, Math.PI * 2); ctx.fill();


        // Segments (Body)
        // Level 1 = 1 Segment. Level 5 = 5 Segments.
        // Drawn from front (0) to back (level-1) along -X

        ctx.fillStyle = this.colors.thorax;

        for (let i = 0; i < this.level; i++) {
            let spacing = 6;
            let currentX = 0 - (i * spacing);

            // Wiggle Logic: Snake wave (Y axis)
            let wiggle = 0;
            if (this.vel.mag() > 0.1) {
                // Phase shift for wave effect
                wiggle = Math.sin(this.walkCycle - (i * 0.8)) * (2 + i * 0.5);
            }

            // Tapering size
            // Width (X) and Height (Y). Since we are horizontal, X is length, Y is thickness.
            let rLength = 8 * (1 - i * 0.05); // Length along body axis
            let rThickness = 6 * (1 - i * 0.05); // Thickness
            // Clamp min size
            rLength = Math.max(4, rLength);
            rThickness = Math.max(3, rThickness);

            ctx.beginPath();
            ctx.ellipse(currentX, wiggle, rLength, rThickness, 0, 0, Math.PI * 2);
            ctx.fill();

            // Legs on segments (First 3 only)
            if (i < 3) {
                ctx.fillStyle = '#666';
                let legY = rThickness - 1;
                // Left (Top in this orientation? -Y)
                ctx.beginPath(); ctx.arc(currentX, wiggle - legY - 2, 1.5, 0, Math.PI * 2); ctx.fill();
                // Right (Bottom in this orientation? +Y)
                ctx.beginPath(); ctx.arc(currentX, wiggle + legY + 2, 1.5, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = this.colors.thorax;
            }
        }

        ctx.restore();
    }

    drawSegment(ctx, pos, w, h, angle, color) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);

        let grad = ctx.createRadialGradient(-w / 3, -h / 3, 1, 0, 0, w);
        grad.addColorStop(0, this.colors.gradStart);
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, this.colors.gradEnd);
        ctx.fillStyle = grad;


        ctx.beginPath();
        ctx.ellipse(0, 0, h, w, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawAntenna(ctx, headPos, angle, side) {
        let time = Date.now() / 200;
        let wiggle = Math.sin(time + side) * 0.2;
        if (this.vel.mag() > 0.1) wiggle += Math.sin(time * 3) * 0.3;

        let baseAngle = angle + (side * 0.2) + wiggle;

        // 触角进一步缩短 1/3
        // 第一段: 12 -> 8
        let elbowPos = new Vec2(Math.cos(baseAngle) * 8, Math.sin(baseAngle) * 8).add(headPos);

        // 第二段: 17 -> 11
        let tipAngle = baseAngle + (side * 0.3) + wiggle * 0.5;
        let tipPos = new Vec2(Math.cos(tipAngle) * 11, Math.sin(tipAngle) * 11).add(elbowPos);

        ctx.strokeStyle = '#2a1a0a';
        ctx.lineWidth = 0.8; // 更细
        ctx.beginPath();
        ctx.moveTo(headPos.x + Math.cos(angle) * 3.5, headPos.y + Math.sin(angle) * 3.5);
        ctx.lineTo(elbowPos.x, elbowPos.y);
        ctx.lineTo(tipPos.x, tipPos.y);
        ctx.stroke();
    }

    drawMandibles(ctx, headPos, angle) {
        ctx.save();
        ctx.translate(headPos.x, headPos.y);
        ctx.rotate(angle);
        ctx.strokeStyle = '#2a1a0a';
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        ctx.arc(4, -1.5, 2.5, Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(4, 1.5, 2.5, Math.PI / 2, Math.PI * 1.5, true);
        ctx.stroke();
        ctx.restore();
    }

    // --- Ladybug Specific Drawing Logic ---
    drawLadybug(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle + Math.PI / 2); // Canvas 0度通常向右，我们需要修正旋转以便计算方便

        let size = 12.5 * this.scale; // Base size adapted to scale (Reduced by half)

        // 阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 5 * this.scale, size * 0.9, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // --- 腿部 (Legs) ---
        this.drawLadybugLegs(ctx, size);

        // --- 身体 (Body/Elytra) ---
        // 鞘翅红色渐变
        const bodyGrad = ctx.createRadialGradient(-5 * this.scale, -5 * this.scale, 2 * this.scale, 0, 0, size * 1.2);
        bodyGrad.addColorStop(0, '#ff4d4d');
        bodyGrad.addColorStop(0.4, '#cc0000');
        bodyGrad.addColorStop(1, '#800000');

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        // 稍微拉长的半球体
        ctx.ellipse(0, 5 * this.scale, size * 0.95, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 鞘翅中间的分隔线
        ctx.strokeStyle = 'rgba(50, 0, 0, 0.3)';
        ctx.lineWidth = 1 * this.scale;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.2);
        ctx.lineTo(0, size * 1.6);
        ctx.stroke();

        // 斑点 (Spots)
        this.drawLadybugSpots(ctx, size);

        // 高光 (Specular Highlight) - 让甲壳看起来硬且亮
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-size * 0.4, 0, size * 0.2, size * 0.4, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // --- 头部 (Head) ---
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, -size * 0.8, size * 0.55, Math.PI, 0);
        ctx.fill();

        // 头部光泽
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(size * 0.2, -size * 1.0, size * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // --- 触角 (Antennae) ---
        this.drawLadybugAntennae(ctx, size);

        ctx.restore();
    }

    drawLadybugLegs(ctx, size) {
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2.5 * this.scale;
        ctx.lineCap = 'round';

        // 腿部参数
        const legX = size * 0.75; // 身体连接点 X
        const legLen1 = size * 0.55; // 大腿长
        const legLen2 = size * 0.65; // 小腿长

        // 步态相位：三角步态 (Tripod Gait)
        const gaitA = Math.sin(this.walkCycle * Math.PI * 2);
        const gaitB = Math.sin(this.walkCycle * Math.PI * 2 + Math.PI);

        // 基础角度配置 (右侧)
        // 0为向右, -PI/2为向上(头), PI/2为向下(尾)
        const angleFront = -0.7; // 右前: 约 -40度
        const angleMid = 0.0; // 右中: 0度
        const angleBack = 0.7; // 右后: 约 40度

        // Y轴位置 (相对于中心)
        const yFront = -size * 0.5;
        const yMid = size * 0.1;
        const yBack = size * 0.7;

        // 腿部定义：完全对称分布
        const legs = [
            // --- 左侧腿 (X为负, 角度镜像) ---
            { x: -legX, y: yFront, baseAngle: Math.PI - angleFront, phase: gaitA, isLeft: true },
            { x: -legX, y: yMid, baseAngle: Math.PI - angleMid, phase: gaitB, isLeft: true },
            { x: -legX, y: yBack, baseAngle: Math.PI - angleBack, phase: gaitA, isLeft: true },

            // --- 右侧腿 (X为正) ---
            { x: legX, y: yFront, baseAngle: angleFront, phase: gaitB, isLeft: false },
            { x: legX, y: yMid, baseAngle: angleMid, phase: gaitA, isLeft: false },
            { x: legX, y: yBack, baseAngle: angleBack, phase: gaitB, isLeft: false },
        ];

        legs.forEach((leg) => {
            // 动态角度摆动幅度
            const swing = leg.phase * 0.35;

            ctx.save();
            ctx.translate(leg.x, leg.y);

            // 1. 大腿角度
            let angle1 = leg.baseAngle;
            // 摆动方向修正
            angle1 += swing;

            // 绘制大腿
            const kneeX = Math.cos(angle1) * legLen1;
            const kneeY = Math.sin(angle1) * legLen1;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(kneeX, kneeY);
            ctx.stroke();

            // 2. 小腿 (膝盖处弯曲)
            ctx.translate(kneeX, kneeY);

            // 弯曲角度
            const kneeBend = 1.2;
            let angle2 = angle1 + (leg.isLeft ? -kneeBend : kneeBend);

            // 运动时小腿也会伸缩一点
            angle2 += leg.phase * 0.15;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle2) * legLen2, Math.sin(angle2) * legLen2);
            ctx.stroke();

            ctx.restore();
        });
    }

    drawLadybugSpots(ctx, size) {
        ctx.fillStyle = '#000';
        const spots = [
            { x: -size * 0.4, y: 0, r: size * 0.2 },
            { x: size * 0.4, y: 0, r: size * 0.2 },
            { x: -size * 0.5, y: size * 0.6, r: size * 0.18 },
            { x: size * 0.5, y: size * 0.6, r: size * 0.18 },
            { x: -size * 0.3, y: size * 1.1, r: size * 0.12 },
            { x: size * 0.3, y: size * 1.1, r: size * 0.12 },
            // 中央靠近头部的一个点
            { x: 0, y: -size * 0.2, r: size * 0.15 },
        ];

        spots.forEach(spot => {
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawLadybugAntennae(ctx, size) {
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5 * this.scale;

        // 触角基座位置
        const baseX = size * 0.2;
        const baseY = -size * 1.2;

        // 随机微动 + 随速度后掠
        const twitchL = Math.sin(this.antennaTimer) * 0.1;
        const twitchR = Math.cos(this.antennaTimer * 1.3) * 0.1;

        // 左触角
        ctx.beginPath();
        ctx.moveTo(-baseX, baseY);
        ctx.quadraticCurveTo(
            -baseX * 2, baseY - 10 * this.scale,
            -baseX * 3 + twitchL * 10, baseY - 5 * this.scale + Math.abs(this.speed) * 2
        );
        ctx.stroke();

        // 右触角
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(
            baseX * 2, baseY - 10 * this.scale,
            baseX * 3 + twitchR * 10, baseY - 5 * this.scale + Math.abs(this.speed) * 2
        );
        ctx.stroke();
    }

    // --- Pill Bug Specific Drawing Logic ---
    drawPillBug(ctx) {
        // Shadow (unified)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        // Draw Legs first (under body)
        this.drawPillBugLegs(ctx);

        ctx.restore(); // Restore shadow settings for body

        // Draw Segments (Tail to Head)
        for (let i = this.pillBugSegments.length - 1; i >= 0; i--) {
            const s = this.pillBugSegments[i];
            const radius = this.getPillBugSegmentRadius(i);
            const isHead = i === 0;
            const isTail = i === this.pillBugSegments.length - 1;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);

            const baseColor = '#4A5568'; // Slate
            const highlightColor = '#718096';

            ctx.beginPath();

            if (isHead) {
                ctx.fillStyle = '#2D3748';
                ctx.ellipse(4 * this.scale, 0, radius * 0.9, radius, 0, 0, Math.PI * 2);
                ctx.fill();

                // Eyes
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(10 * this.scale, -radius * 0.6, 2.5 * this.scale, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(10 * this.scale, radius * 0.6, 2.5 * this.scale, 0, Math.PI * 2); ctx.fill();

                this.drawPillBugAntennae(ctx, radius);

            } else if (isTail) {
                ctx.fillStyle = baseColor;
                ctx.ellipse(-2 * this.scale, 0, radius, radius * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = baseColor;
                ctx.ellipse(0, 0, radius * 0.65, radius, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.stroke();

                ctx.fillStyle = highlightColor;
                ctx.beginPath();
                ctx.ellipse(-2 * this.scale, 0, radius * 0.25, radius * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    drawPillBugLegs(ctx) {
        ctx.strokeStyle = '#2D3748';
        ctx.lineWidth = 3 * this.scale;
        ctx.lineCap = 'round';

        for (let i = 1; i < this.pillBugSegments.length - 1; i++) {
            const s = this.pillBugSegments[i];
            const radius = this.getPillBugSegmentRadius(i);

            const legOffset = i * 0.8;
            const swing = Math.sin(this.walkCycle + legOffset) * (this.speed > 0.1 ? 1 : 0);

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);

            // Left Leg
            ctx.beginPath();
            ctx.moveTo(0, -radius * 0.8);

            let kneeX = (-2 + swing * 5) * this.scale;
            let kneeY = -radius * 1.5;
            let footX = (-6 + swing * 8) * this.scale;
            let footY = -radius * 1.9 + Math.abs(swing) * 4 * this.scale;

            ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
            ctx.stroke();

            // Right Leg
            ctx.beginPath();
            ctx.moveTo(0, radius * 0.8);
            ctx.quadraticCurveTo(kneeX, -kneeY, footX, -footY);
            ctx.stroke();

            ctx.restore();
        }
    }

    drawPillBugAntennae(ctx, headRadius) {
        ctx.strokeStyle = '#2D3748';
        ctx.lineWidth = 2 * this.scale;

        const twitch = Math.sin(Date.now() / 150) * 0.15;

        // Left
        ctx.beginPath();
        ctx.moveTo(8 * this.scale, -headRadius * 0.4);
        ctx.lineTo(20 * this.scale, -headRadius * 0.8);
        ctx.lineTo((30 + twitch * 10) * this.scale, -headRadius * 1.2);
        ctx.stroke();

        // Right
        ctx.beginPath();
        ctx.moveTo(8 * this.scale, headRadius * 0.4);
        ctx.lineTo(20 * this.scale, headRadius * 0.8);
        ctx.lineTo((30 - twitch * 10) * this.scale, headRadius * 1.2);
        ctx.stroke();
    }

    getPillBugSegmentRadius(index) {
        const scales = [0.8, 0.92, 1.0, 1.0, 0.98, 0.92, 0.85, 0.75, 0.6];
        const s = scales[index] !== undefined ? scales[index] : 0.8;
        return 10 * this.scale * s; // Reduced to 10 (Half size)
    }

    updateVisuals() {
        // ALWAYS run predation logic (Spiders reach, others lunge)
        this.updatePredation();

        // --- Update Animations ---
        if (this.form === 'LADYBUG') {
            // 步态速度随移动速度变化
            if (this.speed > 0.1) {
                this.walkCycle += 0.1 * (this.speed / this.maxSpeed);
            }
            this.antennaTimer += 0.05;
            return; // Skip Ant specific IK update
        } else if (this.form === 'PILLBUG') {
            if (this.speed > 0.1) {
                this.walkCycle += this.speed * 0.2;
            }

            // Update Head Segment
            if (this.pillBugSegments.length === 0) {
                // Init if missing (sanity check)
                for (let i = 0; i < 9; i++) this.pillBugSegments.push({ x: this.pos.x, y: this.pos.y, angle: this.angle });
            }
            let head = this.pillBugSegments[0];
            head.x = this.pos.x + this.lungeOffset.x;
            head.y = this.pos.y + this.lungeOffset.y;
            head.angle = this.angle;

            // IK for body segments
            let spacing = 12 * this.scale; // Keep spacing relative to scale, maybe reduce spacing too? 
            // If size is halved, spacing should probably be halved too? 
            // Original: 12. Let's try 6.
            spacing = 6 * this.scale;

            for (let i = 1; i < this.pillBugSegments.length; i++) {
                const current = this.pillBugSegments[i];
                const prev = this.pillBugSegments[i - 1];

                const dx = prev.x - current.x;
                const dy = prev.y - current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angleToPrev = Math.atan2(dy, dx);

                const currentSpacing = i === 1 ? spacing : spacing * 0.9;

                // Simple lerp for smooth following
                let targetX = prev.x - Math.cos(angleToPrev) * currentSpacing;
                let targetY = prev.y - Math.sin(angleToPrev) * currentSpacing;

                current.x += (targetX - current.x) * 0.5;
                current.y += (targetY - current.y) * 0.5;
                current.angle = angleToPrev;
            }
            return;
        } else if (this.form === 'COCKROACH') {
            // Update Antennae
            let headPos = this.pos.add(this.lungeOffset).add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(35 * this.scale));
            if (this.leftCockroachAntenna) {
                this.leftCockroachAntenna.updateScale(this.scale);
                this.leftCockroachAntenna.update(headPos, this.angle, this.vel);
            }
            if (this.rightCockroachAntenna) {
                this.rightCockroachAntenna.updateScale(this.scale);
                this.rightCockroachAntenna.update(headPos, this.angle, this.vel);
            }

            // Update Legs
            let speedMag = this.vel.mag();
            this.gaitClock += speedMag * 0.15;
            let groupA_CanStep = Math.sin(this.gaitClock) > 0;

            if (this.cockroachLegs.length === 0) return; // safety

            this.cockroachLegs.forEach((leg, i) => {
                leg.updateScale(this.scale);
                // Indices: 0(FL), 1(FR), 2(ML), 3(MR), 4(BL), 5(BR)
                // Tripod A: 0, 3, 4 (FL, MR, BL)
                // Tripod B: 1, 2, 5 (FR, ML, BR)
                let isGroupA = (i === 0 || i === 3 || i === 4);
                let allowed = (isGroupA && groupA_CanStep) || (!isGroupA && !groupA_CanStep);

                if (speedMag > 0.5) {
                    if (allowed) leg.update(this.pos, this.angle, this.vel);
                } else {
                    leg.update(this.pos, this.angle, this.vel, false);
                }

            });
            return;
        } else if (this.form === 'SPIDER') {
            // Logic is now driven by legs calling toggleGait()
            this.spiderLegs.forEach(leg => leg.update());
            return;
        } else if (this.form === 'MANTIS') {
            this.animTimer += 0.1;

            // Turn logic for animation (Approximated since we don't have deltaAngle from input directly)
            // Use angular velocity or change in angle?
            // We can approximate turnAmount by (currentAngle - prevAngle)
            // But prevAngle isn't stored explicitly every frame in a way reliable for this?
            // Actually `this.angle` changes in `update`.
            // Let's rely on `this.vel` or just simple swaying for now?
            // User code used `deltaAngle`.
            // Let's just sway based on movement.

            const sway = Math.sin(this.animTimer) * 0.1;
            // A simple turn tilt if we wanted (optional)

            this.abdomenAngle = this.abdomenAngle * 0.9 + sway * 0.1; // Simple lerp
            // this.headAngle ... 

            this.mantisLegs.forEach(leg => {
                leg.updateScale(this.scale);
                leg.update(this.pos.x, this.pos.y, this.angle, this.vel.mag());
            });
            return;
        } else if (this.form === 'CRICKET') {
            this.cricketAntennaTimer += 0.1 + (this.vel.mag() * 0.1);

            let stepThreshold = 40;
            this.cricketLegs.forEach(leg => {
                leg.updateScale(this.scale);
                leg.update(this.pos, this.angle, this.vel, stepThreshold);
            });
            return;
        }

        this.thoraxPos = this.pos;

        // --- 身体跟随 ---
        let headTarget = this.pos.add(new Vec2(Math.cos(this.angle) * 5.5 * this.scale, Math.sin(this.angle) * 5.5 * this.scale));
        this.headPos = this.headPos.add(headTarget.sub(this.headPos).mult(0.5));

        let abTarget = this.pos.add(new Vec2(Math.cos(this.angle) * -7 * this.scale, Math.sin(this.angle) * -7 * this.scale));
        this.abdomenPos = this.abdomenPos.add(abTarget.sub(this.abdomenPos).mult(0.4));

        if (this.legs.length < 6) return; // Guard: Logic below assumes 6 standard legs

        let groupAMoving = this.legs[0].isMoving || this.legs[4].isMoving || this.legs[2].isMoving;
        let groupBMoving = this.legs[3].isMoving || this.legs[1].isMoving || this.legs[5].isMoving;

        let canGroupAMove = !groupBMoving;
        let canGroupBMove = !groupAMoving;

        this.legs.forEach(leg => {
            let canMove = false;
            if ([0, 4, 2].includes(leg.id)) canMove = canGroupAMove;
            else canMove = canGroupBMove;
            leg.update(this.thoraxPos, this.angle, this.vel, canMove);
        });
    }

    drawMantis(ctx) {
        const s = this.scale;
        // 1. Shadows
        ctx.save();
        ctx.translate(this.pos.x + 5 * s, this.pos.y + 5 * s);
        ctx.rotate(this.angle);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        // Width 40*s, Height 15*s
        ctx.ellipse(-10 * s, 0, 40 * s, 15 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Legs (Under body)
        // 2. Legs (Walking Legs & Scythes - Under body)
        // Draw all legs (0-5) before body so they appear connected underneath.
        for (let i = 0; i < 6; i++) {
            if (this.mantisLegs[i]) this.mantisLegs[i].draw(ctx);
        }

        // Draw Held Prey (Under body or Over? Legs are under body, prey held by legs should maybe be under too?)
        if (this.predationState === 'mantis_grapple' && this.heldPrey) {
            this.drawHeldPrey(ctx);
        }

        // 3. Body
        ctx.save();
        ctx.translate(this.pos.x + this.lungeOffset.x, this.pos.y + this.lungeOffset.y);
        ctx.rotate(this.angle);

        // --- Abdomen ---
        ctx.save();
        ctx.translate(-25 * s, 0);
        ctx.rotate(this.abdomenAngle);

        // Main
        ctx.fillStyle = '#6DA04B';
        ctx.beginPath();
        ctx.ellipse(-30 * s, 0, 45 * s, 18 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lines
        ctx.strokeStyle = '#558238';
        ctx.lineWidth = 2 * s;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo((-15 - i * 12) * s, (-15 + i * 2) * s);
            ctx.quadraticCurveTo((-15 - i * 12 - 5) * s, 0, (-15 - i * 12) * s, (15 - i * 2) * s);
            ctx.stroke();
        }

        // Wings
        ctx.fillStyle = 'rgba(128, 168, 108, 0.6)';
        ctx.beginPath();
        ctx.moveTo(-10 * s, -8 * s);
        ctx.lineTo(-70 * s, -2 * s);
        ctx.lineTo(-10 * s, 8 * s);
        ctx.fill();

        ctx.restore();

        // --- Thorax ---
        ctx.fillStyle = '#7CAF54';
        ctx.beginPath();
        ctx.moveTo(-25 * s, -6 * s);
        ctx.lineTo(25 * s, -4 * s);
        ctx.lineTo(25 * s, 4 * s);
        ctx.lineTo(-25 * s, 6 * s);
        ctx.fill();

        // Midline
        ctx.strokeStyle = '#5D8A40';
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(-25 * s, 0);
        ctx.lineTo(25 * s, 0);
        ctx.stroke();

        // --- Head ---
        ctx.save();
        ctx.translate(25 * s, 0);
        ctx.rotate(this.headAngle);

        // Triangle Head
        ctx.fillStyle = '#8BC34A';
        ctx.beginPath();
        ctx.moveTo(0, -8 * s);
        ctx.lineTo(12 * s, 0);
        ctx.lineTo(0, 8 * s);
        ctx.lineTo(-4 * s, 0);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#E1F5C4'; // Highlight
        // Left Eye
        ctx.beginPath();
        ctx.ellipse(2 * s, -8 * s, 4 * s, 6 * s, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#DDDDDD';
        ctx.fill();
        ctx.beginPath(); // Pupil
        ctx.arc(3 * s, -8 * s, 1.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();

        // Right Eye
        ctx.beginPath();
        ctx.ellipse(2 * s, 8 * s, 4 * s, 6 * s, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#DDDDDD';
        ctx.fill();
        ctx.beginPath(); // Pupil
        ctx.arc(3 * s, 8 * s, 1.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();

        // Antennae
        ctx.strokeStyle = '#4a3b22';
        ctx.lineWidth = 0.5 * s;

        // Left Antenna
        ctx.beginPath();
        ctx.moveTo(12 * s, -2 * s);
        ctx.quadraticCurveTo((25 + Math.sin(this.animTimer * 2) * 5) * s, -15 * s, 35 * s, -20 * s);
        ctx.stroke();

        // Right Antenna
        ctx.beginPath();
        ctx.moveTo(12 * s, 2 * s);
        ctx.quadraticCurveTo((25 + Math.cos(this.animTimer * 2) * 5) * s, 15 * s, 35 * s, 20 * s);
        ctx.stroke();

        ctx.restore(); // End Head
        ctx.restore(); // End Body


    }

    drawCockroach(ctx) {
        // Draw Legs
        this.cockroachLegs.forEach(leg => leg.draw(ctx, this.pos, this.angle));

        // Draw Antennae
        if (this.leftCockroachAntenna) this.leftCockroachAntenna.draw(ctx);
        if (this.rightCockroachAntenna) this.rightCockroachAntenna.draw(ctx);

        ctx.save();
        ctx.translate(this.pos.x + this.lungeOffset.x, this.pos.y + this.lungeOffset.y);
        ctx.rotate(this.angle);

        // Shadow (Wider)
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        // Width 42 * scale, Height 26 * scale
        ctx.ellipse(0, 0, 42 * this.scale, 26 * this.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 1. Abdomen (Body) - Wider and Larger
        let abdomenGradient = ctx.createRadialGradient(-10 * this.scale, -5 * this.scale, 0, 0, 0, 55 * this.scale);
        abdomenGradient.addColorStop(0, "#3E2723");
        abdomenGradient.addColorStop(0.6, "#1a0f0a");
        abdomenGradient.addColorStop(1, "#050201");

        ctx.fillStyle = abdomenGradient;
        ctx.beginPath();
        // 修正：从 (20,0) 开始，加宽控制点 Y 到 +/- 28 (原18)，延伸尾部到 -70 (原-50)
        let s = this.scale;
        ctx.moveTo(25 * s, 0);
        ctx.bezierCurveTo(25 * s, 28 * s, -55 * s, 25 * s, -70 * s, 0);
        ctx.bezierCurveTo(-55 * s, -25 * s, 25 * s, -28 * s, 25 * s, 0);
        ctx.fill();

        // Segment lines
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1 * s;
        for (let i = -50; i < 10; i += 12) {
            ctx.beginPath();
            ctx.moveTo(i * s, -18 * s);
            ctx.quadraticCurveTo((i - 8) * s, 0, i * s, 18 * s);
            ctx.stroke();
        }

        // 2. Wings (Folded)
        ctx.fillStyle = "rgba(160, 82, 45, 0.7)";
        ctx.beginPath();
        ctx.moveTo(28 * s, 0);
        ctx.quadraticCurveTo(25 * s, 26 * s, -75 * s, 10 * s);
        ctx.lineTo(-75 * s, -10 * s);
        ctx.quadraticCurveTo(25 * s, -26 * s, 28 * s, 0);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        ctx.ellipse(-15 * s, 8 * s, 25 * s, 8 * s, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(100, 50, 20, 0.3)";
        ctx.lineWidth = 0.5 * s;
        ctx.beginPath();
        ctx.moveTo(28 * s, 0);
        ctx.quadraticCurveTo(0, 15 * s, -70 * s, 8 * s);
        ctx.stroke();

        // 3. Pronotum (前胸背板)
        let pronotumGrad = ctx.createRadialGradient(25 * s, -2 * s, 0, 25 * s, 0, 15 * s);
        pronotumGrad.addColorStop(0, "#5d4037");
        pronotumGrad.addColorStop(0.5, "#2d1e18");
        pronotumGrad.addColorStop(1, "#0f0500");

        ctx.fillStyle = pronotumGrad;
        ctx.beginPath();
        ctx.ellipse(25 * s, 0, 14 * s, 16 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.ellipse(25 * s, -5 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Head (Hidden mostly)
        ctx.fillStyle = "#0f0500";
        ctx.beginPath();
        ctx.ellipse(38 * s, 0, 5 * s, 7 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cerci
        ctx.strokeStyle = "#2d1e18";
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(-65 * s, 6 * s);
        ctx.lineTo(-75 * s, 10 * s);
        ctx.moveTo(-65 * s, -6 * s);
        ctx.lineTo(-75 * s, -10 * s);
        ctx.stroke();

        ctx.restore();
    }

    drawSpider(ctx) {
        // Shadow pass
        ctx.save();
        ctx.translate(5 * this.scale, 5 * this.scale);
        ctx.globalAlpha = 0.1;
        this.drawSpiderBody(ctx, true);
        ctx.restore();

        // Legs
        this.spiderLegs.forEach(leg => leg.draw(ctx));

        // Held Prey
        this.drawHeldPrey(ctx);

        // Body
        this.drawSpiderBody(ctx, false);
    }

    drawSpiderBody(ctx, isShadow) {
        const bodyColor = isShadow ? '#000' : '#5d4037';
        const abdomenColor = isShadow ? '#000' : '#8d6e63';

        const bodySize = 8 * this.scale; // From config roughly
        const abdomenSize = 12 * this.scale;

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);

        // Breathing effect
        const breathe = Math.sin(Date.now() / 200) * 1.5 * this.scale;

        // Abdomen (Long/Oval) - Offset slightly back
        ctx.beginPath();
        // ellipses: x, y, radiusX, radiusY, rotation...
        ctx.ellipse(-bodySize - (2 * this.scale), breathe * 0.5, abdomenSize, bodySize * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = abdomenColor;
        ctx.fill();

        // Thorax
        ctx.beginPath();
        ctx.arc(0, 0, bodySize, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.fill();

        // Eyes
        if (!isShadow) {
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(4 * this.scale, -2 * this.scale, 1.5 * this.scale, 0, Math.PI * 2);
            ctx.arc(4 * this.scale, 2 * this.scale, 1.5 * this.scale, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getEatRange() {
        if (this.form === 'SPIDER') {
            return SPIDER_CONFIG.legLength * 0.8 * this.scale;
        } else if (this.form === 'MANTIS') {
            return 120 * this.scale; // Significantly increased Scythe reach to ensure visible grapple
        }
        return 25 * this.scale;
    }

    startPredation(prey, consumeCallback) {
        if (this.predationState !== 'idle') return false; // Busy

        this.heldPrey = {
            pos: prey.pos.clone(), // Clone position to animate independently
            color: prey.color || '#fff',
            size: (prey.size || 5) * (prey.scale || 1)
        };
        this.onConsumePrey = consumeCallback;
        this.predationTimer = 0;

        if (this.form === 'SPIDER' && this.spiderLegs.length >= 2) {
            this.predationState = 'reaching';
            // Front legs reach out
            const frontLeft = this.spiderLegs[0];
            const frontRight = this.spiderLegs[1];
            frontLeft.overrideTarget = this.heldPrey.pos;
            frontRight.overrideTarget = this.heldPrey.pos;
        } else if (this.form === 'MANTIS' && this.mantisLegs) {
            this.predationState = 'mantis_grapple';
            this.predationTimer = 0;
            // Front Arms: Index 4, 5
            const armL = this.mantisLegs[4]; // Left
            const armR = this.mantisLegs[5]; // Right
            armL.overrideTarget = this.heldPrey.pos;
            armR.overrideTarget = this.heldPrey.pos;
        } else {
            // Generic Lunge
            this.predationState = 'lunging';
            this.lungeTimer = 10; // 10 Frames total lunge
        }

        return true;
    }

    updatePredation() {
        if (this.predationState === 'idle') return;

        // --- Mantis Grapple ---
        if (this.predationState === 'mantis_grapple') {
            this.predationTimer++;
            const armL = this.mantisLegs[4];
            const armR = this.mantisLegs[5];

            // Pull Stage (Immediate pull for snappy feel, or delayed?)
            // Let's do: 
            // 1. Arms go to prey (Already set overrideTarget in start)
            // 2. Drag prey to Head

            // Target Position: Mouth
            const mouthPos = this.headPos.clone().add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(5 * this.scale));

            // Smoothly pull prey to mouth
            const dist = this.heldPrey.pos.dist(mouthPos);

            // Pull Speed
            const pullSpeed = 4.0 * this.scale;

            if (dist > pullSpeed) {
                // Move prey towards mouth
                let dir = mouthPos.sub(this.heldPrey.pos).normalize().mult(pullSpeed);
                this.heldPrey.pos = this.heldPrey.pos.add(dir);

                // Update arms target to follow prey
                armL.overrideTarget = this.heldPrey.pos;
                armR.overrideTarget = this.heldPrey.pos;
            } else {
                // Arrived at mouth
                if (this.onConsumePrey) {
                    this.onConsumePrey(this.heldPrey.pos); // Particles
                    this.onConsumePrey = null;
                }
                this.predationState = 'idle';
                armL.overrideTarget = null;
                armR.overrideTarget = null;
            }
            return;
        }

        // --- Generic Lunge ---
        if (this.predationState === 'lunging') {
            this.lungeTimer--;

            // Apex at timer = 5 (Starts at 10)
            let progress = 0;
            if (this.lungeTimer >= 5) {
                // Outward: 10 -> 5 maps to 0 -> 1
                progress = (10 - this.lungeTimer) / 5;
            } else {
                // Inward: 5 -> 0 maps to 1 -> 0
                progress = this.lungeTimer / 5;
            }

            // Calc Offset (Forward vector * scale * amount)
            let lungeDist = 15 * this.scale;
            this.lungeOffset = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(lungeDist * progress);

            // Trigger Eat at Apex
            if (this.lungeTimer === 5) {
                if (this.onConsumePrey) {
                    this.onConsumePrey(this.headPos.clone().add(this.lungeOffset));
                    this.onConsumePrey = null; // Done
                }
            }

            if (this.lungeTimer <= 0) {
                this.predationState = 'idle';
                this.lungeOffset = new Vec2(0, 0);
            }
            return;
        }

        // --- Spider Logic ---
        const frontLeft = this.spiderLegs[0];
        const frontRight = this.spiderLegs[1];

        if (this.predationState === 'reaching') {
            // Legs moving to prey (handled by overrideTarget lerp in leg.update)
            // Check if close enough to grab
            // For now, just timer based is safer / simpler
            this.predationTimer++;
            if (this.predationTimer > 20) { // 20 frames reach
                this.predationState = 'retracting';
                // Set target to mouth
                frontLeft.overrideTarget = this.headPos;
                frontRight.overrideTarget = this.headPos;
            }
        } else if (this.predationState === 'retracting') {
            // Update targets to follow moving head
            frontLeft.overrideTarget = this.headPos;
            frontRight.overrideTarget = this.headPos;

            // Drag prey to mouth
            // Prey position should follow leg tips (average of two tips)
            const tipCenter = frontLeft.currentPos.add(frontRight.currentPos).mult(0.5);
            this.heldPrey.pos = tipCenter;

            this.predationTimer++;
            // Check distance to mouth
            if (this.heldPrey.pos.dist(this.headPos) < 15 * this.scale) {
                // Eat!
                if (this.onConsumePrey) this.onConsumePrey(this.heldPrey.pos); // Trigger particles/XP logic

                // Reset
                this.heldPrey = null;
                this.predationState = 'idle';
                this.onConsumePrey = null;

                // Release legs
                frontLeft.overrideTarget = null;
                frontRight.overrideTarget = null;
            }
        }
    }

    drawHeldPrey(ctx) {
        if (!this.heldPrey) return;
        ctx.beginPath();
        ctx.arc(this.heldPrey.pos.x, this.heldPrey.pos.y, this.heldPrey.size, 0, Math.PI * 2);
        ctx.fillStyle = this.heldPrey.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();

    }

    drawCricket(ctx) {
        ctx.save();

        // 1. Legs (Under Body)
        this.cricketLegs.forEach(leg => {
            leg.draw(ctx);
        });

        // Transform to Body Center
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        // Note: Scale is handled via leg.scale. But for body we use this.scale manually or apply ctx.scale?
        // In snippet: `ctx.scale(this.scale, this.scale);`
        // Existing Insect methods often use `* s` manually.
        // Let's check `drawMantis`. It uses `const s = this.scale` and multiplies.
        // The snippet used `ctx.scale`. 
        // Mixing `ctx.scale` could affect stroke width if not careful, but snippet did `ctx.scale` and standard linewidths.
        // I will use manual multiplication `* s` to be consistent with `Insect.js` style if possible, 
        // OR just use `ctx.scale` if the snippet logic is complex with hardcoded coords.
        // Snippet uses: `ctx.ellipse(-25, 0, 45, 22 ...)` hardcoded.
        // So I MUST use `ctx.scale`.

        ctx.scale(this.scale, this.scale);

        // 2. Antennae
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 1.5; // Scaled by previous ctx.scale
        ctx.lineCap = "round";

        for (let side = -1; side <= 1; side += 2) {
            ctx.beginPath();
            ctx.moveTo(40, side * 5); // Head start

            let segments = 10;
            let length = 90;
            let startX = 40;
            let startY = side * 5;

            for (let i = 0; i <= segments; i++) {
                let t = i / segments;
                // Bend
                let bend = Math.sin(this.cricketAntennaTimer + i * 0.5) * 10 * (this.vel.mag() > 0.1 ? 2 : 0.5);
                // Drag (Inertia)
                // Use simplified drag based on velocity? 
                // this.vel is global world vel. Relative to body?
                // `this.vel.mag()` is scalar speed.
                // In snippet: `let drag = -this.vel.mag() * 5 * side;`
                // This assumes moving forward drags them back.
                let drag = -this.vel.mag() * 5 * side; // Simplified direction assumption

                let curX = startX + (length / segments) * i;
                let curY = startY + (side * i * 4) + (bend * t) + (drag * t * t);

                ctx.lineTo(curX, curY);
            }
            ctx.stroke();
        }

        // 3. Body Parts (Back to Front)

        // Abdomen
        ctx.fillStyle = "#4e342e"; // Dark Brown
        ctx.beginPath();
        ctx.ellipse(-25, 0, 45, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Segments
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 2;
        for (let i = 1; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(-25 - i * 8, 0, 20 - i * 2, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
        }

        // Highlight
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath();
        ctx.ellipse(-25, -8, 30, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Thorax
        ctx.fillStyle = "#3e2723"; // Deeper
        ctx.beginPath();
        // roundRect might not be supported in all envs? standard in modern browsers.
        if (ctx.roundRect) {
            ctx.roundRect(10, -18, 30, 36, 10);
        } else {
            ctx.rect(10, -18, 30, 36);
        }
        ctx.fill();

        // Highlight
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.ellipse(25, -5, 10, 6, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = "#271c19"; // Almost Black
        ctx.beginPath();
        ctx.arc(45, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.ellipse(50, -8, 4, 6, 0.5, 0, Math.PI * 2); // Left
        ctx.ellipse(50, 8, 4, 6, -0.5, 0, Math.PI * 2); // Right
        ctx.fill();

        // Eye Highlight
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(51, -8, 1, 0, Math.PI * 2);
        ctx.arc(51, 8, 1, 0, Math.PI * 2);
        ctx.fill();

        // Cerci (Tail)
        ctx.strokeStyle = "#4e342e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-65, -5);
        ctx.lineTo(-85, -15);
        ctx.moveTo(-65, 5);
        ctx.lineTo(-85, 15);
        ctx.stroke();

        ctx.restore();
    }



    toggleGait() {
        // Debounce toggle to prevent rapid flickering
        const now = Date.now();
        if (now - this.lastStepChange > 100) {
            this.stepGroup = (this.stepGroup + 1) % 2;
            this.lastStepChange = now;
        }
    }
}