export class GameLoop {
    constructor(updateFn, renderFn) {
        this.updateFn = updateFn;
        this.renderFn = renderFn;
        this.running = false;
    }

    start() {
        console.log("Game loop started");
        this.running = true;
    }
}