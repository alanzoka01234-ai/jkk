export interface InputState {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
  resetPressed: boolean;
  toggleCameraPressed: boolean;
  debugPressed: boolean;
}

export class InputManager {
  private readonly keys = new Set<string>();
  private oneShot = { reset: false, camera: false, debug: false };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  getState(): InputState {
    const throttle = this.isDown('KeyW') || this.isDown('ArrowUp') ? 1 : 0;
    const brake = this.isDown('KeyS') || this.isDown('ArrowDown') ? 1 : 0;
    const steer = (this.isDown('KeyA') || this.isDown('ArrowLeft') ? 1 : 0) - (this.isDown('KeyD') || this.isDown('ArrowRight') ? 1 : 0);
    const state: InputState = {
      throttle,
      brake,
      steer,
      handbrake: this.isDown('Space'),
      resetPressed: this.oneShot.reset,
      toggleCameraPressed: this.oneShot.camera,
      debugPressed: this.oneShot.debug,
    };
    this.oneShot = { reset: false, camera: false, debug: false };
    return state;
  }

  private isDown(code: string): boolean {
    return this.keys.has(code);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
    if (event.code === 'KeyR') this.oneShot.reset = true;
    if (event.code === 'KeyC') this.oneShot.camera = true;
    if (event.code === 'F3') this.oneShot.debug = true;
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onBlur = (): void => {
    this.keys.clear();
  };
}
