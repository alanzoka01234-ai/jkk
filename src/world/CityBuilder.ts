import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { CITY_CONFIG } from '../utils/Config';
import { seededNoise } from '../utils/MathUtils';

export interface TrafficLane {
  points: THREE.Vector3[];
}

export class CityBuilder {
  readonly lanes: TrafficLane[] = [];
  readonly minimapCanvas = document.createElement('canvas');
  private readonly roadMaterial = new THREE.MeshStandardMaterial({ color: '#24282f', roughness: 0.95, metalness: 0.02 });
  private readonly lineMaterial = new THREE.MeshStandardMaterial({ color: '#ddd389', roughness: 0.8, metalness: 0.02, emissive: '#574d10', emissiveIntensity: 0.12 });
  private readonly sidewalkMaterial = new THREE.MeshStandardMaterial({ color: '#737984', roughness: 0.98 });
  private readonly foliageMaterial = new THREE.MeshStandardMaterial({ color: '#357155', roughness: 1 });

  constructor(private readonly scene: THREE.Scene, private readonly physics: PhysicsWorld) {
    this.minimapCanvas.width = 512;
    this.minimapCanvas.height = 512;
  }

  build(): void {
    this.buildGround();
    this.buildRoadGrid();
    this.buildBlocks();
    this.buildOpenArea();
    this.buildMinimap();
  }

  private buildGround(): void {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: '#52696f', roughness: 1 }));
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);

    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.physics.addBody(body);
  }

  private buildRoadGrid(): void {
    const extent = CITY_CONFIG.gridHalfExtent;
    const block = CITY_CONFIG.blockSize;
    const roadMain = CITY_CONFIG.roadWidthMain;
    const roadSide = CITY_CONFIG.roadWidthSide;

    for (let i = -extent; i <= extent; i++) {
      const z = i * block;
      this.createRoadSegment(0, z, block * (extent * 2 + 2), roadMain, true);
      this.createLaneLoopHorizontal(z, block * (extent + 0.75), roadMain);
    }
    for (let i = -extent; i <= extent; i++) {
      const x = i * block;
      this.createRoadSegment(x, 0, block * (extent * 2 + 2), roadSide, false);
      this.createLaneLoopVertical(x, block * (extent + 0.75), roadSide);
    }
  }

  private createRoadSegment(cx: number, cz: number, length: number, width: number, horizontal: boolean): void {
    const road = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? length : width, 0.06, horizontal ? width : length), this.roadMaterial);
    road.receiveShadow = true;
    road.position.set(cx, 0.02, cz);
    this.scene.add(road);

    const lineGeom = new THREE.BoxGeometry(horizontal ? length : 0.18, 0.02, horizontal ? 0.18 : length);
    const line = new THREE.Mesh(lineGeom, this.lineMaterial);
    line.position.set(cx, 0.07, cz);
    this.scene.add(line);

    const sidewalk1 = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? length : 2.2, 0.22, horizontal ? 2.2 : length), this.sidewalkMaterial);
    sidewalk1.position.set(horizontal ? cx : cx - width / 2 - 1.1, 0.1, horizontal ? cz - width / 2 - 1.1 : cz);
    sidewalk1.receiveShadow = true;
    this.scene.add(sidewalk1);

    const sidewalk2 = sidewalk1.clone();
    sidewalk2.position.set(horizontal ? cx : cx + width / 2 + 1.1, 0.1, horizontal ? cz + width / 2 + 1.1 : cz);
    if (horizontal) {
      sidewalk1.position.set(cx, 0.1, cz - width / 2 - 1.1);
      sidewalk2.position.set(cx, 0.1, cz + width / 2 + 1.1);
    }
    this.scene.add(sidewalk2);
  }

  private buildBlocks(): void {
    const group = new THREE.Group();
    const extent = CITY_CONFIG.gridHalfExtent;
    const block = CITY_CONFIG.blockSize;
    const inset = CITY_CONFIG.buildingInset;
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const materials = [
      new THREE.MeshStandardMaterial({ color: '#7e8794', roughness: 0.92, metalness: 0.08 }),
      new THREE.MeshStandardMaterial({ color: '#9b8d83', roughness: 0.87, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: '#6c8aa0', roughness: 0.8, metalness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: '#5f6670', roughness: 0.95, metalness: 0.03 }),
    ];

    const instanced = materials.map((mat) => new THREE.InstancedMesh(buildingGeo, mat, 600));
    instanced.forEach((mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    });
    const counts = new Array(instanced.length).fill(0);
    const matrix = new THREE.Matrix4();

    for (let gx = -extent; gx < extent; gx++) {
      for (let gz = -extent; gz < extent; gz++) {
        const centerX = gx * block + block / 2;
        const centerZ = gz * block + block / 2;
        const lotWidth = block - inset * 2;
        const lotDepth = block - inset * 2;
        const lotsX = 2 + Math.floor(seededNoise(gx, gz) * 2);
        const lotsZ = 2 + Math.floor(seededNoise(gz, gx) * 2);

        for (let lx = 0; lx < lotsX; lx++) {
          for (let lz = 0; lz < lotsZ; lz++) {
            const n = seededNoise(gx * 10 + lx, gz * 10 + lz);
            const sizeX = 8 + n * 8;
            const sizeZ = 8 + seededNoise(gx * 17 + lx, gz * 17 + lz) * 8;
            const height = 10 + seededNoise(gx * 33 + lx, gz * 33 + lz) * 68;
            const x = centerX - lotWidth / 2 + sizeX / 2 + lx * (lotWidth / lotsX);
            const z = centerZ - lotDepth / 2 + sizeZ / 2 + lz * (lotDepth / lotsZ);
            const matIndex = Math.floor(n * instanced.length) % instanced.length;
            matrix.compose(new THREE.Vector3(x, height / 2, z), new THREE.Quaternion(), new THREE.Vector3(sizeX, height, sizeZ));
            instanced[matIndex].setMatrixAt(counts[matIndex]++, matrix);
            this.addStaticBox(x, height / 2, z, sizeX / 2, height / 2, sizeZ / 2);
            this.placeStreetProps(x, z, sizeX, sizeZ, n);
          }
        }
      }
    }

    instanced.forEach((mesh, index) => {
      mesh.count = counts[index];
      mesh.instanceMatrix.needsUpdate = true;
    });
    this.scene.add(group);
  }

  private buildOpenArea(): void {
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(38, 46, 0.5, 30), new THREE.MeshStandardMaterial({ color: '#8d8f94', roughness: 0.98 }));
    plaza.position.set(-CITY_CONFIG.blockSize * 1.5, 0.25, CITY_CONFIG.blockSize * 1.6);
    plaza.receiveShadow = true;
    this.scene.add(plaza);
    this.addStaticBox(plaza.position.x, 0.25, plaza.position.z, 45, 0.25, 45);
  }

  private placeStreetProps(x: number, z: number, sx: number, sz: number, n: number): void {
    if (n < 0.32) return;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.8, 8), new THREE.MeshStandardMaterial({ color: '#4d5867', roughness: 0.8 }));
    pole.position.set(x + sx / 2 + 1.6, 2.9, z - sz / 2 + 1.5);
    pole.castShadow = true;
    this.scene.add(pole);
    this.addStaticBox(pole.position.x, pole.position.y, pole.position.z, 0.18, 2.9, 0.18);

    if (n > 0.54) {
      const treeTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.9, 8), new THREE.MeshStandardMaterial({ color: '#5f4232', roughness: 1 }));
      treeTrunk.position.set(x - sx / 2 - 1.1, 0.95, z + sz / 2 + 1.2);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.25 + n * 0.6, 10, 10), this.foliageMaterial);
      crown.position.set(treeTrunk.position.x, 2.5, treeTrunk.position.z);
      crown.castShadow = true;
      treeTrunk.castShadow = true;
      this.scene.add(treeTrunk, crown);
      this.addStaticBox(treeTrunk.position.x, treeTrunk.position.y, treeTrunk.position.z, 0.28, 1.1, 0.28);
    }
  }

  private createLaneLoopHorizontal(z: number, halfLength: number, width: number): void {
    this.lanes.push({
      points: [
        new THREE.Vector3(-halfLength, 0.1, z - width * 0.2),
        new THREE.Vector3(halfLength, 0.1, z - width * 0.2),
      ],
    });
    this.lanes.push({
      points: [
        new THREE.Vector3(halfLength, 0.1, z + width * 0.2),
        new THREE.Vector3(-halfLength, 0.1, z + width * 0.2),
      ],
    });
  }

  private createLaneLoopVertical(x: number, halfLength: number, width: number): void {
    this.lanes.push({
      points: [
        new THREE.Vector3(x - width * 0.2, 0.1, halfLength),
        new THREE.Vector3(x - width * 0.2, 0.1, -halfLength),
      ],
    });
    this.lanes.push({
      points: [
        new THREE.Vector3(x + width * 0.2, 0.1, -halfLength),
        new THREE.Vector3(x + width * 0.2, 0.1, halfLength),
      ],
    });
  }

  private addStaticBox(x: number, y: number, z: number, hx: number, hy: number, hz: number): void {
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)) });
    body.position.set(x, y, z);
    this.physics.addBody(body);
  }

  private buildMinimap(): void {
    const ctx = this.minimapCanvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0b1320';
    ctx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 18;
    const scale = 3.8;
    for (const lane of this.lanes) {
      ctx.beginPath();
      lane.points.forEach((point, index) => {
        const x = this.minimapCanvas.width / 2 + point.x * scale;
        const y = this.minimapCanvas.height / 2 + point.z * scale;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }
}
