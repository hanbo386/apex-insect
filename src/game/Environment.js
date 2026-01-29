
/**
 * 环境生成与绘制类
 */
export class Environment {
    constructor() {
        this.groundCanvas = document.createElement('canvas');
        this.groundCtx = this.groundCanvas.getContext('2d');
        this.initGround();
        this.initCache();
    }

    initGround(tier = 1) {
        this.currentTier = tier;
        this.groundCanvas.width = 512;
        this.groundCanvas.height = 512;

        let baseColor, noiseColor1, noiseColor2, stoneColor;

        if (tier === 2) {
            // World 2: Forest Floor (Subtle Brown/Green Tint, not dark)
            // Original Sand: #D2B48C. 
            // New: Desaturated Earthy Brown
            baseColor = '#C8B59E';
            noiseColor1 = '#B09A80';
            noiseColor2 = '#A08A70';
            stoneColor = '#795548';
        } else if (tier === 3) {
            // World 3: Ashen Wasteland (Subtle Red/Grey, not dark)
            baseColor = '#C0A0A0'; // Desaturated Reddish Grey
            noiseColor1 = '#A08080';
            noiseColor2 = '#907070';
            stoneColor = '#8D6E63';
        } else if (tier >= 4) {
            // World 4: Titan Realm (Mystic Lighter Purple)
            baseColor = '#9FA0C4'; // Pale Lavender/Grey
            noiseColor1 = '#8485AA';
            noiseColor2 = '#6D6E90';
            stoneColor = '#5A5B7A';
        } else {
            // World 1: Sand (Default)
            baseColor = '#D2B48C';
            noiseColor1 = '#C2A278';
            noiseColor2 = '#E2C49C';
            stoneColor = '#A89F91';
        }

        // Base Color
        this.groundCtx.fillStyle = baseColor;
        this.groundCtx.fillRect(0, 0, 512, 512);

        // Noise
        // Tier 3 gets coarser noise
        let noiseCount = (tier === 3) ? 1500 : 3000;
        let noiseSizeBase = (tier === 3) ? 4 : 2;

        for (let i = 0; i < noiseCount; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * noiseSizeBase;
            this.groundCtx.fillStyle = Math.random() > 0.5 ? noiseColor1 : noiseColor2;
            this.groundCtx.fillRect(x, y, size, size);
        }

        // Stones/Pebbles
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const r = Math.random() * 3 + 1;
            this.groundCtx.beginPath();
            this.groundCtx.arc(x, y, r, 0, Math.PI * 2);
            this.groundCtx.fillStyle = stoneColor;
            this.groundCtx.fill();
        }

        this.bgPattern = null;
    }

    initCache() {
        // --- LEAF CACHE ---
        this.leafCache = [];
        const leafColors = ['#8a7b66', '#a39276', '#6b5c4a', '#7d8a63', '#9e5a3e'];
        // Generate variations per color (Detailed vs Simple shape)
        leafColors.forEach(color => {
            // Variation 1: Lanceolate
            this.leafCache.push(this.createLeafSprite(color, 0));
            // Variation 2: Maple/Oak
            this.leafCache.push(this.createLeafSprite(color, 1));
        });

        // --- STONE CACHE ---
        this.stoneCache = [];
        // Generate 10 random pre-rendered stones
        for (let i = 0; i < 10; i++) {
            this.stoneCache.push(this.createStoneSprite(i));
        }

        // --- MUSHROOM CACHE ---
        this.mushroomCache = [];
        // 2 Types: Red and Brown
        this.mushroomCache.push(this.createMushroomSprite('#d44'));
        this.mushroomCache.push(this.createMushroomSprite('#8b4513'));
    }

    createLeafSprite(color, type) {
        const size = 64; // Max size for cache
        const cvs = document.createElement('canvas');
        cvs.width = size * 2;
        cvs.height = size * 2;
        const ctx = cvs.getContext('2d');
        const r = size * 0.8;

        ctx.translate(size, size);
        ctx.fillStyle = color;
        ctx.beginPath();

        if (type === 0) {
            // Lanceolate
            ctx.moveTo(0, -r);
            ctx.quadraticCurveTo(r * 0.6, -r * 0.5, r * 0.4, 0);
            ctx.quadraticCurveTo(r * 0.4, r * 0.5, 0, r);
            ctx.quadraticCurveTo(-r * 0.4, r * 0.5, -r * 0.4, 0);
            ctx.quadraticCurveTo(-r * 0.6, -r * 0.5, 0, -r);
        } else {
            // Maple/Oak
            ctx.moveTo(0, -r);
            ctx.quadraticCurveTo(r * 0.2, -r * 0.6, r * 0.5, -r * 0.5);
            ctx.quadraticCurveTo(r * 0.3, -r * 0.2, r * 0.1, -r * 0.1);
            ctx.quadraticCurveTo(r * 0.6, 0, r * 0.8, r * 0.2);
            ctx.quadraticCurveTo(r * 0.4, r * 0.4, r * 0.1, r * 0.3);
            ctx.quadraticCurveTo(r * 0.3, r * 0.7, 0, r);
            ctx.quadraticCurveTo(-r * 0.3, r * 0.7, -r * 0.1, r * 0.3);
            ctx.quadraticCurveTo(-r * 0.4, r * 0.4, -r * 0.8, r * 0.2);
            ctx.quadraticCurveTo(-r * 0.6, 0, -r * 0.1, -r * 0.1);
            ctx.quadraticCurveTo(-r * 0.3, -r * 0.2, -r * 0.5, -r * 0.5);
            ctx.quadraticCurveTo(-r * 0.2, -r * 0.6, 0, -r);
        }
        ctx.closePath();
        ctx.fill();

        // Vein
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.8);
        ctx.lineTo(0, r * 0.8);
        ctx.stroke();

        return cvs;
    }

    createStoneSprite(seed) {
        const size = 80;
        const cvs = document.createElement('canvas');
        cvs.width = size * 2;
        cvs.height = size * 2;
        const ctx = cvs.getContext('2d');
        const r = size * 0.8;

        ctx.translate(size, size);
        let grayVal = Math.floor(100 + (seed % 3) * 30);
        ctx.fillStyle = `rgb(${grayVal}, ${grayVal}, ${grayVal})`;
        ctx.strokeStyle = `rgb(${grayVal - 30}, ${grayVal - 30}, ${grayVal - 30})`;
        ctx.lineWidth = 3;

        ctx.beginPath();
        let points = 7 + (seed % 5);
        for (let i = 0; i < points; i++) {
            let angle = (i / points) * Math.PI * 2;
            let rMod = r * (0.8 + Math.abs(Math.sin(angle * 3 + seed)) * 0.2);
            let rx = Math.cos(angle) * rMod;
            let ry = Math.sin(angle) * rMod;
            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cracks
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, -r * 0.2);
        ctx.lineTo(r * 0.2, r * 0.3);
        ctx.lineTo(r * 0.5, r * 0.1);
        ctx.stroke();

        return cvs;
    }

    createMushroomSprite(color) {
        const size = 60;
        const cvs = document.createElement('canvas');
        cvs.width = size * 2;
        cvs.height = size * 2;
        const ctx = cvs.getContext('2d');
        const r = size * 0.8;

        ctx.translate(size, size);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Dots
        ctx.fillStyle = '#fff';
        let seed = 5;
        let dotCount = 5;
        for (let d = 0; d < dotCount; d++) {
            let dAngle = (d / dotCount) * Math.PI * 2;
            let dDist = r * 0.5;
            let dSize = 4;
            ctx.beginPath();
            ctx.arc(Math.cos(dAngle) * dDist, Math.sin(dAngle) * dDist, dSize, 0, Math.PI * 2);
            ctx.fill();
        }
        return cvs;
    }

    draw(ctx, camera, width, height, scale = 1.0, tier = 1) {
        // Detect Tier Change
        if (this.currentTier !== tier) {
            console.log(`Environment: Switching to Tier ${tier}`);
            this.initGround(tier);
        }

        ctx.save();

        // 1. Background Pattern
        if (!this.bgPattern) {
            this.bgPattern = ctx.createPattern(this.groundCanvas, 'repeat');
        }

        ctx.fillStyle = this.bgPattern;

        // Cover a huge area to ensure no flickering edges
        // The pattern tiles based on World Origin (0,0) due to ctx transform
        ctx.fillRect(camera.x - width / scale, camera.y - height / scale, width * 3 / scale, height * 3 / scale);

        // --- SAND GRAINS (TIER 2 VISUAL ONLY - REDUNDANT NOW, handled by initGround noise) ---
        if (typeof tier !== 'undefined' && tier === 2) {
            // Draw noise pattern "on screen"
            // Using stable random based on screen coordinates? No, must anchor to world.
            // We can use a pattern or just draw random noise in the loop below.
            // Let's add noise in the loop below.
        }

        let centerX = camera.x + width / 2;
        let centerY = camera.y + height / 2;
        let viewW = width / scale;

        // --- LAYER 1: Background Noise (Uses LOD) ---
        // This keeps the "Ground" feeling dense/sparse appropriately
        /*
        let rFactor = renormalizationFactor || 1.0;
        let lodGridSize = 500 * rFactor;
        let lodRange = Math.ceil((viewW / 2) / lodGridSize) + 1;
        let lodCx = Math.floor(centerX / lodGridSize) * lodGridSize;
        let lodCy = Math.floor(centerY / lodGridSize) * lodGridSize;

        for (let i = -lodRange; i <= lodRange; i++) {
            for (let j = -lodRange; j <= lodRange; j++) {
                let seedX = lodCx + i * lodGridSize;
                let seedY = lodCy + j * lodGridSize;
                // Only draw noise ticks or similar here if split? 
                // Currently pseudoRandomDecor draws LEAVES.
                // Leaves act as obstacles. So Leaves MUST BE FIXED GRID too.
                // So actually, EVERYTHING should be fixed grid if it interacts.
            }
        }
        */

        // DECISION: To ensure collision consistency, visual representation of obstacles
        // CANNOT depend on renormalizationFactor. They must use the fixed 500 grid.
        // We will perform the object loop using fixed 500 grid.

        let fixedGridSize = 500;
        let range = Math.ceil((viewW / 2) / fixedGridSize) + 2; // +buffer
        let cx = Math.floor(centerX / fixedGridSize) * fixedGridSize;
        let cy = Math.floor(centerY / fixedGridSize) * fixedGridSize;

        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                let seedX = cx + i * fixedGridSize;
                let seedY = cy + j * fixedGridSize;
                // Draw Objects
                this.pseudoRandomDecor(ctx, seedX, seedY, fixedGridSize, tier, scale);
            }
        }

        // --- LAYER 2: PUDDLES (Super Grid 5000) ---
        // Separate loop for large features to prevent overlap
        let puddleGridSize = 5000;
        let pRange = Math.ceil((viewW / 2) / puddleGridSize) + 1;
        let pcx = Math.floor(centerX / puddleGridSize) * puddleGridSize;
        let pcy = Math.floor(centerY / puddleGridSize) * puddleGridSize;

        for (let i = -pRange; i <= pRange; i++) {
            for (let j = -pRange; j <= pRange; j++) {
                let seedX = pcx + i * puddleGridSize;
                let seedY = pcy + j * puddleGridSize;
                this.pseudoRandomPuddles(ctx, seedX, seedY, puddleGridSize);
            }
        }

        ctx.restore();
    }



    checkPuddleCollision(x, y, radius) {
        let puddleGridSize = 5000;
        let cx = Math.floor(x / puddleGridSize) * puddleGridSize;
        let cy = Math.floor(y / puddleGridSize) * puddleGridSize;

        // Puddles Check (Super Grid)
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                let baseX = cx + i * puddleGridSize;
                let baseY = cy + j * puddleGridSize;

                // Deterministic Puddle Gen for Super Grid
                let puddleSeed = Math.abs((Math.sin(baseX * 12.123 + baseY * 45.456) * 78901.2345));

                // 30% Chance per Super Grid (5000x5000)
                if ((puddleSeed % 1) < 0.3) {
                    // Center + Jitter (BaseX is TopLeft)
                    // Center of cell = 2500, 2500
                    // Jitter +/- 2000 (MUCH Larger Variance to break grid feel)
                    // Use chaotic multipliers again
                    let jx = 2500 + (Math.sin(puddleSeed * 123.45) * 2000);
                    let jy = 2500 + (Math.cos(puddleSeed * 678.90) * 2000);

                    let px = baseX + jx;
                    let py = baseY + jy;

                    let scaleFactor = 1.0; // Fixed scale for super grid logic
                    // Size 1000 - 1800
                    let pSize = 1000 + (puddleSeed % 1) * 800;

                    let distSq = (x - px) ** 2 + (y - py) ** 2;
                    let rSum = radius + pSize * 0.8;
                    if (distSq < rSum * rSum) {
                        return { x: px, y: py, radius: pSize * 0.8, type: 'puddle' };
                    }
                }
            }
        }
        return null;
    }

    // Unified Collision (Leaves + Puddles + Stones/Mushrooms)
    checkObstacleCollision(x, y, radius, checkLeaves = true, checkPuddles = true, tier = 1) {
        // 1. PUDDLES (Check First, always valid)
        if (checkPuddles) {
            let hit = this.checkPuddleCollision(x, y, radius);
            if (hit) return hit;
        }

        let gridSize = 500;
        let cx = Math.floor(x / gridSize) * gridSize;
        let cy = Math.floor(y / gridSize) * gridSize;

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                let baseX = cx + i * gridSize;
                let baseY = cy + j * gridSize;
                let seed = Math.abs((Math.sin(baseX * 12.9898 + baseY * 78.233) * 43758.5453));

                // --- TIER 2 OBSTACLES (Stones, Mushrooms) ---
                if (tier === 2) {
                    // Stone: 2% Chance
                    if ((seed * 10) % 1 < 0.02) {
                        let sx = baseX + ((seed * 555) % 1) * gridSize;
                        let sy = baseY + ((seed * 777) % 1) * gridSize;
                        // Varied Size: 30 to 70
                        let sSize = (30 + (seed % 1) * 40);

                        let distSq = (x - sx) ** 2 + (y - sy) ** 2;
                        // Collision roughly matches visual size
                        let rSum = radius + sSize * 0.9;
                        if (distSq < rSum * rSum) return { x: sx, y: sy, radius: sSize * 0.9, type: 'stone' };
                        continue;
                    }
                    // Mushroom: 1.5% Chance
                    else if ((seed * 20) % 1 < 0.015) {
                        let mx = baseX + ((seed * 888) % 1) * gridSize;
                        let my = baseY + ((seed * 999) % 1) * gridSize;
                        // Varied Mushroom Size: 35-55
                        let mSize = 35 + ((seed * 100) % 1) * 20;

                        let distSq = (x - mx) ** 2 + (y - my) ** 2;
                        let rSum = radius + mSize;
                        if (distSq < rSum * rSum) return { x: mx, y: my, radius: mSize, type: 'mushroom' };
                        continue;
                    }
                }

                // 2. LEAVES (Standard Grid)
                if (checkLeaves) {
                    // Halve the count multiplier (Old: * 4, New: * 2)
                    let count = Math.floor((seed - Math.floor(seed)) * 2);
                    let scaleFactor = gridSize / 500;

                    for (let k = 0; k < count; k++) {
                        let localSeed = Math.abs(Math.sin(baseX + k * 132.1) * 43758.5453);
                        // Add significant JITTER to break alignment
                        // The 'baseX' logic puts them in a grid. We must add -0.5 to 0.5 range of jitter
                        // actually, the current logic baseX + (seed%1)*gridSize is already 'random' within the cell.
                        // BUT, if seed%1 is similar, they align.
                        // Let's use more chaotic multipliers.
                        let lx = baseX + ((localSeed * 123.45 + k * 17.17) % 1) * gridSize;
                        let ly = baseY + ((localSeed * 678.90 + k * 31.31) % 1) * gridSize;

                        // Size Variance: 
                        // Base: 15-40
                        let size = (15 + (localSeed % 1) * 25);
                        // Giant Chance (10%): Multiplier 5x-8x
                        // Giant Chance (10%): Multiplier 5x-8x
                        if ((localSeed * 10) % 1 < 0.1) {
                            size *= (5 + (localSeed * 100) % 1 * 3);

                            // Re-randomize position for GIANTS to act as "Terrain Features" rather than Grid Decor
                            // Use a completely different hash for giant positions so they don't align with the grid loop
                            let giantSeed = Math.abs(Math.sin(baseX * 99.99 + k * 88.88) * 54321.123);
                            lx = baseX + ((giantSeed * 444.44) % 1) * gridSize;
                            ly = baseY + ((giantSeed * 555.55) % 1) * gridSize;
                        }
                        size *= scaleFactor;

                        let distSq = (x - lx) ** 2 + (y - ly) ** 2;
                        let rSum = radius + size * 0.6;
                        if (distSq < rSum * rSum) {
                            return { x: lx, y: ly, radius: size * 0.6, type: 'leaf' };
                        }
                    }
                }
            }
        }

        return null;
    }

    // Legacy mapping
    checkLeafCollision(x, y, radius) {
        return this.checkObstacleCollision(x, y, radius, true, false);
    }

    pseudoRandomPuddles(ctx, baseX, baseY, gridSize) {
        // Redefined: This is now called with puddleGridSize = 5000
        // baseX, baseY are TopLeft of Super Grid cell

        let puddleSeed = Math.abs((Math.sin(baseX * 12.123 + baseY * 45.456) * 78901.2345));

        // 30% Chance (Super Grid)
        if ((puddleSeed % 1) < 0.3) {
            let jx = 2500 + (Math.sin(puddleSeed * 123.45) * 2000);
            let jy = 2500 + (Math.cos(puddleSeed * 678.90) * 2000);

            let px = baseX + jx;
            let py = baseY + jy;

            let rot = (puddleSeed * 50) % (Math.PI * 2);

            // Fixed scale
            let scaleFactor = 1.0;
            let size = 1000 + (puddleSeed % 1) * 800; // 1000-1800

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(rot);

            // Puddle Aesthetic
            ctx.fillStyle = 'rgba(100, 140, 180, 0.4)'; // Watery Blue
            ctx.strokeStyle = 'rgba(150, 200, 255, 0.3)';
            ctx.lineWidth = 4 * 5; // thicker

            // Simplified Shape (Irregular "Blob" to look natural, but approx circle)
            ctx.beginPath();
            // Draw a blobby shape instead of perfect circle
            // But keep it largely within the collision radius for fairness
            let rBase = size * 0.8;
            // Varied "frequency" for the blobs based on seed
            let blobFreq = 3 + (puddleSeed % 1) * 7; // 3 to 10 lumps
            for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
                // Add noise to radius: +/- 8%
                // Use blobFreq to make some puddles smoother, some more jagged
                let rNoise = rBase + (Math.sin(angle * blobFreq + puddleSeed) * rBase * 0.08);
                let px = Math.cos(angle) * rNoise;
                let py = Math.sin(angle) * rNoise;
                if (angle === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();

            ctx.fill();
            ctx.stroke();

            // DEBUG: Draw Physical Boundary
            /*
            ctx.save();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 5;
            ctx.setLineDash([20, 20]);
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            */

            // Reflection / Glisten
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.ellipse(-size * 0.3, -size * 0.2, size * 0.2, size * 0.1, 0.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    pseudoRandomDecor(ctx, baseX, baseY, gridSize, tier = 1, scale = 1.0) {
        let seed = Math.abs((Math.sin(baseX * 12.9898 + baseY * 78.233) * 43758.5453));

        // LOD Thresholds
        const pixelThreshold = 4; // Min pixels to draw

        // --- TIER 2: Forest ---
        if (tier === 2) {
            // 1. Ferns (Spiky Greenery)
            if ((seed * 10) % 1 < 0.05) { // 5% Chance
                // Draw Fern
                let fx = baseX + ((seed * 111) % 1) * gridSize;
                let fy = baseY + ((seed * 222) % 1) * gridSize;
                let fSize = 40 + (seed % 1) * 30;
                let rot = (seed * 333) % 6.28;

                ctx.save();
                ctx.translate(fx, fy);
                ctx.rotate(rot);
                ctx.fillStyle = '#556B2F'; // Dark Olive Green
                ctx.beginPath();
                // Simple 5-point fern shape
                for (let leaf = 0; leaf < 5; leaf++) {
                    ctx.rotate(0.5);
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(10, 5, 0, fSize);
                    ctx.quadraticCurveTo(-10, 5, 0, 0);
                }
                ctx.fill();
                ctx.restore();
                return;
            }

            // 2. Mushrooms (Using Cache)
            if ((seed * 20) % 1 < 0.02) {
                let mx = baseX + ((seed * 888) % 1) * gridSize;
                let my = baseY + ((seed * 999) % 1) * gridSize;
                let mSize = 35 + ((seed * 100) % 1) * 20;

                let cacheIdx = ((seed * 10) % 1 > 0.5) ? 1 : 0; // Brown or Red
                let sprite = this.mushroomCache[cacheIdx];
                let drawScale = mSize / 60.0;
                let mRot = (seed * 500) % (Math.PI * 2);

                ctx.save();
                ctx.translate(mx, my);
                ctx.rotate(mRot);
                ctx.scale(drawScale, drawScale);
                ctx.drawImage(sprite, -60, -60);
                ctx.restore();
                return;
            }

            // 3. Giant Logs (Rare)
            if ((seed * 5) % 1 < 0.005) { // 0.5% Chance
                let lx = baseX + ((seed * 123) % 1) * gridSize;
                let ly = baseY + ((seed * 456) % 1) * gridSize;
                let lLen = 200 + (seed % 1) * 100;
                let lWid = 40 + (seed % 1) * 20;
                let lRot = (seed * 789) % 3.14;

                ctx.save();
                ctx.translate(lx, ly);
                ctx.rotate(lRot);
                ctx.fillStyle = '#3E2723';
                ctx.fillRect(-lLen / 2, -lWid / 2, lLen, lWid);
                // Moss on log
                ctx.fillStyle = '#4CA64C';
                ctx.beginPath();
                ctx.arc(-lLen / 3, 0, lWid / 2, 0, 6.28);
                ctx.fill();
                ctx.restore();
                return; // Replaces leaves
            }
        }

        // --- TIER 3: Wasteland ---
        if (tier === 3) {
            // 1. Bones (Sprawled)
            if ((seed * 15) % 1 < 0.03) {
                let bx = baseX + ((seed * 321) % 1) * gridSize;
                let by = baseY + ((seed * 654) % 1) * gridSize;
                let bLen = 60 + (seed % 1) * 40;
                let rot = (seed * 987) % 6.28;

                ctx.save();
                ctx.translate(bx, by);
                ctx.rotate(rot);
                ctx.fillStyle = '#D7CCC8'; // Bone White
                ctx.beginPath();
                // Bone shape: Circle - Rect - Circle
                ctx.arc(-bLen / 2, 0, 8, 0, 6.28);
                ctx.arc(bLen / 2, 0, 8, 0, 6.28);
                ctx.rect(-bLen / 2, -4, bLen, 8);
                ctx.fill();
                ctx.restore();
                return;
            }

            // 2. Crystals (Sharp)
            if ((seed * 25) % 1 < 0.02) {
                let cx = baseX + ((seed * 444) % 1) * gridSize;
                let cy = baseY + ((seed * 222) % 1) * gridSize;
                let cSize = 40 + (seed % 1) * 30;

                ctx.save();
                ctx.translate(cx, cy);
                let rot = (seed * 100) % 6.28;
                ctx.rotate(rot);

                ctx.fillStyle = 'rgba(220, 20, 60, 0.7)';
                ctx.beginPath();
                ctx.moveTo(0, -cSize);
                ctx.lineTo(cSize * 0.3, 0);
                ctx.lineTo(0, cSize);
                ctx.lineTo(-cSize * 0.3, 0);
                ctx.fill();
                ctx.restore();
                return;
            }

            // 3. Giant Ribs (Rare/Grand)
            if ((seed * 7) % 1 < 0.005) {
                let gx = baseX + ((seed * 555) % 1) * gridSize;
                let gy = baseY + ((seed * 777) % 1) * gridSize;
                let gSize = 250;
                let rot = (seed * 888) % 6.28;

                ctx.save();
                ctx.translate(gx, gy);
                ctx.rotate(rot);
                ctx.strokeStyle = '#D7CCC8';
                ctx.lineWidth = 15;
                ctx.beginPath();
                ctx.arc(0, 0, gSize / 2, 3.14, 0); // Semicircle rib
                ctx.stroke();
                ctx.restore();
                return;
            }
        }

        // --- TIER 4: Titan Realm ---
        if (tier >= 4) {
            // 1. Alien Runes/Marks (Ground detail)
            if (scale > 0.6) {
                ctx.fillStyle = '#4A2F4C';
                for (let g = 0; g < 6; g++) {
                    let gs = Math.abs(Math.sin(baseX + g * 44.4) * 9876.5);
                    let gx = baseX + (gs % 1) * gridSize;
                    let gy = baseY + ((gs * 10) % 1) * gridSize;
                    // Draw random Rune-like lines
                    ctx.fillRect(gx, gy, 15, 2);
                    ctx.fillRect(gx + 5, gy - 5, 2, 12);
                }
            }

            // 2. Giant Monoliths (Grand Structures)
            if ((seed * 30) % 1 < 0.015) { // Rare 1.5%
                let ox = baseX + ((seed * 111) % 1) * gridSize;
                let oy = baseY + ((seed * 222) % 1) * gridSize;
                let mH = 250 + (seed % 1) * 150; // Huge Height
                let mW = 60 + (seed % 1) * 40;
                let rot = (seed * 555) % 0.5 - 0.25; // Slight tilt

                ctx.save();
                ctx.translate(ox, oy);
                ctx.rotate(rot);

                // Main Pillar
                ctx.fillStyle = '#222'; // Obsidian
                ctx.fillRect(-mW / 2, -mH, mW, mH);

                // Highlight Edge
                ctx.strokeStyle = '#554';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(-mW / 2, -mH);
                ctx.lineTo(-mW / 2, 0);
                ctx.stroke();

                // Rune on Monolith
                ctx.strokeStyle = '#E040FB';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(-mW * 0.2, -mH * 0.8);
                ctx.lineTo(mW * 0.2, -mH * 0.8);
                ctx.moveTo(0, -mH * 0.85);
                ctx.lineTo(0, -mH * 0.5);
                ctx.stroke();

                ctx.restore();
                return;
            }

            // 2b. Ancient Craters (Impact Zones)
            if ((seed * 60) % 1 < 0.01) { // Rare 1%
                let cx = baseX + ((seed * 333) % 1) * gridSize;
                let cy = baseY + ((seed * 444) % 1) * gridSize;
                let cR = 150 + (seed % 1) * 100;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(1, 0.6); // Perspective squash

                // Crater Floor
                ctx.fillStyle = '#1A1020'; // Darker than ground
                ctx.beginPath();
                ctx.arc(0, 0, cR, 0, 6.28);
                ctx.fill();

                // Rim
                ctx.strokeStyle = '#3E2740';
                ctx.lineWidth = 10;
                ctx.stroke();

                ctx.restore();
                // No return, allow smaller decor on top? No, crater flattens.
                return;
            }

            // 3. Obsidian Spikes
            if ((seed * 40) % 1 < 0.02) {
                let sx = baseX + ((seed * 555) % 1) * gridSize;
                let sy = baseY + ((seed * 666) % 1) * gridSize;
                let sH = 60 + (seed % 1) * 50;
                let sW = 20 + (seed % 1) * 10;
                let rot = (seed * 777) % 6.28;

                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(rot);
                ctx.fillStyle = '#1A1A1A'; // Black
                ctx.beginPath();
                ctx.moveTo(0, -sH);
                ctx.lineTo(sW, 0);
                ctx.lineTo(-sW, 0);
                ctx.fill();

                // Highlight
                ctx.strokeStyle = '#4A2F4C';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -sH);
                ctx.lineTo(sW * 0.5, 0);
                ctx.stroke();

                ctx.restore();
                return;
            }
        }

        let count = Math.floor((seed - Math.floor(seed)) * 2); // Reduced density (Halved)
        let scaleFactor = gridSize / 500;

        for (let k = 0; k < count; k++) {
            let localSeed = Math.abs(Math.sin(baseX + k * 132.1) * 43758.5453);

            // Jittered Position
            let x = baseX + ((localSeed * 123.45 + k * 17.17) % 1) * gridSize;
            let y = baseY + ((localSeed * 678.90 + k * 31.31) % 1) * gridSize;

            let rot = (localSeed * 100) % (Math.PI * 2);

            // Size
            let size = (15 + (localSeed % 1) * 25);
            if ((localSeed * 10) % 1 < 0.1) { // Giant
                size *= (5 + (localSeed * 100) % 1 * 3);
                // Re-randomize giant pos
                let giantSeed = Math.abs(Math.sin(baseX * 99.99 + k * 88.88) * 54321.123);
                x = baseX + ((giantSeed * 444.44) % 1) * gridSize;
                y = baseY + ((giantSeed * 555.55) % 1) * gridSize;
                rot = (giantSeed * 777) % (Math.PI * 2);
            }
            size *= scaleFactor;

            if (size * scale < pixelThreshold) continue;

            // CACHED LEAF DRAWING
            // Color variant index
            let colorVariance = localSeed % 1;
            let colorIdx = 0;
            if (colorVariance > 0.7) colorIdx = 1; // Light brown
            else if (colorVariance > 0.4) colorIdx = 2; // Darker brown
            else if (colorVariance > 0.2) colorIdx = 3; // Faded green
            else colorIdx = 4; // Reddish

            // Shape variant (0 or 1)
            let shapeType = (localSeed % 1 > 0.5) ? 0 : 1;

            // Map to cache array index
            // colorIdx * 2 + shapeType
            // Cache is [Color0_Type0, Color0_Type1, Color1_Type0...]
            let cacheIndex = (colorIdx * 2) + shapeType;
            if (cacheIndex >= this.leafCache.length) cacheIndex = 0;

            let sprite = this.leafCache[cacheIndex];

            // Sprite is 128x128 (64 radius)
            // Desired 'size' is approx radius.
            let drawScale = (size * 1.2) / 64.0; // 1.2 tweak to match original visual size

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.scale(drawScale, drawScale);
            // Draw centered
            ctx.drawImage(sprite, -64, -64);
            ctx.restore();
        }
    }
}
