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

    draw(ctx, camera, width, height) {
        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        let pattern = ctx.createPattern(this.groundCanvas, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(camera.x, camera.y, width, height);

        // 绘制装饰物
        // 计算当前中心位置（基于摄像机中心）
        let centerX = camera.x + width / 2;
        let centerY = camera.y + height / 2;

        let cx = Math.floor(centerX / 500) * 500;
        let cy = Math.floor(centerY / 500) * 500;

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
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
