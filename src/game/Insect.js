import { Vec2 } from './Vec2.js';
import { Leg } from './Leg.js';

import { SpiderLeg, SPIDER_CONFIG } from './SpiderParts.js';
import { MantisLeg } from './MantisParts.js';
import { CricketLeg } from './CricketParts.js';
import { StickInsectLeg } from './StickInsectParts.js';
import { CockroachLeg, CockroachAntenna, CockroachEffect } from './CockroachParts_Fixed.js';

import { RhinoBeetleLeg } from './RhinoBeetleParts.js';
import { CentipedeLeg } from './CentipedeParts.js';
import { ScorpionLeg, ScorpionClaw, ScorpionEffect } from './ScorpionParts.js';
import { TitanLeg, TitanUtils } from './TitanParts.js';
import { WetaLeg, WetaAntenna, drawGiantWeta, WetaEffect } from './WetaParts.js';
import { TarantulaLeg, AttackEffect, WebProjectile, TARANTULA_SETTINGS } from './TarantulaParts.js';

// --- Standardized Size Configuration ---
// Defines the scale range for each evolution stage.
export const STAGE_CONFIG = {
    0: { name: 'PRIMITIVE', startScale: 0.8, endScale: 1.2 },
    1: { name: 'ANT', startScale: 1.2, endScale: 1.8 },
    2: { name: 'LADYBUG', startScale: 1.8, endScale: 2.6 },
    3: { name: 'PILLBUG', startScale: 2.6, endScale: 4.0 },
    4: { name: 'COCKROACH', startScale: 4.5, endScale: 6.0 },
    5: { name: 'SPIDER', startScale: 6.5, endScale: 10.0 },
    6: { name: 'MANTIS', startScale: 12.0, endScale: 18.0 },
    7: { name: 'CRICKET', startScale: 20.0, endScale: 26.0 },
    8: { name: 'GIANT_WETA', startScale: 35.0, endScale: 45.0 },
    9: { name: 'STICK_INSECT', startScale: 60.0, endScale: 80.0 },
    10: { name: 'TARANTULA', startScale: 100.0, endScale: 130.0 },
    11: { name: 'CENTIPEDE', startScale: 150.0, endScale: 200.0 },
    12: { name: 'SCORPION', startScale: 325.0, endScale: 420.0 },
    13: { name: 'TITAN', startScale: 500.0, endScale: 600.0 }
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

        // --- AI Properties ---
        this.visionRadius = 400; // Base vision, will scale
        this.chaseTimer = 0;
        this.isChasing = false;
        this.isFleeing = false;
        this.scale = config.startScale;
        this.damagePopups = []; // Visual Damage Numbers

        // --- Prestige / World Reset Multiplier ---
        this.worldTier = 1.0;
        // Used to shrink the entity physically when the world resets,
        // without affecting its "Canonical" base scale.
        this.worldScaleModifier = 1.0;


        this.flashTimer = 0; // Visual effect for leveling up

        // 颜色配置
        this.colors = {
            head: 'rgba(16, 185, 129, 0.9)', // Emerald 500
            thorax: 'rgba(5, 150, 105, 0.9)', // Emerald 600
            abdomen: 'rgba(4, 120, 87, 0.9)', // Emerald 700
            gradStart: 'rgba(52, 211, 153, 0.9)', // Emerald 400 (Highlight)
            gradEnd: 'rgba(6, 78, 59, 0.9)'   // Emerald 900 (Shadow)
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

        // --- Stick Insect Properties ---
        this.stickLegs = [];
        this.stickSegments = [];

        // --- Tarantula Properties ---
        this.tarantulaLegs = [];
        this.stepGroup = 0; // Shared step group logic
        this.moveDist = 0;

        // --- Giant Weta Properties ---
        this.wetaLegs = [];
        this.wetaAntennae = [];

        // --- Mantis Vars ---
        this.mantisAttackState = 0; // 0:Idle, 1:Charge, 2:Strike, 3:Retract
        this.mantisAttackTimer = 0;
        this.mantisLunge = 0;
        this.mantisEffects = [];
        this.mantisAbdomenAngle = 0;
        this.mantisHeadAngle = 0;
        this.animTimer = 0;
        this.mantisAttackTarget = null;

        // --- Rhino Vars ---
        this.rhinoLegs = [];
        this.rhinoWalkCycle = 0;

        // --- Centipede Properties ---
        this.centipedeSegments = []; // Array of {x, y, angle}
        this.centipedeLegs = []; // Legs are dynamic or stored? Reference generated them on fly or just drawn? 
        // Reference: `drawLeg` called inside loop. We can use a single `CentipedeLeg` class instance as helper or store them.
        // Let's store them to maintain state/scale if needed. But Reference `drawLeg` is stateless except phase.
        // My CentipedeLeg class is stateless-ish.
        this.centipedeLegPhase = 0;

        // --- Scorpion Properties ---
        this.scorpionLegs = [];
        this.scorpionClaws = [];
        this.scorpionSegments = [];
        this.scorpionStingProgress = 0;
        this.scorpionStingTarget = 0;
        this.scorpionAttackState = 'none';
        this.scorpionAttackTimer = 0;
        this.scorpionEffects = [];

        // --- TITAN Properties ---
        this.titanLegs = [];
        this.titanTail = [];
        this.titanAntennae = [];
        this.titanTime = 0;

        // --- Titan Quest Properties ---
        // Requirement: 50 Scorpions, 30 Centipedes, 20 Tarantulas
        this.titanQuest = {
            active: false,
            scorpions: 0,
            centipedes: 0,
            tarantulas: 0,
            reqScorpions: 50,
            reqCentipedes: 30,
            reqTarantulas: 20
        };

        // --- Tarantula Vars ---
        this.tarantulaEffects = [];
        this.tarantulaWebs = [];
        this.webCooldown = 0;
        this.tarantulaAttackTimer = 0;
        this.moveDist = 0;
        this.stepGroup = 0;
        this.stepGroup = 0;
        this.palps = [{ ang: -0.35, len: 22 }, { ang: 0.35, len: 22 }];

        // --- Cockroach Properties ---
        this.cockroachLegs = [];
        this.cockroachAntennae = [];
        this.cockroachEffects = [];
        this.wingOpenFactor = 0;
        this.wasAttacking = false;
        this.gaitClock = 0;
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
        } else if (this.form === 'STICK_INSECT') {
            this.stickLegs = [
                new StickInsectLeg(-1, 0, 120, this.scale), new StickInsectLeg(1, 0, 120, this.scale),
                new StickInsectLeg(-1, 1, 180, this.scale), new StickInsectLeg(1, 1, 180, this.scale),
                new StickInsectLeg(-1, 2, 200, this.scale), new StickInsectLeg(1, 2, 200, this.scale)
            ];

            // Init Segments if empty
            if (this.stickSegments.length === 0) {
                let segCounts = 12;
                // Initialize behind player
                for (let i = 0; i < segCounts; i++) {
                    this.stickSegments.push(this.pos.sub(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(i * 18 * this.scale)));
                }
            }

            this.stickLegs.forEach(leg => {
                leg.updateScale(this.scale);
                // leg.update(this) called in loop
            });
            this.legs = [];
        } else if (this.form === 'TARANTULA') {
            this.tarantulaLegs = [];
            // Init 8 legs (4 pairs)
            for (let i = 0; i < 4; i++) {
                // Simulation uses Leg(parent, side (-1/1), index)
                // My TarantulaLeg(side, index, scale)
                this.tarantulaLegs.push(new TarantulaLeg(-1, i, this.scale));
                this.tarantulaLegs.push(new TarantulaLeg(1, i, this.scale));
            }
            this.legs = [];
        } else if (this.form === 'COCKROACH') {
            this.cockroachEffects = [];
            this.cockroachAntennae = [
                new CockroachAntenna(130, 12, -1, this.scale),
                new CockroachAntenna(130, 12, 1, this.scale)
            ];

            this.cockroachLegs = [
                new CockroachLeg(-1, 0, new Vec2(22, -16), 28, 25, this.scale),
                new CockroachLeg(1, 0, new Vec2(22, 16), 28, 25, this.scale),
                new CockroachLeg(-1, 1, new Vec2(5, -22), 40, 30, this.scale),
                new CockroachLeg(1, 1, new Vec2(5, 22), 40, 30, this.scale),
                new CockroachLeg(-1, 2, new Vec2(-15, -20), 48, 35, this.scale),
                new CockroachLeg(1, 2, new Vec2(-15, 20), 48, 35, this.scale)
            ];
            // Init feet
            this.cockroachLegs.forEach(l => l.update(this.pos, this.angle, this.vel));
            this.legs = [];
        } else if (this.form === 'RHINO_BEETLE') {
            this.rhinoLegs = [
                new RhinoBeetleLeg(1, 0, this.scale),
                new RhinoBeetleLeg(-1, 0, this.scale),
                new RhinoBeetleLeg(1, 1, this.scale),
                new RhinoBeetleLeg(-1, 1, this.scale),
                new RhinoBeetleLeg(1, 2, this.scale),
                new RhinoBeetleLeg(-1, 2, this.scale)
            ];
            this.legs = [];
        } else if (this.form === 'CENTIPEDE') {
            // Init Segments
            this.centipedeSegments = [];
            const SEGMENT_COUNT = 40;
            // Start behind head
            for (let i = 0; i < SEGMENT_COUNT; i++) {
                this.centipedeSegments.push({
                    x: this.pos.x - (i * (18 * 0.6 * this.scale)),
                    y: this.pos.y,
                    angle: this.angle
                });
            }

            // Legs: 1 pair per segment (except head/tail maybe? Reference: 1 to count-1)
            this.centipedeLegs = [];
            for (let i = 0; i < SEGMENT_COUNT; i++) {
                this.centipedeLegs.push(new CentipedeLeg(i, -1, this.scale));
                this.centipedeLegs.push(new CentipedeLeg(i, 1, this.scale));
            }
            this.legs = [];
        } else if (this.form === 'SCORPION') {
            this.scorpionLegs = [];
            this.scorpionClaws = [];

            // [Reference] 6 legs (3 pairs)
            for (let i = 0; i < 3; i++) {
                this.scorpionLegs.push(new ScorpionLeg(-1, i, this.scale));
                this.scorpionLegs.push(new ScorpionLeg(1, i, this.scale));
            }
            this.scorpionClaws = [new ScorpionClaw(-1, this.scale), new ScorpionClaw(1, this.scale)];

            this.legs = [];

            // Initialize Segments (Always regenerate to ensure correct scaling/positioning)
            this.scorpionSegments = []; // Force reset

            const totalSegs = 16;
            // [Reference] Loop
            for (let i = 0; i < totalSegs; i++) {
                let size = 10;
                if (i < 3) size = 16;      // Head
                else if (i < 9) size = 20 - (i - 3) * 1.2; // Body
                else size = 8;             // Tail (incl seg 9)

                // Init trailing behind head (-Forward)
                let offset = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(-i * 8 * this.scale);

                this.scorpionSegments.push({
                    pos: this.pos.add(offset),
                    sizeBase: size, // Store base for scaling
                    size: size * this.scale,
                    angle: this.angle,
                    type: i < 3 ? 'head' : (i < 10 ? 'body' : 'tail')
                });
            }
        } else if (this.form === 'GIANT_WETA') {
            this.wetaLegs = [];
            this.wetaAntennae = [];
            // Initialize using Reference Constants

            this.wetaLegs.push(new WetaLeg(-1, 0, new Vec2(40, -14), 30, 35));
            this.wetaLegs.push(new WetaLeg(1, 0, new Vec2(40, 14), 30, 35));
            this.wetaLegs.push(new WetaLeg(-1, 1, new Vec2(5, -22), 40, 45));
            this.wetaLegs.push(new WetaLeg(1, 1, new Vec2(5, 22), 40, 45));
            this.wetaLegs.push(new WetaLeg(-1, 2, new Vec2(-48, -18), 75, 85));
            this.wetaLegs.push(new WetaLeg(1, 2, new Vec2(-48, 18), 75, 85));

            // Antennae: 20 segments, 8 length, 0.15 stiffness
            this.wetaAntennae.push(new WetaAntenna(20, 8, 0.15));
            this.wetaAntennae.push(new WetaAntenna(20, 8, 0.15));

            // Clear generic legs just in case
            this.legs = [];
        }
        else if (this.form === 'TITAN') {
            this.titanLegs = [];
            this.titanTail = [];
            this.titanAntennae = [];

            // 1. Legs (3 Pairs)
            const legPos = [80, -120, -280];
            const legLen = [180, 240, 360];
            const legWid = [22, 24, 30];
            const legBend = [1, -1, -1];

            for (let i = 0; i < 3; i++) {
                // Right (Side 1)
                this.titanLegs.push(new TitanLeg(this, {
                    offsetX: legPos[i], offsetY: 60,
                    length: legLen[i], side: 1,
                    width: legWid[i], bendDir: legBend[i],
                    isHeavy: i === 2
                }));
                // Left (Side -1)
                this.titanLegs.push(new TitanLeg(this, {
                    offsetX: legPos[i], offsetY: -60,
                    length: legLen[i], side: -1,
                    width: legWid[i], bendDir: legBend[i],
                    isHeavy: i === 2
                }));
            }

            // 2. Tail (20 Segments)
            for (let i = 0; i < 20; i++) {
                const startOff = -200 - i * 40;
                const offX = Math.cos(this.angle) * startOff * this.scale;
                const offY = Math.sin(this.angle) * startOff * this.scale;

                this.titanTail.push({
                    x: this.pos.x + offX,
                    y: this.pos.y + offY,
                    sizeBase: 65 - i * 2.5,
                    size: (65 - i * 2.5) * this.scale
                });
            }

            // 3. Antennae (2 Chains)
            for (let s of [-1, 1]) {
                const segs = [];
                for (let i = 0; i < 15; i++) {
                    const localX = 150;
                    const localY = s * 50;
                    const rX = localX * Math.cos(this.angle) - localY * Math.sin(this.angle);
                    const rY = localX * Math.sin(this.angle) + localY * Math.cos(this.angle);

                    segs.push({
                        x: this.pos.x + rX * this.scale,
                        y: this.pos.y + rY * this.scale,
                        sizeBase: 12 - i * 0.7,
                        size: (12 - i * 0.7) * this.scale
                    });
                }
                this.titanAntennae.push({ side: s, segments: segs });
            }
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

        // Check for Level Up
        this.checkLevelUp();
    }

    checkLevelUp() {
        if (this.xp >= this.xpToNext) {
            // Check Max Level
            if (this.level >= 5) {
                // At Max Level for current stage
                // Titan Quest Logic for Scorpion (Stage 12)
                if (this.evolutionStage === 12) {
                    // Scorpion CANNOT evolve via XP.
                    // Must complete the Quest.
                    // XP accumulates but does nothing or caps?
                    this.xp = this.xpToNext; // Cap it
                    return;
                }

                // Normal Evolution for other stages
                this.evolve();
            } else {
                this.levelUp();
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
        this.initLegs();
    }

    devolve() {
        if (this.evolutionStage > 0) {
            this.evolutionStage--;
            this.level = 1;
            this.xp = 0;

            // Re-apply stage properties
            // Effectively we can use setLevel(targetStage, 1) but we need to ensure it triggers the form update logic.
            // setLevel calls initLegs but doesn't necessarily set 'form' string unless we copy the massive switch from evolve.
            // Actually, setLevel relies on loop calling evolve().
            // So we can set stage to target-1 and call evolve().

            let targetStage = this.evolutionStage;

            // Reset to 0 and re-evolve to target to ensure all props are correct
            // This is slightly expensive but safest for state consistency.
            this.setLevel(targetStage, 1);

            console.log(`Devolved to Stage ${this.evolutionStage}`);
        }
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
            // Assuming a default scaleConfig[1] or similar is available globally or passed.
            // For now, using a placeholder value or previous logic.
            // Original: this.baseScale *= 1.5; this.targetScale = this.baseScale;
            // User snippet: this.targetScale = scaleConfig[1];
            // To avoid undefined, I'll keep the original fallback logic for baseScale.
            this.baseScale *= 1.5;
            this.targetScale = this.baseScale;
        }
        // Fix: Apply worldScaleModifier immediately to prevent "Giant Jump" then shrink.
        this.scale = this.baseScale * (this.worldScaleModifier || 1.0);

        this.damagePopups = []; // Visual Debug for Hits

        this.vel = new Vec2(0, 0);
        // Immediately apply if instant, but respecting modifier will happen in update loop
        // If instant, we might want to force it
        if (isInstant) {
            this.scale = this.targetScale * this.worldScaleModifier;
        }

        // Increase difficulty for next stage
        // Base XP requirement for Level 1 of new stage should be higher
        // Base XP requirement for Level 1 of new stage should be higher but not crazy
        this.xpToNext = 10 * Math.pow(1.6, this.evolutionStage);
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

            // Fix: Reset Ladybug States
            this.ladybugState = 'idle';
            this.wingOpenAngle = 0;
            this.predationState = 'idle';

            this.pillBugSegments = [];
            for (let i = 0; i < 9; i++) {
                this.pillBugSegments.push({ x: this.pos.x, y: this.pos.y, angle: this.angle });
            }
            formName = "潮虫 (PILLBUG)";
            this.legs = []; // Pillbug has custom leg drawing

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
        } else if (this.evolutionStage === 8) {
            this.form = 'GIANT_WETA';
            this.maxSpeed *= 1.25; // More agile
            this.initLegs();
            formName = "大沙螽 (GIANT WETA)";
        } else if (this.evolutionStage === 9) {
            this.form = 'STICK_INSECT';
            this.maxSpeed *= 1.1;
            this.initLegs();
            formName = "竹节虫 (STICK INSECT)";
        } else if (this.evolutionStage === 10) {
            this.form = 'TARANTULA';
            this.maxSpeed *= 1.1; // Faster?
            this.initLegs();
            formName = "狼蛛 (TARANTULA)";
        } else if (this.evolutionStage === 11) {
            this.form = 'CENTIPEDE';
            this.initLegs();
            formName = "巨型蜈蚣 (CENTIPEDE)";
        } else if (this.evolutionStage === 12) {
            this.form = 'SCORPION';
            this.initLegs();
            formName = "巨型毒蝎 (SCORPION)";
        } else if (this.evolutionStage === 13) {
            this.form = 'TITAN';
            this.initLegs();
            formName = "霸主巅峰 (TITAN)";
        }

        if (this.onEvolve) this.onEvolve(formName, this.evolutionStage);
    }

    // Manual Evolution Trigger



    update(input) {
        if (this.globalAttackCooldown > 0) {
            this.globalAttackCooldown--;
        }

        // Update Damage Popups
        if (this.damagePopups) {
            this.damagePopups.forEach(p => p.update());
            this.damagePopups = this.damagePopups.filter(p => p.life > 0);
        }



        // --- Update Predation Logic (Spider / Mantis) ---
        this.updatePredation();

        // Immobilize if eating (Spider / Mantis Grapple / Scorpion Strike / Weta Bite / Ladybug Slide / Stick Insect)
        if (((this.form === 'SPIDER' || this.form === 'MANTIS') && this.predationState !== 'idle') ||
            (this.form === 'GIANT_WETA' && (this.wetaState === 'biting' || this.wetaState === 'attacking')) ||
            (this.form === 'LADYBUG' && this.ladybugState === 'attacking') ||
            (this.form === 'PILLBUG' && this.predationState === 'attacking') ||
            (this.form === 'CENTIPEDE' && this.predationState === 'attacking') ||
            (this.form === 'STICK_INSECT' && this.predationState === 'attacking')) {
            input = { up: false, down: false, left: false, right: false, shift: false };
        }

        // --- Flee Override (Global) ---
        if (this.isFleeing) {
            this.fleeTimer--;
            if (this.fleeTimer <= 0) {
                this.isFleeing = false;
            } else if (this.fleeTarget) {
                let fx = this.pos.x - this.fleeTarget.x;
                let fy = this.pos.y - this.fleeTarget.y;
                input = {
                    up: fy < -10,
                    down: fy > 10,
                    left: fx < -10,
                    right: fx > 10,
                    shift: true,
                    attack: false // no attacking while fleeing
                };
            }
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
            if (this.stickLegs) this.stickLegs.forEach(leg => leg.updateScale(this.scale));
            if (this.tarantulaLegs) this.tarantulaLegs.forEach(leg => leg.updateScale(this.scale));
            if (this.rhinoLegs) this.rhinoLegs.forEach(leg => leg.updateScale(this.scale));
            if (this.centipedeLegs) this.centipedeLegs.forEach(leg => leg.updateScale(this.scale)); // If any
            if (this.scorpionLegs) this.scorpionLegs.forEach(leg => leg.updateScale(this.scale));
            if (this.scorpionClaws) this.scorpionClaws.forEach(claw => claw.updateScale(this.scale));
            if (this.scorpionSegments) {
                this.scorpionSegments.forEach(seg => {
                    seg.size = seg.sizeBase * this.scale;
                });
            }
        } else {
            this.scale = effectiveTarget;
        }

        if (this.flashTimer > 0) this.flashTimer--;

        let dx = 0;
        let dy = 0;

        // Joystick Support
        if (input.moveVector) {
            dx = input.moveVector.x;
            dy = input.moveVector.y;
        }

        if (input.up) dy -= 1;
        if (input.down) dy += 1;
        if (input.left) dx -= 1;
        if (input.right) dx += 1;

        let targetSpeed = 0;
        let isSprinting = input.shift && this.stamina > 0;

        if (dx !== 0 || dy !== 0) {
            let inputMag = Math.sqrt(dx * dx + dy * dy);
            if (inputMag > 1.0) inputMag = 1.0;

            // Scale speed with size so larger forms don't feel slow when zoomed out
            targetSpeed = this.maxSpeed * this.scale * (isSprinting ? 1.8 : 1.0) * inputMag;

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

            let turnSpeed = 0.15;
            if (this.form === 'SCORPION') turnSpeed = 0.08;
            this.angle += diff * turnSpeed;
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

        if (this.form === 'SCORPION') {
            this.updateScorpion(input);
            return;
        } else if (this.form === 'TARANTULA') {
            this.updateTarantula(input);
            return;
        } else if (this.form === 'STICK_INSECT') {
            this.updateStickInsect(input);
            return;
        } else if (this.form === 'COCKROACH') {
            this.updateCockroach(input);
            return;
        } else if (this.form === 'MANTIS') {
            this.updateMantis(input);
            return;
        } else if (this.form === 'TITAN') {
            this.updateTitan(16 / 1000); // Fixed dt or just allow usage
            // Main update doesn't pass dt to updateVisuals, it uses 'input'.
            // But this.titanTime needs dt.
            // Insect.update() calls this.updateVisuals() without dt usually?
            // Actually Insect.update(input, dt) calls this.updateVisuals()
            // Wait, look at line 854: this.updateVisuals();
            // Insect.update definition: update(input, dt)
            // So dt is available in scope if updateVisuals() took it.
            // But updateVisuals definition at line 1425 likely doesn't take dt?
            // Let's check updateVisuals signature.
            // Assuming dt is not passed, we might need a workaround or check if dt is this.game.dt?
            // For now, let's just leave it, but fix the duplication.
            // Ideally passing 'dt' if available or 0.016.
            this.updateTitan(0.016);
            return;
        } else if (this.form === 'GIANT_WETA') {
            this.updateGiantWeta(input);
            return;
        } else if (this.form === 'CENTIPEDE') {
            this.updateCentipede(input);
            return;
        } else if (this.form === 'LADYBUG') {
            this.updateLadybug(input);
            return;
        } else if (this.form === 'PILLBUG') {
            this.updatePillbug(input);
            return;
        } else if (this.form === 'CRICKET') {
            this.updateCricket(input);
            return;
        }

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
        this.drawInternal(ctx);
        // Debug Hitboxes
        // if (!this.isDead) this.drawDebugHitboxes(ctx);

        // Draw Popups (World Space)
        if (this.damagePopups) {
            this.damagePopups.forEach(p => p.draw(ctx));
        }

        // Draw Health Bar (For Same-Stage Victims)
        if (!this.isPlayer && this.hitsTaken > 0 && this.hitsTaken < 3) {
            const maxHP = 3;
            const curHP = 3 - this.hitsTaken;
            const pct = curHP / maxHP;

            ctx.save();
            ctx.translate(this.pos.x, this.pos.y);
            // Bar dimensions
            const w = 60 * this.scale;
            const h = 10 * this.scale;
            const yOff = -60 * this.scale;

            // Background (Black)
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(-w / 2, yOff, w, h);

            // Fall Damage (Gray/Red Empty?) No just fill.

            // Fill (Green -> Red?) or just Red. User said "Drops by 1/3".
            // Let's use Green for HP.
            ctx.fillStyle = curHP === 2 ? '#ffff00' : '#ff3333'; // Yellow (2/3) then Red (1/3)
            if (curHP === 3) ctx.fillStyle = '#00ff00';

            ctx.fillRect(-w / 2 + 2, yOff + 2, (w - 4) * pct, h - 4);

            // Segments Dividers
            ctx.fillStyle = 'black';
            ctx.fillRect(-w / 2 + (w / 3), yOff, 2, h);
            ctx.fillRect(-w / 2 + (2 * w / 3), yOff, 2, h);

            // Border
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w / 2, yOff, w, h);
            ctx.restore();
        }
    }

    getBodyZones() {
        let zones = [];
        let radiusMult = 1.0;
        if (this.form === 'SPIDER') radiusMult = 0.6;
        if (this.form === 'CRICKET') radiusMult = 0.8;

        // Base Body
        let baseRadius = (this.size || 6) * (this.scale || 1) * radiusMult;
        // Pillbug visual is chunky, increase base hit
        if (this.form === 'PILLBUG') baseRadius *= 1.5;

        zones.push({ pos: this.pos, radius: baseRadius });

        // Head
        if (this.headPos) zones.push({ pos: this.headPos, radius: 4 * (this.scale || 1) * radiusMult });

        // Specifics
        if (this.form === 'MANTIS') {
            let backDir = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(-1);
            zones.push({ pos: this.pos.add(backDir.mult(40 * this.scale)), radius: 15 * this.scale });
            zones.push({ pos: this.pos.add(backDir.mult(70 * this.scale)), radius: 20 * this.scale });
        } else if (this.form === 'TARANTULA') {
            zones.push({ pos: this.pos.add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(4 * this.scale)), radius: 20 * this.scale });
            zones.push({ pos: this.pos.add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(-30 * this.scale)), radius: 30 * this.scale });
        } else if (this.form === 'CENTIPEDE' && this.centipedeSegments) {
            this.centipedeSegments.forEach(seg => {
                zones.push({ pos: new Vec2(seg.x, seg.y), radius: 12 * this.scale });
            });
        } else if (this.form === 'SCORPION' && this.scorpionSegments) {
            this.scorpionSegments.forEach(seg => {
                zones.push({ pos: seg.pos, radius: seg.size });
            });
        } else if (this.form === 'GIANT_WETA') {
            let backDir = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(-1);
            let s = this.scale || 1.0;
            zones.push({ pos: this.pos.add(backDir.mult(30 * s)), radius: 25 * s });
            zones.push({ pos: this.pos.add(backDir.mult(60 * s)), radius: 22 * s });
            zones.push({ pos: this.pos.add(backDir.mult(90 * s)), radius: 15 * s });
        } else if (this.form === 'CRICKET') {
            let backDir = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(-1);
            let s = this.scale || 1.0;
            zones.push({ pos: this.pos.add(backDir.mult(25 * s)), radius: 18 * s });
            zones.push({ pos: this.pos.add(backDir.mult(50 * s)), radius: 15 * s });
        } else if (this.form === 'STICK_INSECT') {
            if (this.stickSegments) {
                this.stickSegments.forEach(seg => {
                    zones.push({ pos: seg, radius: 8 * this.scale });
                });
            }
        } else if (this.form === 'PILLBUG') {
            if (this.pillBugSegments) {
                this.pillBugSegments.forEach(s => {
                    zones.push({ pos: new Vec2(s.x, s.y), radius: 8 * this.scale });
                });
            }
        } else {
            if (this.abdomenPos) zones.push({ pos: this.abdomenPos, radius: 5 * (this.scale || 1) * radiusMult });
        }
        return zones;
    }

    drawDebugHitboxes(ctx) {
        // 1. Draw Attack Range (Yellow)
        let reach = this.getEatRange();
        let attackPos = this.headPos ? this.headPos : this.pos;
        ctx.save();
        ctx.translate(attackPos.x, attackPos.y);
        ctx.beginPath();
        // Dashed line
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 2;
        ctx.arc(0, 0, reach, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 2. Draw Body Hitboxes (Red) - Using Centralized Logic
        let preyZones = this.getBodyZones();

        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1.5;
        preyZones.forEach(zone => {
            ctx.beginPath();
            ctx.arc(zone.pos.x, zone.pos.y, zone.radius, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.restore();
    }

    drawInternal(ctx) {
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
        } else if (this.form === 'STICK_INSECT') {
            this.drawStickInsect(ctx);
            return;
        } else if (this.form === 'TARANTULA') {
            this.drawTarantula(ctx);
            return;
        } else if (this.form === 'RHINO_BEETLE') {
            this.drawRhinoBeetle(ctx);
            return;
        } else if (this.form === 'GIANT_WETA') {
            drawGiantWeta(ctx, this);
            if (this.wetaEffects) this.wetaEffects.forEach(e => e.draw(ctx));
            return;
        } else if (this.form === 'CENTIPEDE') {
            this.drawCentipede(ctx);
            return;
        } else if (this.form === 'SCORPION') {
            this.drawScorpion(ctx);
            return;
        } else if (this.form === 'TITAN') {
            this.drawTitan(ctx);
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

    // Overhauled Draw Ladybug
    drawLadybug(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle + Math.PI / 2);

        let size = 12.5 * this.scale;

        // 阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        const shadowOffset = (this.ladybugState === 'attacking' ? 3 : 0) * this.scale;
        ctx.ellipse(0, (5 * this.scale) + shadowOffset, size * 0.9, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // --- 腿部 (Legs) ---
        this.drawLadybugLegs(ctx, size);

        // --- 腹部 (Abdomen) ---
        ctx.fillStyle = '#2a1a10';
        ctx.beginPath();
        ctx.ellipse(0, 5 * this.scale, size * 0.8, size * 1.0, 0, 0, Math.PI * 2);
        ctx.fill();
        // 纹理
        ctx.strokeStyle = '#3d2618';
        ctx.lineWidth = 1 * this.scale;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(0, 5 * this.scale, size * (0.3 + i * 0.15), -0.5, Math.PI + 0.5, true);
            ctx.stroke();
        }

        // --- 攻击大颚 (Mandibles) ---
        this.drawLadybugMandibles(ctx, size);

        // --- 鞘翅 (Elytra) ---
        const pivotY = -size * 0.3;
        const realWingAngle = Math.max(0, (this.wingOpenAngle || 0) + (this.wingFlutter || 0));

        // 绘制单个鞘翅的函数
        const drawFullShell = () => {
            const bodyGrad = ctx.createRadialGradient(-5 * this.scale, -5 * this.scale, 2 * this.scale, 0, 0, size * 1.2);
            bodyGrad.addColorStop(0, '#ff4d4d');
            bodyGrad.addColorStop(0.4, '#cc0000');
            bodyGrad.addColorStop(1, '#800000');

            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.ellipse(0, 5 * this.scale, size * 0.95, size * 1.1, 0, 0, Math.PI * 2);
            ctx.fill();

            this.drawLadybugSpots(ctx, size);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.ellipse(-size * 0.4, 0, size * 0.2, size * 0.4, 0.2, 0, Math.PI * 2);
            ctx.fill();
        };

        // --- 左翅 ---
        ctx.save();
        ctx.translate(0, pivotY);
        ctx.rotate(realWingAngle);
        ctx.translate(0, -pivotY);

        ctx.beginPath();
        ctx.rect(-size * 2, -size * 2, size * 2, size * 5); // Clip Left
        ctx.clip();

        drawFullShell();

        ctx.strokeStyle = 'rgba(40, 0, 0, 0.3)';
        ctx.lineWidth = 1 * this.scale;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.2);
        ctx.lineTo(0, size * 1.6);
        ctx.stroke();
        ctx.restore();

        // --- 右翅 ---
        ctx.save();
        ctx.translate(0, pivotY);
        ctx.rotate(-realWingAngle);
        ctx.translate(0, -pivotY);

        ctx.beginPath();
        ctx.rect(0, -size * 2, size * 2, size * 5); // Clip Right
        ctx.clip();

        drawFullShell();

        ctx.strokeStyle = 'rgba(40, 0, 0, 0.3)';
        ctx.lineWidth = 1 * this.scale;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.2);
        ctx.lineTo(0, size * 1.6);
        ctx.stroke();
        ctx.restore();

        // --- 头部 (Head) ---
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, -size * 0.8, size * 0.55, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(size * 0.2, -size * 1.0, size * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // --- 触角 ---
        this.drawLadybugAntennae(ctx, size);

        ctx.restore();

        if (this.heldPrey) {
            this.drawHeldPrey(ctx);
        }
    }

    drawLadybugMandibles(ctx, size) {
        ctx.fillStyle = '#1a1a1a';

        let openAmount = 0.1;
        let extendAmount = 0;

        if (this.ladybugAttackTimer > 0) {
            let limit = 25; // Duration
            let windup = 5;
            let current = 25 - this.ladybugAttackTimer; // Frames elapsed

            if (current > windup) {
                // attacking lunge
                // Lunge open
                openAmount = 1.0;
                extendAmount = 1.0;
            } else {
                // windup closed
                openAmount = -0.5;
                extendAmount = 0;
            }
        }

        const headY = -size * 1.2;

        ctx.save();
        ctx.translate(0, headY);

        // 左大颚
        ctx.save();
        ctx.translate(-size * 0.15, -extendAmount * 3 * this.scale);
        ctx.rotate(-0.2 - openAmount * 0.5);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Shrink by ~40%
        ctx.quadraticCurveTo(-3 * this.scale, -6 * this.scale, 1 * this.scale, -9 * this.scale);
        ctx.lineTo(4 * this.scale, -6 * this.scale);
        ctx.lineTo(3 * this.scale, 0);
        ctx.fill();
        ctx.restore();

        // 右大颚
        ctx.save();
        ctx.translate(size * 0.15, -extendAmount * 3 * this.scale);
        ctx.rotate(0.2 + openAmount * 0.5);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Shrink by ~40%
        ctx.quadraticCurveTo(3 * this.scale, -6 * this.scale, -1 * this.scale, -9 * this.scale);
        ctx.lineTo(-4 * this.scale, -6 * this.scale);
        ctx.lineTo(-3 * this.scale, 0);
        ctx.fill();
        ctx.restore();

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
        // Use member variable for consistency
        this.antennaTimer = (this.antennaTimer || 0);
        const twitchL = Math.sin(this.antennaTimer) * 0.1;
        const twitchR = Math.cos(this.antennaTimer * 1.3) * 0.1;

        // 左触角
        ctx.beginPath();
        ctx.moveTo(-baseX, baseY);
        ctx.quadraticCurveTo(
            -baseX * 2, baseY - 10 * this.scale,
            -baseX * 3 + twitchL * 10 * this.scale, baseY - 5 * this.scale + Math.abs(this.speed) * 2
        );
        ctx.stroke();

        // 右触角
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(
            baseX * 2, baseY - 10 * this.scale,
            baseX * 3 + twitchR * 10 * this.scale, baseY - 5 * this.scale + Math.abs(this.speed) * 2
        );
        ctx.stroke();
    }

    triggerLadybugAttack() {
        if (this.ladybugAttackTimer > 0 || (this.ladybugCooldown || 0) > 0) return false;

        this.ladybugState = 'attacking'; // For drawing reference
        this.ladybugAttackTimer = 25; // Total Duration
        this.ladybugCooldown = 45;
        this.predationState = 'attacking'; // Global state
        this.wasAttacking = true;
        return true;
    }

    updateLadybug(input) {
        const s = this.scale;

        // Init properties
        if (!this.ladybugAttackTimer) this.ladybugAttackTimer = 0;
        if (!this.ladybugCooldown) this.ladybugCooldown = 0;
        if (!this.wingOpenAngle) this.wingOpenAngle = 0;
        if (!this.wingFlutter) this.wingFlutter = 0;
        if (this.antennaTimer === undefined) this.antennaTimer = 0;

        // Cooldown
        if (this.ladybugCooldown > 0) this.ladybugCooldown--;

        let isAttacking = this.ladybugAttackTimer > 0;

        // Standard Movement Config
        let accel = 0.63 * s;
        let friction = 0.85;
        let maxSpeed = 1.75 * s;

        let ax = 0; let ay = 0;

        if (input.moveVector) {
            ax += input.moveVector.x * accel;
            ay += input.moveVector.y * accel;
        }

        // --- ATTACK LOGIC ---
        if (isAttacking) {
            this.ladybugAttackTimer--;

            // Phases: 0-5 Windup, 5 Lunge/Consume, 5-25 Slide
            let totalDuration = 25;
            let elapsed = totalDuration - this.ladybugAttackTimer;
            let windupTime = 5;

            if (elapsed < windupTime) {
                // WINDUP: Strict Stop (Heavy Friction)
                this.vel = this.vel.mult(0.5);
            } else if (elapsed === windupTime) {
                // LUNGE Trigger
                let lungePower = 15.0 * s;
                this.vel = new Vec2(Math.cos(this.angle) * lungePower, Math.sin(this.angle) * lungePower);

                // CONSUME
                if (this.onConsumePrey && this.heldPrey) {
                    let strikePos = this.pos.add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(20 * s));
                    this.onConsumePrey(strikePos);
                    this.onConsumePrey = null;
                    this.heldPrey = null;
                } else if (this.heldPrey) {
                    this.heldPrey = null;
                }
            }
            // No Input Processing Here!

        } else {
            // NORMAL MOVEMENT
            if (this.predationState === 'attacking') this.predationState = 'idle';
            if (this.ladybugState === 'attacking') this.ladybugState = 'idle';

            // Input Logic - DEFINED HERE ONLY
            let keyW = input.up; let keyS = input.down;
            let keyA = input.left; let keyD = input.right;

            if (input.shift && this.stamina > 0) {
                accel *= 1.8;
                maxSpeed *= 1.8;
                this.stamina -= 0.5;
            } else if (this.stamina < this.maxStamina) {
                this.stamina += 0.5;
            }

            if (keyW) ay -= accel;
            if (keyS) ay += accel;
            if (keyA) ax -= accel;
            if (keyD) ax += accel;

            // Turn Logic (Velocity based)
            if (this.vel.mag() > 0.1) {
                let targetAngle = Math.atan2(this.vel.y, this.vel.x);
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.angle += diff * 0.15;
            }
        }

        // Physics Integration
        this.vel.x += ax;
        this.vel.y += ay;

        // Cap Speed
        let currentSpeed = this.vel.mag();
        if (!isAttacking && currentSpeed > maxSpeed) {
            this.vel = this.vel.normalize().mult(maxSpeed);
        }

        this.vel = this.vel.mult(friction);
        this.pos = this.pos.add(this.vel);

        // -----------------
        // ANIMATION & PROPS
        // -----------------

        // Antennae
        this.antennaTimer += 0.05;

        // Wing Dynamics
        let targetWingAngle = 0;
        let flutterSpeed = 0;
        let flutterAmp = 0;

        if (isAttacking) {
            let elapsed = 25 - this.ladybugAttackTimer;
            if (elapsed > 5) { // Lunge phase
                targetWingAngle = 0.5;
                flutterSpeed = 1.5; // Fixed: Missing assignment
                flutterAmp = 0.08;
            } else { // Windup
                targetWingAngle = 0.1;
            }
        } else if (this.vel.mag() > 2.0 * s) {
            targetWingAngle = 0.05;
            flutterAmp = 0.01;
        } else {
            targetWingAngle = 0.02 * Math.sin(Date.now() / 500);
        }

        // Lerp Wing Angle
        this.wingOpenAngle = this.wingOpenAngle + (targetWingAngle - this.wingOpenAngle) * 0.1;

        // Flutter
        if (flutterAmp > 0) {
            this.wingFlutter = Math.sin(Date.now() * flutterSpeed) * flutterAmp;
        } else {
            this.wingFlutter = 0;
        }

        // --- Walk Cycle ---
        if (this.vel.mag() > 0.1) {
            this.walkCycle += 0.1 * (this.vel.mag() / (this.maxSpeed * this.scale));
        }

        // Standard body follow
        let headTarget = this.pos.add(new Vec2(Math.cos(this.angle) * 3.5 * this.scale, Math.sin(this.angle) * 3.5 * this.scale));
        this.headPos = this.headPos.add(headTarget.sub(this.headPos).mult(0.5));

        // Update Legs
        if (this.legs.length >= 6) {
            let groupAMoving = this.ladybugState !== 'attacking' && (this.legs[0].isMoving || this.legs[4].isMoving || this.legs[2].isMoving);
            let groupBMoving = this.ladybugState !== 'attacking' && (this.legs[3].isMoving || this.legs[1].isMoving || this.legs[5].isMoving);
            let canGroupAMove = !groupBMoving;
            let canGroupBMove = !groupAMoving;

            this.legs.forEach(leg => {
                let canMove = false;
                if ([0, 4, 2].includes(leg.id)) canMove = canGroupAMove;
                else canMove = canGroupBMove;

                leg.update(this.thoraxPos, this.angle, this.vel, canMove);
            });
        }
    }

    // --- Pill Bug Specific Drawing Logic ---
    drawPillBug(ctx) {
        // Shadow (unified)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 5;

        // Draw Particles (Dust)
        if (this.pillBugEffects) {
            this.pillBugEffects.forEach(p => {
                ctx.save();
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.translate(p.x, p.y);
                if (p.type === 'crumb') {
                    ctx.rotate(p.life * 5);
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                } else {
                    ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            });
            ctx.globalAlpha = 1.0;
        }

        ctx.shadowOffsetY = 5;
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
                // Eyes
                if (this.predationState === 'attacking') {
                    ctx.fillStyle = '#ff3300';
                    ctx.shadowColor = '#ff3300';
                    ctx.shadowBlur = 10;
                } else {
                    ctx.fillStyle = '#111';
                    ctx.shadowBlur = 0;
                }
                ctx.beginPath(); ctx.arc(10 * this.scale, -radius * 0.6, 2.5 * this.scale, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(10 * this.scale, radius * 0.6, 2.5 * this.scale, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;

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

    updatePillbug(input) {
        const s = this.scale;
        const maxSpeed = 3.5 * s;

        // Effects Update
        if (!this.pillBugEffects) this.pillBugEffects = [];
        for (let i = this.pillBugEffects.length - 1; i >= 0; i--) {
            let p = this.pillBugEffects[i];
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.92; p.vy *= 0.92;
            p.life -= 0.05;
            p.size *= 0.95;
            if (p.life <= 0) this.pillBugEffects.splice(i, 1);
        }

        if (this.pillBugCooldown > 0) this.pillBugCooldown--;

        // Manual Trigger (Space/Attack only)
        if (input.attack && this.predationState === 'idle' && this.pillBugCooldown <= 0) {
            this.predationState = 'attacking';
            this.pillBugAttackTimer = 0;
        }

        if (this.predationState === 'attacking') {
            this.pillBugAttackTimer += 0.8;
            this.speed *= 0.8;

            // Thrash
            const thrash = Math.sin(this.pillBugAttackTimer) * 0.4 + Math.cos(this.pillBugAttackTimer * 2.5) * 0.2;
            this.angle += thrash * 0.15;

            // Particles (Dust) - Tearing up ground
            if (Math.random() > 0.8) {
                const headX = this.pos.x + Math.cos(this.angle) * 15 * s;
                const headY = this.pos.y + Math.sin(this.angle) * 15 * s;
                const sprayAngle = this.angle + Math.PI + (Math.random() - 0.5) * 1.5;
                const spd = (3 + Math.random() * 3) * s;
                this.pillBugEffects.push({
                    x: headX, y: headY,
                    vx: Math.cos(sprayAngle) * spd, vy: Math.sin(sprayAngle) * spd,
                    life: 1.0, size: (Math.random() * 4 + 2) * s,
                    type: Math.random() > 0.5 ? 'dust' : 'crumb',
                    color: 'rgba(120, 100, 80, 0.6)'
                });
            }

            // Consume (Trigger Once)
            if (this.pillBugAttackTimer > 20 && this.onConsumePrey && this.heldPrey) {
                this.onConsumePrey(this.heldPrey.pos);
                this.onConsumePrey = null; // Ensure single XP reward
                this.heldPrey = null;
            }

            if (this.pillBugAttackTimer > 50) {
                this.predationState = 'idle';
                this.pillBugCooldown = 20;
            }
        } else {
            // Movement
            let targetDx = 0, targetDy = 0;

            if (input.moveVector) {
                targetDx = input.moveVector.x;
                targetDy = input.moveVector.y;
            }

            if (input.up) targetDy = -1;
            if (input.down) targetDy = 1;
            if (input.left) targetDx = -1;
            if (input.right) targetDx = 1;

            if (targetDx !== 0 || targetDy !== 0) {
                const targetAngle = Math.atan2(targetDy, targetDx);
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.angle += diff * 0.1;
                this.speed += (maxSpeed - this.speed) * 0.1;
            } else {
                this.speed *= 0.9;
            }
            this.pos.x += Math.cos(this.angle) * this.speed;
            this.pos.y += Math.sin(this.angle) * this.speed;
            this.walkCycle += this.speed * 0.2;
        }

        // Sync Head
        this.headPos.x = this.pos.x;
        this.headPos.y = this.pos.y;
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
            // Logic moved to updateCockroach
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
            return;
        } else if (this.form === 'STICK_INSECT') {
            // Logic moved to updateStickInsect to allow Input Locking
            // Just ensure visuals are okay or do nothing here
            return;
        } else if (this.form === 'TARANTULA') {
            // Logic moved to updateTarantula
            return;
        } else if (this.form === 'RHINO_BEETLE') {
            // Simple Walk Cycle update
            let speed = this.vel.mag();
            this.rhinoWalkCycle += speed * 0.2;
            this.rhinoLegs.forEach(leg => leg.updateScale(this.scale));
            return;
        } else if (this.form === 'CENTIPEDE') {
            // physics/IK logic from reference
            let head = this.centipedeSegments[0];
            if (!head) return;

            // Head follows 'this.pos' (Player control)
            head.x = this.pos.x;
            head.y = this.pos.y;
            head.angle = this.angle;

            const SEGMENT_SIZE = 18 * this.scale;
            const spacing = SEGMENT_SIZE * 0.65;

            for (let i = 1; i < this.centipedeSegments.length; i++) {
                const current = this.centipedeSegments[i];
                const prev = this.centipedeSegments[i - 1];

                const dx = prev.x - current.x;
                const dy = prev.y - current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                // Teleport if too far (world wrap or reset?)
                // Reference checks > 300. Scaled?
                if (dist > 300 * this.scale) {
                    current.x = prev.x;
                    current.y = prev.y;
                } else {
                    const targetX = prev.x - Math.cos(angle) * spacing;
                    const targetY = prev.y - Math.sin(angle) * spacing;

                    current.x += (targetX - current.x) * 0.6;
                    current.y += (targetY - current.y) * 0.6;
                    current.angle = angle;
                }
            }

            this.centipedeLegPhase += this.vel.mag() * 0.15;
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

    triggerMantisAttack(target = null) {
        if (this.mantisAttackState === 0) {
            this.mantisAttackState = 1; // Charge
            this.mantisAttackTimer = 0;

            // Set generalized attacking state
            this.predationState = 'attacking';

            // Determine Target Pos
            const strikeDist = 100 * this.scale;
            if (target) {
                // Aim at actual target
                const angleToTarget = Math.atan2(target.y - this.pos.y, target.x - this.pos.x);
                let diff = angleToTarget - this.angle;
                // Normalize angle
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                this.angle += diff * 0.5; // Snap turn
                this.mantisAttackTarget = target;
            } else {
                // Free attack (at mouse/forward)
                this.mantisAttackTarget = this.pos.add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(strikeDist));
            }
        }
    }

    updateMantis(input) {
        const s = this.scale;

        // --- Input & Trigger ---
        // Removed manual mouse trigger to allow collision-based Auto Predation to work without state conflict.

        // --- Attack State Machine ---
        let currentLegTarget = null;

        if (this.mantisAttackState === 1) { // CHARGE
            this.mantisAttackTimer++;
            // Pull back
            this.mantisLunge = this.mantisLunge + (-10 * s - this.mantisLunge) * 0.1;

            if (this.mantisAttackTimer > 20) {
                this.mantisAttackState = 2; // STRIKE
                this.mantisAttackTimer = 0;
            }
        } else if (this.mantisAttackState === 2) { // STRIKE
            this.mantisAttackTimer++;

            // Frame 1: Effects
            if (this.mantisAttackTimer === 1) {
                const strikeDist = 100 * s;
                let targetPos = this.mantisAttackTarget || this.pos.add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(strikeDist));

                // Shockwave
                this.mantisEffects.push({
                    type: 'shockwave',
                    x: targetPos.x,
                    y: targetPos.y,
                    radius: 10 * s,
                    maxRadius: 80 * s,
                    alpha: 1.0,
                    color: '255, 255, 220',
                    lineWidth: 5 * s
                });
                // Flash
                this.mantisEffects.push({
                    type: 'flash',
                    x: targetPos.x,
                    y: targetPos.y,
                    radius: 5 * s,
                    maxRadius: 40 * s,
                    alpha: 0.8,
                    color: '255, 255, 255'
                });

                // Eat Logic
                if (this.heldPrey && this.onConsumePrey) {
                    this.onConsumePrey(this.heldPrey.pos);
                    this.heldPrey = null;
                    this.onConsumePrey = null;
                }
            }

            // Thrust forward
            this.mantisLunge = this.mantisLunge + (25 * s - this.mantisLunge) * 0.4;
            currentLegTarget = this.mantisAttackTarget;

            if (this.mantisAttackTimer > 15) {
                this.mantisAttackState = 3; // RETRACT
                this.mantisAttackTimer = 0;
            }
        } else if (this.mantisAttackState === 3) { // RETRACT
            this.mantisAttackTimer++;
            this.mantisLunge = this.mantisLunge + (0 - this.mantisLunge) * 0.08;

            if (this.mantisAttackTimer > 30) {
                this.mantisAttackState = 0;
                this.mantisAttackTarget = null;
                this.predationState = 'idle'; // Reset state
            }
        }

        // --- Effects Update ---
        for (let i = this.mantisEffects.length - 1; i >= 0; i--) {
            const fx = this.mantisEffects[i];
            if (fx.type === 'shockwave') {
                fx.radius += 5 * s;
                fx.alpha -= 0.06;
                fx.lineWidth *= 0.9;
            } else if (fx.type === 'flash') {
                fx.radius += 2 * s;
                fx.alpha -= 0.1;
            }
            if (fx.alpha <= 0) {
                this.mantisEffects.splice(i, 1);
            }
        }

        // --- Movement (Lock during attack) ---
        if (this.mantisAttackState !== 0) {
            this.vel = this.vel.mult(0.8);
        }

        // --- Head/Abdomen Anim ---
        this.animTimer += 0.1;
        const sway = Math.sin(this.animTimer) * 0.1;
        let turnAmount = 0;

        this.mantisAbdomenAngle = this.mantisAbdomenAngle + (-turnAmount * 0.5 + sway - this.mantisAbdomenAngle) * 0.1;

        // --- Legs Update ---
        // Apply Lunge Offset to body position for legs anchor
        let lungeVec = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(this.mantisLunge);
        let drawPos = this.pos.add(lungeVec);

        this.mantisLegs.forEach(leg => {
            leg.updateScale(s);
            if (leg.isFrontArm) {
                // Adjust speed based on state
                if (this.mantisAttackState === 1) leg.followSpeed = 0.05;
                else if (this.mantisAttackState === 2) leg.followSpeed = 0.4;
                else if (this.mantisAttackState === 3) leg.followSpeed = 0.05;
                else leg.followSpeed = 0.1;

                leg.update(drawPos.x, drawPos.y, this.angle, this.vel.mag(), currentLegTarget);
            } else {
                leg.update(drawPos.x, drawPos.y, this.angle, this.vel.mag());
            }
        });
    }

    drawMantis(ctx) {
        const s = this.scale;

        let lungeVec = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(this.mantisLunge);
        let drawX = this.pos.x + lungeVec.x;
        let drawY = this.pos.y + lungeVec.y;

        // 1. Shadows
        ctx.save();
        ctx.translate(drawX + 5 * s, drawY + 5 * s);
        ctx.rotate(this.angle);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        // Width 40*s, Height 15*s
        ctx.ellipse(-10 * s, 0, 40 * s, 15 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Legs
        this.mantisLegs.forEach(leg => leg.draw(ctx));

        if (this.heldPrey) {
            this.drawHeldPrey(ctx);
        }

        // 3. Body
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(this.angle);

        // --- Abdomen ---
        ctx.save();
        ctx.translate(-25 * s, 0);
        ctx.rotate(this.mantisAbdomenAngle);

        ctx.fillStyle = '#6DA04B';
        ctx.beginPath();
        ctx.ellipse(-30 * s, 0, 45 * s, 18 * s, 0, 0, Math.PI * 2);
        ctx.fill();

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

        ctx.restore(); // End Abdomen

        // --- Thorax ---
        ctx.fillStyle = '#7CAF54';
        ctx.beginPath();
        ctx.moveTo(-25 * s, -6 * s);
        ctx.lineTo(25 * s, -4 * s);
        ctx.lineTo(25 * s, 4 * s);
        ctx.lineTo(-25 * s, 6 * s);
        ctx.fill();

        ctx.strokeStyle = '#5D8A40';
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(-25 * s, 0);
        ctx.lineTo(25 * s, 0);
        ctx.stroke();

        // --- Head ---
        ctx.save();
        ctx.translate(25 * s, 0);
        ctx.rotate(this.mantisHeadAngle);

        ctx.fillStyle = '#8BC34A';
        ctx.beginPath();
        ctx.moveTo(0, -8 * s);
        ctx.lineTo(12 * s, 0);
        ctx.lineTo(0, 8 * s);
        ctx.lineTo(-4 * s, 0);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#E1F5C4';
        // Left
        ctx.beginPath();
        ctx.ellipse(2 * s, -8 * s, 4 * s, 6 * s, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#DDDDDD'; // Highlight?
        // Pupil
        ctx.beginPath();
        ctx.arc(3 * s, -8 * s, 1.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();

        // Right
        ctx.fillStyle = '#E1F5C4';
        ctx.beginPath();
        ctx.ellipse(2 * s, 8 * s, 4 * s, 6 * s, 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
        ctx.beginPath();
        ctx.arc(3 * s, 8 * s, 1.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();

        // Antennae
        ctx.strokeStyle = '#4a3b22';
        ctx.lineWidth = 0.5 * s;

        ctx.beginPath();
        ctx.moveTo(12 * s, -2 * s);
        ctx.quadraticCurveTo((25 + Math.sin(this.animTimer * 2) * 5) * s, -15 * s, 35 * s, -20 * s);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(12 * s, 2 * s);
        ctx.quadraticCurveTo((25 + Math.cos(this.animTimer * 2) * 5) * s, 15 * s, 35 * s, 20 * s);
        ctx.stroke();

        ctx.restore(); // End Head
        ctx.restore(); // End Body

        // --- Held Prey ---
        if (this.heldPrey) this.drawHeldPrey(ctx);

        // --- Effects ---
        this.mantisEffects.forEach(fx => {
            if (fx.type === 'shockwave') {
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${fx.color}, ${fx.alpha})`;
                ctx.lineWidth = fx.lineWidth;
                ctx.stroke();
            } else if (fx.type === 'flash') {
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${fx.color}, ${fx.alpha})`;
                ctx.fill();
            }
        });
    }

    drawCockroach(ctx) {
        // Effects (Ground)
        this.cockroachEffects.filter(e => e.type === 'shockwave').forEach(e => e.draw(ctx));

        // Legs
        this.cockroachLegs.forEach(leg => leg.draw(ctx, this.pos, this.angle));

        // Antennae
        this.cockroachAntennae.forEach(ant => ant.draw(ctx));

        // Body & Wings
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        let shadowScale = this.scale * (1 + this.wingOpenFactor * 0.2);
        ctx.ellipse(0, 0, 42 * shadowScale, 26 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 1. Abdomen
        let abdomenGradient = ctx.createRadialGradient(-10 * this.scale, -5 * this.scale, 0, 0, 0, 55 * this.scale);
        abdomenGradient.addColorStop(0, "#3E2723");
        abdomenGradient.addColorStop(0.6, "#1a0f0a");
        abdomenGradient.addColorStop(1, "#050201");

        ctx.fillStyle = abdomenGradient;
        ctx.beginPath();
        ctx.moveTo(25 * this.scale, 0);
        ctx.bezierCurveTo(25 * this.scale, 28 * this.scale, -55 * this.scale, 25 * this.scale, -70 * this.scale, 0);
        ctx.bezierCurveTo(-55 * this.scale, -25 * this.scale, 25 * this.scale, -28 * this.scale, 25 * this.scale, 0);
        ctx.fill();

        // Abdomen segments
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1 * this.scale;
        for (let i = -50; i < 10; i += 12) {
            let x = i * this.scale;
            ctx.beginPath();
            ctx.moveTo(x, -18 * this.scale);
            ctx.quadraticCurveTo(x - 8 * this.scale, 0, x, 18 * this.scale);
            ctx.stroke();
        }

        // --- WING DRAWING ---
        let wingRot = this.wingOpenFactor * 1.4;

        // A. INNER WINGS
        if (this.wingOpenFactor > 0.1) {
            ctx.save();
            let vibrate = Math.sin(Date.now() * 0.1) * 0.1; // Not dependent on time, but ok for visual
            ctx.scale(1 + vibrate, 1);

            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";

            // Left Inner
            ctx.save();
            ctx.rotate(-wingRot * 1.05);
            ctx.beginPath();
            ctx.moveTo(20 * this.scale, 0);
            ctx.quadraticCurveTo(10 * this.scale, -35 * this.scale, -80 * this.scale, -15 * this.scale);
            ctx.lineTo(-20 * this.scale, 0);
            ctx.fill();
            ctx.restore();

            // Right Inner
            ctx.save();
            ctx.rotate(wingRot * 1.05);
            ctx.beginPath();
            ctx.moveTo(20 * this.scale, 0);
            ctx.quadraticCurveTo(10 * this.scale, 35 * this.scale, -80 * this.scale, 15 * this.scale);
            ctx.lineTo(-20 * this.scale, 0);
            ctx.fill();
            ctx.restore();

            ctx.restore();
        }

        // B. RIGHT ELYTRA
        ctx.save();
        ctx.translate(20 * this.scale, 10 * this.scale);
        ctx.rotate(wingRot);
        ctx.translate(-20 * this.scale, -10 * this.scale);

        ctx.fillStyle = "rgba(160, 82, 45, 0.85)";
        ctx.beginPath();
        ctx.moveTo(28 * this.scale, 0);
        ctx.quadraticCurveTo(25 * this.scale, 26 * this.scale, -75 * this.scale, 10 * this.scale);
        ctx.lineTo(-75 * this.scale, 0);
        ctx.lineTo(28 * this.scale, 0);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        ctx.ellipse(-15 * this.scale, 12 * this.scale, 25 * this.scale, 6 * this.scale, 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(100, 50, 20, 0.3)";
        ctx.beginPath();
        ctx.moveTo(28 * this.scale, 0);
        ctx.quadraticCurveTo(0, 15 * this.scale, -70 * this.scale, 8 * this.scale);
        ctx.stroke();
        ctx.restore();


        // C. LEFT ELYTRA
        ctx.save();
        ctx.translate(20 * this.scale, -10 * this.scale);
        ctx.rotate(-wingRot);
        ctx.translate(-20 * this.scale, 10 * this.scale);

        ctx.fillStyle = "rgba(160, 82, 45, 0.85)";
        ctx.beginPath();
        ctx.moveTo(28 * this.scale, 0);
        ctx.quadraticCurveTo(25 * this.scale, -26 * this.scale, -75 * this.scale, -10 * this.scale);
        ctx.lineTo(-75 * this.scale, 0);
        ctx.lineTo(28 * this.scale, 0);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        ctx.ellipse(-15 * this.scale, -12 * this.scale, 25 * this.scale, 6 * this.scale, -0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(100, 50, 20, 0.3)";
        ctx.beginPath();
        ctx.moveTo(28 * this.scale, 0);
        ctx.quadraticCurveTo(0, -15 * this.scale, -70 * this.scale, -8 * this.scale);
        ctx.stroke();
        ctx.restore();

        // 3. Pronotum
        let pronotumGrad = ctx.createRadialGradient(25 * this.scale, -2 * this.scale, 0, 25 * this.scale, 0, 15 * this.scale);
        pronotumGrad.addColorStop(0, "#5d4037");
        pronotumGrad.addColorStop(0.5, "#2d1e18");
        pronotumGrad.addColorStop(1, "#0f0500");

        ctx.fillStyle = pronotumGrad;
        ctx.beginPath();
        ctx.ellipse(25 * this.scale, 0, 14 * this.scale, 16 * this.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.ellipse(25 * this.scale, -5 * this.scale, 6 * this.scale, 4 * this.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Head
        ctx.fillStyle = "#0f0500";
        ctx.beginPath();
        ctx.ellipse(38 * this.scale, 0, 5 * this.scale, 7 * this.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cerci
        ctx.strokeStyle = "#2d1e18";
        ctx.lineWidth = 2 * this.scale;
        ctx.beginPath();
        ctx.moveTo(-65 * this.scale, 6 * this.scale);
        ctx.lineTo(-75 * this.scale, 10 * this.scale);
        ctx.moveTo(-65 * this.scale, -6 * this.scale);
        ctx.lineTo(-75 * this.scale, -10 * this.scale);
        ctx.stroke();

        ctx.restore();

        // Draw Held Prey visually
        this.drawHeldPrey(ctx);

        // Aerial Effects
        this.cockroachEffects.filter(e => e.type === 'line').forEach(e => e.draw(ctx));
    }

    drawGiantWeta(ctx) {
        if (drawGiantWeta) drawGiantWeta(ctx, this);
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
            return 80 * this.scale;
        } else if (this.form === 'TARANTULA') {
            return 30 * this.scale;
        } else if (this.form === 'CENTIPEDE' || this.form === 'SCORPION') {
            return 50 * this.scale;
        } else if (this.form === 'TITAN') {
            return 120 * this.scale;
        } else if (this.form === 'STICK_INSECT') {
            return 60 * this.scale;
        } else if (this.form === 'COCKROACH') {
            return 30 * this.scale;
        } else if (this.form === 'LADYBUG') {
            return 40 * this.scale;
        } else if (this.form === 'PILLBUG') {
            return 30 * this.scale;
        }
        return 20 * this.scale;
    }

    startPredation(prey, consumeCallback) {
        if (this.globalAttackCooldown > 0) {
            return false;
        }

        // Guard: If Scorpion is already attacking, DO NOT start another.
        if (this.form === 'SCORPION' && this.scorpionAttackState !== 'none') {
            return false;
        }

        // Victim Cooldown (Prevent rapid counting)
        if (prey.lastHitTime && (Date.now() - prey.lastHitTime < 500)) {
            return false;
        }

        let nonLethal = false;
        if (prey.evolutionStage === this.evolutionStage) {
            this.globalAttackCooldown = 60; // 1s interval


            prey.hitsTaken = (prey.hitsTaken || 0) + 1;
            prey.lastHitTime = Date.now();

            // Visual Feedback: Handled in Prey's draw method (Health Bar)

            prey.isFleeing = true;
            prey.fleeTimer = 100;
            prey.fleeTarget = { x: this.pos.x, y: this.pos.y };

            if (prey.hitsTaken < 3) {
                nonLethal = true;
            }
        }

        const result = this._startPredationInternal(prey, consumeCallback);
        if (nonLethal) {
            this.heldPrey = null;
            this.onConsumePrey = null;
            return false;
        }
        return result;
    }

    _startPredationInternal(prey, consumeCallback) {
        // Generic Init (Restored from lost block)
        this.heldPrey = {
            pos: prey.pos.clone(),
            angle: prey.angle,
            scale: prey.scale,
            color: prey.color,
            size: (prey.size || 5) * (prey.scale || 1)
        };
        this.onConsumePrey = consumeCallback;
        if (this.form === 'TARANTULA' && this.predationState === 'attacking') {
            if (consumeCallback) consumeCallback(prey.pos);
            return true;
        }

        // --- LADYBUG: Single-Shot Attack (Like Tarantula) ---
        if (this.form === 'LADYBUG') {
            // If already attacking, let the animation finish. Do not reset.
            if (this.ladybugAttackTimer > 0) return true;

            this.angle = Math.atan2(prey.pos.y - this.pos.y, prey.pos.x - this.pos.x);

            // START ANIMATION
            this.ladybugAttackTimer = 25;
            this.ladybugState = 'attacking';
            this.predationState = 'attacking';
            this.ladybugCooldown = 45;
            this.wasAttacking = true;

            // Visuals
            this.heldPrey = {
                pos: prey.pos.clone(),
                angle: prey.angle,
                scale: prey.scale || 1.0,
                color: prey.color || prey.colors?.thorax || '#444',
                form: prey.form || 'ANT',
                colors: prey.colors,
                size: (prey.size || 5) * (prey.scale || 1)
            };
            this.onConsumePrey = consumeCallback;

            return true;
        }

        if (this.form === 'CRICKET') {
            if (this.cricketAttackTimer > 0) return true;

            this.angle = Math.atan2(prey.pos.y - this.pos.y, prey.pos.x - this.pos.x);

            this.cricketAttackTimer = 40;
            this.predationState = 'attacking';

            this.heldPrey = {
                pos: prey.pos.clone(),
                angle: prey.angle,
                scale: prey.scale || 1.0,
                color: prey.color || prey.colors?.thorax || '#444',
                size: (prey.size || 5) * (prey.scale || 1)
            };
            this.onConsumePrey = consumeCallback;
            return true;
        }

        if (this.predationState !== 'idle') {
            if (this.form === 'CENTIPEDE' && this.predationState === 'attacking') {
                // Allow
            } else {
                console.log("Log: Returning False (Non-Lethal)");
                return false;
            }
        }

        this.heldPrey = {
            pos: prey.pos.clone(),
            angle: prey.angle,
            scale: prey.scale || 1.0,
            color: prey.color || prey.colors?.thorax || '#444',
            form: prey.form || 'ANT',
            colors: prey.colors,
            size: (prey.size || 5) * (prey.scale || 1)
        };
        // Wrap callback for debugging
        this.onConsumePrey = consumeCallback;
        this.predationTimer = 0;

        if (this.form === 'TARANTULA') {
            this.predationState = 'attacking';
            this.tarantulaAttackTimer = TARANTULA_SETTINGS.attackDuration;
            this.angle = Math.atan2(prey.pos.y - this.pos.y, prey.pos.x - this.pos.x);
            // Don't consume yet, wait for lunge apex in updateTarantula
            return true;
        }
        // Note: Removed forced 'attacking' state here.
        // Normal contact will now fall through to generic 'lunging' below.
        if (this.form === 'SPIDER' && this.spiderLegs.length >= 2) {
            this.predationState = 'reaching';
            // Front legs reach out
            const frontLeft = this.spiderLegs[0];
            const frontRight = this.spiderLegs[1];
            frontLeft.overrideTarget = this.heldPrey.pos;
            frontRight.overrideTarget = this.heldPrey.pos;
        } else if (this.form === 'MANTIS' && this.mantisLegs) {
            this.triggerMantisAttack(prey.pos);
            return true;
        } else if (this.form === 'PILLBUG') {
            this.predationState = 'attacking';
            this.pillBugAttackTimer = 0;
            return true;
        } else if (this.form === 'SCORPION') {
            // Trigger Charge Attack
            // Only return true if we ACTUALLY started a new attack.
            // If we are already mid-attack, return false so Main doesn't count it again.
            const started = this.triggerScorpionAttack();

            // Don't set generic 'lunging', let the customized attack state handle it.
            // We store onConsumePrey, which triggerScorpionAttack/updateScorpion will use.
            this.angle = Math.atan2(prey.pos.y - this.pos.y, prey.pos.x - this.pos.x);
            return started;

        } else if (this.form === 'GIANT_WETA') {
            this.triggerGiantWetaBite();
            this.angle = Math.atan2(prey.pos.y - this.pos.y, prey.pos.x - this.pos.x);
            return true;

        } else if (this.form === 'STICK_INSECT') {
            this.predationState = 'attacking';
            // Align to prey
            this.angle = Math.atan2(prey.pos.y - this.pos.y, prey.pos.x - this.pos.x);
            // Trigger Front Legs Attack
            if (this.stickLegs) {
                this.stickLegs.forEach(leg => {
                    if (leg.offsetIndex === 0) {
                        leg.isAttacking = true;
                        leg.attackProgress = 0;
                    }
                });
            }
        } else if (this.form === 'CENTIPEDE') {
            console.log('Insect.js: startPredation - CENTIPEDE Block Entered');
            this.predationState = 'attacking';
            this.centipedeAttackTimer = 40;
            this.centipedeMandibleOpen = 0;

            // Surge (5x Speed)
            const baseSpeed = 4.0 * this.scale;
            const surgeSpeed = baseSpeed * 5;
            this.angle = Math.atan2(prey.pos.y - this.pos.y, prey.pos.x - this.pos.x);
            this.vel = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(surgeSpeed);
            this.speed = surgeSpeed;

            return true;
        } else if (this.form === 'COCKROACH') {
            this.predationState = 'attacking';
            // Align to prey
            this.angle = Math.atan2(prey.pos.y - this.pos.y, prey.pos.x - this.pos.x);
            this.wasAttacking = false; // Ensure trigger fires in updateCockroach
        } else {
            // Generic Lunge
            this.predationState = 'lunging';
            this.lungeTimer = 10;
        }

        return true;
    }

    updateCentipede(input) {
        // Fix collision radius and Head Position (Critical for Main.js detection)
        this.radius = 20 * this.scale;
        this.headPos.x = this.pos.x;
        this.headPos.y = this.pos.y;
        this.width = this.radius * 2;
        this.height = this.radius * 2;

        // Debug inputs
        if (!this._debugInput) {
            console.log('Inputs:', Object.keys(input));
            this._debugInput = true;
        }

        // Manual Surge (Shift Key / Space / Attack)
        if ((input.shift || input.space || input.attack) && this.predationState === 'idle') {
            this.predationState = 'attacking';
            this.centipedeAttackTimer = 40;
            this.centipedeMandibleOpen = 0;
            const baseSpeed = 4.0 * this.scale;
            this.speed = baseSpeed * 5; // Surge
            // Maintain current angle
            this.vel = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(this.speed);
        }

        if (this.predationState === 'attacking') {
        }
        const s = this.scale;

        // Effects Update
        if (!this.centipedeEffects) this.centipedeEffects = [];
        this.centipedeEffects.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.9; p.vy *= 0.9;
            p.life -= 0.04;
            p.size *= 0.92;
        });
        this.centipedeEffects = this.centipedeEffects.filter(p => p.life > 0);

        if (!this.centipedeMandibleOpen) this.centipedeMandibleOpen = 0;

        if (this.predationState === 'attacking') {
            this.centipedeAttackTimer--;

            // Particles (Head Burst)
            let head = (this.centipedeSegments && this.centipedeSegments.length > 0) ? this.centipedeSegments[0] : null;
            if (head && this.centipedeAttackTimer > 30) {
                for (let i = 0; i < 2; i++) {
                    let ang = Math.random() * Math.PI * 2;
                    let spd = (Math.random() * 8 + 2) * s;
                    this.centipedeEffects.push({
                        x: head.x, y: head.y,
                        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                        life: 1.0, size: (Math.random() * 6 + 2) * s
                    });
                }
            }

            // Mandibles
            if (this.centipedeAttackTimer > 30) this.centipedeMandibleOpen += 0.2;
            else this.centipedeMandibleOpen -= 0.15;
            this.centipedeMandibleOpen = Math.max(0, Math.min(1, this.centipedeMandibleOpen));

            // Consume Logic (Snap)
            if (this.centipedeAttackTimer === 30) {
                if (this.onConsumePrey) {
                    let impact = head ? new Vec2(head.x, head.y) : this.pos;
                    this.onConsumePrey(impact);
                    this.onConsumePrey = null;
                }
                this.heldPrey = null;
            }

            // End Condition (Timer Only to prevent rapid loops)
            if (this.centipedeAttackTimer <= 0) {
                this.predationState = 'idle';
            }
        } else {
            this.centipedeMandibleOpen *= 0.8;
            if (this.centipedeMandibleOpen < 0.01) this.centipedeMandibleOpen = 0;
        }
    }

    updatePredation() {
        if (this.predationState === 'idle') return;

        // --- Mantis Grapple ---
        if (this.predationState === 'attacking' && this.form === 'MANTIS') {
            if (this.heldPrey) {
                const s = this.scale;
                const lungeDist = this.mantisLunge;
                // Visual sweet spot for "in claws"
                const baseReach = 60 * s;
                const totalReach = lungeDist + baseReach;

                const targetPos = this.pos.add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(totalReach));

                // Snap/Lerp prey to claws
                this.heldPrey.pos.x += (targetPos.x - this.heldPrey.pos.x) * 0.4;
                this.heldPrey.pos.y += (targetPos.y - this.heldPrey.pos.y) * 0.4;
                this.heldPrey.angle = this.angle + Math.PI / 2; // Orient prey crosswise
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

    updateCricket(input) {
        const s = this.scale;

        // Init Props if missing
        if (!this.cricketAttackTimer) this.cricketAttackTimer = 0;
        if (!this.cricketMandibleState) this.cricketMandibleState = 0;
        if (!this.cricketEffects) this.cricketEffects = [];
        if (!this.cricketAntennaTimer) this.cricketAntennaTimer = 0;

        let shouldLockInput = false;

        // --- Attack Logic ---
        if (this.cricketAttackTimer > 0) {
            this.cricketAttackTimer--;

            // Mandible Animation (0.0 - 1.0)
            let progress = 1 - (this.cricketAttackTimer / 40);
            if (progress < 0.2) {
                this.cricketMandibleState = progress / 0.2; // Open fast
            } else if (progress < 0.4) {
                this.cricketMandibleState = 1; // Hold open
            } else {
                this.cricketMandibleState = 1 - ((progress - 0.4) / 0.6); // Close slow
            }

            // Frame 1: Trigger Lunge & Effects
            // startPredation sets timer to 40. First update frame will be 39.
            if (this.cricketAttackTimer === 39) {
                // Lunge Physics
                let lungeForce = 12 * s;
                let lungeVel = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(lungeForce);
                this.vel = this.vel.add(lungeVel);

                // Shockwave Effect
                this.cricketEffects.push({
                    type: 'shockwave',
                    x: this.pos.x, y: this.pos.y,
                    angle: this.angle,
                    radius: 20 * s,
                    alpha: 1.0,
                    width: 30 * s
                });

                // Dust Effect (Rear)
                let rearDir = new Vec2(Math.cos(this.angle + Math.PI), Math.sin(this.angle + Math.PI));
                let rearPos = this.pos.add(rearDir.mult(30 * s));
                for (let i = 0; i < 16; i++) {
                    let spread = (Math.random() - 0.5) * 1.5;
                    let dir = this.angle + Math.PI + spread;
                    let speed = (Math.random() * 8 + 4) * s;
                    this.cricketEffects.push({
                        type: 'dust',
                        x: rearPos.x, y: rearPos.y,
                        vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
                        size: (Math.random() * 12 + 5) * s,
                        life: 1.0
                    });
                }
            }

            // Consume Prey Trigger (Frame 15 -> Timer 25)
            // When mandibles start closing
            if (this.cricketAttackTimer === 25) {
                if (this.onConsumePrey && this.heldPrey) {
                    this.onConsumePrey(this.heldPrey.pos); // Kill callback
                    this.heldPrey = null;
                }
            }

            // Lock Input during heavy lunge phase
            if (this.cricketAttackTimer > 0) {
                shouldLockInput = true;
            }

        } else {
            this.cricketMandibleState = 0;
            if (this.predationState === 'attacking') this.predationState = 'idle';
        }

        // --- Effects Update ---
        for (let i = this.cricketEffects.length - 1; i >= 0; i--) {
            let e = this.cricketEffects[i];
            if (e.type === 'shockwave') {
                e.radius += 12 * s;
                e.width *= 0.9;
                e.alpha -= 0.04;
                if (e.alpha <= 0) this.cricketEffects.splice(i, 1);
            } else if (e.type === 'dust') {
                e.x += e.vx; e.y += e.vy;
                e.vx *= 0.9; e.vy *= 0.9;
                e.life -= 0.03;
                e.size *= 0.96;
                if (e.life <= 0) this.cricketEffects.splice(i, 1);
            }
        }

        // --- Movement Logic ---
        let accel = 0.56 * s;
        let friction = 0.92;
        let maxSpeed = 2.8 * s;
        let turnSpeed = 0.08;

        if (!shouldLockInput) {
            let dx = 0; let dy = 0;
            if (input.up) dy -= 1;
            if (input.down) dy += 1;
            if (input.left) dx -= 1;
            if (input.right) dx += 1;

            if (dx !== 0 || dy !== 0) {
                let targetAngle = Math.atan2(dy, dx);
                let diff = targetAngle - this.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                this.angle += diff * turnSpeed;

                // Move forward in facing direction
                if (this.vel.mag() < maxSpeed) {
                    this.vel.x += Math.cos(this.angle) * accel;
                    this.vel.y += Math.sin(this.angle) * accel;
                }
            }
        }

        this.vel = this.vel.mult(friction);
        this.pos = this.pos.add(this.vel);

        // --- Legs Update ---
        if (this.cricketLegs) {
            let stepThreshold = 40 * s + this.vel.mag() * 2;
            this.cricketLegs.forEach(leg => {
                leg.updateScale(s);
                leg.update(this.pos, this.angle, this.vel, stepThreshold);
            });
        }

        this.cricketAntennaTimer += 0.1 + (this.vel.mag() * 0.1);

        // Update general body parts for collision/eating checks
        this.thoraxPos = this.pos;
        this.headPos = this.pos.add(new Vec2(Math.cos(this.angle) * 40 * s, Math.sin(this.angle) * 40 * s));
    }

    drawCricket(ctx) {
        ctx.save();

        // 0. Effects (Ground)
        if (this.cricketEffects) {
            this.cricketEffects.forEach(e => {
                if (e.type === 'shockwave') {
                    ctx.save();
                    ctx.translate(e.x, e.y);
                    ctx.rotate(e.angle);

                    ctx.shadowBlur = 20;
                    ctx.shadowColor = "rgba(255, 255, 255, 0.9)";

                    ctx.beginPath();
                    ctx.arc(0, 0, e.radius, -Math.PI / 2.5, Math.PI / 2.5);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${e.alpha})`;
                    ctx.lineWidth = e.width;
                    ctx.lineCap = "round";
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(0, 0, e.radius * 0.85, -Math.PI / 3.5, Math.PI / 3.5);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${e.alpha})`;
                    ctx.lineWidth = e.width * 0.4;
                    ctx.stroke();
                    ctx.restore();
                } else if (e.type === 'dust') {
                    ctx.fillStyle = `rgba(90, 70, 40, ${e.life})`;
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        if (this.heldPrey) this.drawHeldPrey(ctx);

        // 1. Legs (Under Body)
        this.cricketLegs.forEach(leg => {
            leg.draw(ctx);
        });

        // Transform to Body Center
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        // Note: Scale is handled via leg.scale. But for body we use this.scale manually or apply ctx.scale?
        // In snippet: `ctx.ellipse(-25, 0, 45, 22 ...)` hardcoded.
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

        // 3. Mandibles
        ctx.fillStyle = "#1a0f00"; // Deep Black
        for (let side = -1; side <= 1; side += 2) {
            ctx.save();
            ctx.translate(45, side * 6); // Front of Head

            // Rotation based on State
            let baseRot = side * Math.PI * 0.25;
            let openRot = side * -Math.PI * 0.1;
            let currentRot = baseRot + (openRot - baseRot) * (this.cricketMandibleState || 0);

            ctx.rotate(currentRot);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(10, 0, 15, side * 5, 20, side * 2); // Outer
            ctx.bezierCurveTo(15, side * 0, 10, side * 0, 0, 0);   // Inner
            ctx.fill();
            ctx.restore();
        }

        // 4. Body Parts (Back to Front)

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



    drawStickInsect(ctx) {
        // Draw Held Prey (Visual Eating)
        this.drawHeldPrey(ctx);

        // 1. Legs (Bottom)
        this.stickLegs.forEach(leg => leg.draw(ctx, this));

        // 2. Head Antennae
        let head = this.stickSegments[0] || this.pos;

        ctx.strokeStyle = "#3E2723";
        ctx.lineWidth = 1 * this.scale;
        [0.2, -0.2].forEach(off => {
            let antLen = 90 * this.scale;
            let antAngle = this.angle + off;
            let ant = new Vec2(Math.cos(antAngle), Math.sin(antAngle)).mult(antLen);

            let twitch = Math.sin(Date.now() / 200) * 5 * this.scale;

            ctx.beginPath();
            ctx.moveTo(head.x, head.y);
            ctx.quadraticCurveTo(
                head.x + ant.x * 0.5, head.y + ant.y * 0.5,
                head.x + ant.x + twitch, head.y + ant.y
            );
            ctx.stroke();
        });

        // 3. Body Segments
        for (let i = 0; i < this.stickSegments.length - 1; i++) {
            let curr = this.stickSegments[i];
            let next = this.stickSegments[i + 1];
            let segAngle = Math.atan2(next.y - curr.y, next.x - curr.x);
            let len = curr.dist(next);

            ctx.save();
            ctx.translate(curr.x, curr.y);
            ctx.rotate(segAngle);

            let width = (i === 0 ? 7 : (i < 5 ? 5 : 3.5)) * this.scale;

            // Gradient
            let grad = ctx.createLinearGradient(0, -width, 0, width);
            grad.addColorStop(0, "#3E2723");
            grad.addColorStop(0.5, "#8D6E63");
            grad.addColorStop(1, "#3E2723");

            ctx.fillStyle = grad;
            ctx.beginPath();
            // Round Rect shim
            if (ctx.roundRect) ctx.roundRect(0, -width / 2, len + 1, width, width / 2);
            else ctx.rect(0, -width / 2, len + 1, width);
            ctx.fill();

            // Joint Node
            ctx.fillStyle = "#3E2723";
            ctx.beginPath();
            ctx.arc(0, 0, width / 2 + 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 4. Eyes
        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = "#000";
        ctx.beginPath();
        let eyeOffset = 3 * this.scale;
        let eyeSize = 1.8 * this.scale;
        ctx.arc(eyeOffset, -eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.arc(eyeOffset, eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fill();
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

    updateTarantula(input = {}, skipIntegration = false) {
        // ... (Scale handling)
        let effectiveTarget = this.targetScale * this.worldScaleModifier;
        if (Math.abs(this.scale - effectiveTarget) > 0.01) {
            this.scale += (effectiveTarget - this.scale) * 0.05;
            this.tarantulaLegs.forEach(leg => leg.updateScale(this.scale));
        } else {
            this.scale = effectiveTarget;
        }

        const s = this.scale;

        // --- Logic from Simulation Loop ---
        let isAttacking = this.tarantulaAttackTimer > 0;
        let attackFrames = TARANTULA_SETTINGS.attackDuration - this.tarantulaAttackTimer;

        let ax = 0, ay = 0;

        // Input mapping
        let keyW = input.up || false;
        let keyS = input.down || false;
        let keyA = input.left || false;
        let keyD = input.right || false;

        // Acceleration Logic
        let accel = (TARANTULA_SETTINGS.accel * 1.3) * s;
        if (input.shift && this.stamina > 0 && !isAttacking) {
            accel *= 2.5; // Boost acceleration.
        }

        if (isAttacking) {
            // LOCK INPUT completely during attack logic (Windup & Lunge & Cooldown)
            // But we must allow velocity to persist if it was set by Lunge Power.
            // During Windup (before lunge), spider should stop moving?
            if (attackFrames < TARANTULA_SETTINGS.attackWindup) {
                this.vel.x *= 0.4; this.vel.y *= 0.4; // Friction stop for windup
            }
            // During Lunge, velocity is set manually below.
            // After Lunge (Cooldown), we allow sliding (velocity decay) but NO input.
            // So: Do NOTHING here for ax/ay.
        } else {
            // Normal Movement
            if (keyW) ay -= accel;
            if (keyS) ay += accel;
            if (keyA) ax -= accel;
            if (keyD) ax += accel;
        }

        this.vel.x += ax; this.vel.y += ay;
        this.speed = Math.hypot(this.vel.x, this.vel.y);

        let currentMaxSpeed = (TARANTULA_SETTINGS.maxSpeed * 1.3) * s;

        // Stamina Run Logic (Standard Shift Sprint)
        if (input.shift && this.stamina > 0 && !isAttacking) {
            currentMaxSpeed *= 2.2; // Sprint Multiplier
            this.stamina = Math.max(0, this.stamina - 0.5); // Drain Stamina
        } else {
            if (this.stamina < this.maxStamina) this.stamina += 0.2; // Regen
        }

        if (isAttacking) {
            // 大幅前移触发点：105 像素，确保在头部前方炸开
            const burstDist = 105 * s;
            const burstX = this.pos.x + Math.cos(this.angle) * burstDist;
            const burstY = this.pos.y + Math.sin(this.angle) * burstDist;

            if (attackFrames === TARANTULA_SETTINGS.attackWindup) {
                // 瞬间弹射阶段：产生冲击波
                this.tarantulaEffects.push(new AttackEffect(burstX, burstY, 'shockwave', 0, s));

                // 产生大量灰尘粒子 (扇形朝前喷射)
                for (let i = 0; i < 35; i++) {
                    const ang = this.angle + (Math.random() - 0.5) * Math.PI * 1.2;
                    this.tarantulaEffects.push(new AttackEffect(burstX, burstY, 'dust', ang, s));
                }

                // Apply Lunge Velocity
                const power = TARANTULA_SETTINGS.attackPower * s;
                this.vel.x = Math.cos(this.angle) * power;
                this.vel.y = Math.sin(this.angle) * power;

                // TRIGGER EAT CALLBACK at Apex
                // In game, actual consumption happens here
                if (this.onConsumePrey) {
                    this.onConsumePrey(new Vec2(burstX, burstY));
                    this.onConsumePrey = null;
                }
                // Preys disappear visually here (at impact)
                this.heldPrey = null;
            }

            // 冲刺过程中持续产生破风粒子
            if (attackFrames > TARANTULA_SETTINGS.attackWindup && attackFrames < TARANTULA_SETTINGS.attackWindup + 15) {
                const headPos = this.pos.x + Math.cos(this.angle) * 60 * s;
                const headPosY = this.pos.y + Math.sin(this.angle) * 60 * s;
                this.tarantulaEffects.push(new AttackEffect(headPos, headPosY, 'spark', this.angle + Math.PI + (Math.random() - 0.5), s));
            }

            currentMaxSpeed = TARANTULA_SETTINGS.maxSpeed * 4.5 * s;
        }

        if (this.speed > currentMaxSpeed) {
            this.vel.x = (this.vel.x / this.speed) * currentMaxSpeed;
            this.vel.y = (this.vel.y / this.speed) * currentMaxSpeed;
        }

        if (!skipIntegration) {
            this.vel.x *= TARANTULA_SETTINGS.friction;
            this.vel.y *= TARANTULA_SETTINGS.friction;
            this.pos.x += this.vel.x;
            this.pos.y += this.vel.y;
        }

        // Rotation
        // In simulation, rotation happens if speed > 0.2
        if (this.speed > 0.2 * s) {
            // Note: Simulation uses Math.atan2(this.vel.y, this.vel.x) which aligns to movement.
            // Game normally has explicit turn input.
            // But strict copy implies we use movement direction alignment?
            // "W A S D" moves relative to screen in simulation logic (absolute ax/ay).
            // Game input usually assumes tank controls or absolute? 
            // Insect.js default: dx/dy -> targetAngle -> rotate towards.
            // Simulation: Accel -> Vel -> targetAngle -> rotate towards.
            // It is compatible.

            const targetAngle = Math.atan2(this.vel.y, this.vel.x);
            let diff = targetAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            let rotMod = (isAttacking && attackFrames < TARANTULA_SETTINGS.attackWindup) ? 0.02 : (isAttacking ? 0.1 : 1);
            this.angle += diff * TARANTULA_SETTINGS.rotSpeed * rotMod;

            this.moveDist += this.speed;
            if (this.moveDist > 24 * s) { this.stepGroup = 1 - this.stepGroup; this.moveDist = 0; }
        }

        // Timers
        if (this.tarantulaAttackTimer > 0) {
            this.tarantulaAttackTimer--;
            if (this.tarantulaAttackTimer <= 0) {
                this.predationState = 'idle'; // Reset game state
            }
        }
        if (this.webCooldown > 0) this.webCooldown--;

        // Boundaries (Game environment uses obstruction, but basic clamps here good for safety or omit?)
        // Omni-directional game world, maybe no bounds. Omit.

        // Updates
        this.tarantulaEffects.forEach(e => e.update());
        this.tarantulaEffects = this.tarantulaEffects.filter(e => e.active);
        this.tarantulaWebs.forEach(web => web.update());
        this.tarantulaWebs = this.tarantulaWebs.filter(web => web.active);

        this.tarantulaEffects = this.tarantulaEffects.filter(e => e.active);
        this.tarantulaWebs.forEach(web => web.update());
        this.tarantulaWebs = this.tarantulaWebs.filter(web => web.active);

        // Run generic predation update (for standard lunge/eating)
        if (this.predationState !== 'attacking' && this.predationState !== 'idle') {
            this.updatePredation();
        }

        // Fix: Update headPos for Collision Detection
        this.headPos = this.pos.clone().add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(20 * s));

        let moving = this.speed > 0.2 * s;
        this.tarantulaLegs.forEach(l => l.update(this.pos, this.angle, moving, this.speed / s, this.stepGroup, this.tarantulaAttackTimer));
    }



    updateScorpion(input) {
        // Fix: Ensure generic state doesn't lock us out (it should check actual scorpion state)
        if (this.predationState === 'attacking') this.predationState = 'idle';

        const s = this.scale;

        // --- Attack State Machine ---
        let speedMult = 1.0;
        let stingTarget = 0;

        // Auto-trigger if 'mouse 0' or 'space' is pressed? User said Left Mouse Button.
        // Assuming input has mouseDown or similar.
        // Also support 'predation' triggered by collision (triggerPredation).

        // if (input && input.mouseDown && this.scorpionAttackState === 'none') {
        //     this.triggerScorpionAttack();
        // }

        if (this.scorpionAttackState === 'windup') {
            speedMult = 0.5;
            stingTarget = 0.2; // 尾巴稍微抬起
            const backDir = new Vec2(Math.cos(this.angle + Math.PI), Math.sin(this.angle + Math.PI));
            // Backpedal slightly? Or just slow? 
            // In Sim: this.velocity = this.velocity.add(backDir.mult(0.2));
            // In Game: Velocity is controlled by Update loop. We can push it.
            this.vel = this.vel.add(backDir.mult(0.2 * s));

            this.scorpionAttackTimer--;
            if (this.scorpionAttackTimer <= 0) {
                this.scorpionAttackState = 'strike';
                this.scorpionAttackTimer = 8;

                // Strike Forward
                const fwdDir = new Vec2(Math.cos(this.angle), Math.sin(this.angle));
                this.vel = fwdDir.mult(15 * s);

                // Screen Shake (Sim: 10)
                // this.game.shake = 10; // If game has shake

                // --- Spawn Effects ---
                if (this.scorpionSegments.length > 0) {
                    const head = this.scorpionSegments[0];
                    const impactPos = head.pos.add(fwdDir.mult(50 * s));
                    this.scorpionEffects.push(new ScorpionEffect(impactPos.x, impactPos.y, s));

                    // Claws Effects
                    if (this.scorpionClaws) {
                        const rightDir = new Vec2(Math.cos(this.angle + Math.PI / 2), Math.sin(this.angle + Math.PI / 2));
                        this.scorpionClaws.forEach(claw => {
                            const clawImpact = this.pos
                                .add(fwdDir.mult(145 * s))
                                .add(rightDir.mult(claw.side * 25 * s));

                            const wave = new ScorpionEffect(clawImpact.x, clawImpact.y, s);
                            wave.maxRadius = 30 * s;
                            this.scorpionEffects.push(wave);
                        });
                    }

                    // --- Perform Consumption of Prey in Range ---
                    // Only if we actually triggered this via predation intent? Or always area damage?
                    // User said "Charge Attack                    // Time-Gate to prevent "100+ Count" glitches
                    if (this.onConsumePrey && (Date.now() - (this.lastConsumeTime || 0) > 500)) {
                        // Eat at impactPos
                        this.onConsumePrey(impactPos);
                        this.onConsumePrey = null; // Prevent multi-trigger
                        this.lastConsumeTime = Date.now();
                    }
                }
            }
        }
        else if (this.scorpionAttackState === 'strike') {
            stingTarget = 1.0; // 刺下去
            speedMult = 0;
            this.scorpionAttackTimer--;
            if (this.scorpionAttackTimer <= 0) {
                this.scorpionAttackState = 'recover';
                this.scorpionAttackTimer = 20;
            }
        }
        else if (this.scorpionAttackState === 'recover') {
            speedMult = 0.3;
            stingTarget = 0.0; // 目标变为初始状态
            this.scorpionAttackTimer--;
            if (this.scorpionAttackTimer <= 0) {
                this.scorpionAttackState = 'none';
                this.heldPrey = null;
                this.onConsumePrey = null;
            }
        }

        // --- Update Effects ---
        this.scorpionEffects.forEach(e => e.update());
        this.scorpionEffects = this.scorpionEffects.filter(e => e.active);

        // --- Segments Body IK (Tail) ---
        // Ensure segments exist
        if (this.scorpionSegments.length === 0) return;

        this.scorpionSegments[0].pos = this.pos.clone();
        this.scorpionSegments[0].angle = this.angle;
        // Fix: Update headPos for collision detection
        this.headPos = this.scorpionSegments[0].pos.clone();
        this.thoraxPos = this.pos.clone();

        // Tail Animation Smooth
        let stingSmooth = 0.1;
        if (this.scorpionAttackState === 'strike') stingSmooth = 0.6;
        else if (this.scorpionAttackState === 'recover') stingSmooth = 0.2;

        this.scorpionStingProgress += (stingTarget - this.scorpionStingProgress) * stingSmooth;


        for (let i = 1; i < this.scorpionSegments.length; i++) {
            const seg = this.scorpionSegments[i];
            const prev = this.scorpionSegments[i - 1];
            // Spacing
            const spacing = (seg.type === 'tail' ? 12 : 6) * s;

            if (seg.type === 'tail') {
                const tailIndex = i - 9;
                const hips = this.scorpionSegments[8] || prev;
                const lowerBody = this.scorpionSegments[7] || this.scorpionSegments[6] || hips;

                // Hips Back Dir
                let hipsBackDir = hips.pos.sub(lowerBody.pos).normalize();
                if (hipsBackDir.mag() === 0) hipsBackDir = new Vec2(Math.cos(hips.angle + Math.PI / 2), Math.sin(hips.angle + Math.PI / 2)); // Fallback

                // Rest Pose
                const distBack = (15 + tailIndex * 12) * s;
                const time = Date.now() / 1000;
                const sway = Math.sin(time + tailIndex * 0.5) * 2 * s;

                // Right Dir (Perp to Back)
                // If Back is (x, y), Right is (-y, x)? 
                // Wait. Sim: rightDir = new Vector(-hipsBackDir.y, hipsBackDir.x).
                const rightDir = new Vec2(-hipsBackDir.y, hipsBackDir.x);

                let restTarget = hips.pos.add(hipsBackDir.mult(distBack)).add(rightDir.mult(sway));

                // Attack Target (Over Head)
                const head = this.scorpionSegments[0];
                // Head Fwd is (cos(angle), sin(angle)).
                // Attack Dir is Fwd? Sim: Vector.fromAngle(head.angle - Math.PI/2).
                // My Head Angle = Velocity Angle.
                // Sim Head Angle = Velocity Angle + PI/2? No.
                // Sim: 0 is Up. -PI/2 is Left.
                // Sim: attackDir = head.angle - PI/2.
                // In my engine, Head Fwd IS (cos, sin) if moving.
                // But let's assume `head.angle` matches standard movement.
                // If moving Right (0 rad), attack should be forward (0 rad).
                // Sim: "fromAngle(head.angle - Math.PI/2)". Sim 0 = Up. -PI/2 = Right.
                // So Sim AttackDir = Forward.
                const attackDir = new Vec2(Math.cos(head.angle), Math.sin(head.angle));
                const attackDist = (30 + tailIndex * 12) * s;
                const attackTarget = head.pos.add(attackDir.mult(attackDist));

                // Mixed Target
                // let targetPos = restTarget * (1-p) + attackTarget * p
                let p = this.scorpionStingProgress;
                let targetPos = new Vec2(
                    restTarget.x * (1 - p) + attackTarget.x * p,
                    restTarget.y * (1 - p) + attackTarget.y * p
                );

                // Arching
                const archFactor = Math.sin(p * Math.PI);
                // Body Up Dir?
                // Seg 5 is mid body.
                const seg5 = this.scorpionSegments[5] || head;
                // Up dir in 2D top down? 'Up' implies Z, but here it's Y offset visually? 
                // Sim: "bodyUpDir = Vector.fromAngle(seg5.angle)". 
                // Wait, Sim uses Side View? No, Top Down.
                // Providing Y offset in top down implies 'Height' which isn't 2D. 
                // Ah, Sim logic: "archAmount". Maybe it pushes 'forward' or 'back'?
                // Sim Code: `targetPos = targetPos.add(bodyUpDir.mult(archAmount))`
                // If `bodyUpDir` is forward vector of body, it pushes tail away/forward.
                const bodyUpDir = new Vec2(Math.cos(seg5.angle), Math.sin(seg5.angle));
                const archAmount = 60 * s * archFactor;

                targetPos = targetPos.add(bodyUpDir.mult(archAmount));

                // Muscle Force
                const muscleStiffness = 0.2;
                seg.pos = seg.pos.add(targetPos.sub(seg.pos).mult(muscleStiffness));

                // Constraint
                let constraintVec = seg.pos.sub(prev.pos);
                if (constraintVec.mag() === 0) constraintVec = hipsBackDir.clone();
                constraintVec = constraintVec.normalize().mult(spacing);
                seg.pos = prev.pos.add(constraintVec);

                seg.angle = Math.atan2(prev.pos.y - seg.pos.y, prev.pos.x - seg.pos.x) + Math.PI / 2;

            } else {
                let dir = seg.pos.sub(prev.pos);
                if (dir.mag() === 0) dir = new Vec2(Math.cos(prev.angle + Math.PI), Math.sin(prev.angle + Math.PI));
                dir = dir.normalize().mult(spacing);
                seg.pos = prev.pos.add(dir);
                seg.angle = Math.atan2(prev.pos.y - seg.pos.y, prev.pos.x - seg.pos.x) + Math.PI / 2;
            }
        }

        // Update Legs & Claws
        if (this.scorpionLegs) this.scorpionLegs.forEach(leg => {
            leg.updateScale(s);
            // Pass attack state to leg? Sim legs react to attack speed.
            // Sim: leg.update(..., isAttacking).
            // My ScorpionLeg.update: (pos, angle, vel, isAttacking).
            leg.update(this.pos, this.angle, this.vel, this.scorpionAttackState !== 'none');
        });
        if (this.scorpionClaws) this.scorpionClaws.forEach(claw => {
            claw.updateScale(s);
            // Update Claw with State
            claw.update(this.pos, this.angle, this.vel, this.scorpionAttackState);
        });
    }

    triggerScorpionAttack() {
        if (this.scorpionAttackState === 'none') {
            this.scorpionAttackState = 'windup';
            this.scorpionAttackTimer = 15;
            // Optionally clear prey?
            return true;
        }
        return false;
    }

    updateGiantWeta(input) {
        const s = this.scale;

        // lazy init effects
        if (!this.wetaEffects) this.wetaEffects = [];

        if (this.wetaState === 'biting') {
            this.wetaBiteProgress += 0.03;

            // Movement Slowdown
            if (this.vel.mag() > 0) this.vel = this.vel.mult(0.5);

            // Lunge Offset Calculation
            if (this.wetaBiteProgress < 0.4) {
                let t = this.wetaBiteProgress / 0.4;
                this.wetaLungeOffset = Math.sin(t * Math.PI / 2) * 30 * s;
                // Lunge Movement (Body Surge)
                if (this.wetaBiteProgress > 0.2) {
                    let dir = new Vec2(Math.cos(this.angle), Math.sin(this.angle));
                    this.vel = this.vel.add(dir.mult(0.8 * s));
                }
            } else {
                let t = (this.wetaBiteProgress - 0.4) / 0.6;
                this.wetaLungeOffset = 30 * s * (1 - t);
            }

            // Impact Event (0.4)
            if (this.wetaBiteProgress >= 0.4 && !this.wetaHasFiredBite) {
                this.wetaHasFiredBite = true;

                // Effects
                let dirVec = new Vec2(Math.cos(this.angle), Math.sin(this.angle));
                let mouthPos = this.pos.add(dirVec.mult((60 + 30) * s));

                // Flash
                this.wetaEffects.push(new WetaEffect(mouthPos.clone(), new Vec2(0, 0), 10, 10 * s, 'rgba(255, 255, 200, 0.9)', 'impact_flash'));

                // Shockwave
                this.wetaEffects.push(new WetaEffect(mouthPos.clone(), dirVec.mult(2 * s), 15, 5 * s, 'rgba(200, 255, 200, 0.6)', 'shockwave'));

                // Debris
                for (let i = 0; i < 8; i++) {
                    let angleVar = (Math.random() - 0.5) * 1.5;
                    let speedVar = (3 + Math.random() * 8) * s;
                    let pVel = dirVec.rotate(angleVar).mult(speedVar);
                    this.wetaEffects.push(new WetaEffect(mouthPos.clone(), pVel, 25 + Math.random() * 15, (2 + Math.random() * 5) * s, 'rgba(120, 220, 60, 0.9)', 'bite_debris'));
                }

                // Consume Prey
                if (this.onConsumePrey && this.heldPrey) {
                    this.onConsumePrey(mouthPos);
                }
            }

            if (this.wetaBiteProgress >= 1) {
                this.wetaState = 'idle';
                this.heldPrey = null;
                this.onConsumePrey = null;
                this.wetaLungeOffset = 0;
            }
        }
        else {
            this.wetaState = 'idle';
            this.wetaLungeOffset = 0;
        }

        // --- Update Components ---
        let attackInfo = {
            isAttacking: this.wetaState === 'attacking',
            progress: 0,
            isBiting: this.wetaState === 'biting',
            biteProgress: this.wetaBiteProgress
        };

        // Effects Update
        this.wetaEffects.forEach(e => e.update());
        this.wetaEffects = this.wetaEffects.filter(e => e.active);

        // Legs Update
        let lungeVec = new Vec2(this.wetaLungeOffset || 0, 0).rotate(this.angle);
        let effectivePos = this.pos.add(lungeVec);

        this.wetaLegs.forEach(leg => leg.update(effectivePos, this.angle, this.vel, this.maxSpeed, s, attackInfo));

        // Antennae
        this.wetaAntennae.forEach((ant, i) => {
            let side = (i === 0) ? -1 : 1;
            ant.update(effectivePos, this.angle, side);
        });
    }

    triggerGiantWetaBite() {
        if (this.wetaState !== 'biting' && this.wetaState !== 'attacking') {
            this.wetaState = 'biting';
            this.wetaBiteProgress = 0;
            this.wetaHasFiredBite = false;
        }
    }

    drawTarantula(ctx) {
        const s = this.scale;

        // Webs (Splatted bottom)
        this.tarantulaWebs.forEach(web => { if (web.isSplatted) web.draw(ctx); });

        // Held Prey (Standard Eat)
        this.drawHeldPrey(ctx);

        let isAttacking = this.tarantulaAttackTimer > 0;
        let attackFrames = TARANTULA_SETTINGS.attackDuration - this.tarantulaAttackTimer;
        let shakeX = 0, shakeY = 0;

        if (isAttacking) {
            if (attackFrames < TARANTULA_SETTINGS.attackWindup) {
                shakeX = (Math.random() - 0.5) * 3 * s; shakeY = (Math.random() - 0.5) * 3 * s;
            } else if (attackFrames < TARANTULA_SETTINGS.attackWindup + 12) {
                shakeX = (Math.random() - 0.5) * 18 * s; shakeY = (Math.random() - 0.5) * 18 * s;
            }
        }

        if (shakeX !== 0) { ctx.save(); ctx.translate(shakeX, shakeY); }

        // Shadow
        ctx.save();
        ctx.translate(15 * s, 20 * s);
        ctx.globalAlpha = 0.2;
        this.renderTarantulaBody(ctx, true);
        ctx.restore();

        // Main Body
        this.renderTarantulaBody(ctx, false);

        if (shakeX !== 0) ctx.restore();

        // Webs (Flying)
        this.tarantulaWebs.forEach(web => { if (!web.isSplatted) web.draw(ctx); });

        // Effects (Top)
        this.tarantulaEffects.forEach(e => e.draw(ctx));
    }

    renderTarantulaBody(ctx, isShadow) {
        const s = this.scale;

        this.tarantulaLegs.forEach(l => l.draw(ctx, isShadow, this.tarantulaAttackTimer));

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);

        let isAttacking = this.tarantulaAttackTimer > 0;
        let attackFrames = TARANTULA_SETTINGS.attackDuration - this.tarantulaAttackTimer;

        // Scale Shake Effect on Body
        if (isAttacking) {
            if (attackFrames < TARANTULA_SETTINGS.attackWindup) {
                let t = attackFrames / TARANTULA_SETTINGS.attackWindup;
                ctx.scale(1 - t * 0.2, 1 - t * 0.1);
            } else {
                let t = (attackFrames - TARANTULA_SETTINGS.attackWindup) / 30;
                // Clamp
                if (t > 1) t = 1; else if (t < 0) t = 0; // Simple clamp for safety
                // Simulation: let t = (frames - windup) / 30. It might go > 1? 
                // Simulation logic: sin(t * PI).
                let sWiggle = 1 + Math.sin(t * Math.PI) * 0.18;
                ctx.scale(sWiggle, sWiggle);
            }
        }

        const SETTINGS = TARANTULA_SETTINGS;

        if (isShadow) {
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.ellipse(4 * s, 0, 22 * s, 18 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(-30 * s, 0, 35 * s, 26 * s, 0, 0, Math.PI * 2); ctx.fill();
        } else {
            // Helpers
            const drawFringeFuzz = (x, y, rx, ry, count, longSpikes) => {
                for (let i = 0; i < count; i++) {
                    const ang = (i / count) * Math.PI * 2;
                    const isLong = longSpikes && (i % 7 === 0);
                    ctx.strokeStyle = isLong ? SETTINGS.spiderSpike : SETTINGS.spiderFuzz;
                    ctx.lineWidth = (isLong ? 0.8 : 0.5) * s;
                    // Coords are local to body calc
                    const px = x + Math.cos(ang) * rx;
                    const py = y + Math.sin(ang) * ry;
                    const hLen = ((isLong ? 12 : 5) + Math.random() * 5) * s;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + Math.cos(ang) * hLen, py + Math.sin(ang) * hLen);
                    ctx.stroke();
                }
            };
            const drawSurfaceFuzz = (x, y, rx, ry, count) => {
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.lineWidth = 0.5 * s;
                for (let i = 0; i < count; i++) {
                    const px = x + (Math.random() - 0.5) * rx * 1.5;
                    const py = y + (Math.random() - 0.5) * ry * 1.5;
                    const ang = Math.random() * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + Math.cos(ang) * (4 * s), py + Math.sin(ang) * (4 * s));
                    ctx.stroke();
                }
            };
            const drawJointTuftInside = (x, y, angle) => {
                ctx.strokeStyle = SETTINGS.spiderFuzz;
                ctx.lineWidth = 0.5 * s;
                for (let i = 0; i < 4; i++) {
                    const a = angle + (Math.random() - 0.5);
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (8 * s), y + Math.sin(a) * (8 * s)); ctx.stroke();
                }
            };

            const abdGrad = ctx.createRadialGradient(-30 * s, -10 * s, 5 * s, -30 * s, 0, 40 * s);
            abdGrad.addColorStop(0, '#3a2a1a'); abdGrad.addColorStop(1, '#0a0805');
            ctx.fillStyle = abdGrad; ctx.beginPath(); ctx.ellipse(-30 * s, 0, 35 * s, 26 * s, 0, 0, Math.PI * 2); ctx.fill();
            drawFringeFuzz(-30 * s, 0, 35 * s, 26 * s, 60, true);
            drawSurfaceFuzz(-30 * s, 0, 30 * s, 20 * s, 30);

            const thoGrad = ctx.createRadialGradient(6 * s, -6 * s, 2 * s, 6 * s, 0, 25 * s);
            thoGrad.addColorStop(0, '#2a1a0a'); thoGrad.addColorStop(1, '#050402');
            ctx.fillStyle = thoGrad; ctx.beginPath(); ctx.ellipse(4 * s, 0, 22 * s, 18 * s, 0, 0, Math.PI * 2); ctx.fill();
            drawFringeFuzz(4 * s, 0, 22 * s, 18 * s, 40, false);
            drawSurfaceFuzz(4 * s, 0, 18 * s, 14 * s, 20);

            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(18 * s, 5 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(18 * s, -5 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();

            let eyeFlash = (isAttacking && attackFrames >= SETTINGS.attackWindup && attackFrames < SETTINGS.attackWindup + 10);
            if (eyeFlash) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = "#fff";
                ctx.fillStyle = "#fff";
            } else {
                ctx.fillStyle = isAttacking ? '#ff3300' : 'rgba(255,255,255,0.5)';
            }
            ctx.beginPath(); ctx.arc(19 * s, 4 * s, (eyeFlash ? 3.5 : 1.2) * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(19 * s, -4 * s, (eyeFlash ? 3.5 : 1.2) * s, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            ctx.strokeStyle = '#120c06'; ctx.lineWidth = 6 * s;
            this.palps.forEach(p => {
                ctx.beginPath(); ctx.moveTo(20 * s, p.ang * (12 * s));
                let palpSwing = 0;
                if (isAttacking) {
                    palpSwing = (attackFrames < SETTINGS.attackWindup) ? Math.sin(Date.now() * 0.15) * (18 * s) : Math.sin(Date.now() * 0.05) * (30 * s);
                } else if (this.webCooldown > 10) {
                    palpSwing = p.ang * (40 * s);
                } else {
                    palpSwing = Math.sin(Date.now() * 0.006) * (3 * s);
                }
                const px = (28 + Math.cos(p.ang) * p.len) * s;
                const py = (p.ang * 28) * s + palpSwing;
                ctx.lineTo(px, py); ctx.stroke();
                drawJointTuftInside(px, py, Math.atan2(py - p.ang * 12 * s, px - 20 * s));
            });
        }
        ctx.restore();
    }

    drawRhinoBeetle(ctx) {
        let s = this.scale;

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);

        // 1. Legs
        this.rhinoLegs.forEach(leg => leg.draw(ctx, this));

        // 2. Abdomen/Elytra
        let abdomenGrad = ctx.createRadialGradient(-10 * s, 0, 2 * s, -15 * s, 0, 45 * s);
        abdomenGrad.addColorStop(0, '#5D4037');
        abdomenGrad.addColorStop(0.4, '#3E1C1C');
        abdomenGrad.addColorStop(1, '#0f0505');

        ctx.fillStyle = abdomenGrad;
        ctx.beginPath();
        ctx.ellipse(-12 * s, 0, 34 * s, 21 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Elytra Suture
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(10 * s, 0);
        ctx.lineTo(-44 * s, 0);
        ctx.stroke();

        // 3. Pronotum
        let thoraxGrad = ctx.createRadialGradient(15 * s, 0, 2 * s, 15 * s, 0, 22 * s);
        thoraxGrad.addColorStop(0, '#5D4037');
        thoraxGrad.addColorStop(0.5, '#2b1212');
        thoraxGrad.addColorStop(1, '#0a0202');

        ctx.fillStyle = thoraxGrad;
        ctx.beginPath();
        ctx.moveTo(8 * s, -18 * s);
        ctx.bezierCurveTo(28 * s, -20 * s, 28 * s, 20 * s, 8 * s, 18 * s);
        ctx.bezierCurveTo(4 * s, 10 * s, 4 * s, -10 * s, 8 * s, -18 * s);
        ctx.fill();

        // Thorax Horn
        ctx.fillStyle = '#1a0505';
        ctx.beginPath();
        ctx.moveTo(18 * s, -6 * s);
        ctx.quadraticCurveTo(35 * s, 0, 42 * s, -6 * s);
        ctx.lineTo(40 * s, 0);
        ctx.lineTo(42 * s, 6 * s);
        ctx.quadraticCurveTo(35 * s, 0, 18 * s, 6 * s);
        ctx.fill();

        // Highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(20 * s, 0);
        ctx.lineTo(38 * s, 0);
        ctx.stroke();

        // 4. Head (With Sway)
        ctx.save();

        const swayAmount = 0.05;
        const speedFactor = Math.min(1.0, this.vel.mag() / this.maxSpeed);
        const headSway = Math.sin(this.rhinoWalkCycle * 0.6) * swayAmount * speedFactor;

        ctx.translate(18 * s, 0);
        ctx.rotate(headSway);
        ctx.translate(-18 * s, 0);

        // Head Sphere
        ctx.fillStyle = '#1a0505';
        ctx.beginPath();
        ctx.arc(24 * s, 0, 11 * s, 0, Math.PI * 2);
        ctx.fill();

        // Head Horn
        ctx.fillStyle = '#2b1212';
        ctx.beginPath();
        ctx.moveTo(28 * s, -6 * s);
        ctx.quadraticCurveTo(55 * s, 0, 75 * s, -12 * s);
        ctx.lineTo(62 * s, -4 * s);
        ctx.lineTo(58 * s, 0);
        ctx.lineTo(62 * s, 4 * s);
        ctx.lineTo(75 * s, 12 * s);
        ctx.quadraticCurveTo(55 * s, 0, 28 * s, 6 * s);
        ctx.fill();

        // Horn Highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.moveTo(30 * s, -2 * s);
        ctx.quadraticCurveTo(50 * s, 0, 65 * s, -2 * s);
        ctx.stroke();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(24 * s, -11 * s, 2.5 * s, 0, Math.PI * 2);
        ctx.arc(24 * s, 11 * s, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Eye Highlight
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(25 * s, -12 * s, 1 * s, 0, Math.PI * 2);
        ctx.arc(25 * s, 10 * s, 1 * s, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.restore();
    }

    drawCentipede(ctx) {
        const segments = this.centipedeSegments;
        if (!segments || segments.length === 0) return;

        const SEGMENT_SIZE = 18 * this.scale;

        // 1. Shadows
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        segments.forEach((seg, i) => {
            const size = i === 0 ? SEGMENT_SIZE * 1.2 : SEGMENT_SIZE * (1 - i / segments.length * 0.6);
            ctx.beginPath();
            ctx.arc(seg.x + 5 * this.scale, seg.y + 5 * this.scale, size, 0, Math.PI * 2);
            ctx.fill();
        });

        // 1.5. Particles
        if (this.centipedeEffects) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            this.centipedeEffects.forEach(p => {
                ctx.beginPath();
                const hue = 30 - (p.life * 20); // 10-30
                const life = Math.max(0, p.life);
                // Gradient local to particle
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${life})`);
                gradient.addColorStop(1, `hsla(${hue}, 100%, 30%, 0)`);

                ctx.fillStyle = gradient;
                ctx.translate(p.x, p.y);
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.translate(-p.x, -p.y);
            });
            ctx.restore();
        }

        // 2. Legs (Draw from 1 to N-1)

        const LEG_LENGTH = 35 * this.scale;

        for (let i = 1; i < segments.length - 1; i++) {
            let seg = segments[i];
            let sizeRatio = (1 - i / segments.length * 0.6);

            let legL = this.centipedeLegs[i * 2];
            let legR = this.centipedeLegs[i * 2 + 1];

            if (legL) legL.draw(ctx, seg.x, seg.y, seg.angle, this.centipedeLegPhase, sizeRatio);
            if (legR) legR.draw(ctx, seg.x, seg.y, seg.angle, this.centipedeLegPhase, sizeRatio);
        }

        // 3. Body
        segments.forEach((seg, i) => {
            const isHead = (i === 0);
            let size = isHead ? SEGMENT_SIZE * 1.3 : SEGMENT_SIZE * (1 - i / segments.length * 0.6);

            ctx.save();
            ctx.translate(seg.x, seg.y);
            ctx.rotate(seg.angle);

            const grad = ctx.createRadialGradient(size / 3, -size / 3, size / 4, 0, 0, size);

            if (isHead) {
                grad.addColorStop(0, '#ff4d4d');
                grad.addColorStop(0.5, '#800000');
                grad.addColorStop(1, '#1a0505');
            } else {
                grad.addColorStop(0, '#d16a2e');
                grad.addColorStop(0.5, '#692a0a');
                grad.addColorStop(1, '#1a0d05');
            }

            ctx.fillStyle = grad;

            ctx.beginPath();
            if (isHead) {
                ctx.ellipse(0, 0, size * 1.2, size, 0, 0, Math.PI * 2);
            } else {
                ctx.ellipse(0, 0, size, size * 0.9, 0, 0, Math.PI * 2);
            }
            ctx.fill();

            if (isHead) {
                // Mandibles & Antennae
                // Dynamic Mandibles
                const headSize = size;
                const openFactor = this.centipedeMandibleOpen || 0;

                // Antennae (Wiggle if attacking)
                ctx.strokeStyle = '#a33';
                ctx.lineWidth = 2 * this.scale;

                // Speed up wiggle if attacking
                const wiggleSpeed = (this.predationState === 'attacking') ? 2 : 0.5;
                let wave = Math.sin(this.centipedeLegPhase * wiggleSpeed) * 0.2;

                // L Antenna
                ctx.beginPath();
                ctx.moveTo(size * 0.5, -size * 0.4);
                ctx.quadraticCurveTo(size * 2, -size * 1.5 + (wave * 10 * this.scale), size * 3.5, -size * 0.8);
                ctx.stroke();
                // R Antenna
                ctx.beginPath();
                ctx.moveTo(size * 0.5, size * 0.4);
                ctx.quadraticCurveTo(size * 2, size * 1.5 - (wave * 10 * this.scale), size * 3.5, size * 0.8);
                ctx.stroke();

                // Mandibles (Dynamic)
                ctx.fillStyle = '#111';
                const baseOffset = 0.3;
                const currentOffset = baseOffset + (openFactor * 0.5);

                // Left
                ctx.beginPath();
                ctx.moveTo(size, -size * currentOffset);
                ctx.lineTo(size + (15 + openFactor * 10) * this.scale, -size * (0.1 + openFactor * 0.2));
                ctx.lineTo(size, 0);
                ctx.fill();

                // Right
                ctx.beginPath();
                ctx.moveTo(size, size * currentOffset);
                ctx.lineTo(size + (15 + openFactor * 10) * this.scale, size * (0.1 + openFactor * 0.2));
                ctx.lineTo(size, 0);
                ctx.fill();
            }

            ctx.restore();
        });

        // Draw Held Prey (Visual Eating)
        this.drawHeldPrey(ctx);
    }





    updatePredation() {
        if (this.predationState === 'idle') return;

        // --- Mantis Grapple ---
        if (this.predationState === 'attacking' && this.form === 'MANTIS') {
            if (this.heldPrey) {
                const s = this.scale;
                const lungeDist = this.mantisLunge;
                // Visual sweet spot for "in claws"
                const baseReach = 60 * s;
                const totalReach = lungeDist + baseReach;

                const targetPos = this.pos.add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(totalReach));

                // Snap/Lerp prey to claws
                this.heldPrey.pos.x += (targetPos.x - this.heldPrey.pos.x) * 0.4;
                this.heldPrey.pos.y += (targetPos.y - this.heldPrey.pos.y) * 0.4;
                this.heldPrey.angle = this.angle + Math.PI / 2; // Orient prey crosswise
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

            if (this.heldPrey) {
                this.heldPrey.pos = tipCenter;
            } else {
                this.predationState = 'idle';
                return;
            }

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

    drawScorpion(ctx) {
        const s = this.scale;

        // 0. Effects (Shockwaves) - Draw Below
        if (this.scorpionEffects) {
            for (let i = this.scorpionEffects.length - 1; i >= 0; i--) {
                const fx = this.scorpionEffects[i];
                // Check active state, though update filters it.
                if (fx.active || fx.life > 0) {
                    fx.draw(ctx); // Use the class draw method
                }
            }
        }

        // 1. Shadows
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        this.scorpionSegments.forEach(seg => {
            ctx.beginPath();
            ctx.ellipse(
                seg.pos.x + 4 * this.scale,
                seg.pos.y + 4 * this.scale,
                seg.size,
                seg.size * 0.8,
                seg.angle, 0, Math.PI * 2
            );
            ctx.fill();
        });

        // 2. Legs & Claws
        this.scorpionLegs.forEach(leg => leg.draw(ctx));
        this.scorpionClaws.forEach(claw => claw.draw(ctx));

        // 3. Body
        for (let i = 9; i >= 3; i--) this.drawScorpionSegment(ctx, i);
        for (let i = 2; i >= 0; i--) this.drawScorpionSegment(ctx, i);
        for (let i = 10; i < this.scorpionSegments.length; i++) this.drawScorpionSegment(ctx, i);

        // 4. Stinger
        if (this.scorpionSegments.length > 0) {
            const last = this.scorpionSegments[this.scorpionSegments.length - 1];

            ctx.save();
            ctx.translate(last.pos.x, last.pos.y);
            ctx.rotate(last.angle);

            ctx.fillStyle = '#8a2020';
            ctx.beginPath(); ctx.arc(0, 4 * s, 7 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

            // Highlight during attack
            if (this.scorpionAttackState !== 'none') {
                ctx.shadowColor = 'red';
                ctx.shadowBlur = 15 * s;
            }

            ctx.fillStyle = '#0f0505';
            ctx.beginPath();
            ctx.moveTo(-4 * s, 9 * s);
            ctx.lineTo(4 * s, 9 * s);
            ctx.bezierCurveTo(55 * s, 15 * s, 45 * s, 75 * s, 0, 80 * s);
            ctx.bezierCurveTo(15 * s, 75 * s, 35 * s, 20 * s, -4 * s, 9 * s);
            ctx.fill();

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1 * s;
            ctx.moveTo(0, 12 * s);
            ctx.quadraticCurveTo(40 * s, 45 * s, 2 * s, 75 * s);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Draw Held Prey (Visual Eating)
        this.drawHeldPrey(ctx);
    }

    drawScorpionSegment(ctx, i) {
        if (!this.scorpionSegments[i]) return;
        const seg = this.scorpionSegments[i];
        const s = this.scale;

        ctx.save();
        ctx.translate(seg.pos.x, seg.pos.y);
        ctx.rotate(seg.angle);

        ctx.strokeStyle = '#2d241b';
        ctx.lineWidth = Math.max(0.5, 1 * s); // Ensure visible even at small scale

        if (seg.type === 'head') {
            ctx.fillStyle = '#4a3b2a';
            const w = seg.size;
            const h = seg.size * 0.8;
            ctx.beginPath();
            ctx.moveTo(-w, h);
            ctx.bezierCurveTo(-w, -h, w, -h, w, h);
            ctx.lineTo(-w, h);
            ctx.fill(); ctx.stroke();

            if (i === 1) { // Eyes on middle head segment
                ctx.fillStyle = 'black';
                ctx.beginPath(); ctx.arc(0, -5 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(-w + 2 * s, -2 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(w - 2 * s, -2 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
            }
        } else if (seg.type === 'body') {
            ctx.fillStyle = '#5c4935';
            const w = seg.size;
            const h = seg.size * 0.35;
            ctx.beginPath(); ctx.rect(-w, -h, w * 2, h * 2); ctx.fill(); ctx.stroke();

            // Detail Line
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.moveTo(0, -h);
            ctx.lineTo(0, h);
            ctx.stroke();

        } else if (seg.type === 'tail') {
            ctx.fillStyle = '#755c42';
            const w = seg.size;
            const h = seg.size * 1.5;
            ctx.beginPath();
            ctx.moveTo(-w, -h / 2); ctx.lineTo(w, -h / 2); ctx.lineTo(w * 0.8, h / 2); ctx.lineTo(-w * 0.8, h / 2);
            ctx.closePath(); ctx.fill(); ctx.stroke();

            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.moveTo(-w * 0.5, 0); ctx.lineTo(w * 0.5, 0); ctx.stroke();
        }
        ctx.restore();
    }

    // --- Titan Methods (Exact logic from Reference) ---
    updateStickInsect(input) {
        const s = this.scale;

        // Detect NPC: input is usually an empty object or persistent object for players.
        // For NPC calls from main.js: updateStickInsect({}) -> input has no keys.
        // For Player: input has keys like 'up', 'down', etc.
        const isPlayer = input && (input.up !== undefined || input.keys !== undefined || input.mouseDown !== undefined);

        // --- Movement & Attack Logic ---
        let shouldMove = true;

        if (this.predationState === 'attacking') {
            shouldMove = false; // Lock Input / Movement

            // Check Attack Progress (Driven by legs)
            let leg = this.stickLegs[0];
            if (leg && leg.isAttacking) {
                let prog = leg.attackProgress;

                // Velocity Surge (Thrust)
                // In snippet: around 0.4 progress, velocity becomes 12.
                if (prog > 0.4 && prog < 0.52) {
                    let surgeSpeed = 12 * s;
                    this.vel = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(surgeSpeed);
                }

                // Eat Event / Impact at ~0.5
                // Trigger callback and destroy prey visual
                if (prog >= 0.5 && this.heldPrey) {
                    if (this.onConsumePrey) {
                        // Impact position ~150px in front
                        let hitPos = this.pos.add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(150 * s));
                        this.onConsumePrey(hitPos);
                        this.onConsumePrey = null;

                        // Shake effect? (simulated by random offsets in draw, handled via this.shake = 8?)
                        // this.shake = 8; // If we implemented shake in Insect generic props
                    }
                    this.heldPrey = null;
                }

                // End Attack
                if (prog >= 1) {
                    this.predationState = 'idle';
                }
            } else {
                // Failsafe
                this.predationState = 'idle';
            }
        }

        // Standard Movement (if not locked)
        if (shouldMove && isPlayer) {
            // Reuse generic acceleration or simple directional?

            let ax = 0, ay = 0;
            let accel = 0.35 * s;
            if (input.shift && this.stamina > 0) { accel *= 2.0; this.stamina -= 0.5; }
            else if (this.stamina < this.maxStamina) this.stamina += 0.5;

            if (input.up) ay -= accel;
            if (input.down) ay += accel;
            if (input.left) ax -= accel;
            if (input.right) ax += accel;

            this.vel.x += ax; this.vel.y += ay;

            // Friction
            this.vel = this.vel.mult(0.9);

            // Angle follows velocity for Stick Insect (it turns to move)
            let speed = this.vel.mag();
            this.speed = speed;
            if (speed > 0.1) {
                let targetAngle = Math.atan2(this.vel.y, this.vel.x);
                // Smooth turn
                let diff = targetAngle - this.angle;
                while (diff <= -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.angle += diff * 0.1;
            }
            this.pos = this.pos.add(this.vel); // Apply position update for player
        } else if (shouldMove && !isPlayer) {
            // NPC Logic: Velocity already set by main.js AI.
            // Just ensure 'speed' prop is up to date for animation
            this.speed = this.vel.mag();
            // No friction application here, main.js handles movement.
            // Position update for NPC is handled by main.js AI.
        } else { // !shouldMove (i.e., attacking)
            // Still apply friction/physics if locked (so surge decays)
            this.vel = this.vel.mult(0.9);
            this.speed = this.vel.mag();
            // If player, apply position update for attack lunge/recoil
            if (isPlayer) this.pos = this.pos.add(this.vel);
            // If NPC, main.js AI should handle position during attack, or it remains stationary.
        }

        // Update Segments (Physics Trail)
        if (this.stickSegments && this.stickSegments.length > 0) {
            this.stickSegments[0] = this.pos.clone();
            for (let i = 1; i < this.stickSegments.length; i++) {
                let prev = this.stickSegments[i - 1];
                let curr = this.stickSegments[i];
                let dist = prev.dist(curr);
                let targetDist = (i <= 4 ? 16 : 20) * s;
                if (dist > 0) {
                    let overlap = dist - targetDist;
                    let dir = curr.sub(prev).normalize();
                    this.stickSegments[i] = curr.sub(dir.mult(overlap * 0.8));
                }
            }
        }

        // Head Pos Update (for Eating Range calculation)
        this.headPos = this.pos.clone();

        // Update Legs
        if (this.stickLegs) {
            this.stickLegs.forEach(leg => {
                leg.updateScale(s);
                leg.update(this);
            });
        }
    }

    updateCockroach(input) {
        const s = this.scale;
        const isPlayer = input && (input.up !== undefined || input.keys !== undefined || input.mouseDown !== undefined);

        // --- Attack Trigger (Auto or Manual) ---
        let triggerAttack = false;

        // If preying, we force attack state
        // If preying, we force attack state
        if (this.predationState === 'attacking' && !this.wasAttacking) {
            triggerAttack = true; // Auto-trigger burst
        }
        // Manual override (Space) for 'Deterrence' effect
        if (isPlayer && input.space && !this.wasAttacking) {
            triggerAttack = true;
            this.predationState = 'attacking'; // Set state if manual
        }

        let isAttacking = (this.predationState === 'attacking');

        // Check completion of effects to reset state if it was a manual/empty attack
        // Actually, let's use a timer or effect life?
        // Sim logic: isAttacking = keys.space.
        // Game logic: one-shot trigger, sustain for a bit?
        // Let's make it sustain providing visuals.

        if (triggerAttack) {
            // Spawn Center Shockwave (at head)
            let forward = new Vec2(Math.cos(this.angle), Math.sin(this.angle));
            // 修正：从 30 调整为 48，确保位置在头部前端
            let headPos = this.pos.add(forward.mult(48 * s));

            // 1. Main Shockwave
            this.cockroachEffects.push(new CockroachEffect(headPos.x, headPos.y, 'shockwave', 0, s));

            // 2. Burst of Speed Lines
            for (let i = 0; i < 12; i++) {
                let spawnAngle = this.angle;
                this.cockroachEffects.push(new CockroachEffect(headPos.x, headPos.y, 'line', spawnAngle, s));
            }

            // If we have prey, we consume it immediately (AoE style or Instant)
            // Or wait for effect?
            // "威慑攻击 (爆发特效)" implies instant hit.
            if (this.heldPrey && this.onConsumePrey) {
                this.onConsumePrey(headPos);
                this.heldPrey = null;
                // Reset state after burst?
                setTimeout(() => { if (this.predationState === 'attacking') this.predationState = 'idle'; }, 300);
            } else {
                // Manual burst, reset quickly
                setTimeout(() => { if (this.predationState === 'attacking') this.predationState = 'idle'; }, 300);
            }
        }

        this.wasAttacking = isAttacking;

        // Wing Animation Logic
        if (isAttacking) {
            this.wingOpenFactor += 0.1;
        } else {
            this.wingOpenFactor -= 0.05;
        }
        this.wingOpenFactor = Math.max(0, Math.min(1, this.wingOpenFactor));

        // Movement
        let shouldMove = true;

        if (shouldMove && isPlayer) {
            let ax = 0, ay = 0;
            let accel = 0.8 * s; // Fast

            // Disable manual input during attack burst
            if (!isAttacking) {
                if (input.up) ay -= accel;
                if (input.down) ay += accel;
                if (input.left) ax -= accel;
                if (input.right) ax += accel;
            }

            if (isAttacking) ay -= 0.5 * s; // Burst forward

            this.vel.x += ax; this.vel.y += ay;
            this.vel = this.vel.mult(0.85); // High friction for snappy movement

            let speed = this.vel.mag();
            this.speed = speed;

            if (speed > 0.1) {
                let targetAngle = Math.atan2(this.vel.y, this.vel.x);
                let diff = targetAngle - this.angle;
                while (diff <= -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.angle += diff * 0.15; // Fast turn

                if (isAttacking) this.angle += (Math.random() - 0.5) * 0.1; // Jitter
            }
            this.pos = this.pos.add(this.vel);
        } else if (!isPlayer) {
            // NPC
            this.speed = this.vel.mag();
            // Angle/Pos handled by AI
        }

        // Head Pos
        let forward = new Vec2(Math.cos(this.angle), Math.sin(this.angle));
        this.headPos = this.pos.add(forward.mult(35 * s));

        // Update Parts
        this.cockroachAntennae.forEach(ant => {
            ant.updateScale(s);
            ant.update(this.headPos, this.angle, this.vel, isAttacking);
        });

        let speedMag = this.speed;
        let gaitSpeed = isAttacking ? 0.8 : 0.15;
        this.gaitClock += speedMag * gaitSpeed; // Normalised speed factor needed? 
        // Sim uses 'speedMag' directly, where maxSpeed is 8.
        // Our speedMag is pixels/frame, roughly same range.

        let groupA_CanStep = Math.sin(this.gaitClock) > 0;

        this.cockroachLegs.forEach((leg, i) => {
            leg.updateScale(s);
            let isGroupA = (i === 0 || i === 3 || i === 4);
            let allowed = (isGroupA && groupA_CanStep) || (!isGroupA && !groupA_CanStep);

            if (isAttacking) allowed = true;

            if (speedMag > (0.5 * s)) {
                if (allowed) leg.update(this.pos, this.angle, this.vel, isAttacking);
            } else {
                leg.update(this.pos, this.angle, this.vel, false);
            }
        });

        // Effects
        this.cockroachEffects.forEach(e => e.update());
        this.cockroachEffects = this.cockroachEffects.filter(e => !e.dead);
    }

    updateTitan(dt) {
        this.titanTime += dt;

        // Update Legs
        this.titanLegs.forEach(leg => {
            leg.update(dt, this.vel);
        });

        // Update Tail (Stable Chain)
        this.updateStableChain(this.titanTail, 180 * this.scale, 45 * this.scale);

        // Update Antennae (Stable Chain)
        this.updateStableChainAntennae(this.titanAntennae, 120 * this.scale, 50 * this.scale, 22 * this.scale);

        // Fix: Update headPos for collision
        this.headPos = this.pos.clone().add(new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(90 * this.scale));
    }

    updateStableChain(chain, rootOffset, spacing) {
        let tx = this.pos.x - Math.cos(this.angle) * rootOffset;
        let ty = this.pos.y - Math.sin(this.angle) * rootOffset;

        chain.forEach((seg) => {
            const dx = tx - seg.x, dy = ty - seg.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > spacing || dist < spacing * 0.5) {
                const ang = Math.atan2(dy, dx);
                seg.x = tx - Math.cos(ang) * spacing;
                seg.y = ty - Math.sin(ang) * spacing;
            }
            tx = seg.x; ty = seg.y;

            // Dynamic Size Update
            seg.size = seg.sizeBase * this.scale;
        });
    }

    updateStableChainAntennae(antennae, localX, localY, spacing) {
        const cos = Math.cos(this.angle), sin = Math.sin(this.angle);

        antennae.forEach(ant => {
            let tx = this.pos.x + (localX * cos - ant.side * localY * sin);
            let ty = this.pos.y + (localX * sin + ant.side * localY * cos);

            ant.segments.forEach((seg) => {
                const dx = tx - seg.x, dy = ty - seg.y, dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > spacing) {
                    const ang = Math.atan2(dy, dx);
                    seg.x = tx - Math.cos(ang) * spacing;
                    seg.y = ty - Math.sin(ang) * spacing;
                }
                tx = seg.x; ty = seg.y;

                // Dynamic Size
                seg.size = seg.sizeBase * this.scale;
            });
        });
    }

    drawTitan(ctx) {
        // Legs
        this.titanLegs.forEach(leg => leg.draw(ctx));

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);

        const glow = `rgba(255, 61, 0, ${0.4 + Math.sin(this.titanTime * 3) * 0.2})`;

        // Body Segments
        const bodySegs = [
            { x: -20, w: 80 },
            { x: -100, w: 100 },
            { x: -180, w: 110 }
        ];

        bodySegs.forEach((seg, i) => {
            const bx = seg.x * this.scale;
            const bw = seg.w * this.scale;
            TitanUtils.drawOrganicPoly(ctx, bx, 0, bw, 12, {
                spike: 8 * this.scale, detail: 2, color: '#5d4037',
                gloss: 0.5, textureSeed: i, glow: glow
            });
        });

        // Thorax
        TitanUtils.drawOrganicPoly(ctx, 40 * this.scale, 0, 90 * this.scale, 8, {
            spike: 15 * this.scale, detail: 3, rotation: Math.PI / 8,
            color: '#2a1a15', gloss: 0.8, textureSeed: 10, glow
        });

        // Mandibles
        ctx.fillStyle = '#1a0a05'; ctx.strokeStyle = '#ff3d00'; ctx.lineWidth = 2 * this.scale;
        [1, -1].forEach(side => {
            ctx.save();
            ctx.translate(60 * this.scale, side * 40 * this.scale);
            ctx.rotate(side * 0.6);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(50 * this.scale, side * 80 * this.scale, 130 * this.scale, side * 30 * this.scale, 150 * this.scale, side * 60 * this.scale);
            ctx.lineTo(100 * this.scale, side * 15 * this.scale);
            ctx.fill(); ctx.stroke();
            ctx.restore();
        });

        // Wings / Cape
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#4a2c2a';

        const speedRatio = (this.vel.mag() / this.maxSpeed);
        const wingIntensity = speedRatio * 25 * this.scale;

        [1, -1].forEach(side => {
            const indShake = Math.sin(this.titanTime * 15 + side * 0.5) * wingIntensity;
            ctx.beginPath();
            ctx.moveTo(-30 * this.scale, side * 40 * this.scale);
            ctx.bezierCurveTo(
                -200 * this.scale,
                (side * 300 * this.scale) + indShake,
                -500 * this.scale,
                (side * 200 * this.scale) + indShake,
                -600 * this.scale,
                side * 60 * this.scale
            );
            ctx.lineTo(-150 * this.scale, 0);
            ctx.fill();
        });
        ctx.restore();

        // Head
        this.drawTitanHead(ctx, glow);

        // Draw Held Prey (Visual Eating)
        this.drawHeldPrey(ctx);

        ctx.restore();

        // Antennae
        this.titanAntennae.forEach(ant => {
            ctx.beginPath();
            ctx.strokeStyle = '#000';
            ctx.lineCap = 'round';
            if (ant.segments.length < 1) return;

            ant.segments.forEach((seg, i) => {
                const prev = ant.segments[i - 1];
                const vSway = Math.sin(this.titanTime * 4 + i * 0.4) * 15 * this.scale;
                let ang = 0;
                if (prev) {
                    ang = Math.atan2(seg.y - prev.y, seg.x - prev.x);
                } else {
                    ang = Math.atan2(seg.y - this.pos.y, seg.x - this.pos.x);
                }

                const sx = seg.x + Math.cos(ang + Math.PI / 2) * vSway;
                const sy = seg.y + Math.sin(ang + Math.PI / 2) * vSway;

                ctx.lineWidth = seg.size;
                if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
                ctx.stroke();

                ctx.beginPath(); ctx.moveTo(sx, sy);
            });
        });

        // Tail
        this.titanTail.forEach((seg, i) => {
            const prev = this.titanTail[i - 1];
            const ang = prev ? Math.atan2(seg.y - prev.y, seg.x - prev.x) : this.angle;

            const moveFactor = (this.vel.mag() / this.maxSpeed) + 0.1;
            // Ramp up sway over first 4 segments to keep connection to body stable
            const swayDamp = Math.min(1.0, i / 4);
            const vSway = Math.sin(this.titanTime * 2 + i * 0.3) * 8 * this.scale * moveFactor * swayDamp;

            const sx = seg.x + Math.cos(ang + Math.PI / 2) * vSway;
            const sy = seg.y + Math.sin(ang + Math.PI / 2) * vSway;

            if (i === this.titanTail.length - 1) {
                // STINGER
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(ang);
                ctx.scale(this.scale, this.scale);

                ctx.fillStyle = '#ff3d00';
                ctx.beginPath();
                ctx.ellipse(0, 0, 65, 45, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.moveTo(40, -15);
                ctx.bezierCurveTo(120, -100, 200, 0, 160, 80);
                ctx.lineTo(145, 60);
                ctx.bezierCurveTo(170, 0, 100, -30, 40, 15);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(80, -30);
                ctx.quadraticCurveTo(150, -20, 155, 50);
                ctx.stroke();

                ctx.restore();
            } else {
                TitanUtils.drawOrganicPoly(ctx, sx, sy, seg.size, 6, {
                    spike: 15 * this.scale, detail: 1, color: '#4e342e',
                    gloss: 0.4, rotation: ang + Math.PI / 2, textureSeed: i
                });
            }
        });

        // Draw Held Prey (Visual Eating)
        this.drawHeldPrey(ctx);
    }

    drawTitanHead(ctx, glow) {
        ctx.save();
        ctx.translate(130 * this.scale, 0);
        const br = Math.sin(this.titanTime * 2) * 0.1;

        const drawM = (sign) => {
            ctx.save();
            ctx.rotate(sign * (0.3 - br));
            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath();
            ctx.moveTo(0, sign * 25 * this.scale);
            ctx.bezierCurveTo(80 * this.scale, sign * 110 * this.scale, 180 * this.scale, sign * 45 * this.scale, 210 * this.scale, sign * 5 * this.scale);
            ctx.lineTo(180 * this.scale, 0);

            for (let k = 0; k < 10; k++) {
                const tx = (180 - k * 18) * this.scale;
                const spikeDepth = (22 + (Math.random() * 5)) * this.scale;
                ctx.lineTo(tx + 5 * this.scale, sign * spikeDepth);
                ctx.lineTo(tx - 12 * this.scale, sign * 2 * this.scale);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#444'; ctx.lineWidth = 2 * this.scale; ctx.stroke();
            ctx.restore();
        };
        drawM(1);
        drawM(-1);

        TitanUtils.drawOrganicPoly(ctx, 0, 0, 60 * this.scale, 6, {
            spike: 6 * this.scale, detail: 2, color: '#3e2723',
            gloss: 0.8, textureSeed: 88
        });

        ctx.fillStyle = '#ff3d00';
        for (let k = 0; k < 3; k++) {
            ctx.fillRect((25 + k * 10) * this.scale, 20 * this.scale, 12 * this.scale, 18 * this.scale);
            ctx.fillRect((25 + k * 10) * this.scale, -40 * this.scale, 12 * this.scale, 18 * this.scale);
        }
        ctx.restore();
    }
}

// Helper Class for Damage Numbers
class DamagePopup {
    constructor(x, y, text) {
        this.pos = new Vec2(x, y);
        this.vel = new Vec2(0, -2.0 * (window.game?.scale || 1.0)); // Float up faster
        this.text = text;
        this.life = 1.0;
        this.alpha = 1.0;
    }
    update() {
        this.pos = this.pos.add(this.vel);
        this.life -= 0.015; // Slower fade
        this.alpha = Math.max(0, Math.min(1, this.life));
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.pos.x, this.pos.y);

        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 48px Arial'; // Much Larger
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'black'; // Black outline for contrast
        ctx.textAlign = 'center';

        // Add Shadow
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;

        ctx.strokeText(this.text, 0, 0);
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}