import * as THREE from 'three';

export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const invLerp = THREE.MathUtils.inverseLerp;
export const smoothstep = THREE.MathUtils.smoothstep;
export const damp = THREE.MathUtils.damp;
export const degToRad = THREE.MathUtils.degToRad;

export function signedAngleXZ(a: THREE.Vector3, b: THREE.Vector3): number {
  const a2 = new THREE.Vector2(a.x, a.z).normalize();
  const b2 = new THREE.Vector2(b.x, b.z).normalize();
  const cross = a2.x * b2.y - a2.y * b2.x;
  const dot = a2.dot(b2);
  return Math.atan2(cross, dot);
}

export function projectOnPlane(v: THREE.Vector3, normal: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
  return out.copy(v).sub(normal.clone().multiplyScalar(v.dot(normal)));
}

export function approach(current: number, target: number, delta: number): number {
  return current < target ? Math.min(current + delta, target) : Math.max(current - delta, target);
}

export function seededNoise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
