
import { Vec2 } from './Vec2.js';

export class RhinoBeetleLeg {
    constructor(side, index, scale = 1.0) {
        this.side = side;
        this.index = index;
        this.scale = scale;

        // Spread angles for 3 legs per side
        // Index 0 (Front): -0.6
        // Index 1 (Mid):    0.1
        // Index 2 (Back):   0.7
        this.baseSpreadAngle = (index === 0 ? -0.6 : (index === 1 ? 0.1 : 0.7));

        // Base mounting offsets
        // Index 0: 12
        // Index 1: 0
        // Index 2: -12
        this.baseXRatio = (index === 0 ? 12 : (index === 1 ? 0 : -12));
        this.baseYRatio = 12 * side;

        this.walkCycleOffset = (side === 1 ? 0 : Math.PI); // Phase offset for side

        // Visual properties
        this.legStroke = 4.5;
        this.legColor = '#1a0505';
    }

    updateScale(s) {
        this.scale = s;
    }

    // New API: simple "draw at" logic, driven by walk cycle param
    // Insect.js will manage the 'walkCycle' timer
    draw(ctx, beetle) {
        let s = this.scale;
        let walkCycle = beetle.rhinoWalkCycle || 0;

        // Calculate dynamic properties
        let wc = walkCycle + this.walkCycleOffset;
        let swing = Math.sin(wc) * 0.45;

        // Mounting Point Visual is relative to body center (0,0) in Beetle's local space
        // We assume ctx is ALREADY translated/rotated to Beetle Body Center

        let startX = this.baseXRatio * s;
        let startY = 12 * this.side * s;

        let baseAngle = (this.side * Math.PI / 2);

        // Femur
        let femurAngle = baseAngle + (this.baseSpreadAngle * this.side) + (swing * this.side * 0.3);
        let femurLen = 22 * s;

        let kneeX = startX + Math.cos(femurAngle) * femurLen;
        let kneeY = startY + Math.sin(femurAngle) * femurLen;

        // Tibia
        let tibiaAngle = femurAngle + (this.side * 0.6) + (swing * this.side * 0.5);
        let tibiaLen = 20 * s;

        let footX = kneeX + Math.cos(tibiaAngle) * tibiaLen;
        let footY = kneeY + Math.sin(tibiaAngle) * tibiaLen;

        // Visualization
        ctx.strokeStyle = this.legColor;
        ctx.lineWidth = this.legStroke * s;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Main Leg
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(footX, footY);
        ctx.stroke();

        // Spikes
        ctx.lineWidth = 1.5 * s;
        let spikeLen = 4 * s;
        for (let i = 1; i <= 3; i++) {
            let t = i / 4;
            let spX = kneeX + (footX - kneeX) * t;
            let spY = kneeY + (footY - kneeY) * t;
            let spAngle = tibiaAngle + (this.side * 2.2);

            ctx.beginPath();
            ctx.moveTo(spX, spY);
            ctx.lineTo(spX + Math.cos(spAngle) * spikeLen, spY + Math.sin(spAngle) * spikeLen);
            ctx.stroke();
        }

        // Foot
        ctx.lineWidth = 1 * s;
        ctx.fillStyle = '#2b1212';
        ctx.beginPath();
        ctx.arc(footX, footY, 2 * s, 0, Math.PI * 2);
        ctx.fill();
    }
}
