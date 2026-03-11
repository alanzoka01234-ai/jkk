import * as CANNON from 'cannon-es';

export class PhysicsWorld {
  readonly world: CANNON.World;

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
      allowSleep: false,
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.defaultContactMaterial.friction = 0.42;
    this.world.defaultContactMaterial.restitution = 0.02;
  }

  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
  }

  step(dt: number, fixedTimeStep: number, maxSubsteps: number): void {
    this.world.step(fixedTimeStep, dt, maxSubsteps);
  }
}
