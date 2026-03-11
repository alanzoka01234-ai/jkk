import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { VEHICLE_CONFIG } from '../utils/Config';
import { approach, clamp } from '../utils/MathUtils';
import type { InputState } from '../utils/InputManager';

export interface WheelState {
  readonly meshPivot: THREE.Group;
  readonly wheelMesh: THREE.Object3D;
  readonly localConnection: THREE.Vector3;
  readonly isFront: boolean;
  readonly isLeft: boolean;
  readonly worldPosition: THREE.Vector3;
  readonly suspensionLength: number;
  readonly grounded: boolean;
}

interface MutableWheelState {
  meshPivot: THREE.Group;
  wheelMesh: THREE.Object3D;
  localConnection: THREE.Vector3;
  isFront: boolean;
  isLeft: boolean;
  worldPosition: THREE.Vector3;
  suspensionLength: number;
  grounded: boolean;
  wheelSpin: number;
}

export class VehicleController {
  readonly body: CANNON.Body;
  private readonly ray = new CANNON.Ray();
  private readonly wheels: MutableWheelState[] = [];
  private steerAngle = 0;
  private gearState = 'N';
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly tempPosition = new THREE.Vector3();
  private readonly tempForward = new THREE.Vector3();
  private readonly tempRight = new THREE.Vector3();
  private readonly tempVelocity = new THREE.Vector3();
  private readonly localVelocity = new THREE.Vector3();
  private readonly forceVector = new CANNON.Vec3();
  private readonly pointVector = new CANNON.Vec3();
  private readonly down = new CANNON.Vec3(0, -1, 0);
  private readonly result = new CANNON.RaycastResult();
  private readonly velocityAtPoint = new CANNON.Vec3();
  private readonly comOffset = new CANNON.Vec3(
    VEHICLE_CONFIG.centerOfMassOffset.x,
    VEHICLE_CONFIG.centerOfMassOffset.y,
    VEHICLE_CONFIG.centerOfMassOffset.z,
  );

  constructor(private readonly world: CANNON.World) {
    this.body = new CANNON.Body({
      mass: VEHICLE_CONFIG.mass,
      material: new CANNON.Material('player-car'),
      angularDamping: 0.4,
      linearDamping: 0.01,
    });
    this.body.addShape(
      new CANNON.Box(new CANNON.Vec3(0.95, 0.48, 2.1)),
      new CANNON.Vec3(-this.comOffset.x, -this.comOffset.y, -this.comOffset.z),
    );
    this.body.position.set(0, 2.2, 0);
    this.body.allowSleep = false;
    this.world.addBody(this.body);
  }

  registerWheel(pivot: THREE.Group, wheelMesh: THREE.Object3D, localConnection: THREE.Vector3, isFront: boolean, isLeft: boolean): void {
    this.wheels.push({
      meshPivot: pivot,
      wheelMesh,
      localConnection,
      isFront,
      isLeft,
      worldPosition: new THREE.Vector3(),
      suspensionLength: VEHICLE_CONFIG.suspensionRestLength,
      grounded: false,
      wheelSpin: 0,
    });
  }

  update(dt: number, input: InputState): void {
    const throttleInput = input.throttle;
    const brakeInput = input.brake;
    const speed = this.getSpeedMps();
    const speedRatio = clamp(Math.abs(speed) / 34, 0, 1);
    const targetSteer = input.steer * VEHICLE_CONFIG.maxSteerAngle * (1 - speedRatio * 0.55);
    this.steerAngle = approach(this.steerAngle, targetSteer, VEHICLE_CONFIG.steerSpeed * dt);

    this.syncBasis();
    this.syncLocalVelocity();

    const movingForward = this.localVelocity.z > 1;
    const movingBackward = this.localVelocity.z < -0.5;
    const wantsReverse = brakeInput > 0 && !movingForward && Math.abs(this.localVelocity.z) < 2.1;

    const engine = throttleInput > 0 ? throttleInput : wantsReverse ? -brakeInput * 0.72 : 0;
    const braking = brakeInput > 0 && !wantsReverse ? brakeInput : 0;

    this.applyAerodynamics();
    this.applyWheelForces(dt, engine, braking, input.handbrake);
    this.stabilizeBody(dt);

    this.gearState = engine > 0.1 ? 'D' : engine < -0.1 || movingBackward ? 'R' : Math.abs(speed) < 0.6 ? 'N' : 'D';
  }

  syncVisuals(chassis: THREE.Object3D): void {
    chassis.position.set(this.body.position.x, this.body.position.y, this.body.position.z);
    chassis.quaternion.set(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w);

    const quat = chassis.quaternion;
    for (const wheel of this.wheels) {
      const worldOffset = wheel.localConnection.clone().applyQuaternion(quat);
      wheel.worldPosition.copy(chassis.position).add(worldOffset);
      wheel.meshPivot.position.copy(worldOffset);
      wheel.meshPivot.position.y -= wheel.suspensionLength;
      wheel.meshPivot.rotation.y = wheel.isFront ? this.steerAngle : 0;
      wheel.wheelMesh.rotation.x = wheel.wheelSpin;
    }
  }

  reset(position = new CANNON.Vec3(0, 2.5, 0)): void {
    this.body.position.copy(position);
    this.body.velocity.setZero();
    this.body.angularVelocity.setZero();
    this.body.quaternion.setFromEuler(0, 0, 0);
  }

  getSpeedKmh(): number {
    return Math.abs(this.getSpeedMps() * 3.6);
  }

  getSpeedMps(): number {
    return new THREE.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z).dot(this.tempForward.set(Math.sin(this.getHeading()), 0, Math.cos(this.getHeading())));
  }

  getHeading(): number {
    const q = new THREE.Quaternion(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    return Math.atan2(forward.x, forward.z);
  }

  getPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.body.position.x, this.body.position.y, this.body.position.z);
  }

  getGearState(): string {
    return this.gearState;
  }

  getSteerAngle(): number {
    return this.steerAngle;
  }

  getWheelStates(): readonly WheelState[] {
    return this.wheels;
  }

  private syncBasis(): void {
    const quat = new THREE.Quaternion(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w);
    this.tempForward.set(0, 0, 1).applyQuaternion(quat).normalize();
    this.tempRight.set(1, 0, 0).applyQuaternion(quat).normalize();
    this.tempPosition.set(this.body.position.x, this.body.position.y, this.body.position.z);
  }

  private syncLocalVelocity(): void {
    this.tempVelocity.set(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
    this.localVelocity.set(
      this.tempVelocity.dot(this.tempRight),
      this.tempVelocity.y,
      this.tempVelocity.dot(this.tempForward),
    );
  }

  private applyAerodynamics(): void {
    const velocity = this.body.velocity;
    const speed = velocity.length();
    const dragMagnitude = speed * speed * VEHICLE_CONFIG.dragCoefficient;
    this.body.applyForce(new CANNON.Vec3(
      -velocity.x * dragMagnitude,
      0,
      -velocity.z * dragMagnitude,
    ), this.body.position);

    this.body.applyForce(new CANNON.Vec3(
      -velocity.x * VEHICLE_CONFIG.rollingResistance,
      0,
      -velocity.z * VEHICLE_CONFIG.rollingResistance,
    ), this.body.position);
  }

  private applyWheelForces(dt: number, engine: number, braking: number, handbrake: boolean): void {
    for (const wheel of this.wheels) {
      const connection = wheel.localConnection.clone();
      const worldConnection = new THREE.Vector3(connection.x, connection.y, connection.z)
        .applyQuaternion(new THREE.Quaternion(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w))
        .add(this.tempPosition);

      const rayFrom = new CANNON.Vec3(worldConnection.x, worldConnection.y, worldConnection.z);
      const rayTo = new CANNON.Vec3(worldConnection.x, worldConnection.y - (VEHICLE_CONFIG.suspensionRestLength + VEHICLE_CONFIG.wheelRadius + VEHICLE_CONFIG.suspensionTravel), worldConnection.z);
      this.result.reset();
      const hit = this.world.raycastClosest(rayFrom, rayTo, { skipBackfaces: true, collisionFilterMask: -1 }, this.result);
      wheel.grounded = hit;

      if (hit && this.result.body !== this.body) {
        const suspensionDistance = Math.max(0, this.result.distance - VEHICLE_CONFIG.wheelRadius);
        const compression = VEHICLE_CONFIG.suspensionRestLength - suspensionDistance;
        this.body.getVelocityAtWorldPoint(this.result.hitPointWorld, this.velocityAtPoint);
        const pointVelocity = this.velocityAtPoint;
        const springForce = compression * VEHICLE_CONFIG.suspensionStiffness;
        const damperForce = -pointVelocity.y * VEHICLE_CONFIG.suspensionDamping;
        const suspensionForce = springForce + damperForce;
        if (suspensionForce > 0) {
          this.forceVector.set(0, suspensionForce, 0);
          this.body.applyForce(this.forceVector, this.result.hitPointWorld);
        }

        const forwardDir = wheel.isFront
          ? this.tempForward.clone().applyAxisAngle(this.up, this.steerAngle)
          : this.tempForward.clone();
        const sideDir = new THREE.Vector3().crossVectors(this.up, forwardDir).normalize();
        const velocityAtPoint = new THREE.Vector3(pointVelocity.x, pointVelocity.y, pointVelocity.z);
        const forwardSpeed = velocityAtPoint.dot(forwardDir);
        const lateralSpeed = velocityAtPoint.dot(sideDir);

        const grip = VEHICLE_CONFIG.tireGrip * (handbrake && !wheel.isFront ? 0.34 : 1);
        const driveForce = engine * VEHICLE_CONFIG.engineForce * (wheel.isFront ? 0.55 : 1) * 0.5;
        const brakeForce = braking * VEHICLE_CONFIG.brakeForce + (handbrake && !wheel.isFront ? VEHICLE_CONFIG.handBrakeForce : 0);
        const longitudinalForce = clamp(driveForce - forwardSpeed * 160, -VEHICLE_CONFIG.maxSpeed * 280, VEHICLE_CONFIG.maxSpeed * 280) - Math.sign(forwardSpeed) * brakeForce;
        const lateralForce = -lateralSpeed * grip * 2100;

        const totalForce = forwardDir.multiplyScalar(longitudinalForce).add(sideDir.multiplyScalar(lateralForce));
        this.body.applyForce(new CANNON.Vec3(totalForce.x, 0, totalForce.z), this.result.hitPointWorld);
        wheel.suspensionLength = suspensionDistance;
        wheel.wheelSpin += (forwardSpeed / VEHICLE_CONFIG.wheelRadius) * dt;
      } else {
        wheel.suspensionLength = VEHICLE_CONFIG.suspensionRestLength + VEHICLE_CONFIG.suspensionTravel * 0.7;
      }
    }
  }

  private stabilizeBody(dt: number): void {
    const angular = this.body.angularVelocity;
    angular.x *= 1 - Math.min(dt * 1.5, 0.08);
    angular.z *= 1 - Math.min(dt * 1.3, 0.07);
  }
}
