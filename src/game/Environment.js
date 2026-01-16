
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

        // 2. Adaptive Grid Size (Renormalization)
        // Base Grid: 500
        // If renormalizationFactor > 1, the grid scales up essentially "resetting" the detail density
        let rFactor = renormalizationFactor || 1.0;
        let gridSize = 500 * rFactor;

        let centerX = camera.x + width / 2;
        let centerY = camera.y + height / 2;

        let viewW = width / scale;
        // Optimization: Don't draw too far
        let range = Math.ceil((viewW / 2) / gridSize) + 1;

        let cx = Math.floor(centerX / gridSize) * gridSize;
        let cy = Math.floor(centerY / gridSize) * gridSize;

        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                let seedX = cx + i * gridSize;
                let seedY = cy + j * gridSize;
                // Pass grid size to scale decoration size
                this.pseudoRandomDecor(ctx, seedX, seedY, gridSize);
            }
        }

        ctx.restore();
    }

    pseudoRandomDecor(ctx, baseX, baseY, gridSize) {
        let seed = Math.abs((Math.sin(baseX * 12.9898 + baseY * 78.233) * 43758.5453));
        let count = Math.floor((seed - Math.floor(seed)) * 5) + 2;

        // Scale decoration size by gridMult
        let scaleFactor = gridSize / 500;

        for (let k = 0; k < count; k++) {
            let localSeed = Math.abs(Math.sin(baseX + k * 132.1) * 43758.5453);
            let x = baseX + (localSeed % 1) * gridSize;
            let y = baseY + ((localSeed * 10) % 1) * gridSize;

            // Objects grow with the grid!
            let size = (5 + (localSeed % 1) * 15) * scaleFactor;

            ctx.fillStyle = (localSeed % 1 > 0.5) ? '#b0a08d' : '#9e8c76';
            if (localSeed % 1 > 0.8) ctx.fillStyle = '#6b7a5a';

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
