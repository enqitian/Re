import * as THREE from 'three';

/**
 * Maps 2D normalized camera coordinates (mirrored for natural webcam experience)
 * into 3D world space at target plane Z.
 */
export function mapNormalizedToWorld(
  normalizedX: number,
  normalizedY: number,
  camera: THREE.PerspectiveCamera,
  targetZ: number = 0,
  isMirrored: boolean = true
): THREE.Vector3 {
  // Mirrored: user looks at screen like a mirror, so moving right moves right on screen
  const screenX = isMirrored ? (1 - normalizedX) : normalizedX;
  const screenY = normalizedY;

  // Convert to Normalized Device Coordinates (NDC) [-1, 1]
  const ndcX = screenX * 2 - 1;
  const ndcY = -(screenY * 2 - 1);

  // Unproject from camera
  const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
  vector.unproject(camera);

  const dir = vector.sub(camera.position).normalize();
  
  // Calculate intersection with plane Z = targetZ
  if (Math.abs(dir.z) < 0.0001) {
    return new THREE.Vector3(ndcX * 5, ndcY * 3, targetZ);
  }

  const distance = (targetZ - camera.position.z) / dir.z;
  const worldPos = camera.position.clone().add(dir.multiplyScalar(distance));
  return worldPos;
}

/**
 * Calculates 2D Euclidean distance between two points
 */
export function get2DDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Calculates 3D distance with depth weight
 */
export function get3DDistance(
  p1: { x: number; y: number; z?: number },
  p2: { x: number; y: number; z?: number },
  zWeight: number = 1.0
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = ((p1.z ?? 0) - (p2.z ?? 0)) * zWeight;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Maps normalized coordinates from a raw video stream to container coordinates
 * when the video is displayed using CSS `object-cover`.
 * Prevents aspect ratio distortion and coordinate displacement between video and UI.
 */
export function mapVideoLandmarkToContainer(
  point: { x: number; y: number },
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  isMirrored: boolean = true
): { x: number; y: number } {
  if (!videoWidth || !videoHeight || !containerWidth || !containerHeight) {
    return {
      x: isMirrored ? 1 - point.x : point.x,
      y: point.y,
    };
  }

  const rv = videoWidth / videoHeight;
  const rc = containerWidth / containerHeight;

  let normX = point.x;
  let normY = point.y;

  if (rv > rc) {
    // Video is wider than container: horizontal sides are cropped
    const deltaX = rc / rv;
    const minX = (1 - deltaX) / 2;
    normX = (point.x - minX) / deltaX;
  } else if (rv < rc) {
    // Video is taller than container: top/bottom sides are cropped
    const deltaY = rv / rc;
    const minY = (1 - deltaY) / 2;
    normY = (point.y - minY) / deltaY;
  }

  return {
    x: isMirrored ? 1 - normX : normX,
    y: normY,
  };
}

/**
 * Calculates source rectangle (sx, sy, sw, sh) to center-crop raw video
 * into a target aspect ratio without any geometric stretching or distortion.
 */
export function calculateCropRect(
  videoWidth: number,
  videoHeight: number,
  targetRatio: number
): { sx: number; sy: number; sw: number; sh: number } {
  const vw = videoWidth || 1200;
  const vh = videoHeight || 900;
  const videoRatio = vw / vh;

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (videoRatio > targetRatio) {
    // Video is wider than target: crop left & right
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
  } else if (videoRatio < targetRatio) {
    // Video is taller than target: crop top & bottom
    sh = vw / targetRatio;
    sy = (vh - sh) / 2;
  }

  return { sx, sy, sw, sh };
}
