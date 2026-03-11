import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetManager {
  private readonly gltfLoader = new GLTFLoader();
  private readonly cache = new Map<string, THREE.Object3D>();

  async loadModel(path: string): Promise<THREE.Object3D | null> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!.clone(true);
    }
    try {
      const gltf = await this.gltfLoader.loadAsync(path);
      this.cache.set(path, gltf.scene);
      return gltf.scene.clone(true);
    } catch {
      return null;
    }
  }
}
