import { PoseLandmark, PoseLandmarkIndex, BodyMetrics, VisibilityStatus } from '../types';

export class LandmarkProcessor {
  private smoothedLandmarks: PoseLandmark[] | null = null;
  private smoothingAlpha: number = 0.65; // Weight for new landmark frame

  /**
   * Smooths incoming raw landmarks using Exponential Moving Average (EMA).
   */
  public smooth(rawLandmarks: PoseLandmark[]): PoseLandmark[] {
    if (!rawLandmarks || rawLandmarks.length === 0) {
      this.smoothedLandmarks = null;
      return [];
    }

    if (!this.smoothedLandmarks || this.smoothedLandmarks.length !== rawLandmarks.length) {
      this.smoothedLandmarks = rawLandmarks.map((p) => ({ ...p }));
      return this.smoothedLandmarks;
    }

    const smoothed: PoseLandmark[] = [];
    for (let i = 0; i < rawLandmarks.length; i++) {
      const prev = this.smoothedLandmarks[i];
      const curr = rawLandmarks[i];

      const x = prev.x * (1 - this.smoothingAlpha) + curr.x * this.smoothingAlpha;
      const y = prev.y * (1 - this.smoothingAlpha) + curr.y * this.smoothingAlpha;
      const z = (prev.z || 0) * (1 - this.smoothingAlpha) + (curr.z || 0) * this.smoothingAlpha;
      const visibility = curr.visibility !== undefined ? curr.visibility : 1.0;

      const pt: PoseLandmark = { x, y, z, visibility };
      smoothed.push(pt);
    }

    this.smoothedLandmarks = smoothed;
    return smoothed;
  }

  public reset(): void {
    this.smoothedLandmarks = null;
  }

  /**
   * Check if landmark is inside viewport with sufficient visibility confidence.
   */
  public isVisible(lm?: PoseLandmark, minVisibility: number = 0.35): boolean {
    if (!lm) return false;
    const vis = lm.visibility !== undefined ? lm.visibility : 1.0;
    return (
      lm.x >= 0.01 &&
      lm.x <= 0.99 &&
      lm.y >= 0.01 &&
      lm.y <= 0.99 &&
      vis >= minVisibility
    );
  }

  /**
   * 2D Euclidean Distance between two landmarks.
   */
  public getDistance2D(p1: PoseLandmark, p2: PoseLandmark): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Midpoint between two landmarks.
   */
  public getMidpoint(p1: PoseLandmark, p2: PoseLandmark): PoseLandmark {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
      z: ((p1.z || 0) + (p2.z || 0)) / 2,
      visibility: Math.min(p1.visibility ?? 1, p2.visibility ?? 1),
    };
  }

  /**
   * Calculates the interior joint angle in degrees (0° - 180°) for point A -> vertex B -> point C.
   */
  public calculateAngle(
    pointA: PoseLandmark,
    vertexB: PoseLandmark,
    pointC: PoseLandmark
  ): number {
    if (!this.isVisible(pointA) || !this.isVisible(vertexB) || !this.isVisible(pointC)) {
      return 0;
    }

    const rad =
      Math.atan2(pointC.y - vertexB.y, pointC.x - vertexB.x) -
      Math.atan2(pointA.y - vertexB.y, pointA.x - vertexB.x);

    let deg = Math.abs((rad * 180.0) / Math.PI);
    if (deg > 180.0) {
      deg = 360.0 - deg;
    }

    return Math.round(deg);
  }

  /**
   * Torso to Upper Arm Abduction Angle (Angle between Torso line [Hip -> Shoulder] and Arm line [Shoulder -> Elbow]).
   * An angle around 30°-50° indicates safe pushup form; > 70° indicates flared/wide elbows.
   */
  public calculateAbductionAngle(
    hip: PoseLandmark,
    shoulder: PoseLandmark,
    elbow: PoseLandmark
  ): number {
    if (!this.isVisible(hip) || !this.isVisible(shoulder) || !this.isVisible(elbow)) {
      return 0;
    }

    // Vector from Shoulder to Hip (torso downward)
    const vTorsoX = hip.x - shoulder.x;
    const vTorsoY = hip.y - shoulder.y;

    // Vector from Shoulder to Elbow (upper arm)
    const vArmX = elbow.x - shoulder.x;
    const vArmY = elbow.y - shoulder.y;

    const dot = vTorsoX * vArmX + vTorsoY * vArmY;
    const magTorso = Math.sqrt(vTorsoX * vTorsoX + vTorsoY * vTorsoY);
    const magArm = Math.sqrt(vArmX * vArmX + vArmY * vArmY);

    if (magTorso === 0 || magArm === 0) return 0;

    let cosTheta = dot / (magTorso * magArm);
    cosTheta = Math.max(-1, Math.min(1, cosTheta));

    return Math.round((Math.acos(cosTheta) * 180.0) / Math.PI);
  }

  /**
   * Evaluates overall body visibility and missing joints for specific exercise.
   */
  public checkVisibility(
    landmarks: PoseLandmark[],
    requiredIndices: number[],
    minConfidence: number = 0.35
  ): VisibilityStatus {
    if (!landmarks || landmarks.length < 33) {
      return {
        isFullyVisible: false,
        guidanceMessage: 'Move back so your full body is visible.',
        missingJoints: ['Full Body'],
        confidence: 0,
      };
    }

    const missingJoints: string[] = [];
    let visibleCount = 0;

    const jointNames: Record<number, string> = {
      [PoseLandmarkIndex.LEFT_SHOULDER]: 'Left Shoulder',
      [PoseLandmarkIndex.RIGHT_SHOULDER]: 'Right Shoulder',
      [PoseLandmarkIndex.LEFT_ELBOW]: 'Left Elbow',
      [PoseLandmarkIndex.RIGHT_ELBOW]: 'Right Elbow',
      [PoseLandmarkIndex.LEFT_WRIST]: 'Left Wrist',
      [PoseLandmarkIndex.RIGHT_WRIST]: 'Right Wrist',
      [PoseLandmarkIndex.LEFT_HIP]: 'Left Hip',
      [PoseLandmarkIndex.RIGHT_HIP]: 'Right Hip',
      [PoseLandmarkIndex.LEFT_KNEE]: 'Left Knee',
      [PoseLandmarkIndex.RIGHT_KNEE]: 'Right Knee',
      [PoseLandmarkIndex.LEFT_ANKLE]: 'Left Ankle',
      [PoseLandmarkIndex.RIGHT_ANKLE]: 'Right Ankle',
    };

    for (const idx of requiredIndices) {
      const pt = landmarks[idx];
      if (this.isVisible(pt, minConfidence)) {
        visibleCount++;
      } else {
        missingJoints.push(jointNames[idx] || `Joint #${idx}`);
      }
    }

    const confidence = visibleCount / requiredIndices.length;
    const isFullyVisible = confidence >= 0.75; // At least 75% required joints visible

    let guidanceMessage: string | undefined;
    if (!isFullyVisible) {
      if (missingJoints.some((j) => j.includes('Ankle') || j.includes('Knee'))) {
        guidanceMessage = 'Move back so your legs and feet are visible.';
      } else if (missingJoints.some((j) => j.includes('Shoulder') || j.includes('Elbow'))) {
        guidanceMessage = 'Adjust camera so your upper body is in frame.';
      } else {
        guidanceMessage = 'Move back so your full body is visible.';
      }
    }

    return {
      isFullyVisible,
      guidanceMessage,
      missingJoints,
      confidence,
    };
  }

  /**
   * Computes normalized body metrics (shoulder width, torso length, scale factor).
   */
  public extractBodyMetrics(landmarks: PoseLandmark[]): BodyMetrics {
    const leftShoulder = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
    const leftHip = landmarks[PoseLandmarkIndex.LEFT_HIP];
    const rightHip = landmarks[PoseLandmarkIndex.RIGHT_HIP];
    const leftElbow = landmarks[PoseLandmarkIndex.LEFT_ELBOW];
    const rightElbow = landmarks[PoseLandmarkIndex.RIGHT_ELBOW];
    const leftWrist = landmarks[PoseLandmarkIndex.LEFT_WRIST];
    const rightWrist = landmarks[PoseLandmarkIndex.RIGHT_WRIST];
    const leftKnee = landmarks[PoseLandmarkIndex.LEFT_KNEE];
    const rightKnee = landmarks[PoseLandmarkIndex.RIGHT_KNEE];

    const leftSideVisible =
      this.isVisible(leftShoulder) && this.isVisible(leftHip);
    const rightSideVisible =
      this.isVisible(rightShoulder) && this.isVisible(rightHip);

    let shoulderWidth = 0;
    if (this.isVisible(leftShoulder) && this.isVisible(rightShoulder)) {
      shoulderWidth = this.getDistance2D(leftShoulder, rightShoulder);
    }

    let hipWidth = 0;
    if (this.isVisible(leftHip) && this.isVisible(rightHip)) {
      hipWidth = this.getDistance2D(leftHip, rightHip);
    }

    // Torso length (Mid-Shoulder to Mid-Hip)
    let torsoLength = 0;
    if (leftSideVisible && rightSideVisible) {
      const midShoulder = this.getMidpoint(leftShoulder, rightShoulder);
      const midHip = this.getMidpoint(leftHip, rightHip);
      torsoLength = this.getDistance2D(midShoulder, midHip);
    } else if (leftSideVisible) {
      torsoLength = this.getDistance2D(leftShoulder, leftHip);
    } else if (rightSideVisible) {
      torsoLength = this.getDistance2D(rightShoulder, rightHip);
    }

    // Is user in side profile / side view?
    // In side view, shoulderWidth is very small relative to torsoLength (< 0.35x torso)
    const isSideView =
      torsoLength > 0 && shoulderWidth > 0 && shoulderWidth / torsoLength < 0.35;

    // Normalize arm lengths
    const leftArmLength =
      this.isVisible(leftShoulder) && this.isVisible(leftElbow) && this.isVisible(leftWrist)
        ? this.getDistance2D(leftShoulder, leftElbow) + this.getDistance2D(leftElbow, leftWrist)
        : 0;

    const rightArmLength =
      this.isVisible(rightShoulder) && this.isVisible(rightElbow) && this.isVisible(rightWrist)
        ? this.getDistance2D(rightShoulder, rightElbow) + this.getDistance2D(rightElbow, rightWrist)
        : 0;

    const leftLegLength =
      this.isVisible(leftHip) && this.isVisible(leftKnee)
        ? this.getDistance2D(leftHip, leftKnee)
        : 0;

    const rightLegLength =
      this.isVisible(rightHip) && this.isVisible(rightKnee)
        ? this.getDistance2D(rightHip, rightKnee)
        : 0;

    // Scale Factor based on available robust body metric (shoulder width or torso length)
    const scaleFactor = torsoLength > 0 ? torsoLength : shoulderWidth > 0 ? shoulderWidth : 1.0;

    return {
      shoulderWidth,
      hipWidth,
      torsoLength,
      leftArmLength,
      rightArmLength,
      leftLegLength,
      rightLegLength,
      isSideView,
      leftSideVisible,
      rightSideVisible,
      scaleFactor,
    };
  }
}
