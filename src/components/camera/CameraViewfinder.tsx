import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { FilmPreset } from '../../utils/filmPresets';
import { BeautyParameters } from '../../types/camera';
import { LandmarkPoint } from '../../hooks/useHandTracking';
import { FaceGem, EmojiOption, MakeupPreset, GhostPreview } from '../../utils/faceGems';
import { soundEffects } from '../../effects/soundEffects';
import { mapVideoLandmarkToContainer } from '../../utils/coordinateMapping';
import { Camera, Focus, Hand, Sparkles } from 'lucide-react';

export interface CameraViewfinderHandle {
  spawnGemAt: (screenX: number, screenY: number, emojiOption: EmojiOption, targetFaceIndex?: number) => void;
  clearAllGems: () => void;
  applyPreset: (preset: MakeupPreset) => void;
  getGemCount: () => number;
  drawGemsToCanvas: (targetCtx: CanvasRenderingContext2D, targetWidth: number, targetHeight: number) => void;
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  faceIndex?: number;
}

interface CameraViewfinderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCameraActive: boolean;
  onStartCamera: () => void;
  currentFilm: FilmPreset;
  beautyParams: BeautyParameters;
  isFlashFired: boolean;
  isFocusLocked: boolean;
  faceBox?: FaceBox | null;
  faceBoxes?: FaceBox[];
  faceLandmarks?: LandmarkPoint[] | null;
  allFaceLandmarks?: LandmarkPoint[][] | null;
  handLandmarks: LandmarkPoint[] | null;
  allHandLandmarks?: LandmarkPoint[][] | null;
  indexTip: LandmarkPoint | null;
  thumbTip: LandmarkPoint | null;
  isPinching: boolean;
  pinchDistance: number;
  clearProgress: number;
  selectedEmoji: EmojiOption;
  ghostPreviews?: GhostPreview[];
  onGemCountChange?: (count: number) => void;
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

export const CameraViewfinder = forwardRef<CameraViewfinderHandle, CameraViewfinderProps>(({
  videoRef,
  isCameraActive,
  onStartCamera,
  currentFilm,
  beautyParams,
  isFlashFired,
  isFocusLocked,
  faceBox,
  faceBoxes,
  faceLandmarks,
  allFaceLandmarks,
  handLandmarks,
  allHandLandmarks,
  indexTip,
  thumbTip,
  isPinching,
  pinchDistance,
  clearProgress,
  selectedEmoji,
  ghostPreviews = [],
  onGemCountChange,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gemCanvasRef = useRef<HTMLCanvasElement>(null);
  const grainCanvasRef = useRef<HTMLCanvasElement>(null);

  const gemsRef = useRef<FaceGem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const lastTimeRef = useRef<number>(performance.now());

  // Helper to emit burst particles when gem is placed
  const emitSparkleBurst = useCallback((px: number, py: number, colorHex: string, count: number = 25) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.2;
      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        color: Math.random() > 0.3 ? colorHex : '#ffffff',
        size: Math.random() * 3.5 + 1.5,
        alpha: 1.0,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.4,
      });
    }
  }, []);

  // Helper to emit expanding shockwave ring
  const emitShockwave = useCallback((x: number, y: number, colorHex: string) => {
    shockwavesRef.current.push({
      x,
      y,
      radius: 4,
      maxRadius: 55,
      color: colorHex,
      alpha: 0.85,
      life: 0,
      maxLife: 0.45,
    });
  }, []);

  // Helper to spawn a gem with physics
  const spawnGemInternal = useCallback((
    screenX: number,
    screenY: number,
    emojiOption: EmojiOption,
    landmarkIndex: number | null,
    offset: { x: number; y: number },
    faceIndex: number = 0
  ) => {
    const canvas = gemCanvasRef.current;
    const width = canvas ? canvas.width : 800;
    const height = canvas ? canvas.height : 600;

    const initBounceOffset = -22 - Math.random() * 8;
    const initBounceVelocity = -120 - Math.random() * 40;

    const newGem: FaceGem = {
      id: `gem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      emoji: emojiOption.emoji,
      color: emojiOption.color,
      glowColor: emojiOption.glowColor,
      x: screenX,
      y: screenY,
      faceIndex,
      faceLandmarkIndex: landmarkIndex,
      offset,
      scale: 0.0,
      rotation: (Math.random() - 0.5) * 0.3,
      createdAt: performance.now(),
      size: 24,

      currentX: screenX * width,
      currentY: screenY * height,
      vx: (Math.random() - 0.5) * 20,
      vy: initBounceVelocity,
      bounceOffset: initBounceOffset,
      bounceVelocity: initBounceVelocity,
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 1.5 + Math.random() * 0.8,
      floatAmpX: 2.5 + Math.random() * 2.5,
      floatAmpY: 5.0 + Math.random() * 3.0,
      wobble: (Math.random() - 0.5) * 0.35,
      wobbleVelocity: (Math.random() - 0.5) * 8,
    };

    gemsRef.current.push(newGem);
    emitSparkleBurst(screenX * width, screenY * height, emojiOption.glowColor, 30);
    emitShockwave(screenX * width, screenY * height, emojiOption.glowColor);
    soundEffects.playCrystalSpawn();

    if (onGemCountChange) {
      onGemCountChange(gemsRef.current.length);
    }
  }, [emitSparkleBurst, emitShockwave, onGemCountChange]);

  // Helper to find nearest face & landmark across all detected faces
  const findNearestFaceAndLandmark = useCallback((
    screenX: number,
    screenY: number,
    faces: LandmarkPoint[][]
  ) => {
    let minDist = Infinity;
    let bestFaceIdx = 0;
    let bestLandmarkIdx = 0;
    const video = videoRef.current;
    const vw = video?.videoWidth || 800;
    const vh = video?.videoHeight || 600;

    faces.forEach((face, fIdx) => {
      face.forEach((pt, lIdx) => {
        const mapped = mapVideoLandmarkToContainer(pt, vw, vh, 1, 1, true);
        const dist = Math.hypot(screenX - mapped.x, screenY - mapped.y);
        if (dist < minDist) {
          minDist = dist;
          bestFaceIdx = fIdx;
          bestLandmarkIdx = lIdx;
        }
      });
    });

    const targetFace = faces[bestFaceIdx];
    const bestMapped = mapVideoLandmarkToContainer(targetFace[bestLandmarkIdx], vw, vh, 1, 1, true);
    return {
      faceIndex: bestFaceIdx,
      landmarkIndex: bestLandmarkIdx,
      distance: minDist,
      offset: {
        x: screenX - bestMapped.x,
        y: screenY - bestMapped.y,
      },
    };
  }, [videoRef]);

  // All faces ref for direct access in loops & callbacks
  const allFaceLandmarksRef = useRef(allFaceLandmarks);
  allFaceLandmarksRef.current = allFaceLandmarks;

  useImperativeHandle(ref, () => ({
    getGemCount: () => gemsRef.current.length,

    spawnGemAt: (screenX: number, screenY: number, emojiOption: EmojiOption, targetFaceIndex?: number) => {
      let faceIndex = targetFaceIndex ?? 0;
      let landmarkIndex: number | null = null;
      let offset = { x: 0, y: 0 };

      const activeFaces = allFaceLandmarksRef.current && allFaceLandmarksRef.current.length > 0
        ? allFaceLandmarksRef.current
        : faceLandmarksRef.current && faceLandmarksRef.current.length > 0
        ? [faceLandmarksRef.current]
        : null;

      if (activeFaces && activeFaces.length > 0) {
        if (targetFaceIndex !== undefined && activeFaces[targetFaceIndex]) {
          const targetFace = activeFaces[targetFaceIndex];
          const video = videoRef.current;
          const vw = video?.videoWidth || 800;
          const vh = video?.videoHeight || 600;

          let minDist = Infinity;
          let bestIdx = 0;
          targetFace.forEach((pt, idx) => {
            const mapped = mapVideoLandmarkToContainer(pt, vw, vh, 1, 1, true);
            const dist = Math.hypot(screenX - mapped.x, screenY - mapped.y);
            if (dist < minDist) {
              minDist = dist;
              bestIdx = idx;
            }
          });

          const bestMapped = mapVideoLandmarkToContainer(targetFace[bestIdx], vw, vh, 1, 1, true);
          faceIndex = targetFaceIndex;
          landmarkIndex = bestIdx;
          offset = {
            x: screenX - bestMapped.x,
            y: screenY - bestMapped.y,
          };
        } else {
          const match = findNearestFaceAndLandmark(screenX, screenY, activeFaces);
          if (match.distance < 0.35) {
            faceIndex = match.faceIndex;
            landmarkIndex = match.landmarkIndex;
            offset = match.offset;
          }
        }
      }

      spawnGemInternal(screenX, screenY, emojiOption, landmarkIndex, offset, faceIndex);
    },

    applyPreset: (preset: MakeupPreset) => {
      gemsRef.current = [];
      const video = videoRef.current;
      const vw = video?.videoWidth || 800;
      const vh = video?.videoHeight || 600;

      const activeFaces = allFaceLandmarksRef.current && allFaceLandmarksRef.current.length > 0
        ? allFaceLandmarksRef.current
        : faceLandmarksRef.current && faceLandmarksRef.current.length > 0
        ? [faceLandmarksRef.current]
        : null;

      if (!activeFaces || activeFaces.length === 0) {
        preset.gems.forEach((g, idx) => {
          const angle = (idx / preset.gems.length) * Math.PI * 2;
          const sx = 0.5 + Math.cos(angle) * 0.14;
          const sy = 0.45 + Math.sin(angle) * 0.14;
          spawnGemInternal(sx, sy, {
            id: preset.id,
            emoji: g.emoji,
            name: preset.name,
            color: g.color,
            glowColor: g.glowColor,
          }, null, { x: 0, y: 0 }, 0);
        });
      } else {
        // Apply preset to all detected faces simultaneously!
        activeFaces.forEach((face, fIdx) => {
          preset.gems.forEach(g => {
            const lm = face[g.landmarkIndex];
            if (!lm) return;
            const mapped = mapVideoLandmarkToContainer(lm, vw, vh, 1, 1, true);
            const normX = mapped.x + (g.offset?.x || 0);
            const normY = mapped.y + (g.offset?.y || 0);
            spawnGemInternal(normX, normY, {
              id: `${preset.id}_f${fIdx}`,
              emoji: g.emoji,
              name: preset.name,
              color: g.color,
              glowColor: g.glowColor,
            }, g.landmarkIndex, g.offset || { x: 0, y: 0 }, fIdx);
          });
        });
      }
      soundEffects.playPresetChime();
    },

    clearAllGems: () => {
      const canvas = gemCanvasRef.current;
      const width = canvas ? canvas.width : 800;
      const height = canvas ? canvas.height : 600;

      gemsRef.current.forEach(gem => {
        const gx = gem.currentX !== undefined ? gem.currentX : gem.x * width;
        const gy = gem.currentY !== undefined ? gem.currentY : gem.y * height;
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

    // Draw active gems onto snapshot export canvas with exact coordinates matching the 4:3 viewfinder
    drawGemsToCanvas: (targetCtx: CanvasRenderingContext2D, targetWidth: number, targetHeight: number) => {
      const gems = gemsRef.current;
      const video = videoRef.current;
      const vw = video?.videoWidth || targetWidth;
      const vh = video?.videoHeight || targetHeight;

      const activeFaces = allFaceLandmarksRef.current && allFaceLandmarksRef.current.length > 0
        ? allFaceLandmarksRef.current
        : faceLandmarksRef.current && faceLandmarksRef.current.length > 0
        ? [faceLandmarksRef.current]
        : null;

      gems.forEach(gem => {
        let normX = gem.x;
        let normY = gem.y;
        if (activeFaces && activeFaces.length > 0 && gem.faceLandmarkIndex !== null) {
          const targetFace = activeFaces[gem.faceIndex ?? 0] || activeFaces[0];
          if (targetFace && targetFace[gem.faceLandmarkIndex]) {
            const pt = targetFace[gem.faceLandmarkIndex];
            const mapped = mapVideoLandmarkToContainer(pt, vw, vh, targetWidth, targetHeight, true);
            normX = mapped.x + gem.offset.x;
            normY = mapped.y + gem.offset.y;
          }
        }

        const px = normX * targetWidth;
        const py = normY * targetHeight + ((gem.bounceOffset || 0) * (targetHeight / 600));
        const scale = (gem.scale || 1.0) * (targetWidth / 800);

        // Soft glow aura
        targetCtx.save();
        const glowRad = Math.max(1, gem.size * scale * 1.3);
        const grad = targetCtx.createRadialGradient(px, py, 0, px, py, glowRad);
        grad.addColorStop(0, `${gem.glowColor}aa`);
        grad.addColorStop(0.4, `${gem.glowColor}44`);
        grad.addColorStop(1, 'transparent');
        targetCtx.fillStyle = grad;
        targetCtx.beginPath();
        targetCtx.arc(px, py, glowRad, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();

        // Emoji
        targetCtx.save();
        targetCtx.translate(px, py);
        targetCtx.rotate(gem.rotation || 0);
        targetCtx.font = `${Math.round(gem.size * scale)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.shadowColor = gem.glowColor;
        targetCtx.shadowBlur = 14;
        targetCtx.fillText(gem.emoji, 0, 0);
        targetCtx.restore();
      });
    },
  }));

  const faceLandmarksRef = useRef(faceLandmarks);
  faceLandmarksRef.current = faceLandmarks;
  const indexTipRef = useRef(indexTip);
  indexTipRef.current = indexTip;
  const thumbTipRef = useRef(thumbTip);
  thumbTipRef.current = thumbTip;
  const isPinchingRef = useRef(isPinching);
  isPinchingRef.current = isPinching;
  const pinchDistanceRef = useRef(pinchDistance);
  pinchDistanceRef.current = pinchDistance;
  const selectedEmojiRef = useRef(selectedEmoji);
  selectedEmojiRef.current = selectedEmoji;

  // Film Grain Canvas Render
  useEffect(() => {
    const canvas = grainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    canvas.width = 256;
    canvas.height = 256;

    const renderGrain = () => {
      const imgData = ctx.createImageData(256, 256);
      const data = imgData.data;
      const intensity = currentFilm.grainIntensity * 28;

      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * intensity;
        data[i] = 128 + noise;
        data[i + 1] = 128 + noise;
        data[i + 2] = 128 + noise;
        data[i + 3] = Math.random() * 32 + 10;
      }

      ctx.putImageData(imgData, 0, 0);
      animId = requestAnimationFrame(renderGrain);
    };

    renderGrain();
    return () => cancelAnimationFrame(animId);
  }, [currentFilm.grainIntensity]);

  // Main AR Gems & Reticle Render Animation Loop
  useEffect(() => {
    const canvas = gemCanvasRef.current;
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

      const currentFaceLandmarks = faceLandmarksRef.current;
      const currentIndexTip = indexTipRef.current;
      const currentThumbTip = thumbTipRef.current;
      const currentIsPinching = isPinchingRef.current;
      const currentPinchDistance = pinchDistanceRef.current;
      const currentSelectedEmoji = selectedEmojiRef.current;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Shockwaves
      const shockwaves = shockwavesRef.current;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.life += dt;
        if (sw.life >= sw.maxLife) {
          shockwaves.splice(i, 1);
          continue;
        }

        const progress = sw.life / sw.maxLife;
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

      // 2. Fingertips coordinates for Laser Reticle and Proximity force
      const video = videoRef.current;
      const vw = video?.videoWidth || width;
      const vh = video?.videoHeight || height;

      let ix = 0, iy = 0, tx = 0, ty = 0;
      let hasFingertips = false;
      if (currentIndexTip && currentThumbTip) {
        const mappedI = mapVideoLandmarkToContainer(currentIndexTip, vw, vh, width, height, true);
        const mappedT = mapVideoLandmarkToContainer(currentThumbTip, vw, vh, width, height, true);
        ix = mappedI.x * width;
        iy = mappedI.y * height;
        tx = mappedT.x * width;
        ty = mappedT.y * height;
        hasFingertips = true;
      }

      // 3. Draw Active Emojis with Physical Dynamics
      const gems = gemsRef.current;

      gems.forEach(gem => {
        const ageSec = (now - gem.createdAt) / 1000;
        if (ageSec < 0) return;

        // Target Anchor Coordinate
        let targetX = gem.x * width;
        let targetY = gem.y * height;

        const activeFaces = allFaceLandmarksRef.current && allFaceLandmarksRef.current.length > 0
          ? allFaceLandmarksRef.current
          : currentFaceLandmarks && currentFaceLandmarks.length > 0
          ? [currentFaceLandmarks]
          : null;

        if (activeFaces && activeFaces.length > 0 && gem.faceLandmarkIndex !== null) {
          const targetFace = activeFaces[gem.faceIndex ?? 0] || activeFaces[0];
          if (targetFace && targetFace[gem.faceLandmarkIndex]) {
            const landmark = targetFace[gem.faceLandmarkIndex];
            const mappedLm = mapVideoLandmarkToContainer(landmark, vw, vh, width, height, true);
            gem.x = mappedLm.x + gem.offset.x;
            gem.y = mappedLm.y + gem.offset.y;
            targetX = gem.x * width;
            targetY = gem.y * height;
          }
        }

        // Initialize state
        if (gem.currentX === undefined) gem.currentX = targetX;
        if (gem.currentY === undefined) gem.currentY = targetY;
        if (gem.bounceOffset === undefined) gem.bounceOffset = 0;
        if (gem.bounceVelocity === undefined) gem.bounceVelocity = 0;
        if (gem.wobble === undefined) gem.wobble = 0;
        if (gem.wobbleVelocity === undefined) gem.wobbleVelocity = 0;
        if (gem.floatPhase === undefined) gem.floatPhase = Math.random() * Math.PI * 2;
        if (gem.floatSpeed === undefined) gem.floatSpeed = 1.5;
        if (gem.floatAmpX === undefined) gem.floatAmpX = 3.5;
        if (gem.floatAmpY === undefined) gem.floatAmpY = 7.0;

        // Inertial follow of face landmark
        gem.currentX += (targetX - gem.currentX) * Math.min(1, 14 * dt);
        gem.currentY += (targetY - gem.currentY) * Math.min(1, 14 * dt);

        // Harmonic Damped Spring Bounce Dynamics
        const springK = 135;
        const springDamping = 9.2;
        const springAcc = -springK * gem.bounceOffset - springDamping * gem.bounceVelocity;
        gem.bounceVelocity += springAcc * dt;
        gem.bounceOffset += gem.bounceVelocity * dt;

        // Interactive Proximity Force from Fingertips
        if (hasFingertips) {
          const distI = Math.hypot(gem.currentX - ix, gem.currentY - iy);
          const distT = Math.hypot(gem.currentX - tx, gem.currentY - ty);
          const minDist = Math.min(distI, distT);
          const repelRadius = 65;

          if (minDist < repelRadius && minDist > 2) {
            const repelStrength = 1 - minDist / repelRadius;
            gem.bounceVelocity -= repelStrength * 160 * dt;
            gem.wobbleVelocity += (Math.random() - 0.5) * repelStrength * 25 * dt;
          }
        }

        // Multi-frequency Floating in 3D Space
        const floatTime = (now * 0.001) * gem.floatSpeed + gem.floatPhase;
        const floatBobY = Math.sin(floatTime) * gem.floatAmpY + Math.sin(floatTime * 2.2 + 1.2) * (gem.floatAmpY * 0.35);
        const floatDriftX = Math.cos(floatTime * 0.75 + gem.floatPhase) * gem.floatAmpX;
        const floatDepthZ = Math.sin(floatTime * 1.4);

        // Rotational Wobble Dynamics
        const wobbleAcc = -35 * gem.wobble - 6 * gem.wobbleVelocity;
        gem.wobbleVelocity += wobbleAcc * dt;
        gem.wobble += gem.wobbleVelocity * dt;

        // Calculated Render Coordinate
        const renderX = gem.currentX + floatDriftX;
        const renderY = gem.currentY + gem.bounceOffset + floatBobY;

        // Scale & Squash/Stretch
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

        const velRatio = Math.max(-0.24, Math.min(0.28, -gem.bounceVelocity * 0.0012));
        const stretchY = 1.0 + velRatio;
        const squashX = 1.0 / Math.sqrt(Math.max(0.55, stretchY));

        const floatTilt = (floatDriftX / gem.floatAmpX) * 0.12;
        const currentRot = gem.rotation + floatTilt + gem.wobble;

        // Ground / Face contact depth shadow
        const elevation = -(gem.bounceOffset + floatBobY);
        const shadowAlpha = Math.max(0.08, Math.min(0.4, 0.35 - elevation * 0.006));
        const shadowRadius = gem.size * 0.45 * Math.max(0.7, 1.0 + elevation * 0.015);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(gem.currentX, gem.currentY + 12, shadowRadius, shadowRadius * 0.38, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha.toFixed(2)})`;
        ctx.filter = `blur(${Math.max(2, 3 + elevation * 0.08).toFixed(1)}px)`;
        ctx.fill();
        ctx.restore();

        // Soft Glowing Aura
        ctx.save();
        const glowRad = gem.size * finalScale * (1.25 + floatDepthZ * 0.15);
        const glowGrad = ctx.createRadialGradient(renderX, renderY, 0, renderX, renderY, glowRad);
        glowGrad.addColorStop(0, `${gem.glowColor}bb`);
        glowGrad.addColorStop(0.35, `${gem.glowColor}44`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(renderX, renderY, glowRad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Emoji Gem
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

        // Occasional ambient sparkle particle
        if (Math.random() < 0.035) {
          particlesRef.current.push({
            x: renderX + (Math.random() - 0.5) * 16,
            y: renderY + (Math.random() - 0.5) * 16,
            vx: (Math.random() - 0.5) * 1.2 + floatDriftX * 0.2,
            vy: -Math.random() * 1.6 - 0.5,
            color: gem.glowColor,
            size: Math.random() * 2.5 + 1.2,
            alpha: 0.95,
            life: 0,
            maxLife: 0.5 + Math.random() * 0.4,
          });
        }
      });

      // 4. Draw Active Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.035;
        p.vx *= 0.96;
        p.vy *= 0.98;

        const fade = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade * p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;

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

      // 5. Draw Fingertip Laser Guidance and Reticles
      if (hasFingertips) {
        const midX = (ix + tx) * 0.5;
        const midY = (iy + ty) * 0.5;

        // Connecting laser line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(tx, ty);

        if (currentIsPinching) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#67e8f9';
          ctx.shadowBlur = 14;
        } else {
          const closeness = Math.min(Math.max((0.12 - currentPinchDistance) / 0.08, 0), 1);
          ctx.strokeStyle = `rgba(254, 240, 138, ${0.4 + closeness * 0.6})`;
          ctx.lineWidth = 2 + closeness * 1.5;
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = 8;
        }
        ctx.stroke();
        ctx.restore();

        // Fingertip Reticles
        const drawReticle = (x: number, y: number, color: string) => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, currentIsPinching ? 8 : 6, 0, Math.PI * 2);
          ctx.fillStyle = currentIsPinching ? '#ffffff' : color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, currentIsPinching ? 15 : 12, 0, Math.PI * 2);
          ctx.strokeStyle = currentIsPinching ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        };

        drawReticle(ix, iy, '#38bdf8');
        drawReticle(tx, ty, '#facc15');

        // Center Pinch Sparkle Glow
        if (currentIsPinching) {
          ctx.save();
          ctx.font = '22px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 14;
          ctx.fillText(currentSelectedEmoji.emoji, midX, midY);
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
  }, []);

  // Click on viewfinder to place gem
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = gemCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) / rect.width;
    const screenY = (e.clientY - rect.top) / rect.height;

    const handle = (ref as React.RefObject<CameraViewfinderHandle | null>)?.current;
    if (handle) {
      handle.spawnGemAt(screenX, screenY, selectedEmoji);
    }
  };

  // Compute Beauty Filter CSS blend with Film Stock
  const skinSmoothBlur = (beautyParams.smoothSkin / 10) * 1.5;
  const skinBrightness = 1 + (beautyParams.skinTone / 10) * 0.12;

  const combinedFilter = `
    ${currentFilm.cssFilter}
    blur(${skinSmoothBlur > 0 ? (skinSmoothBlur * 0.3).toFixed(2) : 0}px)
    brightness(${skinBrightness.toFixed(2)})
  `;

  // Active face boxes for multi-face autofocus targeting
  const activeFaceBoxes: FaceBox[] = faceBoxes && faceBoxes.length > 0
    ? faceBoxes
    : faceBox
    ? [faceBox]
    : [];

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="relative w-full aspect-[4/3] max-h-[70vh] md:max-h-[72vh] xl:max-h-[75vh] bg-stone-950 rounded-2xl overflow-hidden border-4 border-stone-800 shadow-[inset_0_4px_16px_rgba(0,0,0,0.95),0_8px_30px_rgba(0,0,0,0.8)] cursor-crosshair group select-none"
    >
      {/* 1. Mirrored Webcam Video Stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-500 pointer-events-none ${
          isCameraActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ filter: combinedFilter }}
      />

      {/* 2. Standby / Offline Vintage Scene when Camera is off */}
      {!isCameraActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-stone-900 via-stone-950 to-black z-10 pointer-events-auto">
          {/* Simulated 35mm Lens Aperture Graphic */}
          <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-stone-800 bg-gradient-to-tr from-stone-950 via-stone-900 to-stone-800 flex items-center justify-center shadow-[inset_0_4px_16px_rgba(0,0,0,0.9),0_0_24px_rgba(0,0,0,0.8)] mb-3">
            <div className="absolute inset-2 rounded-full border border-stone-700/60 bg-gradient-to-br from-indigo-500/10 via-amber-500/5 to-emerald-500/10" />
            <div className="flex flex-col items-center justify-center text-center p-2 z-10">
              <Camera size={26} className="text-amber-400 mb-1 animate-pulse" />
              <span className="font-serif font-bold text-xs text-stone-200 tracking-wider">
                F=35mm F:1.4
              </span>
              <span className="text-[9px] font-mono text-stone-500">
                MULTICOATED COATING
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartCamera();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 via-stone-700 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-100 font-mono font-bold text-xs rounded-xl shadow-xl shadow-amber-950/40 border border-amber-500/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Camera size={14} />
            <span>开启取景器镜头 (OPEN SHUTTER)</span>
          </button>
          <span className="text-[10px] font-mono text-stone-400 mt-2">
            点击画面或使用食指拇指捏合手势，即可在面部凝聚璀璨彩钻 ✨
          </span>
        </div>
      )}

      {/* 3. Film Grain Texture Overlay */}
      <canvas
        ref={grainCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none mix-blend-overlay opacity-60 z-10"
      />

      {/* 4. AR Gems & Emoji Interactive Canvas */}
      <canvas
        ref={gemCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* 4.5. Subtle Ghost Preview of Selected Emoji at Pinch Midpoint */}
      {isCameraActive && ghostPreviews && ghostPreviews.map((ghost, gIdx) => (
        <div
          key={`ghost-preview-${gIdx}`}
          className="absolute pointer-events-none select-none z-35 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out"
          style={{
            left: `${ghost.x * 100}%`,
            top: `${ghost.y * 100}%`,
            opacity: ghost.opacity,
            transform: `translate(-50%, -50%) scale(${ghost.scale})`,
          }}
        >
          {/* Subtle rotating dashed halo ring with glow color */}
          <div
            className="absolute rounded-full border border-dashed animate-spin pointer-events-none"
            style={{
              width: '36px',
              height: '36px',
              borderColor: ghost.glowColor,
              boxShadow: `0 0 ${10 * ghost.proximity}px ${ghost.glowColor}`,
              animationDuration: '6s',
              opacity: 0.35 + ghost.proximity * 0.45,
            }}
          />

          {/* Soft translucent circular aura */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: `${26 * ghost.scale}px`,
              height: `${26 * ghost.scale}px`,
              backgroundColor: `${ghost.glowColor}18`,
              boxShadow: `0 0 12px ${ghost.glowColor}50`,
            }}
          />

          {/* Translucent 'Ghost' Emoji */}
          <span
            className="text-lg filter drop-shadow-[0_0_6px_rgba(255,255,255,0.7)] select-none leading-none"
            style={{
              textShadow: `0 0 8px ${ghost.glowColor}`,
            }}
          >
            {ghost.emoji}
          </span>

          {/* Micro HUD status badge */}
          <div
            className="mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-stone-950/85 border text-[7.5px] font-mono font-bold tracking-wider text-white/90 shadow-md backdrop-blur-xs pointer-events-none"
            style={{ borderColor: `${ghost.glowColor}80` }}
          >
            <span
              className="w-1 h-1 rounded-full animate-ping"
              style={{ backgroundColor: ghost.glowColor }}
            />
            <span>PINCH {Math.round(ghost.proximity * 100)}%</span>
          </div>
        </div>
      ))}

      {/* 5. Authentic Rangefinder Brightline Frame Guides (35mm Frameline) */}
      <div className="absolute inset-6 md:inset-10 border border-white/35 pointer-events-none rounded-sm z-30">
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-white/80" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-white/80" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-white/80" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-white/80" />

        <div className="absolute top-1 left-1.5 flex items-center gap-1.5 text-[8px] font-mono text-white/60 tracking-widest uppercase">
          <span>35MM FRAME</span>
          <span>·</span>
          <span className="text-amber-300 font-bold">
            {activeFaceBoxes.length > 1
              ? `MULTI-AF (${activeFaceBoxes.length} FACES)`
              : activeFaceBoxes.length === 1
              ? 'AF-LOCK 1 FACE'
              : 'GESTURE AR ACTIVE'}
          </span>
        </div>
      </div>

      {/* 6. Center Rangefinder Split-Image Ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <div className="relative w-16 h-16 rounded-full border border-white/25 flex items-center justify-center">
          <div className="w-full h-[1px] bg-white/20" />
          <div className="absolute w-[1px] h-full bg-white/20" />
          <div className="absolute w-6 h-6 rounded-full border border-amber-300/40 bg-amber-500/[0.04]" />
        </div>
      </div>

      {/* 7. Dynamic AI Rangefinder Autofocus Brackets (Multi-Face Tracking) */}
      {isCameraActive && activeFaceBoxes.map((fb, idx) => {
        const isPrimary = idx === 0;
        return (
          <div
            key={idx}
            className={`absolute border rounded-sm pointer-events-none transition-all duration-100 z-30 ${
              isPrimary
                ? 'border-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                : 'border-cyan-400/70 shadow-[0_0_6px_rgba(34,211,238,0.5)]'
            }`}
            style={{
              left: `${fb.x * 100}%`,
              top: `${fb.y * 100}%`,
              width: `${fb.width * 100}%`,
              height: `${fb.height * 100}%`,
            }}
          >
            <div className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 ${isPrimary ? 'border-emerald-300' : 'border-cyan-300'}`} />
            <div className={`absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 ${isPrimary ? 'border-emerald-300' : 'border-cyan-300'}`} />
            <div className={`absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 ${isPrimary ? 'border-emerald-300' : 'border-cyan-300'}`} />
            <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 ${isPrimary ? 'border-emerald-300' : 'border-cyan-300'}`} />

            <div className={`absolute -top-5 left-0 flex items-center gap-1 bg-stone-950/85 px-1.5 py-0.5 rounded border text-[8px] font-mono ${
              isPrimary ? 'border-emerald-500/40 text-emerald-300' : 'border-cyan-500/40 text-cyan-300'
            }`}>
              <Focus size={8} />
              <span>
                {activeFaceBoxes.length > 1
                  ? `AF #${idx + 1} · ${(1.2 + idx * 0.3).toFixed(1)}M`
                  : 'AF-LOCK 1.2M'}
              </span>
            </div>
          </div>
        );
      })}

      {/* 8. Open Palm 1s Clear Charging Bar */}
      {clearProgress > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center bg-stone-950/90 border border-rose-500/60 px-4 py-2 rounded-xl shadow-2xl animate-pulse pointer-events-none">
          <div className="flex items-center gap-1.5 text-rose-300 font-mono text-[10px] font-bold mb-1">
            <Hand size={12} />
            <span>张开手掌拂去碎钻中: {Math.round(clearProgress * 100)}%</span>
          </div>
          <div className="w-36 h-1 bg-black/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-75"
              style={{ width: `${clearProgress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 9. Optical Lens Vignette & Sheen */}
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          boxShadow: `inset 0 0 ${currentFilm.vignette * 110}px rgba(0,0,0,0.85)`,
        }}
      />

      {/* 10. Flash Curtain Discharge Whiteout Animation */}
      {isFlashFired && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-250" />
      )}
    </div>
  );
});

CameraViewfinder.displayName = 'CameraViewfinder';
