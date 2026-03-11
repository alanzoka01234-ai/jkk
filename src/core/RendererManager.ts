import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import type { GraphicsQuality } from '../utils/Config';

export class RendererManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  readonly canvas: HTMLCanvasElement;
  private ssaoPass: SSAOPass;
  private bloomPass: UnrealBloomPass;
  private renderPass: RenderPass;

  constructor(private readonly scene: THREE.Scene, private readonly camera: THREE.PerspectiveCamera, container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'game-canvas';
    container.appendChild(this.canvas);

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.25, 0.55, 0.9);
    this.ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
    this.ssaoPass.kernelRadius = 10;
    this.ssaoPass.minDistance = 0.003;
    this.ssaoPass.maxDistance = 0.11;
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.ssaoPass);
    this.composer.addPass(this.bloomPass);

    window.addEventListener('resize', this.onResize);
  }

  setQuality(quality: GraphicsQuality): void {
    if (quality === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.ssaoPass.enabled = false;
      this.bloomPass.strength = 0.12;
      this.renderer.setPixelRatio(1);
    } else if (quality === 'medium') {
      this.renderer.shadowMap.enabled = true;
      this.ssaoPass.enabled = false;
      this.bloomPass.strength = 0.18;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } else {
      this.renderer.shadowMap.enabled = true;
      this.ssaoPass.enabled = true;
      this.bloomPass.strength = 0.25;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    this.onResize();
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.composer.dispose();
    this.renderer.dispose();
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.ssaoPass.setSize(width, height);
  };
}
