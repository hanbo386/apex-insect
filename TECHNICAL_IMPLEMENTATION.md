# Apex Insect Evolution - 技术实现文档

## 1. 项目架构综述 (Overview)
本项目是一个基于原生 **HTML5 Canvas 2D** 的微观世界进化模拟游戏。采用纯 JavaScript (ESM) 开发，无需外部游戏引擎。

### 核心模块：
- **main.js**: 游戏控制器。管理主循环 (60FPS)、UI、全局实体（玩家、NPC、粒子）及高层碰撞判定。
- **Insect.js**: 核心基类。封装物理引擎、过程化动画、进化状态机及多种形态（Ant, Ladybug, Tarantula etc.）的特异化逻辑。
- **Environment.js**: 处理地形（叶片、水洼）及其对不同进化阶段昆虫的物理反馈。

---

## 2. 进化与世界缩放系统 (Evolution & Scaling)
游戏通过 `STAGE_CONFIG` 定义了从 Stage 0 (Primitive) 到 Stage 13 (Titan) 的成长曲线。

### 核心技术点：动态世界缩放 (World Shrinking)
当玩家进化到大型阶段（如蝎子或泰坦）时，为了避免玩家超出屏幕，系统引入了 `worldScaleModifier`。
- **实现逻辑**：系统不是无限放大玩家，而是通过**缩小全局背景、障碍物及低阶 NPC 的渲染尺寸**，实现视觉上的“体感放大”。这解决了 Canvas 2D 系统中的尺寸溢出坐标系问题。

---

## 3. 过程化动画 (Procedural Animation)
本项目完全抛弃序列帧，采用纯数学驱动的 2D 过程化动画。

### 步态模拟 (Biomimetic Gait):
- **三角步态 (Tripod Gait)**：针对 6 足昆虫（蚂蚁、瓢虫），将足部按 `{0, 2, 4}` 和 `{1, 3, 5}` 分组，利用正弦函数 (`walkCycle`) 实现交替踏步。
- **身体跟随 (Follower Logic)**：头部和腹部通过物理插值跟随躯干，模拟真实生物爬行时的躯体扭动感。

---

## 4. 捕食与动作序列系统 (Predation & Sequencer)
捕食动作采用 **“三阶段序列器 (Three-Phase Sequencer)”** 架构，解决了交互动作的确定性问题。

### 捕食协议流：
1. **触发 (Trigger)**：`main.js` 检测碰撞 -> 调用 `startPredation` -> 执行 `triggerAttack()`。
2. **三阶段逻辑**：
   - **蓄力 (Windup)** (F0-5)：锁定操作，收缩大颚，速度通过物理阻尼大幅降低。
   - **冲击 (Impact)** (F5)：赋予瞬间爆发力，并在此刻调用 `onConsumePrey` 回调（处理 XP 增加与实体移除）。
   - **恢复 (Recovery)** (F5-25)：进入滑行状态，平滑过渡回正常控制。

---

## 5. 瓢虫 (Ladybug) 专项修复分析
此前瓢虫捕食不触发的问题在于“状态轮询延迟”。重构后改用 **“主动推式触发 (Push-Trigger)”**。
- **修复逻辑**：在 `startPredation` 碰撞逻辑中直接注入 `triggerLadybugAttack` 启动序列，不再依赖 `update` 循环的按键检测。
- **坐标同步**：捕食期间，猎物被逻辑锁定在瓢虫嘴部偏移位 (`mouthOffset`)，直到攻击 apex 点触发消费。

---

## 6. 渲染引擎特性
- **伪 3D 效果**：利用 `createRadialGradient` 模拟甲壳的圆润感和高光偏移。
- **摄像机系统**：具备 Lerp 平滑跟随及动态震动（Camera Shake）反馈。
- **分层渲染**：严格遵循 `影子 -> 腿部 -> 身体 -> 头/足` 的层级顺序，确保遮挡关系合理。

---

## 7. 未来扩展建议
- **群体算法 (Flocking)**：目前 AI采用简单的随机游走，可引入 Boids 算法优化 NPC 社交行为。
- **异步着色器**：虽然目前是 Canvas 2D，未来可考虑 OffscreenCanvas 处理大规模粒子以优化极限环境下的性能。
