import * as CANNON from 'cannon-es';

export class CollisionManager {
  private impactAccumulator = 0;

  register(body: CANNON.Body): void {
    body.addEventListener('collide', (event: { contact: { getImpactVelocityAlongNormal(): number } }) => {
      const rv = event.contact.getImpactVelocityAlongNormal();
      this.impactAccumulator = Math.max(this.impactAccumulator, Math.abs(rv));
    });
  }

  consumeImpact(): number {
    const impact = this.impactAccumulator;
    this.impactAccumulator = 0;
    return impact;
  }
}
