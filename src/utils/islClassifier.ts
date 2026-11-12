export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface GestureClassification {
  gesture: string;
  confidence: number;
  isRecognized: boolean;
  handCount: number;
  statusMessage: string;
  details?: {
    fingerStates: {
      thumb: 'extended' | 'curled' | 'touching';
      index: 'extended' | 'curled';
      middle: 'extended' | 'curled';
      ring: 'extended' | 'curled';
      pinky: 'extended' | 'curled';
    };
    handOrientation: 'up' | 'down' | 'left' | 'right' | 'forward';
  };
}

// Distance helper between two 3D/2D landmark points
function dist(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// 2D distance helper
function dist2D(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * High-accuracy, scale-invariant geometric Indian Sign Language (ISL) classifier.
 * Evaluates finger articulation, joint curling ratios, and spatial relationships.
 */
export function classifyISLGesture(
  landmarks: LandmarkPoint[],
  handCount: number = 1
): GestureClassification {
  if (!landmarks || landmarks.length < 21) {
    return {
      gesture: 'No Hand Detected',
      confidence: 0,
      isRecognized: false,
      handCount: 0,
      statusMessage: 'Please bring your hand clearly into the camera frame.',
    };
  }

  // Key joints:
  // 0: Wrist
  // 1: Thumb CMC, 2: Thumb MCP, 3: Thumb IP, 4: Thumb TIP
  // 5: Index MCP, 6: Index PIP, 7: Index DIP, 8: Index TIP
  // 9: Middle MCP, 10: Middle PIP, 11: Middle DIP, 12: Middle TIP
  // 13: Ring MCP, 14: Ring PIP, 15: Ring DIP, 16: Ring TIP
  // 17: Pinky MCP, 18: Pinky PIP, 19: Pinky DIP, 20: Pinky TIP

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];

  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexDip = landmarks[7];
  const indexTip = landmarks[8];

  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleTip = landmarks[12];

  const ringMcp = landmarks[13];
  const ringPip = landmarks[14];
  const ringTip = landmarks[16];

  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyTip = landmarks[20];

  // Palm reference scale (Wrist to Middle MCP distance)
  const palmScale = Math.max(0.04, dist2D(wrist, middleMcp));

  // Finger extension evaluation:
  // A finger is extended if TIP is significantly farther from wrist than PIP and MCP,
  // and TIP.y is higher (smaller value) than PIP.y when hand is pointing up.
  // We use both Euclidean distance from wrist and relative vertical coordinate.
  const isIndexExtended =
    dist2D(indexTip, wrist) > dist2D(indexPip, wrist) * 1.15 &&
    dist2D(indexTip, indexMcp) > palmScale * 0.75 &&
    indexTip.y < indexPip.y + palmScale * 0.2;

  const isMiddleExtended =
    dist2D(middleTip, wrist) > dist2D(middlePip, wrist) * 1.15 &&
    dist2D(middleTip, middleMcp) > palmScale * 0.75 &&
    middleTip.y < middlePip.y + palmScale * 0.2;

  const isRingExtended =
    dist2D(ringTip, wrist) > dist2D(ringPip, wrist) * 1.15 &&
    dist2D(ringTip, ringMcp) > palmScale * 0.75 &&
    ringTip.y < ringPip.y + palmScale * 0.2;

  const isPinkyExtended =
    dist2D(pinkyTip, wrist) > dist2D(pinkyPip, wrist) * 1.15 &&
    dist2D(pinkyTip, pinkyMcp) > palmScale * 0.65 &&
    pinkyTip.y < pinkyPip.y + palmScale * 0.2;

  // Thumb analysis:
  // Thumb points upwards / extended if thumbTip is away from palm center and higher than MCP
  const thumbToMiddleMcp = dist2D(thumbTip, middleMcp) / palmScale;
  const thumbToIndexMcp = dist2D(thumbTip, indexMcp) / palmScale;
  const thumbToIndexTip = dist2D(thumbTip, indexTip) / palmScale;

  const isThumbExtendedUp =
    thumbTip.y < thumbMcp.y - palmScale * 0.3 &&
    thumbToMiddleMcp > 0.65;

  const isThumbExtendedSide =
    thumbToMiddleMcp > 0.85 &&
    dist2D(thumbTip, wrist) > palmScale * 0.8;

  const isThumbTouchingIndex = thumbToIndexTip < 0.38;

  const isThumbCurled =
    thumbToMiddleMcp < 0.65 ||
    (thumbTip.y >= thumbMcp.y && thumbToIndexTip > 0.4);

  // Finger curl metrics (0 = fully extended, 1 = curled)
  const indexCurl = Math.min(1, Math.max(0, (dist2D(indexPip, wrist) - dist2D(indexTip, wrist) + palmScale) / (palmScale * 1.5)));
  const middleCurl = Math.min(1, Math.max(0, (dist2D(middlePip, wrist) - dist2D(middleTip, wrist) + palmScale) / (palmScale * 1.5)));
  const ringCurl = Math.min(1, Math.max(0, (dist2D(ringPip, wrist) - dist2D(ringTip, wrist) + palmScale) / (palmScale * 1.5)));
  const pinkyCurl = Math.min(1, Math.max(0, (dist2D(pinkyPip, wrist) - dist2D(pinkyTip, wrist) + palmScale) / (palmScale * 1.5)));

  // Distance between adjacent extended fingertips (spread)
  const indexMiddleDist = dist2D(indexTip, middleTip) / palmScale;
  const middleRingDist = dist2D(middleTip, ringTip) / palmScale;

  // Hand orientation: vertical tilt
  const isUpright = wrist.y > middleMcp.y;

  // MULTI-HAND DETECTION (e.g. 2 hands for Namaste)
  if (handCount >= 2) {
    return {
      gesture: 'Namaste',
      confidence: 0.96,
      isRecognized: true,
      handCount,
      statusMessage: 'Two-hand greeting gesture recognized: Namaste 🙏',
    };
  }

  // --- SINGLE HAND GESTURE RULES ---

  // 1. INDEX FINGER / ONE / POINTING
  // Index extended, Middle, Ring, Pinky curled
  if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    // Check if thumb is extended sideways to form "L"
    if (isThumbExtendedSide && thumbToIndexMcp > 0.8 && dist2D(thumbTip, indexTip) > palmScale * 1.1) {
      return {
        gesture: 'Letter L',
        confidence: 0.94,
        isRecognized: true,
        handCount,
        statusMessage: 'Letter "L" / 90° angle handshape recognized.',
      };
    }

    return {
      gesture: 'Index Finger (1)',
      confidence: 0.96,
      isRecognized: true,
      handCount,
      statusMessage: 'Index finger extended: Sign for Number 1 / Point.',
    };
  }

  // 2. PEACE / VICTORY / TWO
  // Index & Middle extended, Ring & Pinky curled
  if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    const isVSpread = indexMiddleDist > 0.35;
    return {
      gesture: isVSpread ? 'Peace (2)' : 'Number 2',
      confidence: 0.95,
      isRecognized: true,
      handCount,
      statusMessage: isVSpread
        ? 'V-shape Peace / Victory gesture recognized.'
        : 'Index & Middle fingers extended: Sign for Number 2.',
    };
  }

  // 3. NUMBER THREE (Index, Middle, Ring extended, Pinky curled)
  if (isIndexExtended && isMiddleExtended && isRingExtended && !isPinkyExtended) {
    return {
      gesture: 'Number 3 / Water',
      confidence: 0.93,
      isRecognized: true,
      handCount,
      statusMessage: 'Three fingers extended: Sign for Number 3 / Water.',
    };
  }

  // 4. NUMBER FOUR (Index, Middle, Ring, Pinky extended, Thumb folded)
  if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && isThumbCurled) {
    return {
      gesture: 'Number 4',
      confidence: 0.94,
      isRecognized: true,
      handCount,
      statusMessage: 'Four fingers upright: Sign for Number 4.',
    };
  }

  // 5. HELLO / FIVE / OPEN PALM
  // All 5 fingers extended and spread upright
  if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && (isThumbExtendedSide || isThumbExtendedUp)) {
    // Check if fingers are held closely together (flat hand) vs spread
    const fingersTogether = indexMiddleDist < 0.38 && middleRingDist < 0.38;
    if (fingersTogether) {
      return {
        gesture: 'Namaste',
        confidence: 0.95,
        isRecognized: true,
        handCount,
        statusMessage: 'Vertical flat palm salute: Sign for Namaste / Welcome.',
      };
    }
    return {
      gesture: 'Hello (5)',
      confidence: 0.97,
      isRecognized: true,
      handCount,
      statusMessage: 'Open palm wave: Sign for Hello / Number 5.',
    };
  }

  // 6. GOOD / THUMBS UP
  // Thumb extended upright, all 4 fingers curled
  if (isThumbExtendedUp && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    return {
      gesture: 'Good / Thumbs Up',
      confidence: 0.96,
      isRecognized: true,
      handCount,
      statusMessage: 'Thumbs up gesture: Sign for Good / Affirmative.',
    };
  }

  // 7. BAD / THUMBS DOWN
  // Thumb pointing downward, 4 fingers curled
  if (
    thumbTip.y > thumbMcp.y + palmScale * 0.4 &&
    !isIndexExtended &&
    !isMiddleExtended &&
    !isRingExtended &&
    !isPinkyExtended
  ) {
    return {
      gesture: 'Bad / Thumbs Down',
      confidence: 0.92,
      isRecognized: true,
      handCount,
      statusMessage: 'Thumbs down gesture: Sign for Bad / Negative.',
    };
  }

  // 8. OKAY / O-HANDSHAPE
  // Thumb tip and Index tip touching, other fingers extended or curved
  if (isThumbTouchingIndex && (isMiddleExtended || middleCurl < 0.6)) {
    return {
      gesture: 'Okay / Perfect',
      confidence: 0.95,
      isRecognized: true,
      handCount,
      statusMessage: 'Thumb and index loop: Sign for Okay / Perfect.',
    };
  }

  // 9. I LOVE YOU (ILY)
  // Thumb, Index, and Pinky extended; Middle and Ring curled
  if (
    (isThumbExtendedSide || isThumbExtendedUp) &&
    isIndexExtended &&
    !isMiddleExtended &&
    !isRingExtended &&
    isPinkyExtended
  ) {
    return {
      gesture: 'I Love You',
      confidence: 0.96,
      isRecognized: true,
      handCount,
      statusMessage: 'ILY sign: Thumb, Index & Pinky extended.',
    };
  }

  // 10. ROCK / HORNS
  // Index and Pinky extended; Middle, Ring, and Thumb curled
  if (
    isIndexExtended &&
    !isMiddleExtended &&
    !isRingExtended &&
    isPinkyExtended &&
    !isThumbExtendedSide
  ) {
    return {
      gesture: 'Rock / Horns',
      confidence: 0.91,
      isRecognized: true,
      handCount,
      statusMessage: 'Index and Pinky extended (Rock on).',
    };
  }

  // 11. CALL ME / PHONE
  // Thumb and Pinky extended, Index, Middle, Ring curled
  if (
    (isThumbExtendedSide || isThumbExtendedUp) &&
    !isIndexExtended &&
    !isMiddleExtended &&
    !isRingExtended &&
    isPinkyExtended
  ) {
    return {
      gesture: 'Call Me / Phone',
      confidence: 0.94,
      isRecognized: true,
      handCount,
      statusMessage: 'Thumb and Pinky extended: Sign for Call / Phone.',
    };
  }

  // 12. YES / FIST (ISL Letter S / Fist nod)
  // All fingers curled tight
  if (
    !isIndexExtended &&
    !isMiddleExtended &&
    !isRingExtended &&
    !isPinkyExtended &&
    isThumbCurled
  ) {
    return {
      gesture: 'Yes / Fist',
      confidence: 0.93,
      isRecognized: true,
      handCount,
      statusMessage: 'Curled fist: Sign for Yes / Letter S.',
    };
  }

  // 13. NO / PINCH (Index and Middle curled down touching thumb)
  if (
    thumbToIndexTip < 0.45 &&
    dist2D(thumbTip, middleTip) / palmScale < 0.45 &&
    !isRingExtended &&
    !isPinkyExtended
  ) {
    return {
      gesture: 'No (Tap)',
      confidence: 0.91,
      isRecognized: true,
      handCount,
      statusMessage: 'Two fingers tapping thumb: Sign for No.',
    };
  }

  // 14. HELP / PLEASE / FLAT PALM
  if (
    indexTip.y < indexPip.y &&
    middleTip.y < middlePip.y &&
    ringTip.y < ringPip.y &&
    pinkyTip.y < pinkyPip.y
  ) {
    return {
      gesture: 'Thank You',
      confidence: 0.88,
      isRecognized: true,
      handCount,
      statusMessage: 'Flat hand salute: Sign for Thank You / Please.',
    };
  }

  // Fallback for partial / transition poses
  return {
    gesture: 'Analyzing Pose...',
    confidence: 0.45,
    isRecognized: false,
    handCount,
    statusMessage: 'Hand detected. Articulate gesture clearly towards camera.',
  };
}
