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

    draw(ctx, camera, width, height, scale = 1.0) {
        ctx.save();
        // Remove internal camera translation because main.js already handles it!
        // ctx.translate(-camera.x, -camera.y);

        let pattern = ctx.createPattern(this.groundCanvas, 'repeat');
        ctx.fillStyle = pattern;

        // Calculate visible world bounds based on scale
        // Camera (top-left) in main.js is derived from simple offset, 
        // but with scaling around center, "camera" variable might effectively point 
        // to the top-left of the unscaled viewport projected to world.
        // It's safer to just cover a huge area around the camera center.

        let centerX = camera.x + width / 2;
        let centerY = camera.y + height / 2;

        let viewW = width / scale;
        let viewH = height / scale;

        // Add some padding to be safe
        let drawX = centerX - viewW / 2 - 100;
        let drawY = centerY - viewH / 2 - 100;
        let drawW = viewW + 200;
        let drawH = viewH + 200;

        // Since pattern repeats, we just need to fill the rect in world space
        ctx.fillRect(drawX, drawY, drawW, drawH);

        // 绘制装饰物
        // 计算当前中心位置（基于摄像机中心）
        // Use the same center for generation

        let cx = Math.floor(centerX / 500) * 500;
        let cy = Math.floor(centerY / 500) * 500;

        // Increase range if zoomed out?
        // At 0.6 scale, 1 screen is ~1.6x larger. 3x3 grid (1500px) might still cover it if screen is < 1000.
        // If screen is 1920, 1920/0.6 = 3200. We need more grid cells!
        let range = Math.ceil((viewW / 2) / 500) + 1;

        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                let seedX = cx + i * 500;
                let seedY = cy + j * 500;
                this.pseudoRandomDecor(ctx, seedX, seedY);
            }
        }

        ctx.restore();
    }

    pseudoRandomDecor(ctx, baseX, baseY) {
        let seed = Math.abs((Math.sin(baseX * 12.9898 + baseY * 78.233) * 43758.5453));
        let count = Math.floor((seed - Math.floor(seed)) * 5) + 2;

        for (let k = 0; k < count; k++) {
            let localSeed = Math.abs(Math.sin(baseX + k * 132.1) * 43758.5453);
            let x = baseX + (localSeed % 1) * 500;
            let y = baseY + ((localSeed * 10) % 1) * 500;
            let size = 5 + (localSeed % 1) * 15;

            ctx.fillStyle = (localSeed % 1 > 0.5) ? '#b0a08d' : '#9e8c76';
            if (localSeed % 1 > 0.8) ctx.fillStyle = '#6b7a5a';

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
