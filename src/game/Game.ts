import * as THREE from 'three';
import { AssetManager } from '../core/AssetManager';
import { AudioManager } from '../core/AudioManager';
import { CameraController } from '../core/CameraController';
import { EnvironmentManager } from '../core/EnvironmentManager';
import { RendererManager } from '../core/RendererManager';
import { SceneManager } from '../core/SceneManager';
import { PlayerCar } from '../entities/PlayerCar';
import { TrafficSystem } from '../entities/TrafficSystem';
import { CollisionManager } from '../physics/CollisionManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { HUDManager } from '../ui/HUDManager';
import { DEBUG_DEFAULT, MAX_SUBSTEPS, PHYSICS_TIMESTEP, type GraphicsQuality } from '../utils/Config';
import { InputManager } from '../utils/InputManager';
import { CityBuilder } from '../world/CityBuilder';

export class Game {
  private readonly sceneManager: SceneManager;
  private readonly rendererManager: RendererManager;
  private readonly assetManager: AssetManager;
  private readonly physics: PhysicsWorld;
  private readonly collisionManager: CollisionManager;
  private readonly input: InputManager;
  private readonly playerCar: PlayerCar;
  private readonly cameraController: CameraController;
  private readonly cityBuilder: CityBuilder;
  private readonly traffic: TrafficSystem;
  private readonly hud: HUDManager;
  private readonly audio: AudioManager;
  private readonly clock = new THREE.Clock();
  private readonly fpsSmoother: number[] = [];
  private debugEnabled = DEBUG_DEFAULT;
  private started = false;
  private animationId = 0;
  private quality: GraphicsQuality = 'high';

  constructor(private readonly host: HTMLElement) {
    this.sceneManager = new SceneManager();
    this.assetManager = new AssetManager();
    this.physics = new PhysicsWorld();
    this.collisionManager = new CollisionManager();
    this.input = new InputManager();
    this.cityBuilder = new CityBuilder(this.sceneManager.scene, this.physics);
    this.cityBuilder.build();
    new EnvironmentManager(this.sceneManager.scene);

    this.hud = new HUDManager(host, this.cityBuilder.minimapCanvas);
    this.rendererManager = new RendererManager(this.sceneManager.scene, this.sceneManager.camera, this.hud.root);
    this.playerCar = new PlayerCar(this.sceneManager.scene, this.physics, this.assetManager);
    this.collisionManager.register(this.playerCar.vehicle.body);
    this.cameraController = new CameraController(this.sceneManager.camera, this.playerCar);
    this.traffic = new TrafficSystem(this.sceneManager.scene, this.physics, this.cityBuilder.lanes);
    this.audio = new AudioManager();

    this.hud.onStart(async (settings) => {
      this.quality = settings.quality as GraphicsQuality;
      this.rendererManager.setQuality(this.quality);
      this.cameraController.setQuality(this.quality);
      this.cameraController.setSensitivity(settings.cameraSensitivity);
      this.audio.setVolume(settings.volume);
      await this.audio.unlock();
      this.started = true;
    });

    window.addEventListener('game-reset', () => this.playerCar.reset());
  }

  start(): void {
    this.clock.start();
    const tick = (): void => {
      this.animationId = requestAnimationFrame(tick);
      const dt = Math.min(this.clock.getDelta(), 0.033);
      this.update(dt);
      this.render();
    };
    tick();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.input.dispose();
    this.rendererManager.dispose();
  }

  private update(dt: number): void {
    const input = this.input.getState();
    if (input.debugPressed) this.debugEnabled = !this.debugEnabled;
    if (input.resetPressed) this.playerCar.reset();
    if (input.toggleCameraPressed) this.cameraController.cycleMode();

    if (this.started) {
      this.playerCar.step(dt, input);
      this.physics.step(dt, PHYSICS_TIMESTEP, MAX_SUBSTEPS);
      this.playerCar.sync();
      this.traffic.update(dt, this.playerCar.getPosition());
      this.cameraController.update(dt);
      this.audio.update(this.playerCar.getSpeedKmh(), input.throttle);
      this.audio.impact(this.collisionManager.consumeImpact());
    }

    this.trackFps(dt);
    this.hud.update({
      speed: this.playerCar.getSpeedKmh(),
      gear: this.playerCar.getGearState(),
      cameraMode: this.cameraController.getModeLabel(),
      fps: this.getAverageFps(),
      position: this.playerCar.getPosition(),
      debug: this.debugEnabled,
      wheelDebug: this.playerCar.getWheelDebug(),
    });
    this.hud.drawPlayerOnMinimap(this.playerCar.getPosition(), this.playerCar.getHeading());
  }

  private render(): void {
    this.rendererManager.render();
  }

  private trackFps(dt: number): void {
    this.fpsSmoother.push(1 / Math.max(dt, 1e-5));
    if (this.fpsSmoother.length > 30) this.fpsSmoother.shift();
  }

  private getAverageFps(): number {
    return this.fpsSmoother.reduce((sum, fps) => sum + fps, 0) / Math.max(this.fpsSmoother.length, 1);
  }
}
