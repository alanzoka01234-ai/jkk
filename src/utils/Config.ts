export type GraphicsQuality = 'low' | 'medium' | 'high';

export const GAME_TITLE = 'Open City Driver';

export const PHYSICS_TIMESTEP = 1 / 60;
export const MAX_SUBSTEPS = 5;

export const VEHICLE_CONFIG = {
  mass: 1320,
  wheelBase: 2.68,
  trackWidth: 1.58,
  wheelRadius: 0.36,
  suspensionRestLength: 0.42,
  suspensionTravel: 0.24,
  suspensionStiffness: 36000,
  suspensionDamping: 4200,
  tireGrip: 2.5,
  engineForce: 9300,
  brakeForce: 9400,
  handBrakeForce: 10800,
  dragCoefficient: 0.425,
  rollingResistance: 18,
  maxSteerAngle: 0.56,
  steerSpeed: 2.5,
  maxSpeed: 68,
  centerOfMassOffset: { x: 0, y: -0.58, z: 0.08 },
} as const;

export const CITY_CONFIG = {
  blockSize: 52,
  roadWidthMain: 14,
  roadWidthSide: 9,
  gridHalfExtent: 5,
  buildingInset: 5,
  trafficDensity: 18,
};

export const CAMERA_CONFIG = {
  followDistance: 8.2,
  followHeight: 3.7,
  targetHeight: 1.4,
  positionLerp: 5.2,
  targetLerp: 7.6,
  sideOffset: 0.85,
};

export const DEBUG_DEFAULT = false;
