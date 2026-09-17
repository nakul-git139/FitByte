export type ExerciseGender = 'men' | 'women';

export type ExerciseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ExerciseDemoMetadata {
  id: string;
  name: string;
  category: string;
  difficulty: ExerciseDifficulty;
  targetMuscles: string[];
  instructions: string[];
  commonMistakes: string[];
  breathingCue?: string;
  demoVideo?: any;
  demoVideoMen?: any;
  demoVideoWomen?: any;
  hasDemoVideo: boolean;
  thumbnailUrl?: string;
}
