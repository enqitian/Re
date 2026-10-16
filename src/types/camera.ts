export interface BeautyParameters {
  smoothSkin: number; // 0 to 10
  faceShape: number;  // 0 to 10
  eyeEnhance: number; // 0 to 10
  skinTone: number;   // 0 to 10
}

export type BeautyParamKey = keyof BeautyParameters;

export interface DevelopedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
  dateString: string;
  timeString: string;
  filmName: string;
  filmCode: string;
  iso: number;
  shutterSpeed: string;
  aperture: string;
  lens: string;
  beautyParams: BeautyParameters;
  exposureCompensation: string;
}

export interface CameraState {
  shutterSpeed: string;
  aperture: string;
  iso: number;
  batteryLevel: number;
  filmFramesRemaining: number;
  flashMode: 'off' | 'on' | 'auto';
  isFocusLocked: boolean;
  isAiActive: boolean;
  isDeveloping: boolean;
  activeFilmId: string;
}
