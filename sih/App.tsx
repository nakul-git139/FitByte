import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from './src/components/HomeScreen';
import { ChooseWorkoutScreen } from './src/components/ChooseWorkoutScreen';
import { ProgressScreen } from './src/components/ProgressScreen';
import { ProfileScreen } from './src/components/ProfileScreen';
import { BottomNavBar, MainTabType } from './src/components/BottomNavBar';
import { DailyMoodCheckInScreen } from './src/components/DailyMoodCheckInScreen';
import { TodaysWorkoutScreen } from './src/components/TodaysWorkoutScreen';
import { WorkoutCameraScreen } from './src/components/WorkoutCameraScreen';

import { MoodCheckInData } from './src/types/mood';
import { GeneratedWorkout } from './src/types/aiWorkout';

type AppView = 'tabs' | 'mood-checkin' | 'todays-workout' | 'workout-camera';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('tabs');
  const [activeTab, setActiveTab] = useState<MainTabType>('home');
  const [checkInData, setCheckInData] = useState<MoodCheckInData | null>(null);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>('Pushups');

  // Triggered from Home "Start Workout" button or Choose Workout "Continue"
  const handleStartDailyFlow = (exerciseName?: string) => {
    if (exerciseName) {
      setSelectedExercise(exerciseName);
    }
    setCurrentView('mood-checkin');
  };

  // Quick Play directly launches workout camera with chosen exercise
  const handleQuickLaunchExercise = (exerciseName: string) => {
    setSelectedExercise(exerciseName);
    setCurrentView('workout-camera');
  };

  // Completed mood check-in (Gemini generated workout)
  const handleMoodSubmit = (data: MoodCheckInData, workout?: GeneratedWorkout) => {
    setCheckInData(data);
    if (workout) {
      setGeneratedWorkout(workout);
      if (workout.exercises && workout.exercises.length > 0) {
        setSelectedExercise(workout.exercises[0].name);
      }
    }
    setCurrentView('todays-workout');
  };

  const handleSkipMood = () => {
    setCurrentView('todays-workout');
  };

  // Start workout from Today's Workout screen
  const handleStartFromWorkoutPlan = (exerciseName?: string) => {
    if (exerciseName) {
      setSelectedExercise(exerciseName);
    }
    setCurrentView('workout-camera');
  };

  const handleEditCheckIn = () => {
    setCurrentView('mood-checkin');
  };

  const handleReturnToTabs = (tab?: MainTabType) => {
    if (tab) {
      setActiveTab(tab);
    }
    setCurrentView('tabs');
  };

  const handleExitWorkoutCamera = () => {
    // Navigate to Progress tab so user sees their updated workout stats
    setActiveTab('progress');
    setCurrentView('tabs');
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />

        {currentView === 'tabs' && (
          <View style={styles.tabContentContainer}>
            {activeTab === 'home' && (
              <HomeScreen
                onStartMainWorkout={() => handleStartDailyFlow()}
                onSelectQuickExercise={handleQuickLaunchExercise}
                onNavigateToWorkouts={() => setActiveTab('workout')}
                onNavigateToProfile={() => setActiveTab('profile')}
              />
            )}

            {activeTab === 'workout' && (
              <ChooseWorkoutScreen
                initialExercise={selectedExercise}
                onSelectExerciseAndContinue={(exercise) => handleStartDailyFlow(exercise)}
                onBack={() => setActiveTab('home')}
                onOpenSettings={() => setActiveTab('profile')}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressScreen
                onOpenSettings={() => setActiveTab('profile')}
                onSelectWorkout={handleQuickLaunchExercise}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen />
            )}

            <BottomNavBar
              activeTab={activeTab}
              onTabSelect={(tab) => setActiveTab(tab)}
            />
          </View>
        )}

        {currentView === 'mood-checkin' && (
          <DailyMoodCheckInScreen
            initialMood={checkInData?.mood}
            initialEnergy={checkInData?.energyLevel}
            onSubmitCheckIn={handleMoodSubmit}
            onSkip={handleSkipMood}
            onBack={() => handleReturnToTabs()}
          />
        )}

        {currentView === 'todays-workout' && (
          <TodaysWorkoutScreen
            checkInData={checkInData}
            generatedWorkout={generatedWorkout}
            onStartWorkout={handleStartFromWorkoutPlan}
            onEditCheckIn={handleEditCheckIn}
            onBack={() => handleReturnToTabs()}
          />
        )}

        {currentView === 'workout-camera' && (
          <WorkoutCameraScreen
            initialExercise={selectedExercise}
            initialWorkoutPlan={generatedWorkout}
            checkInData={checkInData}
            onExit={handleExitWorkoutCamera}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  tabContentContainer: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
});

