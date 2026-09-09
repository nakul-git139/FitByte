import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DailyMoodCheckInScreen } from './src/components/DailyMoodCheckInScreen';
import { TodaysWorkoutScreen } from './src/components/TodaysWorkoutScreen';
import { WorkoutCameraScreen } from './src/components/WorkoutCameraScreen';
import { MoodCheckInData } from './src/types/mood';
import { GeneratedWorkout } from './src/types/aiWorkout';

type AppScreen = 'mood-checkin' | 'todays-workout' | 'workout-camera';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('mood-checkin');
  const [checkInData, setCheckInData] = useState<MoodCheckInData | null>(null);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>('Pushups');

  const handleMoodSubmit = (data: MoodCheckInData, workout?: GeneratedWorkout) => {
    setCheckInData(data);
    if (workout) {
      setGeneratedWorkout(workout);
      if (workout.exercises && workout.exercises.length > 0) {
        setSelectedExercise(workout.exercises[0].name);
      }
    }
    setCurrentScreen('todays-workout');
  };

  const handleSkipMood = () => {
    setCurrentScreen('todays-workout');
  };

  const handleStartWorkout = (exerciseName?: string) => {
    if (exerciseName) {
      setSelectedExercise(exerciseName);
    }
    setCurrentScreen('workout-camera');
  };

  const handleEditCheckIn = () => {
    setCurrentScreen('mood-checkin');
  };

  const handleExitWorkout = () => {
    setCurrentScreen('todays-workout');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {currentScreen === 'mood-checkin' && (
        <DailyMoodCheckInScreen
          initialMood={checkInData?.mood}
          initialEnergy={checkInData?.energyLevel}
          onSubmitCheckIn={handleMoodSubmit}
          onSkip={handleSkipMood}
        />
      )}

      {currentScreen === 'todays-workout' && (
        <TodaysWorkoutScreen
          checkInData={checkInData}
          generatedWorkout={generatedWorkout}
          onStartWorkout={handleStartWorkout}
          onEditCheckIn={handleEditCheckIn}
        />
      )}

      {currentScreen === 'workout-camera' && (
        <WorkoutCameraScreen
          initialExercise={selectedExercise}
          initialWorkoutPlan={generatedWorkout}
          checkInData={checkInData}
          onExit={handleExitWorkout}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
