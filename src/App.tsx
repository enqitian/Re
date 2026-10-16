import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useVisionTracking, LandmarkPoint } from './hooks/useHandTracking';
import { FILM_PRESETS, FilmPreset } from './utils/filmPresets';
import { BeautyParameters, DevelopedPhoto } from './types/camera';
import { cameraAudio } from './utils/cameraAudio';
import { soundEffects } from './effects/soundEffects';
import { TopStatusPanel } from './components/camera/TopStatusPanel';
import { CameraViewfinder, CameraViewfinderHandle } from './components/camera/CameraViewfinder';
import { MechanicalKnob } from './components/camera/MechanicalKnob';
import { FilmDial } from './components/camera/FilmDial';
import { EmojiDial } from './components/camera/EmojiDial';
import { ShutterControl } from './components/camera/ShutterControl';
import { NeuralOpticsPanel } from './components/camera/NeuralOpticsPanel';
import { PhotoDevelopingModal } from './components/camera/PhotoDevelopingModal';
import { PhotoAlbumModal } from './components/camera/PhotoAlbumModal';
import { EMOJI_OPTIONS, EmojiOption, GhostPreview } from './utils/faceGems';
import { calculateCropRect, mapVideoLandmarkToContainer, get3DDistance } from './utils/coordinateMapping';
import { Images, RefreshCw, AlertCircle, Sliders, ChevronDown } from 'lucide-react';

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewfinderRef = useRef<CameraViewfinderHandle | null>(null);

  // Vision Tracking (Webcam & MediaPipe Hand/Face Landmarkers)
  const {
    isLoading: isModelLoading,
    isModelReady,
    isCameraActive,
    hasPermissionError,
    errorMessage,
    handLandmarks,
    allHandLandmarks,
    faceLandmarks,
    allFaceLandmarks,
    indexTip,
    thumbTip,
    startCamera,
    stopCamera,
  } = useVisionTracking(videoRef);

  // Mechanical Camera State
  const [selectedFilm, setSelectedFilm] = useState<FilmPreset>(FILM_PRESETS[0]);
  const [batteryLevel] = useState<number>(88);
  const [filmCounter, setFilmCounter] = useState<number>(36);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('auto');
  const [isAiActive, setIsAiActive] = useState<boolean>(true);
  const [isFlashFired, setIsFlashFired] = useState<boolean>(false);
  const [isShutterVibrating, setIsShutterVibrating] = useState<boolean>(false);
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState<boolean>(false);

  // AR Emoji Gem State
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiOption>(EMOJI_OPTIONS[0]);
  const [gemCount, setGemCount] = useState<number>(0);

  // Independent multi-person pinch & gesture state tracker across frames
  const personPinchStatesRef = useRef<Map<string, { wasPinching: boolean; lastPinchTime: number }>>(new Map());
  const openPalmStartRef = useRef<number | null>(null);
  const hasTriggeredClearRef = useRef<boolean>(false);
  const lastTickSoundTimeRef = useRef<number>(0);

  // Multi-person gesture processing logic:
  // Loops through all detected face landmarks and detects pinch gestures for each person's hands independently,
  // allowing multiple users to spawn emojis on their respective faces simultaneously.
  // Also generates subtle ghost previews at pinch midpoints when finger proximity is close but before full pinch.
  const gestureState = React.useMemo(() => {
    const faces: LandmarkPoint[][] = allFaceLandmarks && allFaceLandmarks.length > 0
      ? allFaceLandmarks
      : faceLandmarks && faceLandmarks.length > 0
      ? [faceLandmarks]
      : [];

    const hands: LandmarkPoint[][] = allHandLandmarks && allHandLandmarks.length > 0
      ? allHandLandmarks
      : handLandmarks && handLandmarks.length > 0
      ? [handLandmarks]
      : [];

    const video = videoRef.current;
    const vw = video?.videoWidth || 800;
    const vh = video?.videoHeight || 600;
    const now = performance.now();

    const PINCH_ENTER_THRESHOLD = 0.058;
    const PINCH_EXIT_THRESHOLD = 0.082;
    const GHOST_PROXIMITY_THRESHOLD = 0.13; // Finger proximity threshold for subtle preview

    let anyPinching = false;
    let minPinchDist = 1.0;
    let anyOpenPalm = false;
    let primaryMidpoint: LandmarkPoint | null = null;
    const ghostPreviews: GhostPreview[] = [];

    if (hands.length === 0) {
      openPalmStartRef.current = null;
      hasTriggeredClearRef.current = false;
      return {
        isPinching: false,
        pinchDistance: 1.0,
        isOpenPalm: false,
        clearProgress: 0,
        pinchMidpoint: null,
        ghostPreviews: [],
      };
    }

    // 1. Loop through all detected face landmarks and detect pinch gestures for each person's hands independently
    if (faces.length > 0) {
      faces.forEach((face, faceIndex) => {
        // Reference point for this person's face center (nose tip / mid-face)
        const nosePt = face[1] || face[4] || face[0];

        // Find hands assigned to this person (closest face to the hand's wrist / palm)
        const assignedHands = hands.filter(hand => {
          if (faces.length === 1) return true;
          const wrist = hand[0];
          let closestFaceIdx = 0;
          let minFaceDist = Infinity;
          faces.forEach((otherFace, otherIdx) => {
            const otherNose = otherFace[1] || otherFace[4] || otherFace[0];
            const d = Math.hypot(wrist.x - otherNose.x, wrist.y - otherNose.y);
            if (d < minFaceDist) {
              minFaceDist = d;
              closestFaceIdx = otherIdx;
            }
          });
          return closestFaceIdx === faceIndex;
        });

        // Check pinch gestures for each of this person's hands independently
        assignedHands.forEach((hand, hIdx) => {
          const rawThumb = hand[4];
          const rawIndex = hand[8];
          const pinchDist = get3DDistance(rawThumb, rawIndex, 1.2);
          if (pinchDist < minPinchDist) {
            minPinchDist = pinchDist;
          }

          const midpoint: LandmarkPoint = {
            x: (rawThumb.x + rawIndex.x) * 0.5,
            y: (rawThumb.y + rawIndex.y) * 0.5,
            z: (rawThumb.z + rawIndex.z) * 0.5,
          };

          const stateKey = `face_${faceIndex}_hand_${hIdx}`;
          const state = personPinchStatesRef.current.get(stateKey) || { wasPinching: false, lastPinchTime: 0 };

          // Independent pinch hysteresis per person's hand
          let isPersonPinching = state.wasPinching;
          if (state.wasPinching) {
            if (pinchDist > PINCH_EXIT_THRESHOLD) {
              isPersonPinching = false;
            }
          } else {
            if (pinchDist < PINCH_ENTER_THRESHOLD) {
              isPersonPinching = true;
              if (now - state.lastPinchTime > 240) {
                state.lastPinchTime = now;
                // Spawn emoji on this person's respective face!
                const mapped = mapVideoLandmarkToContainer(midpoint, vw, vh, 1, 1, true);
                viewfinderRef.current?.spawnGemAt(mapped.x, mapped.y, selectedEmoji, faceIndex);
              }
            }
          }

          state.wasPinching = isPersonPinching;
          personPinchStatesRef.current.set(stateKey, state);

          // 2. Subtle 'ghost' preview of the selected emoji at the pinch midpoint
          // when finger proximity is close but before the full pinch threshold is met
          if (!isPersonPinching && pinchDist < GHOST_PROXIMITY_THRESHOLD) {
            const proximity = Math.min(
              1.0,
              Math.max(0, (GHOST_PROXIMITY_THRESHOLD - pinchDist) / (GHOST_PROXIMITY_THRESHOLD - PINCH_ENTER_THRESHOLD))
            );
            const mapped = mapVideoLandmarkToContainer(midpoint, vw, vh, 1, 1, true);
            ghostPreviews.push({
              x: mapped.x,
              y: mapped.y,
              opacity: 0.22 + proximity * 0.55,
              scale: 0.75 + proximity * 0.35,
              emoji: selectedEmoji.emoji,
              glowColor: selectedEmoji.glowColor,
              color: selectedEmoji.color,
              proximity,
              faceIndex,
            });
          }

          if (isPersonPinching) {
            anyPinching = true;
            if (!primaryMidpoint) {
              primaryMidpoint = midpoint;
            }
          }

          // Open palm detection on this hand
          const wrist = hand[0];
          const isExt = (tip: number, pip: number) => {
            return Math.hypot(hand[tip].x - wrist.x, hand[tip].y - wrist.y) >
                   Math.hypot(hand[pip].x - wrist.x, hand[pip].y - wrist.y) * 1.15;
          };
          if (isExt(8, 6) && isExt(12, 10) && isExt(16, 14) && isExt(20, 18) && !isPersonPinching && pinchDist > 0.12) {
            anyOpenPalm = true;
          }
        });
      });
    } else {
      // Fallback when hands are detected without face bounding boxes
      hands.forEach((hand, hIdx) => {
        const rawThumb = hand[4];
        const rawIndex = hand[8];
        const pinchDist = get3DDistance(rawThumb, rawIndex, 1.2);
        if (pinchDist < minPinchDist) minPinchDist = pinchDist;

        const midpoint: LandmarkPoint = {
          x: (rawThumb.x + rawIndex.x) * 0.5,
          y: (rawThumb.y + rawIndex.y) * 0.5,
          z: (rawThumb.z + rawIndex.z) * 0.5,
        };

        const stateKey = `noface_hand_${hIdx}`;
        const state = personPinchStatesRef.current.get(stateKey) || { wasPinching: false, lastPinchTime: 0 };
        let isP = state.wasPinching;
        if (state.wasPinching) {
          if (pinchDist > PINCH_EXIT_THRESHOLD) isP = false;
        } else {
          if (pinchDist < PINCH_ENTER_THRESHOLD) {
            isP = true;
            if (now - state.lastPinchTime > 240) {
              state.lastPinchTime = now;
              const mapped = mapVideoLandmarkToContainer(midpoint, vw, vh, 1, 1, true);
              viewfinderRef.current?.spawnGemAt(mapped.x, mapped.y, selectedEmoji, 0);
            }
          }
        }
        state.wasPinching = isP;
        personPinchStatesRef.current.set(stateKey, state);

        // Subtle ghost preview when finger proximity is close but before full pinch
        if (!isP && pinchDist < GHOST_PROXIMITY_THRESHOLD) {
          const proximity = Math.min(
            1.0,
            Math.max(0, (GHOST_PROXIMITY_THRESHOLD - pinchDist) / (GHOST_PROXIMITY_THRESHOLD - PINCH_ENTER_THRESHOLD))
          );
          const mapped = mapVideoLandmarkToContainer(midpoint, vw, vh, 1, 1, true);
          ghostPreviews.push({
            x: mapped.x,
            y: mapped.y,
            opacity: 0.22 + proximity * 0.55,
            scale: 0.75 + proximity * 0.35,
            emoji: selectedEmoji.emoji,
            glowColor: selectedEmoji.glowColor,
            color: selectedEmoji.color,
            proximity,
            faceIndex: 0,
          });
        }

        if (isP) {
          anyPinching = true;
          if (!primaryMidpoint) primaryMidpoint = midpoint;
        }

        const wrist = hand[0];
        const isExt = (tip: number, pip: number) => {
          return Math.hypot(hand[tip].x - wrist.x, hand[tip].y - wrist.y) >
                 Math.hypot(hand[pip].x - wrist.x, hand[pip].y - wrist.y) * 1.15;
        };
        if (isExt(8, 6) && isExt(12, 10) && isExt(16, 14) && isExt(20, 18) && !isP && pinchDist > 0.12) {
          anyOpenPalm = true;
        }
      });
    }

    // 2. Open Palm 1-second Clear Logic
    let clearProg = 0;
    if (anyOpenPalm) {
      if (!openPalmStartRef.current) {
        openPalmStartRef.current = now;
      }
      const elapsed = now - openPalmStartRef.current;
      clearProg = Math.min(elapsed / 1000, 1.0);

      if (now - lastTickSoundTimeRef.current > 180 && clearProg < 1.0) {
        soundEffects.playChargeTick(clearProg);
        lastTickSoundTimeRef.current = now;
      }

      if (clearProg >= 1.0 && !hasTriggeredClearRef.current) {
        hasTriggeredClearRef.current = true;
        viewfinderRef.current?.clearAllGems();
      }
    } else {
      openPalmStartRef.current = null;
      hasTriggeredClearRef.current = false;
    }

    return {
      isPinching: anyPinching,
      pinchDistance: minPinchDist,
      isOpenPalm: anyOpenPalm,
      clearProgress: clearProg,
      pinchMidpoint: primaryMidpoint,
      ghostPreviews,
    };
  }, [allFaceLandmarks, faceLandmarks, allHandLandmarks, handLandmarks, selectedEmoji]);

  // Derived Shutter Speed & Aperture based on Film ISO
  const shutterSpeed = selectedFilm.iso >= 640 ? '1/500s' : selectedFilm.iso >= 400 ? '1/250s' : selectedFilm.iso >= 200 ? '1/125s' : '1/60s';
  const aperture = selectedFilm.iso >= 640 ? 'f/2.8' : selectedFilm.iso >= 400 ? 'f/2.0' : selectedFilm.iso >= 200 ? 'f/1.8' : 'f/1.4';

  // Beauty Knob Levels (Level 0 → Level 10)
  const [beautyParams, setBeautyParams] = useState<BeautyParameters>({
    smoothSkin: 4,
    faceShape: 3,
    eyeEnhance: 4,
    skinTone: 5,
  });

  // Photo Developing & Vault
  const [developedPhotos, setDevelopedPhotos] = useState<DevelopedPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('lumina_developed_photos');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load photos from localStorage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('lumina_developed_photos', JSON.stringify(developedPhotos));
    } catch (e) {
      // If quota exceeded, keep the latest 10 photos
      try {
        const trimmed = developedPhotos.slice(-10);
        localStorage.setItem('lumina_developed_photos', JSON.stringify(trimmed));
      } catch (err) {
        console.warn('LocalStorage save failed', err);
      }
    }
  }, [developedPhotos]);

  const [currentDevelopingPhoto, setCurrentDevelopingPhoto] = useState<DevelopedPhoto | null>(null);
  const [isDeveloping, setIsDeveloping] = useState<boolean>(false);
  const [isAlbumOpen, setIsAlbumOpen] = useState<boolean>(false);

  // Compute Face Bounding Boxes for ALL detected faces with exact object-cover mapping
  const faceBoxes = React.useMemo(() => {
    const faces = allFaceLandmarks && allFaceLandmarks.length > 0
      ? allFaceLandmarks
      : faceLandmarks && faceLandmarks.length > 0
      ? [faceLandmarks]
      : [];

    if (faces.length === 0) return [];
    const video = videoRef.current;
    const vw = video?.videoWidth || 800;
    const vh = video?.videoHeight || 600;

    return faces.map((landmarks, fIdx) => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pt of landmarks) {
        const mapped = mapVideoLandmarkToContainer(pt, vw, vh, 1, 1, true);
        if (mapped.x < minX) minX = mapped.x;
        if (mapped.x > maxX) maxX = mapped.x;
        if (mapped.y < minY) minY = mapped.y;
        if (mapped.y > maxY) maxY = mapped.y;
      }

      const boxW = Math.max(0.12, (maxX - minX) * 1.15);
      const boxH = Math.max(0.15, (maxY - minY) * 1.15);
      const boxX = Math.max(0, Math.min(1 - boxW, minX - boxW * 0.08));
      const boxY = Math.max(0, Math.min(1 - boxH, minY - boxH * 0.08));

      return { x: boxX, y: boxY, width: boxW, height: boxH, faceIndex: fIdx };
    });
  }, [allFaceLandmarks, faceLandmarks]);

  const faceBox = faceBoxes[0] || null;
  const faceCount = faceBoxes.length;

  // Automatically start camera on initial load once model is ready
  const hasRequestedInitialCameraRef = useRef(false);
  useEffect(() => {
    if (isModelReady && !isCameraActive && !hasPermissionError && !hasRequestedInitialCameraRef.current) {
      hasRequestedInitialCameraRef.current = true;
      startCamera();
    }
  }, [isModelReady, isCameraActive, hasPermissionError, startCamera]);

  // Capture Photo Handler
  const handleCapture = useCallback(() => {
    // 1. Shutter sound & camera body recoil vibration
    cameraAudio.playShutter();
    setIsShutterVibrating(true);
    setTimeout(() => setIsShutterVibrating(false), 240);

    // 2. Full-page instantaneous pure white flash overlay simulating camera strobe
    setIsFlashFired(true);
    setTimeout(() => setIsFlashFired(false), 280);

    // 3. Decrement film counter
    setFilmCounter(prev => Math.max(0, prev - 1));

    // 4. Strict Aspect-Ratio Preserving Canvas Capture (1200x900, 4:3)
    const TARGET_WIDTH = 1200;
    const TARGET_HEIGHT = 900;
    const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT; // 4/3 = 1.3333333333333333

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Check whether video has valid frames and active dimensions
      const hasValidVideo = Boolean(
        video &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        (video.readyState >= 2 || !video.paused)
      );

      if (hasValidVideo && video) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const streamRatio = vw / vh;

        // Calculate center-crop rectangle so that source aspect ratio STRICTLY matches TARGET_RATIO.
        // This completely fills the 1200x900 canvas with uniform 1:1 pixel scaling (scaleX === scaleY),
        // eliminating any stretching, squishing, or letterboxing regardless of stream orientation
        // (landscape 16:9, portrait 9:16, 4:3, square 1:1, ultrawide 21:9, etc.) or resolution.
        let sx = 0;
        let sy = 0;
        let sw = vw;
        let sh = vh;

        if (streamRatio > TARGET_RATIO) {
          // Camera stream is wider than 4:3 (e.g. 16:9, 21:9) -> crop horizontal margins equally
          sw = vh * TARGET_RATIO;
          sx = (vw - sw) / 2;
        } else if (streamRatio < TARGET_RATIO) {
          // Camera stream is taller than 4:3 (e.g. 9:16 portrait, 3:4) -> crop vertical margins equally
          sh = vw / TARGET_RATIO;
          sy = (vh - sh) / 2;
        }

        ctx.save();
        // Mirror horizontally so the capture matches the mirrored viewfinder
        ctx.translate(TARGET_WIDTH, 0);
        ctx.scale(-1, 1);

        // Apply film color grading & beauty soft blur to canvas capture
        const skinBlur = (beautyParams.smoothSkin / 10) * 1.5;
        const skinBrightness = 1 + (beautyParams.skinTone / 10) * 0.12;
        ctx.filter = `
          ${selectedFilm.cssFilter}
          blur(${skinBlur > 0 ? (skinBlur * 0.4).toFixed(2) : 0}px)
          brightness(${skinBrightness.toFixed(2)})
        `;

        // Draw cropped video strictly filling 1200x900 with zero aspect-ratio distortion
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        ctx.restore();

        // 5. Draw Active AR Emojis & Gems onto captured photo matching 4:3 viewfinder
        if (viewfinderRef.current) {
          viewfinderRef.current.drawGemsToCanvas(ctx, TARGET_WIDTH, TARGET_HEIGHT);
        }
      } else {
        // High-aesthetic analog darkroom gradient canvas when camera is off
        const grad = ctx.createLinearGradient(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        grad.addColorStop(0, '#292524');
        grad.addColorStop(0.5, '#1c1917');
        grad.addColorStop(1, '#0c0a09');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

        // Draw vintage lens ring watermark
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(TARGET_WIDTH / 2, TARGET_HEIGHT / 2, 220, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f5f5f4';
        ctx.font = '700 36px "Cinzel", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('LUMINA 35 · VINTAGE EXPOSURE', TARGET_WIDTH / 2, TARGET_HEIGHT / 2 - 20);
        ctx.font = '500 20px monospace';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`EMULSION: ${selectedFilm.filmCode} · ${selectedFilm.name}`, TARGET_WIDTH / 2, TARGET_HEIGHT / 2 + 25);
        ctx.restore();
      }

      // Add subtle analog film grain overlay
      if (selectedFilm.grainIntensity > 0) {
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = 300;
        grainCanvas.height = 225;
        const gCtx = grainCanvas.getContext('2d');
        if (gCtx) {
          const grainImg = gCtx.createImageData(grainCanvas.width, grainCanvas.height);
          const gData = grainImg.data;
          const intensity = selectedFilm.grainIntensity * 28;
          for (let i = 0; i < gData.length; i += 4) {
            const noise = (Math.random() - 0.5) * intensity;
            gData[i] = 128 + noise;
            gData[i + 1] = 128 + noise;
            gData[i + 2] = 128 + noise;
            gData[i + 3] = Math.random() * 22 + 8;
          }
          gCtx.putImageData(grainImg, 0, 0);
          ctx.save();
          ctx.globalCompositeOperation = 'overlay';
          ctx.drawImage(grainCanvas, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
          ctx.restore();
        }
      }
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newPhoto: DevelopedPhoto = {
      id: `film_${Date.now()}`,
      dataUrl,
      timestamp: Date.now(),
      dateString: dateStr,
      timeString: timeStr,
      filmName: selectedFilm.name,
      filmCode: selectedFilm.filmCode,
      iso: selectedFilm.iso,
      shutterSpeed,
      aperture,
      lens: selectedFilm.exifLens,
      beautyParams: { ...beautyParams },
      exposureCompensation: '+0.3 EV',
    };

    setDevelopedPhotos(prev => [...prev, newPhoto]);
    setCurrentDevelopingPhoto(newPhoto);
    setIsDeveloping(true);

    // 5. Film advance motor sound
    setTimeout(() => {
      cameraAudio.playFilmAdvance();
    }, 180);

    // 6. Chemical developing chime after 2.4s
    setTimeout(() => {
      setIsDeveloping(false);
      cameraAudio.playDevelopingComplete();
    }, 2400);
  }, [selectedFilm, shutterSpeed, aperture, beautyParams, flashMode]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090807] flex items-center justify-center p-1 md:p-3 select-none font-sans text-stone-100">
      {/* 0. Full-Page Pure White Flash Overlay (Mechanical Strobe Flashbulb Simulation) */}
      {isFlashFired && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[100] bg-white pointer-events-none animate-camera-flash"
        />
      )}

      {/* 
        ======================================================================
        THE VIRTUAL LUXURY MECHANICAL CAMERA BACK (LEICA/FUJIFILM INSPIRED)
        ======================================================================
      */}
      <div
        className={`relative w-full max-w-7xl h-full max-h-[98vh] rounded-3xl overflow-hidden flex flex-col border-4 border-stone-800 bg-[#161412] shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.15)] transition-transform duration-100 ${
          isShutterVibrating ? 'scale-[0.99] translate-y-0.5' : 'scale-100'
        }`}
      >
        {/* Left & Right Classic Pebbled Brown Leather Grips */}
        <div
          className="absolute top-0 bottom-0 left-0 w-6 md:w-12 pointer-events-none z-10 border-r-2 border-stone-800 shadow-[inset_-4px_0_12px_rgba(0,0,0,0.8)]"
          style={{
            backgroundColor: '#261b14',
            backgroundImage: `radial-gradient(circle at 50% 50%, #3e2b20 1px, transparent 1px)`,
            backgroundSize: '4px 4px',
          }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 w-6 md:w-12 pointer-events-none z-10 border-l-2 border-stone-800 shadow-[inset_4px_0_12px_rgba(0,0,0,0.8)]"
          style={{
            backgroundColor: '#261b14',
            backgroundImage: `radial-gradient(circle at 50% 50%, #3e2b20 1px, transparent 1px)`,
            backgroundSize: '4px 4px',
          }}
        />

        {/* 1. Camera Top Status Bar Panel */}
        <div className="z-20 pl-6 pr-6 md:pl-12 md:pr-12">
          <TopStatusPanel
            currentFilm={selectedFilm}
            shutterSpeed={shutterSpeed}
            aperture={aperture}
            batteryLevel={batteryLevel}
            filmCounter={filmCounter}
            maxFrames={36}
            flashMode={flashMode}
            onToggleFlash={() => {
              setFlashMode(prev => (prev === 'auto' ? 'on' : prev === 'on' ? 'off' : 'auto'));
            }}
            isAiActive={isAiActive}
            onToggleAi={() => setIsAiActive(prev => !prev)}
            isFocusLocked={faceCount > 0}
            faceCount={faceCount}
            isCameraActive={isCameraActive}
            onTogglePower={() => {
              if (isCameraActive) {
                stopCamera();
              } else {
                startCamera();
              }
            }}
          />
        </div>

        {/* 2. Middle Main Body: Viewfinder + AI Chip + Emoji Rotary + Leather Texture */}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-3.5 p-2.5 pl-6 pr-6 md:pl-12 md:pr-12 overflow-y-auto scrollbar-none z-20">
          {/* Central Large Optical Viewfinder Window */}
          <div className="flex-1 w-full max-w-4xl xl:max-w-5xl flex flex-col items-center justify-center shrink-0">
            <CameraViewfinder
              ref={viewfinderRef}
              videoRef={videoRef}
              isCameraActive={isCameraActive}
              onStartCamera={startCamera}
              currentFilm={selectedFilm}
              beautyParams={beautyParams}
              isFlashFired={isFlashFired}
              isFocusLocked={faceCount > 0}
              faceBox={faceBox}
              faceBoxes={faceBoxes}
              faceLandmarks={faceLandmarks}
              allFaceLandmarks={allFaceLandmarks}
              handLandmarks={handLandmarks}
              allHandLandmarks={allHandLandmarks}
              indexTip={indexTip}
              thumbTip={thumbTip}
              isPinching={gestureState.isPinching}
              pinchDistance={gestureState.pinchDistance}
              clearProgress={gestureState.clearProgress}
              selectedEmoji={selectedEmoji}
              ghostPreviews={gestureState.ghostPreviews}
              onGemCountChange={setGemCount}
            />
          </div>

          {/* Right Side: AI Neural Optics Module & Emoji Rotary Dial & Quick Status */}
          <div className="w-full md:w-68 lg:w-72 flex flex-col space-y-2 shrink-0">
            {/* AI Neural Chip Screen */}
            <NeuralOpticsPanel
              isAiActive={isAiActive}
              faceDetected={faceCount > 0}
              faceCount={faceCount}
              landmarkCount={faceLandmarks ? faceLandmarks.length : 0}
              beautyParams={beautyParams}
              exposureValue="+0.3"
              gemCount={gemCount}
              isPinching={gestureState.isPinching}
            />

            {/* Emoji Gem Rotary Selector */}
            <EmojiDial
              selectedEmoji={selectedEmoji}
              onSelectEmoji={setSelectedEmoji}
              gemCount={gemCount}
              onClearGems={() => viewfinderRef.current?.clearAllGems()}
            />

            {/* Film Vault Album Entry & Camera Roll Button */}
            <div className="p-2 bg-stone-900/80 border border-stone-800 rounded-xl flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-stone-950 border border-stone-700 flex items-center justify-center overflow-hidden">
                  {developedPhotos.length > 0 ? (
                    <img
                      src={developedPhotos[developedPhotos.length - 1].dataUrl}
                      alt="Last shot"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Images size={14} className="text-stone-500" />
                  )}
                </div>
                <div className="flex flex-col font-mono text-[9.5px]">
                  <span className="font-bold text-stone-200">
                    FILM VAULT
                  </span>
                  <span className="text-[8.5px] text-amber-400">
                    {developedPhotos.length} EXPOSURES
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  cameraAudio.playToggleSwitch();
                  setIsAlbumOpen(true);
                }}
                className="px-2 py-1 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-stone-900 font-mono font-bold text-[11px] shadow-md transition-all active:scale-95 cursor-pointer"
              >
                暗房相册
              </button>
            </div>
          </div>
        </div>

        {/* 3. Camera Bottom Mechanical Controls Deck */}
        <div className="bg-gradient-to-t from-stone-950 via-stone-900 to-stone-900 border-t-2 border-stone-800 p-2 pl-4 pr-4 md:p-2.5 md:pl-12 md:pr-12 flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-3 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.8)] shrink-0">
          {/* A. 4 Mechanical Beauty Knobs (Level 0 → Level 10) */}
          <div
            className={`items-center justify-center gap-2.5 sm:gap-5 bg-stone-950/70 border border-stone-800/80 rounded-2xl px-3 py-1.5 shadow-inner transition-all duration-300 w-full md:w-auto ${
              isMobileControlsOpen ? 'flex' : 'hidden md:flex'
            }`}
          >
            <MechanicalKnob
              label="SMOOTH"
              subLabel="磨皮柔焦"
              value={beautyParams.smoothSkin}
              onChange={val => setBeautyParams(p => ({ ...p, smoothSkin: val }))}
              accentColor="#f59e0b"
            />
            <MechanicalKnob
              label="SHAPE"
              subLabel="修容轮廓"
              value={beautyParams.faceShape}
              onChange={val => setBeautyParams(p => ({ ...p, faceShape: val }))}
              accentColor="#ec4899"
            />
            <MechanicalKnob
              label="EYES"
              subLabel="明眸眼神"
              value={beautyParams.eyeEnhance}
              onChange={val => setBeautyParams(p => ({ ...p, eyeEnhance: val }))}
              accentColor="#38bdf8"
            />
            <MechanicalKnob
              label="TONE"
              subLabel="胶片肤色"
              value={beautyParams.skinTone}
              onChange={val => setBeautyParams(p => ({ ...p, skinTone: val }))}
              accentColor="#10b981"
            />
          </div>

          {/* B. Film Emulsion Rotary Dial (6 Film Stocks) */}
          <div
            className={`flex-1 justify-center max-w-md w-full transition-all duration-300 ${
              isMobileControlsOpen ? 'flex' : 'hidden md:flex'
            }`}
          >
            <FilmDial
              selectedFilm={selectedFilm}
              onSelectFilm={setSelectedFilm}
            />
          </div>

          {/* C. Large Mechanical Shutter Button & Mobile Controls Dropdown Toggle */}
          <div className="shrink-0 flex items-center justify-between md:justify-center w-full md:w-auto gap-3">
            {/* Mobile Dropdown Toggle Button */}
            <button
              type="button"
              onClick={() => {
                cameraAudio.playDialClick();
                setIsMobileControlsOpen(prev => !prev);
              }}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/90 border border-stone-700/80 hover:border-amber-500/60 text-stone-300 font-mono text-[11px] shadow-md active:scale-95 transition-all cursor-pointer"
              title="展开/收起美颜旋钮与胶卷转盘"
            >
              <Sliders size={13} className="text-amber-400" />
              <span className="text-amber-300 font-bold">
                {isMobileControlsOpen ? '收起控制选项' : '下拉控制选项'}
              </span>
              <ChevronDown
                size={14}
                className={`text-stone-400 transition-transform duration-200 ${
                  isMobileControlsOpen ? 'rotate-180 text-amber-400' : ''
                }`}
              />
            </button>

            {/* Current Film Stock Pill for quick glance on mobile when collapsed */}
            {!isMobileControlsOpen && (
              <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-[10px] font-mono text-stone-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-stone-200 font-bold">{selectedFilm.filmCode}</span>
                <span className="text-stone-500">ISO {selectedFilm.iso}</span>
              </div>
            )}

            <ShutterControl
              onCapture={handleCapture}
              disabled={isDeveloping}
            />
          </div>
        </div>
      </div>

      {/* 4. Photo Developing Latent Chemical Reveal Modal */}
      <PhotoDevelopingModal
        photo={currentDevelopingPhoto}
        isDeveloping={isDeveloping}
        onClose={() => setCurrentDevelopingPhoto(null)}
      />

      {/* 5. Contact Sheet Film Album Modal */}
      <PhotoAlbumModal
        photos={developedPhotos}
        isOpen={isAlbumOpen}
        onClose={() => setIsAlbumOpen(false)}
        onDeletePhoto={id => {
          setDevelopedPhotos(prev => prev.filter(p => p.id !== id));
        }}
        onClearAllPhotos={() => {
          setDevelopedPhotos([]);
        }}
      />

      {/* 6. Camera Permission Notice if blocked */}
      {hasPermissionError && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] bg-stone-900 border-2 border-red-500/60 rounded-2xl p-4 shadow-2xl flex items-start gap-3 text-stone-200">
          <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs font-mono">
            <p className="font-bold text-red-300">摄像头未连接或权限被拒绝</p>
            <p className="text-stone-400 mt-1 leading-relaxed">
              {errorMessage || '无法访问光学镜头。无需担心，您仍可转动机械旋钮与滤镜拨盘，按下快门拍摄样张体验显影过程！'}
            </p>
            <button
              onClick={startCamera}
              className="mt-2.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>重新连接镜头</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
