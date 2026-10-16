import * as THREE from 'three';

interface SparkleParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotSpeed: number;
}

export class ParticleSystemManager {
  public group: THREE.Group;
  private sparkles: SparkleParticle[] = [];
  private sparkleGeometry: THREE.BufferGeometry;
  private sparkleMaterial: THREE.PointsMaterial;
  private sparklePoints: THREE.Points;
  private maxSparkles = 1200;

  // Background Cosmic Dust
  private starPoints: THREE.Points;

  constructor() {
    this.group = new THREE.Group();

    // 1. Create Background Starfield / Cosmic Dust
    const starCount = 1500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    const basePalette = [
      new THREE.Color('#38bdf8'),
      new THREE.Color('#c084fc'),
      new THREE.Color('#f472b6'),
      new THREE.Color('#e0f2fe'),
      new THREE.Color('#fbbf24')
    ];

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      // Spread in a large sphere / frustum volume
      starPositions[idx] = (Math.random() - 0.5) * 35;
      starPositions[idx + 1] = (Math.random() - 0.5) * 25;
      starPositions[idx + 2] = -5 - Math.random() * 25;

      const col = basePalette[Math.floor(Math.random() * basePalette.length)];
      starColors[idx] = col.r;
      starColors[idx + 1] = col.g;
      starColors[idx + 2] = col.b;

      starSizes[i] = Math.random() * 0.08 + 0.02;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    // Dynamic procedural circular texture
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 64;
    starCanvas.height = 64;
    const ctx = starCanvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.2, 'rgba(230, 240, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(120, 180, 255, 0.25)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const starTexture = new THREE.CanvasTexture(starCanvas);

    const starMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      map: starTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starPoints = new THREE.Points(starGeo, starMat);
    this.group.add(this.starPoints);

    // 2. Active Sparkles Buffer
    this.sparkleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxSparkles * 3);
    const colors = new Float32Array(this.maxSparkles * 3);

    this.sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.sparkleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.sparkleMaterial = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      map: starTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparklePoints = new THREE.Points(this.sparkleGeometry, this.sparkleMaterial);
    this.group.add(this.sparklePoints);
  }

  /**
   * Spawns a burst of celebratory sparkle particles when diamond is created
   */
  public emitSpawnBurst(position: THREE.Vector3, colorHex: string, count: number = 45) {
    const mainColor = new THREE.Color(colorHex);
    const whiteColor = new THREE.Color('#ffffff');

    for (let i = 0; i < count; i++) {
      if (this.sparkles.length >= this.maxSparkles) {
        this.sparkles.shift();
      }

      // Spherical random velocity
      const phi = Math.random() * Math.PI * 2;
      const costheta = Math.random() * 2 - 1;
      const u = Math.random();
      const theta = Math.acos(costheta);
      const r = Math.cbrt(u) * (0.8 + Math.random() * 1.6);

      const vx = r * Math.sin(theta) * Math.cos(phi);
      const vy = r * Math.sin(theta) * Math.sin(phi);
      const vz = r * Math.cos(theta);

      const pCol = Math.random() > 0.4 ? mainColor.clone() : whiteColor.clone();
      // add slight rainbow variance
      pCol.offsetHSL((Math.random() - 0.5) * 0.1, 0, 0);

      this.sparkles.push({
        position: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        )),
        velocity: new THREE.Vector3(vx * 1.8, vy * 1.8, vz * 1.8),
        color: pCol,
        size: Math.random() * 0.25 + 0.1,
        alpha: 1.0,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.6,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 4
      });
    }
  }

  /**
   * Spawns floating dissolution particles when diamonds are cleared
   */
  public emitDissolveBurst(position: THREE.Vector3, colorHex: string) {
    const col = new THREE.Color(colorHex);
    for (let i = 0; i < 30; i++) {
      if (this.sparkles.length >= this.maxSparkles) {
        this.sparkles.shift();
      }

      this.sparkles.push({
        position: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4
        )),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          Math.random() * 1.5 + 0.5, // float upward
          (Math.random() - 0.5) * 0.8
        ),
        color: col.clone(),
        size: Math.random() * 0.18 + 0.08,
        alpha: 0.9,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.5,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 2
      });
    }
  }

  /**
   * Spawns fingertip hover trail particle
   */
  public emitFingertipGlow(position: THREE.Vector3) {
    if (Math.random() > 0.65) return;
    if (this.sparkles.length >= this.maxSparkles) {
      this.sparkles.shift();
    }

    const col = new THREE.Color().setHSL(0.55 + Math.sin(Date.now() * 0.003) * 0.1, 0.9, 0.7);

    this.sparkles.push({
      position: position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        Math.random() * 0.3,
        (Math.random() - 0.5) * 0.2
      ),
      color: col,
      size: 0.12,
      alpha: 0.8,
      life: 0,
      maxLife: 0.4 + Math.random() * 0.3,
      rotation: 0,
      rotSpeed: 0
    });
  }

  /**
   * Updates particle positions and buffers
   */
  public update(delta: number) {
    // 1. Slow drift of background starfield
    this.starPoints.rotation.y += delta * 0.015;
    this.starPoints.rotation.x += delta * 0.005;

    // 2. Update active sparkles
    const posAttr = this.sparkleGeometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.sparkleGeometry.attributes.color as THREE.BufferAttribute;

    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const p = this.sparkles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.sparkles.splice(i, 1);
        continue;
      }

      // Drag and velocity
      p.position.addScaledVector(p.velocity, delta);
      p.velocity.multiplyScalar(0.94); // drag
      p.velocity.y += delta * 0.15; // slight buoyant rise

      const progress = p.life / p.maxLife;
      const fade = Math.sin((1 - progress) * Math.PI * 0.5);

      const idx = i * 3;
      positions[idx] = p.position.x;
      positions[idx + 1] = p.position.y;
      positions[idx + 2] = p.position.z;

      colors[idx] = p.color.r * fade;
      colors[idx + 1] = p.color.g * fade;
      colors[idx + 2] = p.color.b * fade;
    }

    // Zero out unused slots
    for (let i = this.sparkles.length; i < this.maxSparkles; i++) {
      const idx = i * 3;
      positions[idx] = 0;
      positions[idx + 1] = 0;
      positions[idx + 2] = -9999;
      colors[idx] = 0;
      colors[idx + 1] = 0;
      colors[idx + 2] = 0;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public dispose() {
    this.sparkleGeometry.dispose();
    this.sparkleMaterial.dispose();
    this.starPoints.geometry.dispose();
    (this.starPoints.material as THREE.Material).dispose();
  }
}
