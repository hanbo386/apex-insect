import { Vec2 } from './Vec2.js';
import { Leg } from './Leg.js';

/**
 * 蚂蚁主体类
 */
export class Ant {
    constructor(x, y) {
        this.pos = new Vec2(x, y);
        this.vel = new Vec2(0, 0);
        this.angle = 0;
        this.speed = 0;
        this.maxSpeed = 3.2;

        // --- Stamina ---
        this.stamina = 100;
        this.maxStamina = 100;
        this.canSprint = true;

        // --- 成长属性 ---
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 5; // 升级所需初始 XP
        this.evolutionStage = 0; // 0: 初始, 1: 进化形态
        this.scale = 1.0;
        this.baseScale = 1.0;
        this.targetScale = 1.0;

        this.flashTimer = 0; // Visual effect for leveling up

        // 颜色配置
        this.colors = {
            head: '#4a331c',
            thorax: '#4a331c',
            abdomen: '#3d2612',
            gradStart: '#755430',
            gradEnd: '#1a1108'
        };

        this.thoraxPos = this.pos.clone();
        this.abdomenPos = this.pos.clone();
        this.headPos = this.pos.clone();


        this.legs = [];
        this.initLegs();
        this.gaitState = 0;
    }

    initLegs() {
        this.legs = [];
        // --- 身体尺寸没变，但是为了配合短腿，腿根部位置保持紧凑 ---
        let legConfigs = [
            { id: 0, side: -1, x: 5 },  // Left Front
            { id: 1, side: -1, x: 0 },  // Left Mid
            { id: 2, side: -1, x: -5 }, // Left Back
            { id: 3, side: 1, x: 5 },  // Right Front
            { id: 4, side: 1, x: 0 },  // Right Mid
            { id: 5, side: 1, x: -5 }  // Right Back
        ];

        legConfigs.forEach(cfg => {
            this.legs.push(new Leg(cfg.id, cfg.side, cfg.x, cfg.side * 2.5, this.scale));
        });

        legConfigs.forEach(cfg => {
            this.legs.push(new Leg(cfg.id, cfg.side, cfg.x, cfg.side * 2.5, this.scale));
        });

        this.legs.forEach(leg => {
            leg.currentPos = leg.idealOffset.add(this.pos);
            leg.targetPos = leg.currentPos.clone();
        });

        // Callback
        this.onLevelUp = null;
    }

    gainXp(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNext) {
            this.levelUp();
        }
    }

    levelUp() {
        this.xp -= this.xpToNext;
        this.level++;
        this.xpToNext = Math.floor(this.xpToNext * 1.5); // 升级难度增加

        // 每次升级体型变大 15%
        this.baseScale *= 1.15;
        this.targetScale = this.baseScale;

        // 重新初始化腿部以适应新尺寸
        this.initLegs();

        // Trigger Flash Effect
        this.flashTimer = 30; // 30 frames (~0.5s)

        // 检查进化
        if (this.level % 5 === 0) {
            this.evolve();
        }

        if (this.onLevelUp) this.onLevelUp(this.level);
    }

    setLevel(targetLevel) {
        // Reset to base
        this.level = 1;
        this.xp = 0;
        this.scale = 1.0;
        this.baseScale = 1.0;
        this.targetScale = 1.0;
        this.evolutionStage = 0;
        this.initLegs();

        // Fast forward to target level
        for (let i = 1; i < targetLevel; i++) {
            // Simulate level up without effects
            this.level++;
            this.xpToNext = Math.floor(this.xpToNext * 1.5);
            this.baseScale *= 1.15;
            this.targetScale = this.baseScale;
            if (this.level % 5 === 0) {
                this.evolve();
            }
        }
        this.scale = this.targetScale;
        this.legs.forEach(leg => leg.updateScale(this.scale));
    }

    evolve() {
        this.evolutionStage++;
        // 进化改变外观
        if (this.evolutionStage === 1) {
            // 进化成 "红甲虫皇"
            this.colors = {
                head: '#8B0000',     // 深红
                thorax: '#800000',   // 栗色
                abdomen: '#A52A2A',  // 棕红
                gradStart: '#FF4500',// 橙红高光
                gradEnd: '#2F0000'   // 近黑阴影
            };
            this.maxSpeed *= 1.2; // 速度提升
        } else {
            // 后续进化...
            this.colors.gradStart = '#FFD700'; // 泛金光
        }
    }


    update(input) {
        // --- Smooth Growth ---
        if (Math.abs(this.scale - this.targetScale) > 0.01) {
            this.scale += (this.targetScale - this.scale) * 0.05;
            // Update legs scale without resetting them
            this.legs.forEach(leg => leg.updateScale(this.scale));
        } else {
            this.scale = this.targetScale;
        }

        if (this.flashTimer > 0) this.flashTimer--;

        let dx = 0;
        let dy = 0;
        if (input.up) dy -= 1;
        if (input.down) dy += 1;
        if (input.left) dx -= 1;
        if (input.right) dx += 1;

        let targetSpeed = 0;
        let isSprinting = input.shift && this.stamina > 0;

        if (dx !== 0 || dy !== 0) {
            targetSpeed = this.maxSpeed * (isSprinting ? 1.8 : 1.0);

            // Stamina Logic
            if (isSprinting) {
                this.stamina -= 0.8; // Drain
                if (this.stamina <= 0) this.stamina = 0;
            } else {
                this.stamina += 0.3; // Regen while moving but not sprinting
                if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
            }

            let targetAngle = Math.atan2(dy, dx);
            let diff = targetAngle - this.angle;
            while (diff <= -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * 0.15;
        } else {
            targetSpeed = 0;
            // Regen faster when standing still
            this.stamina += 0.4;
            if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
        }

        // Increased friction/deceleration (0.2 -> 0.15 for accel, faster decay for stopping)
        if (targetSpeed === 0) {
            this.speed += (targetSpeed - this.speed) * 0.3; // Stop faster (Higher val = faster stop)
        } else {
            this.speed += (targetSpeed - this.speed) * 0.1; // Accel slower
        }

        this.vel = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(this.speed);
        this.pos = this.pos.add(this.vel);

        this.thoraxPos = this.pos;

        // --- 身体跟随 ---
        let headTarget = this.pos.add(new Vec2(Math.cos(this.angle) * 5.5 * this.scale, Math.sin(this.angle) * 5.5 * this.scale));
        this.headPos = this.headPos.add(headTarget.sub(this.headPos).mult(0.5));

        let abTarget = this.pos.add(new Vec2(Math.cos(this.angle) * -7 * this.scale, Math.sin(this.angle) * -7 * this.scale));
        this.abdomenPos = this.abdomenPos.add(abTarget.sub(this.abdomenPos).mult(0.4));

        let groupAMoving = this.legs[0].isMoving || this.legs[4].isMoving || this.legs[2].isMoving;
        let groupBMoving = this.legs[3].isMoving || this.legs[1].isMoving || this.legs[5].isMoving;

        let canGroupAMove = !groupBMoving;
        let canGroupBMove = !groupAMoving;

        this.legs.forEach(leg => {
            let canMove = false;
            if ([0, 4, 2].includes(leg.id)) canMove = canGroupAMove;
            else canMove = canGroupBMove;
            leg.update(this.thoraxPos, this.angle, this.vel, canMove);
        });
    }

    draw(ctx) {
        // --- Growth Flash Effect ---
        if (this.flashTimer > 0) {
            ctx.save();
            ctx.translate(this.pos.x, this.pos.y);
            let alpha = this.flashTimer / 30;
            ctx.beginPath();
            ctx.arc(0, 0, 30 * this.scale * (2 - alpha), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.6})`; // Gold glow
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        this.legs.forEach(leg => {
            let hipWorldPos = leg.offset.rotate(this.angle).add(this.thoraxPos);
            leg.draw(ctx, hipWorldPos);
        });

        // --- 身体 (保持微型尺寸，随 scale 变化) ---
        // 腹部
        this.drawSegment(ctx, this.abdomenPos, 6 * this.scale, 9 * this.scale, this.angle, this.colors.abdomen);
        // 胸部
        this.drawSegment(ctx, this.thoraxPos, 4 * this.scale, 6 * this.scale, this.angle, this.colors.thorax);
        // 头部
        this.drawSegment(ctx, this.headPos, 3.5 * this.scale, 5 * this.scale, this.angle, this.colors.head);


        // 眼睛
        let eyeOffsetL = new Vec2(1.5, -2).rotate(this.angle).add(this.headPos);
        let eyeOffsetR = new Vec2(1.5, 2).rotate(this.angle).add(this.headPos);
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(eyeOffsetL.x, eyeOffsetL.y, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeOffsetR.x, eyeOffsetR.y, 1, 0, Math.PI * 2); ctx.fill();

        // 触角
        this.drawAntenna(ctx, this.headPos, this.angle, -1);
        this.drawAntenna(ctx, this.headPos, this.angle, 1);

        // 大颚
        this.drawMandibles(ctx, this.headPos, this.angle);
    }

    drawSegment(ctx, pos, w, h, angle, color) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);

        let grad = ctx.createRadialGradient(-w / 3, -h / 3, 1, 0, 0, w);
        grad.addColorStop(0, this.colors.gradStart);
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, this.colors.gradEnd);
        ctx.fillStyle = grad;


        ctx.beginPath();
        ctx.ellipse(0, 0, h, w, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawAntenna(ctx, headPos, angle, side) {
        let time = Date.now() / 200;
        let wiggle = Math.sin(time + side) * 0.2;
        if (this.vel.mag() > 0.1) wiggle += Math.sin(time * 3) * 0.3;

        let baseAngle = angle + (side * 0.2) + wiggle;

        // 触角进一步缩短 1/3
        // 第一段: 12 -> 8
        let elbowPos = new Vec2(Math.cos(baseAngle) * 8, Math.sin(baseAngle) * 8).add(headPos);

        // 第二段: 17 -> 11
        let tipAngle = baseAngle + (side * 0.3) + wiggle * 0.5;
        let tipPos = new Vec2(Math.cos(tipAngle) * 11, Math.sin(tipAngle) * 11).add(elbowPos);

        ctx.strokeStyle = '#2a1a0a';
        ctx.lineWidth = 0.8; // 更细
        ctx.beginPath();
        ctx.moveTo(headPos.x + Math.cos(angle) * 3.5, headPos.y + Math.sin(angle) * 3.5);
        ctx.lineTo(elbowPos.x, elbowPos.y);
        ctx.lineTo(tipPos.x, tipPos.y);
        ctx.stroke();
    }

    drawMandibles(ctx, headPos, angle) {
        ctx.save();
        ctx.translate(headPos.x, headPos.y);
        ctx.rotate(angle);
        ctx.strokeStyle = '#2a1a0a';
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        ctx.arc(4, -1.5, 2.5, Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(4, 1.5, 2.5, Math.PI / 2, Math.PI * 1.5, true);
        ctx.stroke();
        ctx.restore();
    }
}
