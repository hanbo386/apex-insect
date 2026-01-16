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
            preyZones.push({ pos: new Vec2(s.x, s.y), radius: 5 * (prey.scale || 1) }); // pillBugSegments store {x,y} objects not Vec2? Let's check Insect.js L442. `push({x,y,angle})`. Yes.
            // But we need to check if Vec2 is imported in this scope? passing 'prey' which has Vec2 methods is fine, but constructing new Vec2 needs import.
            // Actually, dist check is mathematical.
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
