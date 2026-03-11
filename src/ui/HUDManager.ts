import * as THREE from 'three';

export interface HUDData {
  speed: number;
  gear: string;
  cameraMode: string;
  fps: number;
  position: THREE.Vector3;
  debug: boolean;
  wheelDebug: string;
}

export class HUDManager {
  readonly root: HTMLDivElement;
  private readonly menuLayer: HTMLDivElement;
  private readonly debugLayer: HTMLDivElement;
  private readonly speedValue: HTMLDivElement;
  private readonly gearValue: HTMLDivElement;
  private readonly cameraValue: HTMLDivElement;
  private readonly posValue: HTMLDivElement;
  private readonly fpsValue: HTMLDivElement;
  private readonly debugPanel: HTMLDivElement;
  private readonly minimapCanvas: HTMLCanvasElement;
  private readonly mapCtx: CanvasRenderingContext2D | null;
  private readonly minimapSource: HTMLCanvasElement;
  private startHandlers: Array<(settings: { quality: string; cameraSensitivity: number; volume: number; }) => void> = [];

  constructor(container: HTMLElement, minimapSource: HTMLCanvasElement) {
    this.minimapSource = minimapSource;
    this.root = document.createElement('div');
    this.root.className = 'game-root';
    container.appendChild(this.root);

    this.menuLayer = document.createElement('div');
    this.menuLayer.className = 'menu-layer';
    this.menuLayer.innerHTML = `
      <div class="main-menu">
        <div class="menu-card panel">
          <div class="badge"><span class="dot"></span> Cidade aberta • Three.js • TypeScript</div>
          <h1 class="menu-title">Open City Driver</h1>
          <p class="menu-sub">Dirija livremente por uma cidade grande, com câmera suave, física semi-realista, tráfego básico e arquitetura pronta para expansão.</p>
          <div class="menu-grid">
            <div class="control-group">
              <label>Qualidade gráfica</label>
              <select id="quality-select">
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>
            <div class="control-group">
              <label>Sensibilidade da câmera</label>
              <input id="camera-range" type="range" min="0.2" max="1.2" step="0.05" value="0.45" />
            </div>
            <div class="control-group">
              <label>Volume</label>
              <input id="volume-range" type="range" min="0" max="1" step="0.01" value="0.7" />
            </div>
            <div class="control-group">
              <label>Debug</label>
              <div class="row"><button id="debug-toggle" class="secondary" type="button">Alternar F3</button></div>
            </div>
          </div>
          <div class="hint-grid">
            <div>W / ↑ acelera</div><div>S / ↓ freia / ré</div>
            <div>A / ← e D / → esterçam</div><div>Espaço freio de mão</div>
            <div>C alterna câmera</div><div>R reposiciona carro</div>
          </div>
          <div class="row">
            <button id="start-button" class="primary" type="button">Iniciar corrida livre</button>
            <button id="reset-button" class="secondary" type="button">Reiniciar posição</button>
          </div>
        </div>
      </div>`;
    this.root.appendChild(this.menuLayer);

    const hudLayer = document.createElement('div');
    hudLayer.className = 'overlay';
    hudLayer.innerHTML = `
      <div class="hud">
        <div class="top-strip">
          <div class="hud-card panel speed-card">
            <div class="stat-label">Velocidade</div>
            <div class="stat-value speed-value"><span id="speed-value">0</span><span class="speed-unit">km/h</span></div>
            <div class="stat-sub" id="gear-value">Marcha N</div>
          </div>
          <div class="hud-card panel">
            <div class="stat-label">Câmera</div>
            <div class="stat-value" id="camera-value">Follow</div>
            <div class="stat-sub">C para alternar</div>
          </div>
        </div>
        <div class="bottom-strip">
          <div class="hud-card panel">
            <div class="stat-label">Status</div>
            <div class="status-list">
              <div id="fps-value">FPS --</div>
              <div id="pos-value">Pos 0, 0</div>
              <div>R: reset • F3: debug</div>
            </div>
          </div>
          <div class="hud-card panel minimap"><canvas id="minimap-live"></canvas></div>
        </div>
      </div>`;
    this.root.appendChild(hudLayer);

    this.debugLayer = document.createElement('div');
    this.debugLayer.className = 'debug-layer hidden';
    this.debugLayer.innerHTML = `<div class="debug-panel panel" id="debug-panel"></div>`;
    this.root.appendChild(this.debugLayer);

    this.speedValue = this.root.querySelector('#speed-value') as HTMLDivElement;
    this.gearValue = this.root.querySelector('#gear-value') as HTMLDivElement;
    this.cameraValue = this.root.querySelector('#camera-value') as HTMLDivElement;
    this.posValue = this.root.querySelector('#pos-value') as HTMLDivElement;
    this.fpsValue = this.root.querySelector('#fps-value') as HTMLDivElement;
    this.debugPanel = this.root.querySelector('#debug-panel') as HTMLDivElement;
    this.minimapCanvas = this.root.querySelector('#minimap-live') as HTMLCanvasElement;
    this.minimapCanvas.width = 256;
    this.minimapCanvas.height = 256;
    this.mapCtx = this.minimapCanvas.getContext('2d');

    const startButton = this.root.querySelector('#start-button') as HTMLButtonElement;
    const qualitySelect = this.root.querySelector('#quality-select') as HTMLSelectElement;
    const cameraRange = this.root.querySelector('#camera-range') as HTMLInputElement;
    const volumeRange = this.root.querySelector('#volume-range') as HTMLInputElement;
    const debugButton = this.root.querySelector('#debug-toggle') as HTMLButtonElement;

    startButton.addEventListener('click', () => {
      this.hideMenu();
      this.startHandlers.forEach((handler) => handler({
        quality: qualitySelect.value,
        cameraSensitivity: Number(cameraRange.value),
        volume: Number(volumeRange.value),
      }));
    });
    debugButton.addEventListener('click', () => this.setDebugVisible(this.debugLayer.classList.contains('hidden')));
    (this.root.querySelector('#reset-button') as HTMLButtonElement).addEventListener('click', () => window.dispatchEvent(new CustomEvent('game-reset')));

    if (this.mapCtx) {
      this.mapCtx.drawImage(minimapSource, 0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
    }
  }

  onStart(handler: (settings: { quality: string; cameraSensitivity: number; volume: number; }) => void): void {
    this.startHandlers.push(handler);
  }

  hideMenu(): void {
    this.menuLayer.classList.add('hidden');
  }

  update(data: HUDData): void {
    this.speedValue.textContent = String(Math.round(data.speed));
    this.gearValue.textContent = `Marcha ${data.gear}`;
    this.cameraValue.textContent = data.cameraMode;
    this.posValue.textContent = `Pos ${data.position.x.toFixed(1)}, ${data.position.z.toFixed(1)}`;
    this.fpsValue.textContent = `FPS ${Math.round(data.fps)}`;
    this.setDebugVisible(data.debug);
    this.debugPanel.innerHTML = [
      `speed: ${data.speed.toFixed(2)} km/h`,
      `gear: ${data.gear}`,
      `camera: ${data.cameraMode}`,
      `position: ${data.position.x.toFixed(2)}, ${data.position.y.toFixed(2)}, ${data.position.z.toFixed(2)}`,
      `wheels: ${data.wheelDebug}`,
    ].join('<br />');
  }

  drawPlayerOnMinimap(position: THREE.Vector3, heading: number): void {
    if (!this.mapCtx) return;
    this.mapCtx.clearRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
    this.mapCtx.drawImage(this.minimapSource, 0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
    const x = this.minimapCanvas.width / 2 + position.x * 3.8;
    const y = this.minimapCanvas.height / 2 + position.z * 3.8;
    this.mapCtx.save();
    this.mapCtx.translate(x, y);
    this.mapCtx.rotate(-heading);
    this.mapCtx.fillStyle = '#47c8ff';
    this.mapCtx.beginPath();
    this.mapCtx.moveTo(0, -10);
    this.mapCtx.lineTo(6, 8);
    this.mapCtx.lineTo(-6, 8);
    this.mapCtx.closePath();
    this.mapCtx.fill();
    this.mapCtx.restore();
  }

  private setDebugVisible(visible: boolean): void {
    this.debugLayer.classList.toggle('hidden', !visible);
  }
}
