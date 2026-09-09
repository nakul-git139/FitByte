import { GeminiVisionRequest, GeminiVisionResponse, VisionCoachingTip } from '../types/vision';
import { ExercisePhase, FormError } from '../engine/types';
import { getBackendBaseUrl } from '../config/apiConfig';

const VISION_COOLDOWN_MS = 10000; // Minimum 10s cooldown between Gemini Vision calls

export class GeminiVisionService {
  private static lastCallTimestamp: number = 0;
  private static isRequestInFlight: boolean = false;
  private static lastCoachingTip: VisionCoachingTip | null = null;

  /**
   * Evaluates whether the current frame is a prime keyframe for Gemini Vision coaching
   */
  public static shouldAnalyzeFrame(
    phase: ExercisePhase,
    activeErrors: FormError[],
    repCount: number,
    timestamp: number = Date.now()
  ): { eligible: boolean; reason?: 'deepest_position' | 'form_issue' | 'milestone' } {
    // 1. Check in-flight and cooldown lock
    if (this.isRequestInFlight) {
      return { eligible: false };
    }

    if (timestamp - this.lastCallTimestamp < VISION_COOLDOWN_MS) {
      return { eligible: false };
    }

    // 2. Reason A: Form error detected during movement
    if (activeErrors.length > 0 && (phase === 'DESCENDING' || phase === 'BOTTOM' || phase === 'ASCENDING')) {
      return { eligible: true, reason: 'form_issue' };
    }

    // 3. Reason B: Reached deepest inflection point of a rep
    if (phase === 'BOTTOM') {
      return { eligible: true, reason: 'deepest_position' };
    }

    // 4. Reason C: First rep or periodic milestone
    if (repCount === 1 && phase === 'COMPLETED') {
      return { eligible: true, reason: 'milestone' };
    }

    return { eligible: false };
  }

  /**
   * Asynchronously dispatches keyframe data to backend Gemini Vision service
   */
  public static async analyzeKeyframe(
    requestData: GeminiVisionRequest,
    timestamp: number = Date.now()
  ): Promise<GeminiVisionResponse> {
    this.isRequestInFlight = true;
    this.lastCallTimestamp = timestamp;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const response = await fetch(`${getBackendBaseUrl()}/api/vision/analyze-frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Vision API error status: ${response.status}`);
      }

      const result: GeminiVisionResponse = await response.json();

      // Record coaching tip
      if (result.overallSuggestion) {
        this.lastCoachingTip = {
          text: result.overallSuggestion,
          assessment: result.assessment,
          confidence: result.confidence || 0.9,
          timestamp: Date.now(),
          repNumber: requestData.repNumber,
        };
      }

      return result;
    } catch (err: any) {
      console.warn(`[GeminiVisionService] Analysis failed or timed out (${err.message}). Using local fallback.`);
      const fallbackResult = this.createLocalFallbackResponse(requestData);
      
      this.lastCoachingTip = {
        text: fallbackResult.overallSuggestion,
        assessment: fallbackResult.assessment,
        confidence: fallbackResult.confidence,
        timestamp: Date.now(),
        repNumber: requestData.repNumber,
      };

      return fallbackResult;
    } finally {
      this.isRequestInFlight = false;
    }
  }

  public static getLastCoachingTip(): VisionCoachingTip | null {
    return this.lastCoachingTip;
  }

  public static clearCoachingTip(): void {
    this.lastCoachingTip = null;
  }

  private static createLocalFallbackResponse(request: GeminiVisionRequest): GeminiVisionResponse {
    const norm = (request.exercise || '').toLowerCase();
    const hasIssues = request.detectedIssues && request.detectedIssues.length > 0;

    if (hasIssues) {
      const firstIssue = request.detectedIssues[0];
      let tip = 'Keep your core braced and maintain controlled tempo.';

      if (firstIssue.toLowerCase().includes('elbow')) {
        tip = 'Keep your elbows tucked at ~45° for shoulder safety.';
      } else if (firstIssue.toLowerCase().includes('hip')) {
        tip = 'Keep your hips up and body in a straight line.';
      } else if (firstIssue.toLowerCase().includes('knee')) {
        tip = 'Push your knees outward in line with your toes.';
      }

      return {
        assessment: 'needs_improvement',
        confidence: 0.85,
        issues: [
          {
            issue: firstIssue,
            severity: 'moderate',
            suggestion: tip,
          },
        ],
        overallSuggestion: tip,
        isFallback: true,
      };
    }

    let goodTip = 'Good form — keep it up!';
    if (norm.includes('squat')) {
      goodTip = 'Great knee tracking and depth — keep it up!';
    } else if (norm.includes('pushup')) {
      goodTip = 'Great elbow tuck and body alignment — keep it up!';
    } else if (norm.includes('plank')) {
      goodTip = 'Solid straight spine and hip posture — keep holding!';
    }

    return {
      assessment: 'good',
      confidence: 0.9,
      issues: [],
      overallSuggestion: goodTip,
      isFallback: true,
    };
  }
}
