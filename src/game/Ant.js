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

        // --- Ladybug Vars ---
        this.form = 'ANT';
        this.walkCycle = 0;
        this.antennaTimer = 0;

        // --- Pill Bug Vars ---
        this.pillBugSegments = [];
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
        let formName = "";

        // 进化改变外观
        if (this.evolutionStage === 1) {
            this.form = 'LADYBUG';
            this.maxSpeed *= 1.2;
            formName = "瓢虫 (LADYBUG)";
        } else if (this.evolutionStage === 2) {
            this.form = 'PILLBUG';
            this.maxSpeed *= 1.1; // Slightly faster
            this.pillBugSegments = [];
            for (let i = 0; i < 9; i++) {
                this.pillBugSegments.push({ x: this.pos.x, y: this.pos.y, angle: this.angle });
            }
            formName = "潮虫 (PILLBUG)";
        }

        if (this.onEvolve) this.onEvolve(formName);
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
        this.vel = new Vec2(Math.cos(this.angle), Math.sin(this.angle)).mult(this.speed);
        this.pos = this.pos.add(this.vel);

        this.updateVisuals();


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

        if (this.form === 'LADYBUG') {
            this.drawLadybug(ctx);
            return;
        } else if (this.form === 'PILLBUG') {
            this.drawPillBug(ctx);
            return;
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

    // --- Ladybug Specific Drawing Logic ---
    drawLadybug(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle + Math.PI / 2); // Canvas 0度通常向右，我们需要修正旋转以便计算方便

        let size = 12.5 * this.scale; // Base size adapted to scale (Reduced by half)

        // 阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 5 * this.scale, size * 0.9, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // --- 腿部 (Legs) ---
        this.drawLadybugLegs(ctx, size);

        // --- 身体 (Body/Elytra) ---
        // 鞘翅红色渐变
        const bodyGrad = ctx.createRadialGradient(-5 * this.scale, -5 * this.scale, 2 * this.scale, 0, 0, size * 1.2);
        bodyGrad.addColorStop(0, '#ff4d4d');
        bodyGrad.addColorStop(0.4, '#cc0000');
        bodyGrad.addColorStop(1, '#800000');

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        // 稍微拉长的半球体
        ctx.ellipse(0, 5 * this.scale, size * 0.95, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 鞘翅中间的分隔线
        ctx.strokeStyle = 'rgba(50, 0, 0, 0.3)';
        ctx.lineWidth = 1 * this.scale;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.2);
        ctx.lineTo(0, size * 1.6);
        ctx.stroke();

        // 斑点 (Spots)
        this.drawLadybugSpots(ctx, size);

        // 高光 (Specular Highlight) - 让甲壳看起来硬且亮
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-size * 0.4, 0, size * 0.2, size * 0.4, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // --- 头部 (Head) ---
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, -size * 0.8, size * 0.55, Math.PI, 0);
        ctx.fill();

        // 头部光泽
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(size * 0.2, -size * 1.0, size * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // --- 触角 (Antennae) ---
        this.drawLadybugAntennae(ctx, size);

        ctx.restore();
    }

    drawLadybugLegs(ctx, size) {
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2.5 * this.scale;
        ctx.lineCap = 'round';

        // 腿部参数
        const legX = size * 0.75; // 身体连接点 X
        const legLen1 = size * 0.55; // 大腿长
        const legLen2 = size * 0.65; // 小腿长

        // 步态相位：三角步态 (Tripod Gait)
        const gaitA = Math.sin(this.walkCycle * Math.PI * 2);
        const gaitB = Math.sin(this.walkCycle * Math.PI * 2 + Math.PI);

        // 基础角度配置 (右侧)
        // 0为向右, -PI/2为向上(头), PI/2为向下(尾)
        const angleFront = -0.7; // 右前: 约 -40度
        const angleMid = 0.0; // 右中: 0度
        const angleBack = 0.7; // 右后: 约 40度

        // Y轴位置 (相对于中心)
        const yFront = -size * 0.5;
        const yMid = size * 0.1;
        const yBack = size * 0.7;

        // 腿部定义：完全对称分布
        const legs = [
            // --- 左侧腿 (X为负, 角度镜像) ---
            { x: -legX, y: yFront, baseAngle: Math.PI - angleFront, phase: gaitA, isLeft: true },
            { x: -legX, y: yMid, baseAngle: Math.PI - angleMid, phase: gaitB, isLeft: true },
            { x: -legX, y: yBack, baseAngle: Math.PI - angleBack, phase: gaitA, isLeft: true },

            // --- 右侧腿 (X为正) ---
            { x: legX, y: yFront, baseAngle: angleFront, phase: gaitB, isLeft: false },
            { x: legX, y: yMid, baseAngle: angleMid, phase: gaitA, isLeft: false },
            { x: legX, y: yBack, baseAngle: angleBack, phase: gaitB, isLeft: false },
        ];

        legs.forEach((leg) => {
            // 动态角度摆动幅度
            const swing = leg.phase * 0.35;

            ctx.save();
            ctx.translate(leg.x, leg.y);

            // 1. 大腿角度
            let angle1 = leg.baseAngle;
            // 摆动方向修正
            angle1 += swing;

            // 绘制大腿
            const kneeX = Math.cos(angle1) * legLen1;
            const kneeY = Math.sin(angle1) * legLen1;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(kneeX, kneeY);
            ctx.stroke();

            // 2. 小腿 (膝盖处弯曲)
            ctx.translate(kneeX, kneeY);

            // 弯曲角度
            const kneeBend = 1.2;
            let angle2 = angle1 + (leg.isLeft ? -kneeBend : kneeBend);

            // 运动时小腿也会伸缩一点
            angle2 += leg.phase * 0.15;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle2) * legLen2, Math.sin(angle2) * legLen2);
            ctx.stroke();

            ctx.restore();
        });
    }

    drawLadybugSpots(ctx, size) {
        ctx.fillStyle = '#000';
        const spots = [
            { x: -size * 0.4, y: 0, r: size * 0.2 },
            { x: size * 0.4, y: 0, r: size * 0.2 },
            { x: -size * 0.5, y: size * 0.6, r: size * 0.18 },
            { x: size * 0.5, y: size * 0.6, r: size * 0.18 },
            { x: -size * 0.3, y: size * 1.1, r: size * 0.12 },
            { x: size * 0.3, y: size * 1.1, r: size * 0.12 },
            // 中央靠近头部的一个点
            { x: 0, y: -size * 0.2, r: size * 0.15 },
        ];

        spots.forEach(spot => {
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawLadybugAntennae(ctx, size) {
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5 * this.scale;

        // 触角基座位置
        const baseX = size * 0.2;
        const baseY = -size * 1.2;

        // 随机微动 + 随速度后掠
        const twitchL = Math.sin(this.antennaTimer) * 0.1;
        const twitchR = Math.cos(this.antennaTimer * 1.3) * 0.1;

        // 左触角
        ctx.beginPath();
        ctx.moveTo(-baseX, baseY);
        ctx.quadraticCurveTo(
            -baseX * 2, baseY - 10 * this.scale,
            -baseX * 3 + twitchL * 10, baseY - 5 * this.scale + Math.abs(this.speed) * 2
        );
        ctx.stroke();

        // 右触角
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(
            baseX * 2, baseY - 10 * this.scale,
            baseX * 3 + twitchR * 10, baseY - 5 * this.scale + Math.abs(this.speed) * 2
        );
        ctx.stroke();
    }

    // --- Pill Bug Specific Drawing Logic ---
    drawPillBug(ctx) {
        // Shadow (unified)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        // Draw Legs first (under body)
        this.drawPillBugLegs(ctx);

        ctx.restore(); // Restore shadow settings for body

        // Draw Segments (Tail to Head)
        for (let i = this.pillBugSegments.length - 1; i >= 0; i--) {
            const s = this.pillBugSegments[i];
            const radius = this.getPillBugSegmentRadius(i);
            const isHead = i === 0;
            const isTail = i === this.pillBugSegments.length - 1;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);

            const baseColor = '#4A5568'; // Slate
            const highlightColor = '#718096';

            ctx.beginPath();

            if (isHead) {
                ctx.fillStyle = '#2D3748';
                ctx.ellipse(4 * this.scale, 0, radius * 0.9, radius, 0, 0, Math.PI * 2);
                ctx.fill();

                // Eyes
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(10 * this.scale, -radius * 0.6, 2.5 * this.scale, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(10 * this.scale, radius * 0.6, 2.5 * this.scale, 0, Math.PI * 2); ctx.fill();

                this.drawPillBugAntennae(ctx, radius);

            } else if (isTail) {
                ctx.fillStyle = baseColor;
                ctx.ellipse(-2 * this.scale, 0, radius, radius * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = baseColor;
                ctx.ellipse(0, 0, radius * 0.65, radius, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.stroke();

                ctx.fillStyle = highlightColor;
                ctx.beginPath();
                ctx.ellipse(-2 * this.scale, 0, radius * 0.25, radius * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    drawPillBugLegs(ctx) {
        ctx.strokeStyle = '#2D3748';
        ctx.lineWidth = 3 * this.scale;
        ctx.lineCap = 'round';

        for (let i = 1; i < this.pillBugSegments.length - 1; i++) {
            const s = this.pillBugSegments[i];
            const radius = this.getPillBugSegmentRadius(i);

            const legOffset = i * 0.8;
            const swing = Math.sin(this.walkCycle + legOffset) * (this.speed > 0.1 ? 1 : 0);

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);

            // Left Leg
            ctx.beginPath();
            ctx.moveTo(0, -radius * 0.8);

            let kneeX = (-2 + swing * 5) * this.scale;
            let kneeY = -radius * 1.5;
            let footX = (-6 + swing * 8) * this.scale;
            let footY = -radius * 1.9 + Math.abs(swing) * 4 * this.scale;

            ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
            ctx.stroke();

            // Right Leg
            ctx.beginPath();
            ctx.moveTo(0, radius * 0.8);
            ctx.quadraticCurveTo(kneeX, -kneeY, footX, -footY);
            ctx.stroke();

            ctx.restore();
        }
    }

    drawPillBugAntennae(ctx, headRadius) {
        ctx.strokeStyle = '#2D3748';
        ctx.lineWidth = 2 * this.scale;

        const twitch = Math.sin(Date.now() / 150) * 0.15;

        // Left
        ctx.beginPath();
        ctx.moveTo(8 * this.scale, -headRadius * 0.4);
        ctx.lineTo(20 * this.scale, -headRadius * 0.8);
        ctx.lineTo((30 + twitch * 10) * this.scale, -headRadius * 1.2);
        ctx.stroke();

        // Right
        ctx.beginPath();
        ctx.moveTo(8 * this.scale, headRadius * 0.4);
        ctx.lineTo(20 * this.scale, headRadius * 0.8);
        ctx.lineTo((30 - twitch * 10) * this.scale, headRadius * 1.2);
        ctx.stroke();
    }

    getPillBugSegmentRadius(index) {
        const scales = [0.8, 0.92, 1.0, 1.0, 0.98, 0.92, 0.85, 0.75, 0.6];
        const s = scales[index] !== undefined ? scales[index] : 0.8;
        return 10 * this.scale * s; // Reduced to 10 (Half size)
    }

    updateVisuals() {
        // --- Update Animations ---
        if (this.form === 'LADYBUG') {
            // 步态速度随移动速度变化
            if (this.speed > 0.1) {
                this.walkCycle += 0.1 * (this.speed / this.maxSpeed);
            }
            this.antennaTimer += 0.05;
            return; // Skip Ant specific IK update
        } else if (this.form === 'PILLBUG') {
            if (this.speed > 0.1) {
                this.walkCycle += this.speed * 0.2;
            }

            // Update Head Segment
            if (this.pillBugSegments.length === 0) {
                // Init if missing (sanity check)
                for (let i = 0; i < 9; i++) this.pillBugSegments.push({ x: this.pos.x, y: this.pos.y, angle: this.angle });
            }
            let head = this.pillBugSegments[0];
            head.x = this.pos.x;
            head.y = this.pos.y;
            head.angle = this.angle;

            // IK for body segments
            let spacing = 12 * this.scale; // Keep spacing relative to scale, maybe reduce spacing too? 
            // If size is halved, spacing should probably be halved too? 
            // Original: 12. Let's try 6.
            spacing = 6 * this.scale;

            for (let i = 1; i < this.pillBugSegments.length; i++) {
                const current = this.pillBugSegments[i];
                const prev = this.pillBugSegments[i - 1];

                const dx = prev.x - current.x;
                const dy = prev.y - current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angleToPrev = Math.atan2(dy, dx);

                const currentSpacing = i === 1 ? spacing : spacing * 0.9;

                // Simple lerp for smooth following
                let targetX = prev.x - Math.cos(angleToPrev) * currentSpacing;
                let targetY = prev.y - Math.sin(angleToPrev) * currentSpacing;

                current.x += (targetX - current.x) * 0.5;
                current.y += (targetY - current.y) * 0.5;
                current.angle = angleToPrev;
            }
            return;
        }

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
}
