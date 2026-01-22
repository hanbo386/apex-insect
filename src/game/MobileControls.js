
export class MobileControls {
    constructor() {
        this.moveVector = { x: 0, y: 0 };
        this.sprinting = false;
        this.attacking = false;
        this.touchId = null;

        // Simple Mobile Detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);

        if (this.isMobile) {
            this.initUI();
            this.bindEvents();
        }
    }

    isActive() {
        return this.isMobile;
    }

    getMoveVector() {
        return this.moveVector;
    }

    isSprinting() {
        return this.sprinting;
    }

    isAttacking() {
        return this.attacking;
    }

    initUI() {
        // Prevents default touch actions (scrolling/zoom)
        document.body.style.touchAction = 'none';

        // 1. Joystick Area (Bottom Left)
        this.joyBase = document.createElement('div');
        this.joyBase.id = 'joy-base';
        this.joyBase.style.cssText = `
            position: fixed; bottom: 50px; left: 40px; width: 140px; height: 140px;
            background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 50%; touch-action: none; z-index: 9999;
        `;
        document.body.appendChild(this.joyBase);

        // Joystick Knob
        this.joyStick = document.createElement('div');
        this.joyStick.style.cssText = `
            width: 60px; height: 60px; background: rgba(255, 255, 255, 0.4);
            border-radius: 50%; position: absolute; top: 40px; left: 40px;
            pointer-events: none; transform: translate(0, 0); transition: transform 0.05s;
        `;
        this.joyBase.appendChild(this.joyStick);


        // 2. Sprint Button (Bottom Right)
        this.sprintBtn = document.createElement('div');
        this.sprintBtn.id = 'sprint-btn';
        this.sprintBtn.style.cssText = `
            position: fixed; bottom: 50px; right: 40px; width: 90px; height: 90px;
            background: rgba(0, 255, 0, 0.2); border: 2px solid rgba(0, 255, 0, 0.4);
            border-radius: 50%; touch-action: none; z-index: 9999;
            display: flex; justify-content: center; align-items: center;
            font-family: monospace; color: white; font-weight: bold; font-size: 16px;
            user-select: none;
        `;
        this.sprintBtn.innerText = "RUSH";
        document.body.appendChild(this.sprintBtn);

        // 3. Attack Button (Bottom Right - Higher)
        this.attackBtn = document.createElement('div');
        this.attackBtn.id = 'attack-btn';
        this.attackBtn.style.cssText = `
            position: fixed; bottom: 160px; right: 40px; width: 80px; height: 80px;
            background: rgba(255, 0, 0, 0.2); border: 2px solid rgba(255, 0, 0, 0.4);
            border-radius: 50%; touch-action: none; z-index: 9999;
            display: flex; justify-content: center; align-items: center;
            font-family: monospace; color: white; font-weight: bold; font-size: 16px;
            user-select: none;
        `;
        this.attackBtn.innerText = "ATK";
        document.body.appendChild(this.attackBtn);
    }

    bindEvents() {
        const center = { x: 70, y: 70 }; // Half of 140 base
        const maxDist = 40;

        // Joystick Logic
        this.joyBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.touchId = touch.identifier;
            this.updateJoystick(touch.clientX, touch.clientY, center, maxDist);
        }, { passive: false });

        this.joyBase.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchId) {
                    const touch = e.changedTouches[i];
                    this.updateJoystick(touch.clientX, touch.clientY, center, maxDist);
                    break;
                }
            }
        }, { passive: false });

        const endJoystick = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchId) {
                    this.moveVector = { x: 0, y: 0 };
                    this.touchId = null;
                    this.joyStick.style.transform = `translate(0px, 0px)`;
                    break;
                }
            }
        };

        this.joyBase.addEventListener('touchend', endJoystick);
        this.joyBase.addEventListener('touchcancel', endJoystick);

        // Sprint Logic
        this.sprintBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.sprinting = true; this.sprintBtn.style.backgroundColor = 'rgba(0,255,0,0.5)'; });
        this.sprintBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.sprinting = false; this.sprintBtn.style.backgroundColor = 'rgba(0,255,0,0.2)'; });

        // Attack Logic
        this.attackBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.attacking = true; this.attackBtn.style.backgroundColor = 'rgba(255,0,0,0.5)'; });
        this.attackBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.attacking = false; this.attackBtn.style.backgroundColor = 'rgba(255,0,0,0.2)'; });
    }

    updateJoystick(clientX, clientY, center, maxDist) {
        const rect = this.joyBase.getBoundingClientRect();
        const touchX = clientX - rect.left;
        const touchY = clientY - rect.top;

        const dx = touchX - center.x;
        const dy = touchY - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let clampedDist = Math.min(dist, maxDist);
        let angle = Math.atan2(dy, dx);

        const moveX = Math.cos(angle) * clampedDist;
        const moveY = Math.sin(angle) * clampedDist;

        this.joyStick.style.transform = `translate(${moveX}px, ${moveY}px)`;

        // Normalize output (-1 to 1)
        this.moveVector = {
            x: moveX / maxDist,
            y: moveY / maxDist
        };
    }
}
