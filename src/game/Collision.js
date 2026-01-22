import { Vec2 } from './Vec2.js';

export function checkCollision(player, prey) {
    // 1. Get Interaction Point (Mouth/Weapon)
    let attackPos = player.headPos ? player.headPos : player.pos;

    // 2. Get Prey Body Zones (Centralized Logic)
    let preyZones;
    if (prey.getBodyZones) {
        preyZones = prey.getBodyZones();
    } else {
        // Fallback for non-Insect entities if any
        let r = (prey.size || 5) * (prey.scale || 1);
        preyZones = [{ pos: prey.pos, radius: r }];
    }

    // 3. Check Overlap
    // We check if 'attackPos' is within 'eatRange' + 'radius' of any zone.
    let reach = player.getEatRange ? player.getEatRange() : (50 * player.scale);

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
