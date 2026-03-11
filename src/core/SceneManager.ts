import * as THREE from 'three';

export class SceneManager {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(67, window.innerWidth / window.innerHeight, 0.1, 1500);

  constructor() {
    this.scene.background = new THREE.Color('#8bb9ff');
    this.scene.fog = new THREE.Fog('#97b7dc', 140, 520);
    this.camera.position.set(0, 5, -10);
  }
}
