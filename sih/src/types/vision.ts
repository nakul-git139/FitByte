export interface PoseJointData {
  kneeAngle?: number;
  elbowAngle?: number;
  hipAngle?: number;
  backAngle?: number;
  armAngle?: number;
  [key: string]: number | undefined;
}

export interface GeminiVisionRequest {
  exercise: string;
  repNumber: number;
  localFormScore: number;
  detectedIssues: string[];
  poseData: PoseJointData;
  imageBase64?: string;
  mimeType?: string;
  keyframeReason?: 'deepest_position' | 'form_issue' | 'start_position' | 'end_position' | 'milestone';
  timestamp?: number;
}

export interface VisionIssue {
  issue: string;
  severity: 'minor' | 'moderate' | 'major';
  suggestion: string;
}

export interface GeminiVisionResponse {
  assessment: 'good' | 'needs_improvement';
  confidence: number;
  issues: VisionIssue[];
  overallSuggestion: string;
  isFallback?: boolean;
}

export interface VisionCoachingTip {
  text: string;
  assessment: 'good' | 'needs_improvement';
  confidence: number;
  timestamp: number;
  repNumber: number;
}
