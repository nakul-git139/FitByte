import { PoseLandmark, PoseLandmarkIndex } from '../types/pose';

/**
 * MediaPipe Pose 33 Keypoints Skeleton Connections
 */
export const POSE_CONNECTIONS: [number, number][] = [
  // Torso & Spine
  [PoseLandmarkIndex.LEFT_SHOULDER, PoseLandmarkIndex.RIGHT_SHOULDER],
  [PoseLandmarkIndex.LEFT_SHOULDER, PoseLandmarkIndex.LEFT_HIP],
  [PoseLandmarkIndex.RIGHT_SHOULDER, PoseLandmarkIndex.RIGHT_HIP],
  [PoseLandmarkIndex.LEFT_HIP, PoseLandmarkIndex.RIGHT_HIP],

  // Left Arm
  [PoseLandmarkIndex.LEFT_SHOULDER, PoseLandmarkIndex.LEFT_ELBOW],
  [PoseLandmarkIndex.LEFT_ELBOW, PoseLandmarkIndex.LEFT_WRIST],

  // Right Arm
  [PoseLandmarkIndex.RIGHT_SHOULDER, PoseLandmarkIndex.RIGHT_ELBOW],
  [PoseLandmarkIndex.RIGHT_ELBOW, PoseLandmarkIndex.RIGHT_WRIST],

  // Left Leg
  [PoseLandmarkIndex.LEFT_HIP, PoseLandmarkIndex.LEFT_KNEE],
  [PoseLandmarkIndex.LEFT_KNEE, PoseLandmarkIndex.LEFT_ANKLE],
  [PoseLandmarkIndex.LEFT_ANKLE, PoseLandmarkIndex.LEFT_HEEL],

  // Right Leg
  [PoseLandmarkIndex.RIGHT_HIP, PoseLandmarkIndex.RIGHT_KNEE],
  [PoseLandmarkIndex.RIGHT_KNEE, PoseLandmarkIndex.RIGHT_ANKLE],
  [PoseLandmarkIndex.RIGHT_ANKLE, PoseLandmarkIndex.RIGHT_HEEL],

  // Face
  [PoseLandmarkIndex.NOSE, PoseLandmarkIndex.LEFT_EYE],
  [PoseLandmarkIndex.NOSE, PoseLandmarkIndex.RIGHT_EYE],
  [PoseLandmarkIndex.LEFT_EYE, PoseLandmarkIndex.LEFT_EAR],
  [PoseLandmarkIndex.RIGHT_EYE, PoseLandmarkIndex.RIGHT_EAR],
];

/**
 * Calculate the interior angle (in degrees) formed by three 2D/3D points (Point A -> Point B (Joint Vertex) -> Point C).
 * Example: Knee Angle = calculateJointAngle(hip, knee, ankle)
 */
export function calculateJointAngle(
  firstPoint: PoseLandmark,
  vertexPoint: PoseLandmark,
  thirdPoint: PoseLandmark
): number {
  const radians =
    Math.atan2(thirdPoint.y - vertexPoint.y, thirdPoint.x - vertexPoint.x) -
    Math.atan2(firstPoint.y - vertexPoint.y, firstPoint.x - vertexPoint.x);

  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return Math.round(angle);
}
