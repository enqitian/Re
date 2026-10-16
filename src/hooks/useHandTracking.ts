import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
  HandLandmarkerResult,
  FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface TrackingState {
  isLoading: boolean;
  isModelReady: boolean;
  isCameraActive: boolean;
  hasPermissionError: boolean;
  errorMessage: string | null;
  handLandmarks: LandmarkPoint[] | null;
  allHandLandmarks: LandmarkPoint[][] | null;
  faceLandmarks: LandmarkPoint[] | null;
  allFaceLandmarks: LandmarkPoint[][] | null;
  indexTip: LandmarkPoint | null;
  thumbTip: LandmarkPoint | null;
  palmCenter: LandmarkPoint | null;
}

export function useVisionTracking(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<TrackingState>({
    isLoading: true,
    isModelReady: false,
    isCameraActive: false,
    hasPermissionError: false,
    errorMessage: null,
    handLandmarks: null,
    allHandLandmarks: null,
    faceLandmarks: null,
    allFaceLandmarks: null,
    indexTip: null,
    thumbTip: null,
    palmCenter: null,
  });

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastTimestampMsRef = useRef<number>(0);

  // Initialize both Hand & Face Vision Models
  useEffect(() => {
    let isCancelled = false;

    async function initModels() {
      try {
        setState(s => ({ ...s, isLoading: true, errorMessage: null }));

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (isCancelled) return;

        // Helper to load HandLandmarker with GPU first, falling back to CPU
        const initHandLandmarker = async () => {
          try {
            return await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: 'GPU',
              },
              runningMode: 'VIDEO',
              numHands: 4,
              minHandDetectionConfidence: 0.45,
              minHandPresenceConfidence: 0.45,
              minTrackingConfidence: 0.45,
            });
          } catch (gpuErr) {
            console.info('Switching HandLandmarker to CPU delegate:', gpuErr);
            return await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: 'CPU',
              },
              runningMode: 'VIDEO',
              numHands: 4,
              minHandDetectionConfidence: 0.45,
              minHandPresenceConfidence: 0.45,
              minTrackingConfidence: 0.45,
            });
          }
        };

        // Helper to load FaceLandmarker with GPU first, falling back to CPU
        const initFaceLandmarker = async () => {
          try {
            return await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                delegate: 'GPU',
              },
              runningMode: 'VIDEO',
              numFaces: 4,
              minFaceDetectionConfidence: 0.45,
              minFacePresenceConfidence: 0.45,
              minTrackingConfidence: 0.45,
            });
          } catch (gpuErr) {
            console.info('Switching FaceLandmarker to CPU delegate:', gpuErr);
            return await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                delegate: 'CPU',
              },
              runningMode: 'VIDEO',
              numFaces: 4,
              minFaceDetectionConfidence: 0.45,
              minFacePresenceConfidence: 0.45,
              minTrackingConfidence: 0.45,
            });
          }
        };

        const [handLandmarker, faceLandmarker] = await Promise.all([
          initHandLandmarker(),
          initFaceLandmarker(),
        ]);

        if (isCancelled) {
          handLandmarker.close();
          faceLandmarker.close();
          return;
        }

        handLandmarkerRef.current = handLandmarker;
        faceLandmarkerRef.current = faceLandmarker;

        setState(s => ({
          ...s,
          isLoading: false,
          isModelReady: true,
        }));
      } catch (err) {
        console.error('Failed to load Vision AI models:', err);
        if (!isCancelled) {
          setState(s => ({
            ...s,
            isLoading: false,
            isModelReady: false,
            errorMessage: 'AI识别模型加载失败，请检查网络或使用屏幕点击互动。',
          }));
        }
      }
    }

    initModels();

    return () => {
      isCancelled = true;
      if (handLandmarkerRef.current) {
        try {
          handLandmarkerRef.current.close();
        } catch {}
      }
      if (faceLandmarkerRef.current) {
        try {
          faceLandmarkerRef.current.close();
        } catch {}
      }
    };
  }, []);

  const isStartingCameraRef = useRef<boolean>(false);

  // Start Camera
  const startCamera = useCallback(async () => {
    if (isStartingCameraRef.current) return;
    isStartingCameraRef.current = true;

    try {
      setState(s => ({ ...s, isLoading: true, hasPermissionError: false, errorMessage: null }));

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('当前浏览器环境不支持媒体设备访问。');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState(s => ({
        ...s,
        isLoading: false,
        isCameraActive: true,
        hasPermissionError: false,
      }));
    } catch (err: unknown) {
      console.warn('Camera access denied:', err);
      const isPermissionDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');

      setState(s => ({
        ...s,
        isLoading: false,
        isCameraActive: false,
        hasPermissionError: true,
        errorMessage: isPermissionDenied
          ? '摄像头权限未开启。点击右上角允许摄像头，或在画面上点击贴钻！'
          : '未能启动摄像头，请确保摄像头未被其他应用占用。',
      }));
    } finally {
      isStartingCameraRef.current = false;
    }
  }, [videoRef]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState(s => ({
      ...s,
      isCameraActive: false,
      handLandmarks: null,
      allHandLandmarks: null,
      faceLandmarks: null,
      allFaceLandmarks: null,
      indexTip: null,
      thumbTip: null,
      palmCenter: null,
    }));
  }, [videoRef]);

  // Real-time Detection Loop
  useEffect(() => {
    if (!state.isModelReady || !state.isCameraActive) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    const handLandmarker = handLandmarkerRef.current;
    const faceLandmarker = faceLandmarkerRef.current;

    if (!video || !handLandmarker) return;

    let isRunning = true;
    let hadLandmarks = false;

    const detectFrame = () => {
      if (!isRunning) return;

      if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        let nowMs = performance.now();
        // Ensure monotonically increasing timestamp for MediaPipe Tasks
        if (nowMs <= lastTimestampMsRef.current) {
          nowMs = lastTimestampMsRef.current + 1;
        }
        lastTimestampMsRef.current = nowMs;

        try {
          // 1. Multi-Hand Tracking
          const handResult: HandLandmarkerResult = handLandmarker.detectForVideo(video, nowMs);
          let currentHand: LandmarkPoint[] | null = null;
          let currentAllHands: LandmarkPoint[][] | null = null;
          let thumbTip: LandmarkPoint | null = null;
          let indexTip: LandmarkPoint | null = null;
          let palmCenter: LandmarkPoint | null = null;

          if (handResult.landmarks && handResult.landmarks.length > 0) {
            currentAllHands = handResult.landmarks;
            currentHand = handResult.landmarks[0];
            thumbTip = currentHand[4];
            indexTip = currentHand[8];
            palmCenter = {
              x: (currentHand[0].x + currentHand[5].x + currentHand[17].x) / 3,
              y: (currentHand[0].y + currentHand[5].y + currentHand[17].y) / 3,
              z: (currentHand[0].z + currentHand[5].z + currentHand[17].z) / 3,
            };
          }

          // 2. Multi-Face Tracking
          let currentFace: LandmarkPoint[] | null = null;
          let currentAllFaces: LandmarkPoint[][] | null = null;
          if (faceLandmarker) {
            const faceResult: FaceLandmarkerResult = faceLandmarker.detectForVideo(video, nowMs);
            if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
              currentAllFaces = faceResult.faceLandmarks;
              currentFace = faceResult.faceLandmarks[0];
            }
          }

          const hasLandmarksNow = Boolean(
            (currentAllHands && currentAllHands.length > 0) ||
            (currentAllFaces && currentAllFaces.length > 0)
          );
          // Only update state if we have landmarks or we just transitioned from having landmarks to none
          if (hasLandmarksNow || hadLandmarks) {
            hadLandmarks = hasLandmarksNow;
            setState(s => ({
              ...s,
              handLandmarks: currentHand,
              allHandLandmarks: currentAllHands,
              faceLandmarks: currentFace,
              allFaceLandmarks: currentAllFaces,
              indexTip,
              thumbTip,
              palmCenter,
            }));
          }
        } catch {
          // Graceful frame skip
        }
      }

      animFrameRef.current = requestAnimationFrame(detectFrame);
    };

    animFrameRef.current = requestAnimationFrame(detectFrame);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [state.isModelReady, state.isCameraActive, videoRef]);

  // Clean up media tracks on unmount without calling setState
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    startCamera,
    stopCamera,
  };
}
