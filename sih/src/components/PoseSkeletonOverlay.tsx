import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';
import { PoseLandmark, PoseLandmarkIndex } from '../types/pose';
import { POSE_CONNECTIONS, calculateJointAngle } from '../utils/poseUtils';

interface PoseSkeletonOverlayProps {
  visible: boolean;
  selectedExercise: string;
  highlightJoints?: number[];
  isGoodForm?: boolean;
  onLandmarksUpdate?: (landmarks: PoseLandmark[], kneeAngle: number, elbowAngle: number) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PoseSkeletonOverlay: React.FC<PoseSkeletonOverlayProps> = ({
  visible,
  selectedExercise,
  highlightJoints = [],
  isGoodForm = true,
  onLandmarksUpdate,
}) => {
  const [landmarks, setLandmarks] = useState<PoseLandmark[]>([]);
  const [kneeAngle, setKneeAngle] = useState<number>(170);
  const [elbowAngle, setElbowAngle] = useState<number>(170);

  useEffect(() => {
    if (!visible) return;

    let frameId: number;
    let tick = 0;

    const updatePoseFrame = () => {
      tick += 0.05;

      const centerX = 0.5;
      const headY = 0.22;
      const shoulderY = 0.34;
      const hipY = 0.55;

      let squatOffset = 0;
      let armFlexOffset = 0;

      if (selectedExercise === 'Squats') {
        squatOffset = Math.sin(tick) * 0.12;
      } else if (selectedExercise === 'Pushups' || selectedExercise === 'Jumping Jacks') {
        armFlexOffset = Math.sin(tick * 1.5) * 0.15;
      }

      const leftKneeY = 0.72 + squatOffset * 0.6;
      const rightKneeY = 0.72 + squatOffset * 0.6;
      const hipOffsetY = hipY + squatOffset;

      const currentLandmarks: PoseLandmark[] = new Array(33).fill(null).map(() => ({
        x: centerX,
        y: headY,
        z: 0,
        visibility: 0.95,
      }));

      // 0: Nose
      currentLandmarks[PoseLandmarkIndex.NOSE] = { x: centerX, y: headY, z: 0, visibility: 0.99 };
      // 1-3: Left Eye / Ear
      currentLandmarks[PoseLandmarkIndex.LEFT_EYE] = { x: centerX - 0.03, y: headY - 0.02, z: 0, visibility: 0.9 };
      currentLandmarks[PoseLandmarkIndex.LEFT_EAR] = { x: centerX - 0.07, y: headY, z: 0, visibility: 0.9 };
      // 4-6: Right Eye / Ear
      currentLandmarks[PoseLandmarkIndex.RIGHT_EYE] = { x: centerX + 0.03, y: headY - 0.02, z: 0, visibility: 0.9 };
      currentLandmarks[PoseLandmarkIndex.RIGHT_EAR] = { x: centerX + 0.07, y: headY, z: 0, visibility: 0.9 };

      // Shoulders
      currentLandmarks[PoseLandmarkIndex.LEFT_SHOULDER] = { x: centerX - 0.18, y: shoulderY, z: 0, visibility: 0.98 };
      currentLandmarks[PoseLandmarkIndex.RIGHT_SHOULDER] = { x: centerX + 0.18, y: shoulderY, z: 0, visibility: 0.98 };

      // Elbows & Wrists
      currentLandmarks[PoseLandmarkIndex.LEFT_ELBOW] = { x: centerX - 0.26 - armFlexOffset, y: shoulderY + 0.12, z: 0, visibility: 0.95 };
      currentLandmarks[PoseLandmarkIndex.RIGHT_ELBOW] = { x: centerX + 0.26 + armFlexOffset, y: shoulderY + 0.12, z: 0, visibility: 0.95 };

      currentLandmarks[PoseLandmarkIndex.LEFT_WRIST] = { x: centerX - 0.24, y: shoulderY + 0.24, z: 0, visibility: 0.95 };
      currentLandmarks[PoseLandmarkIndex.RIGHT_WRIST] = { x: centerX + 0.24, y: shoulderY + 0.24, z: 0, visibility: 0.95 };

      // Hips
      currentLandmarks[PoseLandmarkIndex.LEFT_HIP] = { x: centerX - 0.12, y: hipOffsetY, z: 0, visibility: 0.98 };
      currentLandmarks[PoseLandmarkIndex.RIGHT_HIP] = { x: centerX + 0.12, y: hipOffsetY, z: 0, visibility: 0.98 };

      // Knees
      currentLandmarks[PoseLandmarkIndex.LEFT_KNEE] = { x: centerX - 0.15 - squatOffset * 0.4, y: leftKneeY, z: 0, visibility: 0.98 };
      currentLandmarks[PoseLandmarkIndex.RIGHT_KNEE] = { x: centerX + 0.15 + squatOffset * 0.4, y: rightKneeY, z: 0, visibility: 0.98 };

      // Ankles
      currentLandmarks[PoseLandmarkIndex.LEFT_ANKLE] = { x: centerX - 0.14, y: 0.88, z: 0, visibility: 0.95 };
      currentLandmarks[PoseLandmarkIndex.RIGHT_ANKLE] = { x: centerX + 0.14, y: 0.88, z: 0, visibility: 0.95 };

      const currentKneeAngle = calculateJointAngle(
        currentLandmarks[PoseLandmarkIndex.LEFT_HIP],
        currentLandmarks[PoseLandmarkIndex.LEFT_KNEE],
        currentLandmarks[PoseLandmarkIndex.LEFT_ANKLE]
      );

      const currentElbowAngle = calculateJointAngle(
        currentLandmarks[PoseLandmarkIndex.LEFT_SHOULDER],
        currentLandmarks[PoseLandmarkIndex.LEFT_ELBOW],
        currentLandmarks[PoseLandmarkIndex.LEFT_WRIST]
      );

      setLandmarks(currentLandmarks);
      setKneeAngle(currentKneeAngle);
      setElbowAngle(currentElbowAngle);

      if (onLandmarksUpdate) {
        onLandmarksUpdate(currentLandmarks, currentKneeAngle, currentElbowAngle);
      }

      frameId = requestAnimationFrame(updatePoseFrame);
    };

    frameId = requestAnimationFrame(updatePoseFrame);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [visible, selectedExercise, onLandmarksUpdate]);

  if (!visible || landmarks.length === 0) return null;

  const errorJointSet = new Set(highlightJoints);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg height={SCREEN_HEIGHT} width={SCREEN_WIDTH} style={StyleSheet.absoluteFill}>
        {/* 1. Skeleton Lines */}
        <G id="skeleton-lines">
          {POSE_CONNECTIONS.map(([startIdx, endIdx], index) => {
            const p1 = landmarks[startIdx];
            const p2 = landmarks[endIdx];

            if (!p1 || !p2) return null;

            const x1 = p1.x * SCREEN_WIDTH;
            const y1 = p1.y * SCREEN_HEIGHT;
            const x2 = p2.x * SCREEN_WIDTH;
            const y2 = p2.y * SCREEN_HEIGHT;

            const hasError = errorJointSet.has(startIdx) || errorJointSet.has(endIdx);
            const strokeColor = hasError ? '#EF4444' : isGoodForm ? '#10B981' : '#F59E0B';

            return (
              <Line
                key={`line-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth={hasError ? '4.5' : '3.5'}
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          })}
        </G>

        {/* 2. 33 Glowing Joint Markers */}
        <G id="joint-points">
          {landmarks.map((landmark, idx) => {
            const x = landmark.x * SCREEN_WIDTH;
            const y = landmark.y * SCREEN_HEIGHT;

            const isErrorJoint = errorJointSet.has(idx);
            const isMainJoint = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(idx);
            const coreColor = isErrorJoint
              ? '#EF4444'
              : idx === 0
              ? '#EF4444'
              : isMainJoint
              ? '#38BDF8'
              : '#10B981';

            const glowColor = isErrorJoint
              ? 'rgba(239, 68, 68, 0.65)'
              : 'rgba(16, 185, 129, 0.35)';

            return (
              <G key={`joint-${idx}`}>
                <Circle
                  cx={x}
                  cy={y}
                  r={isErrorJoint ? 12 : 8}
                  fill={glowColor}
                />
                <Circle
                  cx={x}
                  cy={y}
                  r={isErrorJoint ? 6 : 4.5}
                  fill={coreColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
};
