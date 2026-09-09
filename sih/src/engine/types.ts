import { PoseLandmark, PoseLandmarkIndex } from '../types/pose';

export { PoseLandmark, PoseLandmarkIndex };

export type ExercisePhase =
  | 'IDLE'
  | 'START'
  | 'DESCENDING'
  | 'BOTTOM'
  | 'ASCENDING'
  | 'COMPLETED';

export type FormSeverity = 'info' | 'warning' | 'error';

export interface BodyMetrics {
  shoulderWidth: number;
  hipWidth: number;
  torsoLength: number;
  leftArmLength: number;
  rightArmLength: number;
  leftLegLength: number;
  rightLegLength: number;
  isSideView: boolean;
  leftSideVisible: boolean;
  rightSideVisible: boolean;
  scaleFactor: number;
}

export interface FormError {
  ruleId: string;
  message: string;        // Voice message (e.g. "Narrow your elbows.")
  visualMessage: string;  // Visual banner (e.g. "⚠️ Narrow your elbows")
  severity: FormSeverity;
  priority: number;       // Higher number = higher priority
  highlightJoints?: number[];
  timestamp?: number;
}

export interface FormRuleConfig {
  id: string;
  name: string;
  priority: number;
  cooldownMs: number;
  persistenceMs: number;
  voiceMessage: string;
  visualMessage: string;
  highlightJoints: number[];
}

export interface VisibilityStatus {
  isFullyVisible: boolean;
  guidanceMessage?: string;
  missingJoints: string[];
  confidence: number;
}

export interface ExerciseAnalysisResult {
  exerciseName: string;
  phase: ExercisePhase;
  repCount: number;
  perfectReps: number;
  formAccuracyScore: number;
  activeErrors: FormError[];
  primaryFeedback: FormError | null;
  isGoodForm: boolean;
  visibilityStatus: VisibilityStatus;
  metrics: {
    primaryAngle: number;
    secondaryAngle?: number;
    hipAngle?: number;
    elbowWidthRatio?: number;
    elbowFlareAngle?: number;
    lowestAngleInRep?: number;
    [key: string]: number | string | undefined;
  };
  highlightJoints: number[];
}

export interface FeedbackEvent {
  ruleId: string;
  voiceMessage: string;
  visualMessage: string;
  severity: FormSeverity;
  timestamp: number;
}
