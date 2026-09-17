import { ExerciseDemoMetadata, ExerciseGender } from '../types/exerciseDemo';

// Mapping of actual 3D exercise video assets located in assets/Exercise Videos/
export const EXERCISE_VIDEO_ASSETS = {
  pushups: {
    men: require('../../assets/Exercise Videos/Pushups_(Men)_20260917173619.mp4'),
    women: require('../../assets/Exercise Videos/Pushups_(Women)_20260917173635.mp4'),
  },
  squats: {
    men: require('../../assets/Exercise Videos/Scouts_(Men)_20260917173547.mp4'),
    women: require('../../assets/Exercise Videos/Scouts_(Women)_20260917173603.mp4'),
  },
  pullups: {
    men: require('../../assets/Exercise Videos/Pullups_(Mens)_20260917173702.mp4'),
    women: require('../../assets/Exercise Videos/Pullups_(Women)_20260917173718.mp4'),
  },
  plank: {
    men: require('../../assets/Exercise Videos/Planks_(Men)_20260917173434.mp4'),
    women: require('../../assets/Exercise Videos/Planks_(Woman)_20260917173522.mp4'),
  },
  bicepcurls: {
    men: require('../../assets/Exercise Videos/Bicep_Curls_(men)_20260917173753.mp4'),
    women: require('../../assets/Exercise Videos/Bicep_curls_(Women)_20260917173813.mp4'),
  },
  lunges: {
    men: require('../../assets/Exercise Videos/Lunges_(Men)_20260917173846.mp4'),
    women: require('../../assets/Exercise Videos/Lunges_(Women)_20260917173905.mp4'),
  },
  jumpingjacks: {
    men: require('../../assets/Exercise Videos/Jumping_Jacks_(Men)_20260917182029.mp4'),
    women: require('../../assets/Exercise Videos/Jumping_Jacks_(Women)_20260917182010.mp4'),
  },
  mountainclimbers: {
    men: require('../../assets/Exercise Videos/Mountain_Climbing_(Men)_20260917182431.mp4'),
    women: require('../../assets/Exercise Videos/Mountain_Climbing_(Women)_20260917182424.mp4'),
  },
} as const;

export const EXERCISE_DEMO_REGISTRY: Record<string, ExerciseDemoMetadata> = {
  pushups: {
    id: 'pushups',
    name: 'Pushups',
    category: 'Upper body',
    difficulty: 'Intermediate',
    targetMuscles: ['Chest', 'Triceps', 'Shoulders', 'Core'],
    instructions: [
      'Set hands slightly wider than shoulder-width on the floor.',
      'Maintain a rigid plank line from head through hips down to heels.',
      'Lower your chest until elbows reach approximately 90 degrees.',
      'Drive forcefully through palms to return to full lock-out without arching back.',
    ],
    commonMistakes: [
      'Sagging hips or hyperextending the lower back',
      'Flaring elbows out past 90 degrees relative to shoulders',
      'Not completing full range of motion',
    ],
    breathingCue: 'Inhale on the controlled descent, exhale powerfully as you push up.',
    demoVideoMen: EXERCISE_VIDEO_ASSETS.pushups.men,
    demoVideoWomen: EXERCISE_VIDEO_ASSETS.pushups.women,
    demoVideo: EXERCISE_VIDEO_ASSETS.pushups.men,
    hasDemoVideo: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80',
  },
  squats: {
    id: 'squats',
    name: 'Squats',
    category: 'Lower body',
    difficulty: 'Beginner',
    targetMuscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Core'],
    instructions: [
      'Stand tall with feet shoulder-width apart, toes pointed slightly outward.',
      'Keep chest upright and brace your core throughout the movement.',
      'Hinge hips backward and bend knees until thighs are parallel to the floor.',
      'Press firmly through your heels to return to standing position.',
    ],
    commonMistakes: [
      'Knees caving inward past the toe line',
      'Rounding the lower back or collapsing the upper chest',
      'Lifting heels off the ground during bottom phase',
    ],
    breathingCue: 'Inhale deeply as you descend, exhale as you drive back upward.',
    demoVideoMen: EXERCISE_VIDEO_ASSETS.squats.men,
    demoVideoWomen: EXERCISE_VIDEO_ASSETS.squats.women,
    demoVideo: EXERCISE_VIDEO_ASSETS.squats.men,
    hasDemoVideo: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=600&q=80',
  },
  pullups: {
    id: 'pullups',
    name: 'Pullups',
    category: 'Back & Arms',
    difficulty: 'Advanced',
    targetMuscles: ['Latissimus Dorsi', 'Biceps', 'Upper Back', 'Grip'],
    instructions: [
      'Grip the pull-up bar with hands just outside shoulder-width, palms forward.',
      'Hang with arms fully extended and engage your shoulder blades.',
      'Pull your chest up toward the bar until chin clears the bar level.',
      'Lower back down under strict control to a dead hang position.',
    ],
    commonMistakes: [
      'Kicking legs or swinging hips (kipping)',
      'Not dropping down to full arm extension',
      'Shrugging shoulders into ears at the top',
    ],
    breathingCue: 'Exhale while pulling up to the bar, inhale during controlled descent.',
    demoVideoMen: EXERCISE_VIDEO_ASSETS.pullups.men,
    demoVideoWomen: EXERCISE_VIDEO_ASSETS.pullups.women,
    demoVideo: EXERCISE_VIDEO_ASSETS.pullups.men,
    hasDemoVideo: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=600&q=80',
  },
  plank: {
    id: 'plank',
    name: 'Plank',
    category: 'Core & Spine',
    difficulty: 'Beginner',
    targetMuscles: ['Rectus Abdominis', 'Transverse Abdominis', 'Glutes', 'Deltoids'],
    instructions: [
      'Position elbows directly below shoulders with forearms flat on the ground.',
      'Extend legs straight back, resting weight on toes.',
      'Tighten glutes, brace abs firmly, and align spine in a straight neutral line.',
      'Hold position steadily while keeping neck neutral and gaze at the floor.',
    ],
    commonMistakes: [
      'Letting the lower back dip or sag toward the floor',
      'Piking hips too high in the air',
      'Holding breath instead of deep rhythmic diaphragmatic breathing',
    ],
    breathingCue: 'Maintain steady, controlled breathing while keeping core braced tight.',
    demoVideoMen: EXERCISE_VIDEO_ASSETS.plank.men,
    demoVideoWomen: EXERCISE_VIDEO_ASSETS.plank.women,
    demoVideo: EXERCISE_VIDEO_ASSETS.plank.men,
    hasDemoVideo: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=600&q=80',
  },
  bicepcurls: {
    id: 'bicepcurls',
    name: 'Bicep Curls',
    category: 'Arms & Power',
    difficulty: 'Beginner',
    targetMuscles: ['Biceps Brachii', 'Brachialis', 'Forearms'],
    instructions: [
      'Stand upright with feet hip-width apart and arms relaxed at your sides.',
      'Keep elbows pinned close to your torso without swinging shoulders.',
      'Curl the arms upward contracting biceps until full peak contraction.',
      'Lower under control back to starting extended position.',
    ],
    commonMistakes: [
      'Using momentum or swinging back to lift weight',
      'Elbows drifting forward during the curl',
      'Dropping arms rapidly without eccentric control',
    ],
    breathingCue: 'Exhale as you curl up, inhale as you lower the weight.',
    demoVideoMen: EXERCISE_VIDEO_ASSETS.bicepcurls.men,
    demoVideoWomen: EXERCISE_VIDEO_ASSETS.bicepcurls.women,
    demoVideo: EXERCISE_VIDEO_ASSETS.bicepcurls.men,
    hasDemoVideo: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80',
  },
  lunges: {
    id: 'lunges',
    name: 'Lunges',
    category: 'Lower body',
    difficulty: 'Intermediate',
    targetMuscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core'],
    instructions: [
      'Stand upright with feet together and hands on hips or at chest.',
      'Take a large, controlled step forward with one leg.',
      'Lower hips until both knees form approximately 90-degree angles.',
      'Push off the front heel to step back to starting position, then switch legs.',
    ],
    commonMistakes: [
      'Front knee pushing excessively far beyond toes',
      'Torso leaning excessively forward instead of staying tall',
      'Banging the back knee hard against the floor',
    ],
    breathingCue: 'Inhale as you step forward and lower down, exhale as you push back up.',
    demoVideoMen: EXERCISE_VIDEO_ASSETS.lunges.men,
    demoVideoWomen: EXERCISE_VIDEO_ASSETS.lunges.women,
    demoVideo: EXERCISE_VIDEO_ASSETS.lunges.men,
    hasDemoVideo: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
  },
  jumpingjacks: {
    id: 'jumpingjacks',
    name: 'Jumping Jacks',
    category: 'Cardio & Agility',
    difficulty: 'Beginner',
    targetMuscles: ['Calves', 'Shoulders', 'Core', 'Cardiovascular'],
    instructions: [
      'Stand upright with feet together and arms resting at your sides.',
      'Jump feet out to shoulder-width apart while raising arms overhead.',
      'Quickly jump back to the starting stance lowering arms down.',
      'Maintain light, bouncy rhythm landing softly on the balls of feet.',
    ],
    commonMistakes: [
      'Landing heavily on flat feet or locked knees',
      'Incomplete arm sweeps overhead',
    ],
    breathingCue: 'Breathe rhythmically in sync with jump cadence.',
    demoVideoMen: EXERCISE_VIDEO_ASSETS.jumpingjacks.men,
    demoVideoWomen: EXERCISE_VIDEO_ASSETS.jumpingjacks.women,
    demoVideo: EXERCISE_VIDEO_ASSETS.jumpingjacks.men,
    hasDemoVideo: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
  },
  mountainclimbers: {
    id: 'mountainclimbers',
    name: 'Mountain Climbers',
    category: 'Core & Conditioning',
    difficulty: 'Intermediate',
    targetMuscles: ['Core', 'Hip Flexors', 'Shoulders', 'Cardiovascular'],
    instructions: [
      'Begin in a high plank position with shoulders stacked directly above wrists.',
      'Drive one knee forward toward your chest without rounding lower spine.',
      'Quickly switch legs, extending the first leg back and driving the second knee.',
      'Continue alternating in a swift, controlled running motion.',
    ],
    commonMistakes: [
      'Hips bouncing up in the air',
      'Hands moving away from under shoulders',
    ],
    breathingCue: 'Keep continuous steady breaths throughout the set.',
    demoVideoMen: EXERCISE_VIDEO_ASSETS.mountainclimbers.men,
    demoVideoWomen: EXERCISE_VIDEO_ASSETS.mountainclimbers.women,
    demoVideo: EXERCISE_VIDEO_ASSETS.mountainclimbers.men,
    hasDemoVideo: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=600&q=80',
  },
};

/**
 * Normalizes any incoming exercise name / string and returns the matching demo metadata.
 * Safe fallback guarantees non-crashing behavior even for unknown exercises or missing video assets.
 */
export function getExerciseDemo(
  exerciseNameOrId?: string,
  gender: ExerciseGender = 'men'
): ExerciseDemoMetadata {
  if (!exerciseNameOrId) {
    return resolveWithGender(EXERCISE_DEMO_REGISTRY.pushups, gender);
  }

  const normalized = exerciseNameOrId.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Exact or substring matches
  if (normalized.includes('pushup')) {
    return resolveWithGender(EXERCISE_DEMO_REGISTRY.pushups, gender);
  }
  if (normalized.includes('squat')) {
    return resolveWithGender(EXERCISE_DEMO_REGISTRY.squats, gender);
  }
  if (normalized.includes('pullup') || normalized.includes('chinup')) {
    return resolveWithGender(EXERCISE_DEMO_REGISTRY.pullups, gender);
  }
  if (normalized.includes('plank')) {
    return resolveWithGender(EXERCISE_DEMO_REGISTRY.plank, gender);
  }
  if (normalized.includes('bicep') || normalized.includes('curl')) {
    return resolveWithGender(EXERCISE_DEMO_REGISTRY.bicepcurls, gender);
  }
  if (normalized.includes('lunge')) {
    return resolveWithGender(EXERCISE_DEMO_REGISTRY.lunges, gender);
  }
  if (normalized.includes('jumping') || normalized.includes('jack')) {
    return resolveWithGender(EXERCISE_DEMO_REGISTRY.jumpingjacks, gender);
  }
  if (normalized.includes('mountain') || normalized.includes('climber')) {
    return resolveWithGender(EXERCISE_DEMO_REGISTRY.mountainclimbers, gender);
  }

  // Fallback for custom or unrecognized exercise names
  return {
    id: normalized || 'custom',
    name: exerciseNameOrId,
    category: 'Full Body',
    difficulty: 'Intermediate',
    targetMuscles: ['Full Body', 'Core'],
    instructions: [
      'Set up in a balanced, controlled athletic stance.',
      'Execute movement with proper posture, keeping joints aligned.',
      'Maintain controlled tempo and full range of motion.',
    ],
    commonMistakes: ['Rushing reps without controlled cadence', 'Losing core stability'],
    breathingCue: 'Exhale during exertion phase, inhale on return.',
    hasDemoVideo: false,
    demoVideo: null,
  };
}

function resolveWithGender(
  demo: ExerciseDemoMetadata,
  gender: ExerciseGender
): ExerciseDemoMetadata {
  const chosenVideo = gender === 'women' ? (demo.demoVideoWomen || demo.demoVideo) : (demo.demoVideoMen || demo.demoVideo);
  return {
    ...demo,
    demoVideo: chosenVideo,
    hasDemoVideo: Boolean(chosenVideo),
  };
}
