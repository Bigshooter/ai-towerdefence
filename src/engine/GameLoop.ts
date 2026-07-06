export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime: number = 0;
  private running: boolean = false;
  private updateCallback: (dt: number) => void;
  private renderCallback: () => void;

  constructor(canvas: HTMLCanvasElement, update: (dt: number) => void, render: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.updateCallback = update;
    this.renderCallback = render;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.tick.bind(this));
  }

  stop() {
    this.running = false;
  }

  private tick(currentTime: number) {
    if (!this.running) return;

    const dt = (currentTime - this.lastTime) / 1000; // delta time in seconds
    this.lastTime = currentTime;

    this.updateCallback(dt);
    this.renderCallback();

    requestAnimationFrame(this.tick.bind(this));
  }

  get deltaTime(): number {
    return (performance.now() - this.lastTime) / 1000;
  }
}
