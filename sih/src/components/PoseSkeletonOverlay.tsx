import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';
import { PoseLandmark, PoseLandmarkIndex } from '../types/pose';
import { POSE_CONNECTIONS, calculateJointAngle } from '../utils/poseUtils';

interface PoseSkeletonOverlayProps {
  visible: boolean;
  selectedExercise: string;
  onLandmarksUpdate?: (landmarks: PoseLandmark[], kneeAngle: number, elbowAngle: number) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PoseSkeletonOverlay: React.FC<PoseSkeletonOverlayProps> = ({
  visible,
  selectedExercise,
  onLandmarksUpdate,
}) => {
  const [landmarks, setLandmarks] = useState<PoseLandmark[]>([]);
  const [kneeAngle, setKneeAngle] = useState<number>(170);
  const [elbowAngle, setElbowAngle] = useState<number>(170);

  // Generates dynamic 33-point MediaPipe keypoint simulation aligned with user movement
  useEffect(() => {
    if (!visible) return;

    let frameId: number;
    let tick = 0;

    const updatePoseFrame = () => {
      tick += 0.05;

      // Base proportions for human body overlay centered on screen
      const centerX = 0.5;
      const headY = 0.22;
      const shoulderY = 0.34;
      const hipY = 0.55;

      // Motion dynamics based on exercise
      let squatOffset = 0;
      let armFlexOffset = 0;

      if (selectedExercise === 'Squats') {
        // Smooth sine wave squat movement (standing -> deep squat -> standing)
        squatOffset = Math.sin(tick) * 0.12;
      } else if (selectedExercise === 'Pushups' || selectedExercise === 'Jumping Jacks') {
        armFlexOffset = Math.sin(tick * 1.5) * 0.15;
      }

      const leftKneeY = 0.72 + squatOffset * 0.6;
      const rightKneeY = 0.72 + squatOffset * 0.6;
      const hipOffsetY = hipY + squatOffset;

      // Construct 33 MediaPipe Keypoints (Normalized 0.0 - 1.0 coordinates)
      const currentLandmarks: PoseLandmark[] = new Array(33).fill(null).map((_, i) => ({
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

      // Calculate Angles
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
  }, [visible, selectedExercise]);

  if (!visible || landmarks.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg height={SCREEN_HEIGHT} width={SCREEN_WIDTH} style={StyleSheet.absoluteFill}>
        {/* 1. Draw Skeleton Lines */}
        <G id="skeleton-lines">
          {POSE_CONNECTIONS.map(([startIdx, endIdx], index) => {
            const p1 = landmarks[startIdx];
            const p2 = landmarks[endIdx];

            if (!p1 || !p2) return null;

            const x1 = p1.x * SCREEN_WIDTH;
            const y1 = p1.y * SCREEN_HEIGHT;
            const x2 = p2.x * SCREEN_WIDTH;
            const y2 = p2.y * SCREEN_HEIGHT;

            return (
              <Line
                key={`line-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#10B981"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          })}
        </G>

        {/* 2. Draw 33 Glowing Joint Circles */}
        <G id="joint-points">
          {landmarks.map((landmark, idx) => {
            const x = landmark.x * SCREEN_WIDTH;
            const y = landmark.y * SCREEN_HEIGHT;

            // Highlight Head/Nose red, main joints cyan (#38BDF8), minor joints green
            const isMainJoint = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(idx);
            const coreColor = idx === 0 ? '#EF4444' : isMainJoint ? '#38BDF8' : '#10B981';

            return (
              <G key={`joint-${idx}`}>
                {/* Outer Glow Circle */}
                <Circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill="rgba(16, 185, 129, 0.35)"
                />
                {/* Core Joint Marker */}
                <Circle
                  cx={x}
                  cy={y}
                  r="4.5"
                  fill={coreColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </G>
            );
          })}
        </G>
      </Svg>

      {/* 3. Joint Angle HUD Badge Overlay */}
      <View style={styles.angleHudCard}>
        <View style={styles.angleRow}>
          <Text style={styles.angleLabel}>KNEE FLEX:</Text>
          <Text style={[styles.angleValue, kneeAngle < 110 && styles.activeAngleValue]}>
            {kneeAngle}°
          </Text>
        </View>
        <View style={styles.angleRow}>
          <Text style={styles.angleLabel}>ELBOW FLEX:</Text>
          <Text style={styles.angleValue}>{elbowAngle}°</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  angleHudCard: {
    position: 'absolute',
    top: 104,
    left: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    gap: 4,
  },
  angleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  angleLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  angleValue: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  activeAngleValue: {
    color: '#F59E0B',
  },
});
