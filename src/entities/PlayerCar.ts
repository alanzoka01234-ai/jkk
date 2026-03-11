import * as THREE from 'three';
import type { AssetManager } from '../core/AssetManager';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { VehicleController } from '../physics/VehicleController';
import { VEHICLE_CONFIG } from '../utils/Config';
import type { InputState } from '../utils/InputManager';

export class PlayerCar {
  readonly root = new THREE.Group();
  readonly vehicle: VehicleController;
  private readonly bodyShell = new THREE.Group();

  constructor(scene: THREE.Scene, physics: PhysicsWorld, assetManager: AssetManager) {
    this.vehicle = new VehicleController(physics.world);
    this.root.name = 'PlayerCar';
    this.root.add(this.bodyShell);
    this.buildFallbackModel();
    scene.add(this.root);
    void this.tryLoadAsset(assetManager);
  }

  step(dt: number, input: InputState): void {
    this.vehicle.update(dt, input);
  }

  sync(): void {
    this.vehicle.syncVisuals(this.root);
    const pitch = THREE.MathUtils.clamp(this.vehicle.body.angularVelocity.x * -0.1, -0.08, 0.08);
    const roll = THREE.MathUtils.clamp(this.vehicle.body.angularVelocity.z * 0.12, -0.1, 0.1);
    this.bodyShell.rotation.z = roll;
    this.bodyShell.rotation.x = pitch;
  }

  reset(): void {
    this.vehicle.reset();
  }

  getPosition(): THREE.Vector3 {
    return this.root.position.clone();
  }

  getHeading(): number {
    return this.vehicle.getHeading();
  }

  getSpeedKmh(): number {
    return this.vehicle.getSpeedKmh();
  }

  getGearState(): string {
    return this.vehicle.getGearState();
  }

  getSteerAngle(): number {
    return this.vehicle.getSteerAngle();
  }

  getWheelDebug(): string {
    return this.vehicle.getWheelStates().map((wheel, index) => {
      const name = ['FL', 'FR', 'RL', 'RR'][index] ?? `W${index}`;
      return `${name}: ${wheel.grounded ? 'G' : 'A'} ${wheel.suspensionLength.toFixed(2)}m`;
    }).join(' | ');
  }

  private buildFallbackModel(): void {
    const paint = new THREE.MeshPhysicalMaterial({ color: '#2ea8ff', metalness: 0.45, roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.25 });
    const dark = new THREE.MeshStandardMaterial({ color: '#151b23', metalness: 0.55, roughness: 0.6 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#b7e6ff', transmission: 0.18, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.85 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.2), paint);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    chassis.position.y = 0.82;
    this.bodyShell.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.64, 2.02), glass);
    cabin.castShadow = true;
    cabin.position.set(0, 1.28, -0.15);
    this.bodyShell.add(cabin);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.22, 1.26), paint);
    hood.position.set(0, 1.0, 1.22);
    hood.castShadow = true;
    this.bodyShell.add(hood);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.28, 0.38), dark);
    bumper.position.set(0, 0.72, 2.06);
    this.bodyShell.add(bumper);

    const rearBumper = bumper.clone();
    rearBumper.position.z = -2.06;
    this.bodyShell.add(rearBumper);

    this.createWheel(new THREE.Vector3(-VEHICLE_CONFIG.trackWidth / 2, 0.35, VEHICLE_CONFIG.wheelBase / 2), true, true, dark);
    this.createWheel(new THREE.Vector3(VEHICLE_CONFIG.trackWidth / 2, 0.35, VEHICLE_CONFIG.wheelBase / 2), true, false, dark);
    this.createWheel(new THREE.Vector3(-VEHICLE_CONFIG.trackWidth / 2, 0.35, -VEHICLE_CONFIG.wheelBase / 2), false, true, dark);
    this.createWheel(new THREE.Vector3(VEHICLE_CONFIG.trackWidth / 2, 0.35, -VEHICLE_CONFIG.wheelBase / 2), false, false, dark);

    const headLight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.06), new THREE.MeshBasicMaterial({ color: '#e9f7ff' }));
    headLight.position.set(0.72, 0.95, 2.09);
    this.bodyShell.add(headLight);
    const headLightL = headLight.clone();
    headLightL.position.x = -0.72;
    this.bodyShell.add(headLightL);

    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: '#ff5d71' }));
    tailLight.position.set(0.72, 0.92, -2.09);
    this.bodyShell.add(tailLight);
    const tailLightL = tailLight.clone();
    tailLightL.position.x = -0.72;
    this.bodyShell.add(tailLightL);
  }

  private createWheel(position: THREE.Vector3, isFront: boolean, isLeft: boolean, material: THREE.Material): void {
    const pivot = new THREE.Group();
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(VEHICLE_CONFIG.wheelRadius, VEHICLE_CONFIG.wheelRadius, 0.32, 20), material);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    wheel.receiveShadow = true;
    pivot.add(wheel);
    this.root.add(pivot);
    this.vehicle.registerWheel(pivot, wheel, position, isFront, isLeft);
  }

  private async tryLoadAsset(assetManager: AssetManager): Promise<void> {
    const model = await assetManager.loadModel('/models/player_car.glb');
    if (!model) return;
    this.bodyShell.clear();
    model.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    model.scale.setScalar(1.15);
    model.position.y = 0.35;
    this.bodyShell.add(model);
  }
}
