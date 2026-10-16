export interface FaceGem {
  id: string;
  emoji: string;
  color: string;
  glowColor: string;
  // Normalized coordinates [0, 1] relative to mirrored screen
  x: number;
  y: number;
  faceIndex?: number; // Target face index when multiple faces are detected (0, 1, 2...)
  faceLandmarkIndex: number | null;
  offset: { x: number; y: number };
  scale: number;
  rotation: number;
  createdAt: number;
  size: number; // in pixels

  // Physics dynamics state:
  currentX?: number;        // Smooth anchor position X (px)
  currentY?: number;        // Smooth anchor position Y (px)
  vx?: number;              // Inertial velocity X
  vy?: number;              // Inertial velocity Y
  bounceOffset?: number;    // Vertical spring bounce displacement (px)
  bounceVelocity?: number;  // Vertical spring bounce velocity (px/s)
  floatPhase?: number;      // Unique phase offset for multi-frequency floating
  floatSpeed?: number;      // Floating frequency
  floatAmpX?: number;       // Horizontal drift amplitude (px)
  floatAmpY?: number;       // Vertical floating bobbing amplitude (px)
  wobble?: number;          // Rotational wobble displacement
  wobbleVelocity?: number;  // Rotational wobble angular velocity
}

export interface GhostPreview {
  x: number;
  y: number;
  opacity: number;
  scale: number;
  emoji: string;
  glowColor: string;
  color: string;
  proximity: number;
  faceIndex?: number;
}

export interface EmojiOption {
  id: string;
  emoji: string;
  name: string;
  color: string;
  glowColor: string;
}

export const EMOJI_OPTIONS: EmojiOption[] = [
  { id: 'sparkle', emoji: '✨', name: '流光星芒', color: '#fef08a', glowColor: '#eab308' },
  { id: 'diamond', emoji: '💎', name: '璀璨彩钻', color: '#67e8f9', glowColor: '#06b6d4' },
  { id: 'crystal', emoji: '💠', name: '纯净水晶', color: '#a5f3fc', glowColor: '#0284c7' },
  { id: 'star', emoji: '🌟', name: '金色烁星', color: '#fde047', glowColor: '#ca8a04' },
  { id: 'heart', emoji: '💖', name: '晶莹粉心', color: '#f472b6', glowColor: '#ec4899' },
  { id: 'flower', emoji: '🌸', name: '梦幻樱钻', color: '#fbcfe8', glowColor: '#db2777' },
  { id: 'violet', emoji: '🔮', name: '极光魔石', color: '#c084fc', glowColor: '#9333ea' },
  { id: 'glint', emoji: '💫', name: '眩光星环', color: '#fdba74', glowColor: '#ea580c' },
];

export interface MakeupPreset {
  id: string;
  name: string;
  description: string;
  gems: {
    emoji: string;
    landmarkIndex: number;
    color: string;
    glowColor: string;
    size: number;
    offset?: { x: number; y: number };
  }[];
}

// MediaPipe Face Landmarks:
// 145: Left eye lower eyelid / tear gem
// 374: Right eye lower eyelid / tear gem
// 33: Left eye outer corner
// 263: Right eye outer corner
// 168: Glabella / forehead center
// 10: High forehead
// 50: Left cheek
// 280: Right cheek
// 1: Nose tip
// 152: Chin
export const MAKEUP_PRESETS: MakeupPreset[] = [
  {
    id: 'fairy_tears',
    name: '仙女眼角泪钻',
    description: '双眼下方与眼尾点缀灵动星芒',
    gems: [
      { emoji: '✨', landmarkIndex: 145, color: '#fef08a', glowColor: '#eab308', size: 30, offset: { x: 0, y: 0.015 } },
      { emoji: '✨', landmarkIndex: 374, color: '#fef08a', glowColor: '#eab308', size: 30, offset: { x: 0, y: 0.015 } },
      { emoji: '💎', landmarkIndex: 33, color: '#67e8f9', glowColor: '#06b6d4', size: 24, offset: { x: -0.015, y: -0.005 } },
      { emoji: '💎', landmarkIndex: 263, color: '#67e8f9', glowColor: '#06b6d4', size: 24, offset: { x: 0.015, y: -0.005 } },
    ],
  },
  {
    id: 'forehead_star',
    name: '花钿额间星印',
    description: '眉心与额间点缀古典华美星芒',
    gems: [
      { emoji: '✨', landmarkIndex: 168, color: '#fef08a', glowColor: '#eab308', size: 36 },
      { emoji: '💎', landmarkIndex: 10, color: '#67e8f9', glowColor: '#06b6d4', size: 28 },
      { emoji: '💖', landmarkIndex: 151, color: '#f472b6', glowColor: '#ec4899', size: 22, offset: { x: 0, y: 0.012 } },
    ],
  },
  {
    id: 'cheek_galaxy',
    name: '双颊星河雀斑',
    description: '宛如银河落于两颊的梦幻彩钻群',
    gems: [
      { emoji: '✨', landmarkIndex: 50, color: '#fef08a', glowColor: '#eab308', size: 26 },
      { emoji: '💖', landmarkIndex: 116, color: '#f472b6', glowColor: '#ec4899', size: 22, offset: { x: -0.01, y: 0.01 } },
      { emoji: '💎', landmarkIndex: 205, color: '#67e8f9', glowColor: '#06b6d4', size: 20, offset: { x: 0.01, y: -0.01 } },
      { emoji: '✨', landmarkIndex: 280, color: '#fef08a', glowColor: '#eab308', size: 26 },
      { emoji: '💖', landmarkIndex: 345, color: '#f472b6', glowColor: '#ec4899', size: 22, offset: { x: 0.01, y: 0.01 } },
      { emoji: '💎', landmarkIndex: 425, color: '#67e8f9', glowColor: '#06b6d4', size: 20, offset: { x: -0.01, y: -0.01 } },
      { emoji: '🌟', landmarkIndex: 1, color: '#fde047', glowColor: '#ca8a04', size: 22, offset: { x: 0, y: -0.01 } },
    ],
  },
];
