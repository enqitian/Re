import { useRef } from 'react';
import { LandmarkPoint } from './useHandTracking';
import { get3DDistance } from '../utils/coordinateMapping';
import { soundEffects } from '../effects/soundEffects';

interface UseGestureOptions {
  landmarks: LandmarkPoint[] | null;
  onPinchTrigger?: (pinchPoint: LandmarkPoint) => void;
  onClearTrigger?: () => void;
  pinchEnterThreshold?: number; // default 0.055
  pinchExitThreshold?: number;  // default 0.080
  openPalmHoldDurationMs?: number; // default 1000ms
}

export interface GestureDetectionState {
  isPinching: boolean;
  pinchDistance: number;
  isOpenPalm: boolean;
  clearProgress: number; // 0.0 to 1.0
  pinchMidpoint: LandmarkPoint | null;
}

export function useGesture({
  landmarks,
  onPinchTrigger,
  onClearTrigger,
  pinchEnterThreshold = 0.055,
  pinchExitThreshold = 0.080,
  openPalmHoldDurationMs = 1000,
}: UseGestureOptions): GestureDetectionState {
  const onPinchTriggerRef = useRef(onPinchTrigger);
  onPinchTriggerRef.current = onPinchTrigger;
  const onClearTriggerRef = useRef(onClearTrigger);
  onClearTriggerRef.current = onClearTrigger;

  const wasPinchingRef = useRef<boolean>(false);
  const openPalmStartRef = useRef<number | null>(null);
  const hasTriggeredClearRef = useRef<boolean>(false);
  const lastTickSoundTimeRef = useRef<number>(0);

  const smoothedThumbRef = useRef<LandmarkPoint | null>(null);
  const smoothedIndexRef = useRef<LandmarkPoint | null>(null);

  // Compute gesture state synchronously from current landmarks without useEffect setState
  if (!landmarks || landmarks.length < 21) {
    wasPinchingRef.current = false;
    openPalmStartRef.current = null;
    hasTriggeredClearRef.current = false;
    smoothedThumbRef.current = null;
    smoothedIndexRef.current = null;

    return {
      isPinching: false,
      pinchDistance: 1.0,
      isOpenPalm: false,
      clearProgress: 0,
      pinchMidpoint: null,
    };
  }

  const wrist = landmarks[0];
  const rawThumb = landmarks[4];
  const rawIndex = landmarks[8];

  // Smooth landmarks for jitter-free tracking
  const smoothPoint = (current: LandmarkPoint, prev: LandmarkPoint | null): LandmarkPoint => {
    if (!prev) return { ...current };
    const alpha = 0.5;
    return {
      x: prev.x + (current.x - prev.x) * alpha,
      y: prev.y + (current.y - prev.y) * alpha,
      z: prev.z + (current.z - prev.z) * alpha,
    };
  };

  const thumb = smoothPoint(rawThumb, smoothedThumbRef.current);
  const index = smoothPoint(rawIndex, smoothedIndexRef.current);
  smoothedThumbRef.current = thumb;
  smoothedIndexRef.current = index;

  // 1. Pinch Distance
  const pinchDist = get3DDistance(thumb, index, 1.2);
  const midpoint: LandmarkPoint = {
    x: (thumb.x + index.x) * 0.5,
    y: (thumb.y + index.y) * 0.5,
    z: (thumb.z + index.z) * 0.5,
  };

  // Pinch Hysteresis Logic
  let isCurrentlyPinching = wasPinchingRef.current;
  if (wasPinchingRef.current) {
    if (pinchDist > pinchExitThreshold) {
      isCurrentlyPinching = false;
    }
  } else {
    if (pinchDist < pinchEnterThreshold) {
      isCurrentlyPinching = true;
      if (onPinchTriggerRef.current) {
        setTimeout(() => {
          onPinchTriggerRef.current?.(midpoint);
        }, 0);
      }
    }
  }
  wasPinchingRef.current = isCurrentlyPinching;

  // 2. Open Palm Detection
  const isExtended = (tipIdx: number, pipIdx: number) => {
    const tipDist = Math.hypot(landmarks[tipIdx].x - wrist.x, landmarks[tipIdx].y - wrist.y);
    const pipDist = Math.hypot(landmarks[pipIdx].x - wrist.x, landmarks[pipIdx].y - wrist.y);
    return tipDist > pipDist * 1.15;
  };

  const indexExtended = isExtended(8, 6);
  const middleExtended = isExtended(12, 10);
  const ringExtended = isExtended(16, 14);
  const pinkyExtended = isExtended(20, 18);
  const thumbDistToIndexMcp = Math.hypot(thumb.x - landmarks[5].x, thumb.y - landmarks[5].y);
  const thumbExtended = thumbDistToIndexMcp > 0.12;

  const isOpenPalmNow = (
    indexExtended &&
    middleExtended &&
    ringExtended &&
    pinkyExtended &&
    thumbExtended &&
    !isCurrentlyPinching &&
    pinchDist > 0.14
  );

  // 3. Open Palm 1-second Clear Logic
  const now = performance.now();
  let currentClearProgress = 0;

  if (isOpenPalmNow) {
    if (!openPalmStartRef.current) {
      openPalmStartRef.current = now;
    }

    const elapsed = now - openPalmStartRef.current;
    currentClearProgress = Math.min(elapsed / openPalmHoldDurationMs, 1.0);

    if (now - lastTickSoundTimeRef.current > 180 && currentClearProgress < 1.0) {
      soundEffects.playChargeTick(currentClearProgress);
      lastTickSoundTimeRef.current = now;
    }

    if (currentClearProgress >= 1.0 && !hasTriggeredClearRef.current) {
      hasTriggeredClearRef.current = true;
      if (onClearTriggerRef.current) {
        setTimeout(() => {
          onClearTriggerRef.current?.();
        }, 0);
      }
    }
  } else {
    openPalmStartRef.current = null;
    hasTriggeredClearRef.current = false;
    currentClearProgress = 0;
  }

  return {
    isPinching: isCurrentlyPinching,
    pinchDistance: pinchDist,
    isOpenPalm: isOpenPalmNow,
    clearProgress: currentClearProgress,
    pinchMidpoint: midpoint,
  };
}
