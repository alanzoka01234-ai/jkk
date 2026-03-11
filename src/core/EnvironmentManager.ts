import * as THREE from 'three';

export class EnvironmentManager {
  readonly sun = new THREE.DirectionalLight('#fff8e7', 2.35);
  readonly ambient = new THREE.HemisphereLight('#d7ecff', '#7793a8', 1.1);
  readonly cityGlow = new THREE.PointLight('#80d4ff', 28, 160, 2);

  constructor(scene: THREE.Scene) {
    this.sun.position.set(100, 180, 65);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -180;
    this.sun.shadow.camera.right = 180;
    this.sun.shadow.camera.top = 180;
    this.sun.shadow.camera.bottom = -180;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 420;
    scene.add(this.ambient, this.sun);

    this.cityGlow.position.set(0, 22, 0);
    scene.add(this.cityGlow);
  }
}
