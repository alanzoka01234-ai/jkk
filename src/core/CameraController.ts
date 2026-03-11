import * as THREE from 'three';
import { CAMERA_CONFIG, type GraphicsQuality } from '../utils/Config';
import { clamp, damp } from '../utils/MathUtils';
import type { PlayerCar } from '../entities/PlayerCar';

export class CameraController {
  private readonly desiredPosition = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private readonly currentTarget = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private mode = 0;
  private sensitivity = 0.45;
  private quality: GraphicsQuality = 'high';

  constructor(private readonly camera: THREE.PerspectiveCamera, private readonly playerCar: PlayerCar) {}

  setSensitivity(value: number): void {
    this.sensitivity = clamp(value, 0.1, 1.2);
  }

  cycleMode(): void {
    this.mode = (this.mode + 1) % 3;
  }

  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
  }

  update(dt: number): void {
    const speed = this.playerCar.getSpeedKmh();
    const bodyPosition = this.playerCar.getPosition();
    const yaw = this.playerCar.getHeading();

    this.forward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    this.right.set(this.forward.z, 0, -this.forward.x).normalize();

    const dynamicDistance = CAMERA_CONFIG.followDistance + clamp(speed / 120, 0, 1.8);
    const dynamicHeight = CAMERA_CONFIG.followHeight + clamp(speed / 200, 0, 0.6);

    if (this.mode === 0) {
      this.desiredPosition.copy(bodyPosition)
        .addScaledVector(this.forward, -dynamicDistance)
        .addScaledVector(this.right, CAMERA_CONFIG.sideOffset * 0.18)
        .setY(bodyPosition.y + dynamicHeight);
    } else if (this.mode === 1) {
      this.desiredPosition.copy(bodyPosition)
        .addScaledVector(this.forward, -dynamicDistance * 1.45)
        .setY(bodyPosition.y + dynamicHeight + 1.3);
    } else {
      this.desiredPosition.copy(bodyPosition)
        .addScaledVector(this.forward, 1.1)
        .setY(bodyPosition.y + 1.35);
    }

    this.desiredTarget.copy(bodyPosition).addScaledVector(this.forward, 5).setY(bodyPosition.y + CAMERA_CONFIG.targetHeight);
    if (this.mode === 2) {
      this.desiredTarget.copy(bodyPosition).addScaledVector(this.forward, 12).setY(bodyPosition.y + 1.1);
    }

    const posLerp = this.quality === 'low' ? 4.2 : CAMERA_CONFIG.positionLerp + this.sensitivity;
    const targetLerp = CAMERA_CONFIG.targetLerp + this.sensitivity;
    this.camera.position.x = damp(this.camera.position.x, this.desiredPosition.x, posLerp, dt);
    this.camera.position.y = damp(this.camera.position.y, this.desiredPosition.y, posLerp, dt);
    this.camera.position.z = damp(this.camera.position.z, this.desiredPosition.z, posLerp, dt);

    this.currentTarget.x = damp(this.currentTarget.x, this.desiredTarget.x, targetLerp, dt);
    this.currentTarget.y = damp(this.currentTarget.y, this.desiredTarget.y, targetLerp, dt);
    this.currentTarget.z = damp(this.currentTarget.z, this.desiredTarget.z, targetLerp, dt);
    this.camera.lookAt(this.currentTarget);
  }

  getModeLabel(): string {
    return this.mode === 0 ? 'Follow' : this.mode === 1 ? 'Far' : 'Hood';
  }
}
