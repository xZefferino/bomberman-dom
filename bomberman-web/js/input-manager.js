export class InputManager {
    constructor() {
        this.keys = new Map();
        this.previousKeys = new Map();
        
        window.addEventListener('keydown', (e) => {
            this.keys.set(e.code, true);
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });

        // Handle tab/window focus to prevent stuck keys
        window.addEventListener('blur', () => {
            this.keys.clear();
        });
    }

    isKeyPressed(code) {
        return this.keys.has(code);
    }

    // For one-time keypresses (avoid holding key)
    wasKeyJustPressed(code) {
        const isPressed = this.keys.has(code);
        const wasPressed = this.previousKeys.has(code);
        return isPressed && !wasPressed;
    }

    update() {
        // Save current state for next frame comparison
        this.previousKeys = new Map(this.keys);
    }
}