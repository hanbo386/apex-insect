
/**
 * 环境生成与绘制类
 */
export class Environment {
    constructor() {
        this.groundCanvas = document.createElement('canvas');
        this.groundCtx = this.groundCanvas.getContext('2d');
        this.initGround();
    }

    initGround() {
        this.groundCanvas.width = 1024;
        this.groundCanvas.height = 1024;
        this.groundCtx.fillStyle = '#e6dcc3';
        this.groundCtx.fillRect(0, 0, 1024, 1024);

        // Store obstacles for collision
        this.obstacles = []; // Array of {x, y, radius} normalized to [0,1024] space

        for (let i = 0; i < 8000; i++) {
            this.groundCtx.fillStyle = Math.random() > 0.5 ? '#d1c4a8' : '#c7b695';
            let x = Math.random() * 1024;
            let y = Math.random() * 1024;
            let s = Math.random() * 2.5;
            this.groundCtx.fillRect(x, y, s, s);
        }
    }

    draw(ctx, camera, width, height, scale = 1.0, renormalizationFactor = 1.0) {
        ctx.save();

        // 1. Adaptive Background Color
        ctx.fillStyle = '#e6dcc3';
        // Cover a huge area to ensure no flickering edges
        ctx.fillRect(camera.x - width / scale, camera.y - height / scale, width * 3 / scale, height * 3 / scale);

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
                // Draw Objects - Always at scale 1.0 logic (gridSize 500)
                this.pseudoRandomDecor(ctx, seedX, seedY, fixedGridSize);
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

    // Unified Collision (Leaves + Puddles)
    checkObstacleCollision(x, y, radius, checkLeaves = true, checkPuddles = true) {
        // 1. PUDDLES (Check First, always valid)
        if (checkPuddles) {
            let hit = this.checkPuddleCollision(x, y, radius);
            if (hit) return hit;
        }

        // 2. LEAVES (Standard Grid)
        if (checkLeaves) {
            let gridSize = 500;
            let cx = Math.floor(x / gridSize) * gridSize;
            let cy = Math.floor(y / gridSize) * gridSize;

            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    let baseX = cx + i * gridSize;
                    let baseY = cy + j * gridSize;

                    let seed = Math.abs((Math.sin(baseX * 12.9898 + baseY * 78.233) * 43758.5453));
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

    pseudoRandomDecor(ctx, baseX, baseY, gridSize) {
        let seed = Math.abs((Math.sin(baseX * 12.9898 + baseY * 78.233) * 43758.5453));
        let count = Math.floor((seed - Math.floor(seed)) * 2); // Reduced density (Halved)


        // Scale decoration size by gridMult
        let scaleFactor = gridSize / 500;

        for (let k = 0; k < count; k++) {
            let localSeed = Math.abs(Math.sin(baseX + k * 132.1) * 43758.5453);

            // Jittered Position
            // Include 'k' in the randomization to ensure multiple leaves in same cell don't align
            let x = baseX + ((localSeed * 123.45 + k * 17.17) % 1) * gridSize;
            let y = baseY + ((localSeed * 678.90 + k * 31.31) % 1) * gridSize;

            let rot = (localSeed * 100) % (Math.PI * 2);

            // Objects grow with the grid!
            // Size Variance: 
            // Base: 15-40
            let size = (15 + (localSeed % 1) * 25);
            // Giant Chance (10%): Multiplier 5x-8x
            if ((localSeed * 10) % 1 < 0.1) {
                size *= (5 + (localSeed * 100) % 1 * 3);

                // Re-randomize position & Rotation for GIANTS
                let giantSeed = Math.abs(Math.sin(baseX * 99.99 + k * 88.88) * 54321.123);
                x = baseX + ((giantSeed * 444.44) % 1) * gridSize;
                y = baseY + ((giantSeed * 555.55) % 1) * gridSize;

                // Unique rotation for giants
                rot = (giantSeed * 777) % (Math.PI * 2);
            }
            size *= scaleFactor;

            // Leaf Colors (Autumn/Dry themes)
            let colorVariance = localSeed % 1;
            let color = '#8a7b66'; // Default brown
            if (colorVariance > 0.7) color = '#a39276'; // Light brown
            else if (colorVariance > 0.4) color = '#6b5c4a'; // Darker brown
            else if (colorVariance > 0.2) color = '#7d8a63'; // Faded green
            else color = '#9e5a3e'; // Reddish/Orange leaf

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.fillStyle = color;
            ctx.beginPath();

            // Draw diverse leaf shapes based on seed
            if (localSeed % 1 > 0.5) {
                // Organic Lanceolate Leaf (Elliptical but tapered tips)
                ctx.moveTo(0, -size);
                // Right Curve
                ctx.quadraticCurveTo(size * 0.6, -size * 0.5, size * 0.4, 0);
                ctx.quadraticCurveTo(size * 0.4, size * 0.5, 0, size);
                // Left Curve (Mirrored)
                ctx.quadraticCurveTo(-size * 0.4, size * 0.5, -size * 0.4, 0);
                ctx.quadraticCurveTo(-size * 0.6, -size * 0.5, 0, -size);
            } else {
                // Organic Maple/Oak Leaf
                ctx.moveTo(0, -size);

                // Top Right Lobe
                ctx.quadraticCurveTo(size * 0.2, -size * 0.6, size * 0.5, -size * 0.5);
                ctx.quadraticCurveTo(size * 0.3, -size * 0.2, size * 0.1, -size * 0.1);
                // Mid Right Lobe
                ctx.quadraticCurveTo(size * 0.6, 0, size * 0.8, size * 0.2);
                ctx.quadraticCurveTo(size * 0.4, size * 0.4, size * 0.1, size * 0.3);
                // Bottom Right
                ctx.quadraticCurveTo(size * 0.3, size * 0.7, 0, size); // Stem base

                // Mirror Left Side
                // Bottom Left
                ctx.quadraticCurveTo(-size * 0.3, size * 0.7, -size * 0.1, size * 0.3);
                // Mid Left Lobe
                ctx.quadraticCurveTo(-size * 0.4, size * 0.4, -size * 0.8, size * 0.2);
                ctx.quadraticCurveTo(-size * 0.6, 0, -size * 0.1, -size * 0.1);
                // Top Left Lobe
                ctx.quadraticCurveTo(-size * 0.3, -size * 0.2, -size * 0.5, -size * 0.5);
                ctx.quadraticCurveTo(-size * 0.2, -size * 0.6, 0, -size);

                ctx.closePath();
            }

            ctx.fill();

            // Vein (simple line)
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 2 * scaleFactor;
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.8);
            ctx.lineTo(0, size * 0.8);
            ctx.stroke();

            ctx.restore();
        }
    }
}
