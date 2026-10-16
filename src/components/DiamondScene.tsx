import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { LandmarkPoint } from '../hooks/useHandTracking';
import { FaceGem, EmojiOption, MakeupPreset } from '../utils/faceGems';
import { soundEffects } from '../effects/soundEffects';
import { Camera, Sparkles } from 'lucide-react';

export interface DiamondSceneHandle {
  spawnGemAt: (screenX: number, screenY: number, emojiOption: EmojiOption) => void;
  clearAllGems: () => void;
  applyPreset: (preset: MakeupPreset) => void;
  captureSelfie: () => void;
  getGemCount: () => number;
}

interface DiamondSceneProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCameraActive: boolean;
  onStartCamera: () => void;
  faceLandmarks: LandmarkPoint[] | null;
  handLandmarks: LandmarkPoint[] | null;
  indexTip: LandmarkPoint | null;
  thumbTip: LandmarkPoint | null;
  isPinching: boolean;
  pinchDistance: number;
  clearProgress: number;
  selectedEmoji: EmojiOption;
  onGemCountChange?: (count: number) => void;
  beautyFilter: string; // e.g. 'natural', 'bright', 'warm', 'peach'
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export const DiamondScene = forwardRef<DiamondSceneHandle, DiamondSceneProps>(({
  videoRef,
  isCameraActive,
  onStartCamera,
  faceLandmarks,
  indexTip,
  thumbTip,
  isPinching,
  pinchDistance,
  selectedEmoji,
  onGemCountChange,
  beautyFilter,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gemsRef = useRef<FaceGem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const [snapshotFlash, setSnapshotFlash] = useState<boolean>(false);

  // Helper to emit burst particles when gem is placed
  const emitSparkleBurst = useCallback((px: number, py: number, colorHex: string, count: number = 30) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        color: Math.random() > 0.3 ? colorHex : '#ffffff',
        size: Math.random() * 4 + 2,
        alpha: 1.0,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.5,
      });
    }
  }, []);

  // Helper to emit expanding shockwave ring
  const emitShockwave = useCallback((x: number, y: number, colorHex: string) => {
    shockwavesRef.current.push({
      x,
      y,
      radius: 4,
      maxRadius: 60,
      color: colorHex,
      alpha: 0.85,
      life: 0,
      maxLife: 0.5,
    });
  }, []);

  // Helper to find nearest face landmark index to a screen coordinate
  const findNearestFaceLandmark = useCallback((screenX: number, screenY: number, landmarks: LandmarkPoint[]) => {
    let minDist = Infinity;
    let bestIdx = 0;

    landmarks.forEach((pt, idx) => {
      // In mirrored video, screenX = 1 - pt.x
      const lx = 1 - pt.x;
      const ly = pt.y;
      const dist = Math.hypot(screenX - lx, screenY - ly);
      if (dist < minDist) {
        minDist = dist;
        bestIdx = idx;
      }
    });

    return {
      index: bestIdx,
      distance: minDist,
      offset: {
        x: screenX - (1 - landmarks[bestIdx].x),
        y: screenY - landmarks[bestIdx].y,
      },
    };
  }, []);

  useImperativeHandle(ref, () => ({
    getGemCount: () => gemsRef.current.length,

    spawnGemAt: (screenX: number, screenY: number, emojiOption: EmojiOption) => {
      const canvas = canvasRef.current;
      const width = canvas ? canvas.width : window.innerWidth;
      const height = canvas ? canvas.height : window.innerHeight;

      let landmarkIndex: number | null = null;
      let offset = { x: 0, y: 0 };

      // Attach to closest facial landmark if face is present
      if (faceLandmarks && faceLandmarks.length > 0) {
        const match = findNearestFaceLandmark(screenX, screenY, faceLandmarks);
        // If reasonably close to face (within 28% of viewport width)
        if (match.distance < 0.28) {
          landmarkIndex = match.index;
          offset = match.offset;
        }
      }

      // Initial physical spring bounce impulse on creation
      const initBounceOffset = -30 - Math.random() * 10; // Pop up 30-40px on birth
      const initBounceVelocity = -160 - Math.random() * 60; // Upward bounce velocity

      const newGem: FaceGem = {
        id: `gem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        emoji: emojiOption.emoji,
        color: emojiOption.color,
        glowColor: emojiOption.glowColor,
        x: screenX,
        y: screenY,
        faceLandmarkIndex: landmarkIndex,
        offset,
        scale: 0.0, // starts at 0 for spring pop
        rotation: (Math.random() - 0.5) * 0.3,
        createdAt: performance.now(),
        size: 34,

        // Physical dynamics initialization:
        currentX: screenX * width,
        currentY: screenY * height,
        vx: (Math.random() - 0.5) * 30,
        vy: initBounceVelocity,
        bounceOffset: initBounceOffset,
        bounceVelocity: initBounceVelocity,
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: 1.5 + Math.random() * 0.8,
        floatAmpX: 3.5 + Math.random() * 3.5,
        floatAmpY: 7.5 + Math.random() * 4.5,
        wobble: (Math.random() - 0.5) * 0.4,
        wobbleVelocity: (Math.random() - 0.5) * 10,
      };

      gemsRef.current.push(newGem);
      emitSparkleBurst(screenX * width, screenY * height, emojiOption.glowColor, 35);
      emitShockwave(screenX * width, screenY * height, emojiOption.glowColor);
      soundEffects.playCrystalSpawn();

      if (onGemCountChange) {
        onGemCountChange(gemsRef.current.length);
      }
    },

    clearAllGems: () => {
      const canvas = canvasRef.current;
      const width = canvas ? canvas.width : window.innerWidth;
      const height = canvas ? canvas.height : window.innerHeight;

      gemsRef.current.forEach(gem => {
        const gx = (gem.currentX !== undefined ? gem.currentX : gem.x * width);
        const gy = (gem.currentY !== undefined ? gem.currentY : gem.y * height);
        emitSparkleBurst(gx, gy, gem.glowColor, 20);
        emitShockwave(gx, gy, gem.glowColor);
      });

      gemsRef.current = [];
      shockwavesRef.current = [];
      soundEffects.playCrystalClear();

      if (onGemCountChange) {
        onGemCountChange(0);
      }
    },

    applyPreset: (preset: MakeupPreset) => {
      const canvas = canvasRef.current;
      const width = canvas ? canvas.width : window.innerWidth;
      const height = canvas ? canvas.height : window.innerHeight;

      gemsRef.current = [];
      shockwavesRef.current = [];

      preset.gems.forEach((item, idx) => {
        let posX = 0.5;
        let posY = 0.5;

        if (faceLandmarks && faceLandmarks[item.landmarkIndex]) {
          const pt = faceLandmarks[item.landmarkIndex];
          posX = 1 - pt.x + (item.offset?.x ?? 0);
          posY = pt.y + (item.offset?.y ?? 0);
        } else {
          // Default face template layout
          posX = 0.4 + (idx % 3) * 0.1;
          posY = 0.35 + Math.floor(idx / 3) * 0.1;
        }

        const staggerDelay = idx * 60;
        const newGem: FaceGem = {
          id: `preset_gem_${idx}_${Date.now()}`,
          emoji: item.emoji,
          color: item.color,
          glowColor: item.glowColor,
          x: posX,
          y: posY,
          faceLandmarkIndex: item.landmarkIndex,
          offset: item.offset || { x: 0, y: 0 },
          scale: 0.0,
          rotation: (Math.random() - 0.5) * 0.25,
          createdAt: performance.now() + staggerDelay,
          size: item.size,

          // Physics setup with staggered bounce
          currentX: posX * width,
          currentY: posY * height,
          vx: 0,
          vy: -130,
          bounceOffset: -26 - Math.random() * 8,
          bounceVelocity: -150 - Math.random() * 40,
          floatPhase: (idx * 0.9) + Math.random(),
          floatSpeed: 1.4 + Math.random() * 0.7,
          floatAmpX: 3.0 + Math.random() * 3,
          floatAmpY: 6.5 + Math.random() * 4,
          wobble: (Math.random() - 0.5) * 0.3,
          wobbleVelocity: (Math.random() - 0.5) * 8,
        };

        gemsRef.current.push(newGem);
        emitSparkleBurst(posX * width, posY * height, item.glowColor, 25);
        emitShockwave(posX * width, posY * height, item.glowColor);
      });

      soundEffects.playCrystalSpawn();

      if (onGemCountChange) {
        onGemCountChange(gemsRef.current.length);
      }
    },

    captureSelfie: () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Trigger camera flash visual
      setSnapshotFlash(true);
      setTimeout(() => setSnapshotFlash(false), 220);

      // Create high-res offscreen canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      // 1. Draw webcam image or background gradient
      if (video && video.readyState >= 2) {
        ctx.save();
        ctx.translate(offscreen.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
        ctx.restore();
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, offscreen.height);
        bgGrad.addColorStop(0, '#111827');
        bgGrad.addColorStop(1, '#030712');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
      }

      // 2. Apply beauty filter color grade
      if (beautyFilter === 'peach') {
        ctx.fillStyle = 'rgba(255, 180, 200, 0.12)';
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
      } else if (beautyFilter === 'warm') {
        ctx.fillStyle = 'rgba(255, 220, 160, 0.10)';
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
      } else if (beautyFilter === 'bright') {
        ctx.fillStyle = 'rgba(200, 240, 255, 0.08)';
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
      }

      // 3. Draw gems & overlays
      ctx.drawImage(canvas, 0, 0);

      // 4. Add elegant beauty camera watermark
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '600 16px "Cinzel", Georgia, serif';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText('PRISMGEM ✨ BEAUTY CAM', 28, offscreen.height - 30);
      ctx.font = '400 12px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillText(new Date().toLocaleDateString(), 28, offscreen.height - 14);
      ctx.restore();

      // 5. Download image
      const dataUrl = offscreen.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `prismgem_selfie_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    },
  }));

  // Main Render Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;
      const now = performance.now();
      const dt = Math.min(Math.max((now - lastTimeRef.current) / 1000, 0.001), 0.05);
      lastTimeRef.current = now;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw and Update Physical Shockwaves from Gem Spawning
      const shockwaves = shockwavesRef.current;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.life += dt;
        if (sw.life >= sw.maxLife) {
          shockwaves.splice(i, 1);
          continue;
        }

        const progress = sw.life / sw.maxLife;
        // Fast outward expansion with physical drag
        const curRadius = sw.radius + (sw.maxRadius - sw.radius) * Math.sin(progress * Math.PI * 0.5);
        const curAlpha = Math.max(0, (1 - progress) * sw.alpha);

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, curRadius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2.5 * (1 - progress * 0.6);
        ctx.globalAlpha = curAlpha;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      }

      // Fingertip coordinates for spatial proximity interaction
      let ix = 0, iy = 0, tx = 0, ty = 0;
      let hasFingertips = false;
      if (indexTip && thumbTip) {
        ix = (1 - indexTip.x) * width;
        iy = indexTip.y * height;
        tx = (1 - thumbTip.x) * width;
        ty = thumbTip.y * height;
        hasFingertips = true;
      }

      // 2. Draw Active Face Gems with Physical Dynamics
      const gems = gemsRef.current;

      gems.forEach(gem => {
        const ageSec = (now - gem.createdAt) / 1000;
        if (ageSec < 0) return; // Pending staggered preset animation

        // A. Target Anchor Coordinates
        let targetX = gem.x * width;
        let targetY = gem.y * height;

        if (faceLandmarks && gem.faceLandmarkIndex !== null && faceLandmarks[gem.faceLandmarkIndex]) {
          const landmark = faceLandmarks[gem.faceLandmarkIndex];
          // Mirrored horizontal coordinate: 1 - x
          gem.x = 1 - landmark.x + gem.offset.x;
          gem.y = landmark.y + gem.offset.y;
          targetX = gem.x * width;
          targetY = gem.y * height;
        }

        // Initialize state if not defined
        if (gem.currentX === undefined) gem.currentX = targetX;
        if (gem.currentY === undefined) gem.currentY = targetY;
        if (gem.bounceOffset === undefined) gem.bounceOffset = 0;
        if (gem.bounceVelocity === undefined) gem.bounceVelocity = 0;
        if (gem.wobble === undefined) gem.wobble = 0;
        if (gem.wobbleVelocity === undefined) gem.wobbleVelocity = 0;
        if (gem.floatPhase === undefined) gem.floatPhase = Math.random() * Math.PI * 2;
        if (gem.floatSpeed === undefined) gem.floatSpeed = 1.5;
        if (gem.floatAmpX === undefined) gem.floatAmpX = 3.5;
        if (gem.floatAmpY === undefined) gem.floatAmpY = 7.5;

        // B. Inertial Tracking of Face Anchor (smooth physical follow-through)
        const followRate = 14;
        gem.currentX += (targetX - gem.currentX) * Math.min(1, followRate * dt);
        gem.currentY += (targetY - gem.currentY) * Math.min(1, followRate * dt);

        // C. Harmonic Damped Spring Bounce Dynamics (轻微弹跳效果)
        // Spring equation: F = -k * x - c * v
        const springK = 135; // stiffness
        const springDamping = 9.2; // damping coefficient
        const springAcc = -springK * gem.bounceOffset - springDamping * gem.bounceVelocity;
        gem.bounceVelocity += springAcc * dt;
        gem.bounceOffset += gem.bounceVelocity * dt;

        // D. Interactive Proximity Force from Fingertips (空间悬停力场)
        if (hasFingertips) {
          const distI = Math.hypot(gem.currentX - ix, gem.currentY - iy);
          const distT = Math.hypot(gem.currentX - tx, gem.currentY - ty);
          const minDist = Math.min(distI, distT);
          const repelRadius = 70;

          if (minDist < repelRadius && minDist > 2) {
            const repelStrength = 1 - minDist / repelRadius;
            // Float upward slightly away from fingers
            gem.bounceVelocity -= repelStrength * 180 * dt;
            gem.wobbleVelocity += (Math.random() - 0.5) * repelStrength * 30 * dt;
          }
        }

        // E. Organic Multi-Frequency Floating Dynamics in 3D Space (轻微漂浮感)
        const floatTime = (now * 0.001) * gem.floatSpeed + gem.floatPhase;
        // Dual harmonic waves for rich, non-mechanical floating motion
        const floatBobY = Math.sin(floatTime) * gem.floatAmpY + Math.sin(floatTime * 2.2 + 1.2) * (gem.floatAmpY * 0.35);
        const floatDriftX = Math.cos(floatTime * 0.75 + gem.floatPhase) * gem.floatAmpX;
        const floatDepthZ = Math.sin(floatTime * 1.4); // Spatial Z-axis depth float (-1 to 1)

        // F. Rotational Wobble Dynamics
        const wobbleK = 35;
        const wobbleDamping = 6;
        const wobbleAcc = -wobbleK * gem.wobble - wobbleDamping * gem.wobbleVelocity;
        gem.wobbleVelocity += wobbleAcc * dt;
        gem.wobble += gem.wobbleVelocity * dt;

        // G. Calculated Render Position
        const renderX = gem.currentX + floatDriftX;
        const renderY = gem.currentY + gem.bounceOffset + floatBobY;

        // H. Dynamic Scale Animation (Elastic birth curve + spatial breathing + depth)
        let baseScale = 1.0;
        if (ageSec < 0.6) {
          const p = Math.min(ageSec / 0.5, 1.0);
          const elastic = 1 - Math.pow(1 - p, 3) * Math.cos(p * Math.PI * 3.5);
          baseScale = Math.max(0.01, elastic);
        } else {
          baseScale = 1.0 + Math.sin(now * 0.004 + floatTime) * 0.08;
        }

        const depthScale = 1.0 + floatDepthZ * 0.07;
        const finalScale = baseScale * depthScale;
        gem.scale = finalScale;

        // I. Physical Squash & Stretch based on vertical bounce velocity
        const velRatio = Math.max(-0.24, Math.min(0.28, -gem.bounceVelocity * 0.0012));
        const stretchY = 1.0 + velRatio;
        const squashX = 1.0 / Math.sqrt(Math.max(0.55, stretchY));

        // J. Dynamic Rotation with tilt and wobble
        const floatTilt = (floatDriftX / gem.floatAmpX) * 0.12;
        const currentRot = gem.rotation + floatTilt + gem.wobble;

        // K. 1. Spatial Ground / Skin Contact Depth Shadow
        // Visual cue that gives the illusion of physical levitation above the face surface
        const elevation = -(gem.bounceOffset + floatBobY);
        const shadowAlpha = Math.max(0.08, Math.min(0.4, 0.35 - elevation * 0.006));
        const shadowScale = Math.max(0.7, 1.0 + elevation * 0.015);
        const shadowRadius = gem.size * 0.45 * shadowScale;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(gem.currentX, gem.currentY + 12, shadowRadius, shadowRadius * 0.38, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha.toFixed(2)})`;
        ctx.filter = `blur(${Math.max(2, 3 + elevation * 0.08).toFixed(1)}px)`;
        ctx.fill();
        ctx.restore();

        // L. 2. Soft Glowing Aura behind Gem
        ctx.save();
        const glowRadius = gem.size * finalScale * (1.25 + floatDepthZ * 0.15);
        const glowGrad = ctx.createRadialGradient(renderX, renderY, 0, renderX, renderY, glowRadius);
        glowGrad.addColorStop(0, `${gem.glowColor}bb`);
        glowGrad.addColorStop(0.35, `${gem.glowColor}44`);
        glowGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(renderX, renderY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // M. 3. Render Emoji Gem with Physical Deformation (Squash, Stretch, Tilt)
        ctx.save();
        ctx.translate(renderX, renderY);
        ctx.rotate(currentRot);
        ctx.scale(finalScale * squashX, finalScale * stretchY);

        ctx.font = `${gem.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = gem.glowColor;
        ctx.shadowBlur = 12 + floatDepthZ * 4;
        ctx.fillText(gem.emoji, 0, 0);

        ctx.restore();

        // N. 4. Ambient Physical Sparkle Particle Emission
        if (Math.random() < 0.035) {
          particlesRef.current.push({
            x: renderX + (Math.random() - 0.5) * 16,
            y: renderY + (Math.random() - 0.5) * 16,
            vx: (Math.random() - 0.5) * 1.2 + floatDriftX * 0.2,
            vy: -Math.random() * 1.8 - 0.5, // buoyant float upward
            color: gem.glowColor,
            size: Math.random() * 2.5 + 1.2,
            alpha: 0.95,
            life: 0,
            maxLife: 0.55 + Math.random() * 0.4,
          });
        }
      });

      // 2. Draw Active Glitter / Sparkle Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 0.016;

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04; // gravity
        p.vx *= 0.97;

        const fade = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.globalAlpha = Math.max(0, fade * p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;

        // Draw diamond star cross shape
        const r = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r * 1.5);
        ctx.lineTo(p.x + r * 0.4, p.y - r * 0.4);
        ctx.lineTo(p.x + r * 1.5, p.y);
        ctx.lineTo(p.x + r * 0.4, p.y + r * 0.4);
        ctx.lineTo(p.x, p.y + r * 1.5);
        ctx.lineTo(p.x - r * 0.4, p.y + r * 0.4);
        ctx.lineTo(p.x - r * 1.5, p.y);
        ctx.lineTo(p.x - r * 0.4, p.y - r * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // 3. Draw Hand Fingertip Reticles & Pinch Laser Guidance
      if (indexTip && thumbTip) {
        // Mirrored coordinates on canvas
        const ix = (1 - indexTip.x) * width;
        const iy = indexTip.y * height;
        const tx = (1 - thumbTip.x) * width;
        const ty = thumbTip.y * height;

        const midX = (ix + tx) * 0.5;
        const midY = (iy + ty) * 0.5;

        // Connecting laser line between fingertips
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(tx, ty);

        if (isPinching) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#67e8f9';
          ctx.shadowBlur = 14;
        } else {
          const closeness = Math.min(Math.max((0.12 - pinchDistance) / 0.08, 0), 1);
          ctx.strokeStyle = `rgba(254, 240, 138, ${0.4 + closeness * 0.6})`;
          ctx.lineWidth = 2 + closeness * 1.5;
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = 8;
        }
        ctx.stroke();
        ctx.restore();

        // Fingertip Glowing Reticles
        const drawReticle = (x: number, y: number, color: string) => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, isPinching ? 10 : 8, 0, Math.PI * 2);
          ctx.fillStyle = isPinching ? '#ffffff' : color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, isPinching ? 18 : 14, 0, Math.PI * 2);
          ctx.strokeStyle = isPinching ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        };

        drawReticle(ix, iy, '#38bdf8');
        drawReticle(tx, ty, '#facc15');

        // Pinch Sparkle Center Glow
        if (isPinching) {
          ctx.save();
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 16;
          ctx.fillText('✨', midX, midY);
          ctx.restore();
        }
      }
    };

    animId = requestAnimationFrame(render);

    const handleResize = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [faceLandmarks, indexTip, thumbTip, isPinching, pinchDistance]);

  // Handle direct click/touch on face to place gem
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) / rect.width;
    const screenY = (e.clientY - rect.top) / rect.height;

    const handle = (ref as React.RefObject<DiamondSceneHandle | null>)?.current;
    if (handle) {
      handle.spawnGemAt(screenX, screenY, selectedEmoji);
    }
  };

  // Beauty filter CSS tone classes
  const filterStyles: Record<string, string> = {
    natural: 'brightness-105 contrast-[1.02] saturate-105',
    bright: 'brightness-110 contrast-100 saturate-100 hue-rotate-[-3deg]',
    warm: 'brightness-105 contrast-[1.03] saturate-110 sepia-[0.12]',
    peach: 'brightness-108 contrast-[1.02] saturate-115 hue-rotate-[-10deg]',
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="absolute inset-0 w-full h-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-black select-none"
    >
      {/* 1. Fullscreen Mirrored Beauty Webcam Video */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`w-full h-full object-cover transform -scale-x-100 transition-all duration-500 ${
          isCameraActive ? 'opacity-100' : 'opacity-0'
        } ${filterStyles[beautyFilter] || filterStyles.natural}`}
      />

      {/* 2. Aesthetic Mirror Backdrop when camera is off */}
      {!isCameraActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
          {/* Subtle Face Contour Silhouette */}
          <div className="relative w-64 h-80 border-2 border-pink-400/20 rounded-[50%/60%_60%_40%_40%] flex flex-col items-center justify-center backdrop-blur-[2px] bg-pink-500/[0.03] shadow-[0_0_50px_rgba(236,72,153,0.1)] mb-4">
            <div className="w-16 h-1 border-t border-dashed border-pink-300/30 mb-8" />
            <div className="flex justify-between w-36 mb-12 text-pink-300/30 text-xs">
              <span>+</span>
              <span>+</span>
            </div>
            <div className="text-pink-300/40 text-xs font-serif tracking-widest uppercase">
              Face Mesh Ready
            </div>
          </div>

          <div className="pointer-events-auto">
            <button
              onClick={onStartCamera}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-rose-400 text-white font-semibold text-xs rounded-2xl shadow-xl shadow-pink-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Camera size={15} />
              <span>开启摄像头体验面部美妆</span>
            </button>
            <p className="text-[11px] text-slate-400 mt-2">
              或直接在虚线轮廓或屏幕上点击，贴上流光彩钻 ✨
            </p>
          </div>
        </div>
      )}

      {/* 3. Soft Ambient Vignette / Beauty Glow Scrim */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/40" />

      {/* 4. AR Face Gems & Fingertip Reticle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair z-10"
      />

      {/* 5. Snapshot Flash Visual */}
      {snapshotFlash && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-300" />
      )}
    </div>
  );
});

DiamondScene.displayName = 'DiamondScene';
