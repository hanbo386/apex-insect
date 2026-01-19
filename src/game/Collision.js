import { Vec2 } from './Vec2.js';

export function checkCollision(player, prey) {
    // 1. Get Interaction Point (Mouth/Weapon)
    let attackPos = player.headPos ? player.headPos : player.pos;

    // Adjust for long reach weapons (Mantis, Spider)?
    // User request: "predator's head touched prey's head" was strict.
    // New Goal: "Touch body should success".

    // 2. Define Prey Body Zones
    let preyZones = [];

    // All forms have pos/thorax
    // All forms have pos/thorax
    // Default radius logic
    let radiusMult = 1.0;
    if (prey.form === 'SPIDER') radiusMult = 0.6; // Spider visual body is smaller than scale suggests
    if (prey.form === 'CRICKET') radiusMult = 0.8;

    let baseRadius = (prey.size || 6) * (prey.scale || 1) * radiusMult;
    preyZones.push({ pos: prey.pos, radius: baseRadius });

    // Add specific body parts with tighter radius
    if (prey.headPos) preyZones.push({ pos: prey.headPos, radius: 4 * (prey.scale || 1) * radiusMult });

    // Mantis Abdomen Fix: The visual abdomen is much further back than the generic 'abdomenPos'
    if (prey.form === 'MANTIS') {
        let backDir = new Vec2(Math.cos(prey.angle), Math.sin(prey.angle)).mult(-1);
        // Visual abdomen centers around -55 scale. Size is roughly 45x18.
        // Add two zones to cover it.
        preyZones.push({ pos: prey.pos.add(backDir.mult(40 * (prey.scale || 1))), radius: 15 * (prey.scale || 1) });
        preyZones.push({ pos: prey.pos.add(backDir.mult(70 * (prey.scale || 1))), radius: 20 * (prey.scale || 1) });
    } else if (prey.form === 'TARANTULA') {
        // Tarantula: Large Cephalothorax and Abdomen
        // Cephalothorax: +4 scale, radius ~20
        preyZones.push({ pos: prey.pos.add(new Vec2(Math.cos(prey.angle), Math.sin(prey.angle)).mult(4 * (prey.scale || 1))), radius: 20 * (prey.scale || 1) });
        // Abdomen: -30 scale, radius ~30
        preyZones.push({ pos: prey.pos.add(new Vec2(Math.cos(prey.angle), Math.sin(prey.angle)).mult(-30 * (prey.scale || 1))), radius: 30 * (prey.scale || 1) });
    } else if (prey.form === 'CENTIPEDE' && prey.centipedeSegments) {
        prey.centipedeSegments.forEach(seg => {
            // Segment is object {x, y, angle}, convert to Vec2 or use raw check?
            // Existing logic uses Vec2 or object with .x .y
            // collision loop uses .pos.x .pos.y.
            // So we need to push objects that look like { pos: {x,y}, radius }.
            preyZones.push({ pos: new Vec2(seg.x, seg.y), radius: 10 * (prey.scale || 1) });
        });
    } else if (prey.form === 'GIANT_WETA') {
        // Giant Weta: Long body, ensure full coverage
        let backDir = new Vec2(Math.cos(prey.angle), Math.sin(prey.angle)).mult(-1);
        let s = prey.scale || 1.0;
        // Thorax/Head area
        preyZones.push({ pos: prey.pos, radius: 25 * s });
        // Abdomen segments
        preyZones.push({ pos: prey.pos.add(backDir.mult(30 * s)), radius: 25 * s });
        preyZones.push({ pos: prey.pos.add(backDir.mult(60 * s)), radius: 22 * s });
        preyZones.push({ pos: prey.pos.add(backDir.mult(90 * s)), radius: 15 * s });
    } else if (prey.form === 'CRICKET') {
        // Cricket: Similar to Weta but smaller
        let backDir = new Vec2(Math.cos(prey.angle), Math.sin(prey.angle)).mult(-1);
        let s = prey.scale || 1.0;
        preyZones.push({ pos: prey.pos, radius: 20 * s });
        preyZones.push({ pos: prey.pos.add(backDir.mult(25 * s)), radius: 18 * s });
        preyZones.push({ pos: prey.pos.add(backDir.mult(50 * s)), radius: 15 * s });
    } else {
        if (prey.abdomenPos) preyZones.push({ pos: prey.abdomenPos, radius: 5 * (prey.scale || 1) * radiusMult });
    }

    // Stick Insect Segments
    if (prey.stickSegments && prey.stickSegments.length > 0) {
        prey.stickSegments.forEach(seg => {
            preyZones.push({ pos: seg, radius: 4 * (prey.scale || 1) });
        });
    }

    // Pillbug Segments
    if (prey.pillBugSegments && prey.pillBugSegments.length > 0) {
        prey.pillBugSegments.forEach(s => {
            preyZones.push({ pos: new Vec2(s.x, s.y), radius: 5 * (prey.scale || 1) });
        });
    }

    // Scorpion Segments
    if (prey.form === 'SCORPION' && prey.scorpionSegments) {
        prey.scorpionSegments.forEach(seg => {
            preyZones.push({ pos: seg.pos, radius: seg.size });
        });
    }

    // 3. Check Overlap
    // We check if 'attackPos' is within 'eatRange' + 'radius' of any zone.
    let reach = player.getEatRange(); // This is the mouth reach radius

    for (let zone of preyZones) {
        // zone.pos might be Vec2 or {x,y}
        let px = zone.pos.x;
        let py = zone.pos.y;

        // Dist sq
        let dx = attackPos.x - px;
        let dy = attackPos.y - py;
        let dSq = dx * dx + dy * dy;

        let r = reach + zone.radius;
        if (dSq < r * r) {
            return true;
        }
    }

    return false;
}
