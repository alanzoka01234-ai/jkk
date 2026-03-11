export class AudioManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineTone: BiquadFilterNode | null = null;
  private volume = 0.7;

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.gainNode) this.gainNode.gain.value = volume * 0.18;
  }

  async unlock(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume * 0.18;
      this.gainNode.connect(this.audioContext.destination);

      this.engineTone = this.audioContext.createBiquadFilter();
      this.engineTone.type = 'lowpass';
      this.engineTone.frequency.value = 900;
      this.engineTone.Q.value = 1.5;

      this.engineOsc = this.audioContext.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 48;
      this.engineOsc.connect(this.engineTone);
      this.engineTone.connect(this.gainNode);
      this.engineOsc.start();
    }
    if (this.audioContext.state !== 'running') {
      await this.audioContext.resume();
    }
  }

  update(speedKmh: number, throttle: number): void {
    if (!this.audioContext || !this.engineOsc || !this.engineTone) return;
    const freq = 38 + speedKmh * 0.9 + throttle * 22;
    this.engineOsc.frequency.linearRampToValueAtTime(freq, this.audioContext.currentTime + 0.08);
    this.engineTone.frequency.linearRampToValueAtTime(420 + speedKmh * 10 + throttle * 280, this.audioContext.currentTime + 0.08);
  }

  impact(intensity: number): void {
    if (!this.audioContext || !this.gainNode || intensity < 1.5) return;
    const duration = 0.1;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 110 + Math.min(intensity * 10, 120);
    gain.gain.value = Math.min(intensity / 18, 0.22) * this.volume;
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);
    osc.stop(this.audioContext.currentTime + duration);
  }
}
