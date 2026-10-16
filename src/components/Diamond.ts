import * as THREE from 'three';
import { createDiamondGeometry, DiamondColorTheme } from '../utils/diamondGeometry';

export interface DiamondInstanceData {
  id: string;
  theme: DiamondColorTheme;
  position: THREE.Vector3;
  createdAt: number;
}

export class DiamondMeshNode {
  public group: THREE.Group;
  public id: string;
  public theme: DiamondColorTheme;
  public basePosition: THREE.Vector3;
  public isDisposed = false;

  private mesh: THREE.Mesh;
  private wireframeMesh: THREE.LineSegments;
  private glowSprite: THREE.Sprite;
  private light: THREE.PointLight;
  private spawnTime: number;
  private floatOffset: number;
  private rotationSpeedY: number;
  private rotationSpeedX: number;
  private baseScale = 0.55;

  constructor(id: string, theme: DiamondColorTheme, position: THREE.Vector3) {
    this.id = id;
    this.theme = theme;
    this.basePosition = position.clone();
    this.spawnTime = performance.now();
    this.floatOffset = Math.random() * Math.PI * 2;
    this.rotationSpeedY = (0.6 + Math.random() * 0.8) * (Math.random() > 0.5 ? 1 : -1);
    this.rotationSpeedX = (0.2 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1);

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.scale.setScalar(0.001); // start at 0 for spawn animation

    // 1. Faceted Diamond Geometry
    const geometry = createDiamondGeometry(this.baseScale);

    // 2. Crystal Physical Material
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(theme.color),
      emissive: new THREE.Color(theme.glowColor),
      emissiveIntensity: 0.18,
      roughness: theme.roughness,
      metalness: 0.05,
      transmission: theme.transmission,
      ior: 2.417, // True diamond refractive index
      thickness: 1.4,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(theme.specularColor),
      attenuationColor: new THREE.Color(theme.attenuationColor),
      attenuationDistance: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // 3. Subtle facet edge brilliance wireframe
    const wireGeo = new THREE.WireframeGeometry(geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#ffffff'),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    this.wireframeMesh = new THREE.LineSegments(wireGeo, wireMat);
    this.group.add(this.wireframeMesh);

    // 4. Subtle glowing halo sprite
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 128;
    spriteCanvas.height = 128;
    const sCtx = spriteCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.2, theme.color);
      grad.addColorStop(0.5, theme.glowColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const spriteTex = new THREE.CanvasTexture(spriteCanvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: spriteTex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });
    this.glowSprite = new THREE.Sprite(spriteMat);
    this.glowSprite.scale.set(1.4, 1.4, 1.4);
    this.group.add(this.glowSprite);

    // 5. Dynamic local point light for ambient facet illumination
    this.light = new THREE.PointLight(theme.glowColor, 2.5, 3.5);
    this.group.add(this.light);
  }

  /**
   * Update animation frame
   */
  public update(timeMs: number, deltaSec: number) {
    if (this.isDisposed) return;

    const ageSec = (timeMs - this.spawnTime) / 1000;

    // Spawn Elastic Scale Animation (0 -> 1 with bounce overshoot)
    if (ageSec < 1.2) {
      // Elastic out formula
      const p = Math.min(ageSec / 0.8, 1.0);
      const elastic = 1 - Math.pow(1 - p, 3) * Math.cos(p * Math.PI * 3.5);
      const currentScale = Math.max(0.001, elastic);
      this.group.scale.setScalar(currentScale);

      // Light flash at birth
      const flash = Math.max(0, 1.0 - ageSec * 1.5);
      this.light.intensity = 2.5 + flash * 8.0;
      this.glowSprite.scale.setScalar(1.4 + flash * 2.2);
    } else {
      this.group.scale.setScalar(1.0);
      // Gentle pulsing aura
      const pulse = Math.sin(timeSec(timeMs) * 3 + this.floatOffset) * 0.15;
      this.light.intensity = 2.0 + pulse;
      this.glowSprite.scale.setScalar(1.3 + pulse * 0.3);
    }

    // Gentle floating bobbing
    const floatY = Math.sin(timeSec(timeMs) * 1.8 + this.floatOffset) * 0.08;
    this.group.position.y = this.basePosition.y + floatY;

    // Slow rotation
    this.mesh.rotation.y += this.rotationSpeedY * deltaSec;
    this.mesh.rotation.x += this.rotationSpeedX * deltaSec;
    this.wireframeMesh.rotation.copy(this.mesh.rotation);

    // Rainbow prism dynamic color cycle
    if (this.theme.isRainbow) {
      const hue = ((timeMs * 0.0003) + this.floatOffset * 0.2) % 1;
      const rainbowCol = new THREE.Color().setHSL(hue, 0.95, 0.65);
      (this.mesh.material as THREE.MeshPhysicalMaterial).color = rainbowCol;
      (this.mesh.material as THREE.MeshPhysicalMaterial).emissive = rainbowCol;
      this.light.color = rainbowCol;
    }
  }

  public dispose() {
    this.isDisposed = true;
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach(m => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
    this.wireframeMesh.geometry.dispose();
    (this.wireframeMesh.material as THREE.Material).dispose();
    this.glowSprite.material.dispose();
    this.group.clear();
  }
}

function timeSec(ms: number) {
  return ms * 0.001;
}
