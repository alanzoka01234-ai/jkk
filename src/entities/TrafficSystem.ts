import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { TrafficLane } from '../world/CityBuilder';
import { CITY_CONFIG } from '../utils/Config';

interface TrafficVehicle {
  mesh: THREE.Group;
  body: CANNON.Body;
  lane: TrafficLane;
  segmentIndex: number;
  t: number;
  speed: number;
}

export class TrafficSystem {
  private readonly vehicles: TrafficVehicle[] = [];
  private readonly tempA = new THREE.Vector3();
  private readonly tempB = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene, private readonly physics: PhysicsWorld, lanes: TrafficLane[]) {
    const amount = Math.min(CITY_CONFIG.trafficDensity, lanes.length);
    for (let i = 0; i < amount; i++) {
      const lane = lanes[(i * 3) % lanes.length];
      this.vehicles.push(this.createVehicle(lane, i / amount));
    }
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    for (const vehicle of this.vehicles) {
      const current = vehicle.lane.points[vehicle.segmentIndex % vehicle.lane.points.length];
      const next = vehicle.lane.points[(vehicle.segmentIndex + 1) % vehicle.lane.points.length];
      this.tempA.copy(current);
      this.tempB.copy(next);
      const distance = this.tempA.distanceTo(this.tempB);
      vehicle.t += (vehicle.speed * dt) / Math.max(distance, 0.001);
      if (vehicle.t >= 1) {
        vehicle.t -= 1;
        vehicle.segmentIndex = (vehicle.segmentIndex + 1) % vehicle.lane.points.length;
      }

      const position = current.clone().lerp(next, vehicle.t);
      const direction = next.clone().sub(current).normalize();
      const desiredYaw = Math.atan2(direction.x, direction.z);

      vehicle.mesh.position.copy(position);
      vehicle.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), desiredYaw);
      vehicle.body.position.set(position.x, 0.8, position.z);
      vehicle.body.quaternion.setFromEuler(0, desiredYaw, 0);

      const distToPlayer = position.distanceTo(playerPosition);
      vehicle.mesh.visible = distToPlayer < 240;
    }
  }

  private createVehicle(lane: TrafficLane, offset: number): TrafficVehicle {
    const group = new THREE.Group();
    const color = new THREE.Color().setHSL((0.55 + Math.random() * 0.25) % 1, 0.65, 0.58);
    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.68, 3.9),
      new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.33 }),
    );
    bodyMesh.castShadow = true;
    bodyMesh.position.y = 0.72;
    group.add(bodyMesh);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.52, 1.8), new THREE.MeshStandardMaterial({ color: '#c5dcf6', roughness: 0.2, metalness: 0.1 }));
    roof.position.set(0, 1.15, -0.15);
    group.add(roof);

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#121416', roughness: 0.92, metalness: 0.1 });
    const positions = [[-0.82, 0.38, 1.28], [0.82, 0.38, 1.28], [-0.82, 0.38, -1.28], [0.82, 0.38, -1.28]];
    for (const [x, y, z] of positions) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 14), wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      group.add(wheel);
    }

    this.scene.add(group);

    const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Box(new CANNON.Vec3(0.9, 0.5, 1.95)) });
    this.physics.addBody(body);

    return {
      mesh: group,
      body,
      lane,
      segmentIndex: 0,
      t: offset,
      speed: 12 + Math.random() * 4,
    };
  }
}
