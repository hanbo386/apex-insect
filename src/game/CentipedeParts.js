export class CentipedeLeg {
    constructor(segmentIndex, side, scale = 1.0) {
        this.segmentIndex = segmentIndex;
        this.side = side;
        this.scale = scale;
        this.legPhase = 0;
    }

    updateScale(s) {
        this.scale = s;
    }

    // Draw directly, similar to Rhino/Reference
    draw(ctx, segX, segY, segAngle, phase, lenPercent) {
        const SEGMENT_SIZE = 18 * this.scale;
        const LEG_LENGTH = 35 * this.scale;

        // Calculate offset and swing based on segment index and phase
        const offset = this.segmentIndex * 0.5;
        const swing = Math.sin(phase + offset) * 0.6;

        let angle = (this.side === -1)
            ? segAngle - Math.PI / 2 + swing * 0.5
            : segAngle + Math.PI / 2 + swing * 0.5;

        let finalLen = LEG_LENGTH * lenPercent;

        // --- Draw logic from reference `drawLeg` ---
        // tip
        const tipX = segX + Math.cos(angle) * finalLen;
        const tipY = segY + Math.sin(angle) * finalLen;

        // knee
        const kneeDist = finalLen * 0.6;
        const kneeX = segX + Math.cos(angle - this.side * 0.2) * kneeDist;
        const kneeY = segY + Math.sin(angle - this.side * 0.2) * kneeDist;

        ctx.strokeStyle = '#3e0e0e'; // Dark red/black
        ctx.lineCap = 'round';
        ctx.lineWidth = 3 * this.scale;

        ctx.beginPath();
        ctx.moveTo(segX, segY);
        ctx.quadraticCurveTo(kneeX, kneeY, tipX, tipY);
        ctx.stroke();

        // tip dot
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(tipX, tipY, 1.5 * this.scale, 0, Math.PI * 2);
        ctx.fill();
    }
}
