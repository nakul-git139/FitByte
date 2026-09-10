import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SplashScreen } from './src/components/SplashScreen';
import { OnboardingScreen } from './src/components/OnboardingScreen';
import { AuthScreen } from './src/components/AuthScreen';
import { HomeScreen } from './src/components/HomeScreen';
import { ChooseWorkoutScreen } from './src/components/ChooseWorkoutScreen';
import { ProgressScreen } from './src/components/ProgressScreen';
import { ProfileScreen } from './src/components/ProfileScreen';
import { BottomNavBar, MainTabType } from './src/components/BottomNavBar';
import { DailyMoodCheckInScreen } from './src/components/DailyMoodCheckInScreen';
import { TodaysWorkoutScreen } from './src/components/TodaysWorkoutScreen';
import { WorkoutReadyScreen } from './src/components/WorkoutReadyScreen';
import { WorkoutCameraScreen } from './src/components/WorkoutCameraScreen';
import { FoodScannerScreen } from './src/components/FoodScannerScreen';
import { UserProfileSetupScreen } from './src/components/UserProfileSetupScreen';

import { AuthService } from './src/services/authService';
import { StorageService } from './src/services/storageService';
import { User } from './src/types/auth';
import { MoodCheckInData } from './src/types/mood';
import { GeneratedWorkout } from './src/types/aiWorkout';
import { Theme } from './src/config/theme';

type AppView =
  | 'splash'
  | 'onboarding'
  | 'auth'
  | 'tabs'
  | 'mood-checkin'
  | 'todays-workout'
  | 'workout-ready'
  | 'workout-camera'
  | 'food-scanner'
  | 'profile-setup';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('splash');
  const [previousView, setPreviousView] = useState<AppView>('tabs');
  const [isInitialProfileSetup, setIsInitialProfileSetup] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<MainTabType>('home');
  const [checkInData, setCheckInData] = useState<MoodCheckInData | null>(null);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>('Pushups');
  const [selectedTargetReps, setSelectedTargetReps] = useState<number | undefined>(undefined);

  // Check stored auth session on startup
  useEffect(() => {
    AuthService.getCurrentUser()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
        }
      })
      .catch((err) => {
        console.warn('[App] Error restoring auth session:', err);
      });
  }, []);

  const handleSplashFinish = async () => {
    if (currentUser) {
      const isSetup = await StorageService.isProfileSetup();
      if (!isSetup) {
        setPreviousView('tabs');
        setIsInitialProfileSetup(true);
        setCurrentView('profile-setup');
      } else {
        setCurrentView('tabs');
      }
    } else {
      setCurrentView('onboarding');
    }
  };

  const handleOnboardingGetStarted = () => {
    setCurrentView('auth');
  };

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    const isSetup = await StorageService.isProfileSetup();
    if (!isSetup) {
      setPreviousView('tabs');
      setIsInitialProfileSetup(true);
      setCurrentView('profile-setup');
      setActiveTab('home');
    } else {
      setCurrentView('tabs');
      setActiveTab('home');
    }
  };

  const handleContinueAsGuest = async () => {
    const isSetup = await StorageService.isProfileSetup();
    if (!isSetup) {
      setPreviousView('tabs');
      setIsInitialProfileSetup(true);
      setCurrentView('profile-setup');
      setActiveTab('home');
    } else {
      setCurrentView('tabs');
      setActiveTab('home');
    }
  };

  const handleSignOut = async () => {
    await AuthService.logout();
    setCurrentUser(null);
    setCurrentView('auth');
  };

  // Triggered from Home "Start Workout" button
  const handleStartDailyFlow = (exerciseName?: string, targetReps?: number) => {
    if (exerciseName) {
      setSelectedExercise(exerciseName);
    }
    if (targetReps) {
      setSelectedTargetReps(targetReps);
    }
    setCurrentView('mood-checkin');
  };

  // Quick Play directly navigates to Workout Ready screen
  const handleQuickLaunchExercise = (exerciseName: string, targetReps?: number) => {
    setSelectedExercise(exerciseName);
    setSelectedTargetReps(targetReps);
    setCurrentView('workout-ready');
  };

  // Completed mood check-in (Gemini generated workout)
  const handleMoodSubmit = (data: MoodCheckInData, workout?: GeneratedWorkout) => {
    setCheckInData(data);
    if (workout) {
      setGeneratedWorkout(workout);
      if (workout.exercises && workout.exercises.length > 0) {
        setSelectedExercise(workout.exercises[0].name);
        setSelectedTargetReps(workout.exercises[0].reps);
      }
    }
    setCurrentView('todays-workout');
  };

  const handleSkipMood = () => {
    setCurrentView('todays-workout');
  };

  // Start workout from Today's Workout screen -> Goes to Workout Ready preview
  const handleStartFromWorkoutPlan = (exerciseName?: string, targetReps?: number) => {
    if (exerciseName) {
      setSelectedExercise(exerciseName);
    }
    if (targetReps) {
      setSelectedTargetReps(targetReps);
    }
    setCurrentView('workout-ready');
  };

  // Start workout from Workout Ready -> Launches camera
  const handleLaunchCameraWorkout = () => {
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
        <StatusBar style={currentView === 'workout-camera' ? 'light' : 'dark'} />

        {currentView === 'splash' && (
          <SplashScreen onFinish={handleSplashFinish} />
        )}

        {currentView === 'onboarding' && (
          <OnboardingScreen
            onGetStarted={handleOnboardingGetStarted}
            onSignIn={() => setCurrentView('auth')}
          />
        )}

        {currentView === 'auth' && (
          <AuthScreen
            onAuthSuccess={handleAuthSuccess}
            onContinueAsGuest={handleContinueAsGuest}
          />
        )}

        {currentView === 'tabs' && (
          <View style={styles.tabContentContainer}>
            {activeTab === 'home' && (
              <HomeScreen
                user={currentUser}
                onStartMainWorkout={() => handleStartDailyFlow()}
                onSelectQuickExercise={handleQuickLaunchExercise}
                onNavigateToWorkouts={() => setActiveTab('workout')}
                onNavigateToProfile={() => setActiveTab('profile')}
                onNavigateToFoodScanner={() => setCurrentView('food-scanner')}
              />
            )}

            {activeTab === 'workout' && (
              <ChooseWorkoutScreen
                initialExercise={selectedExercise}
                onSelectExerciseAndContinue={(exercise) => {
                  setSelectedExercise(exercise);
                  setCurrentView('workout-ready');
                }}
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
              <ProfileScreen
                user={currentUser}
                onSignOut={handleSignOut}
                onOpenAuth={() => setCurrentView('auth')}
                onEditProfile={() => {
                  setPreviousView('tabs');
                  setIsInitialProfileSetup(false);
                  setCurrentView('profile-setup');
                }}
              />
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
            onOpenProfileSetup={() => {
              setPreviousView('mood-checkin');
              setIsInitialProfileSetup(false);
              setCurrentView('profile-setup');
            }}
          />
        )}

        {currentView === 'profile-setup' && (
          <UserProfileSetupScreen
            isInitialSetup={isInitialProfileSetup}
            onSaveProfile={(_profile) => {
              setIsInitialProfileSetup(false);
              setCurrentView(previousView || 'tabs');
            }}
            onCancel={
              isInitialProfileSetup
                ? undefined
                : () => {
                    setCurrentView(previousView || 'tabs');
                  }
            }
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

        {currentView === 'workout-ready' && (
          <WorkoutReadyScreen
            exerciseName={selectedExercise}
            targetReps={selectedTargetReps}
            onStartWorkout={handleLaunchCameraWorkout}
            onChangeExercise={() => {
              setActiveTab('workout');
              setCurrentView('tabs');
            }}
            onBack={() => handleReturnToTabs()}
          />
        )}

        {currentView === 'workout-camera' && (
          <WorkoutCameraScreen
            initialExercise={selectedExercise}
            initialTargetReps={selectedTargetReps}
            initialWorkoutPlan={generatedWorkout}
            checkInData={checkInData}
            onExit={handleExitWorkoutCamera}
          />
        )}

        {currentView === 'food-scanner' && (
          <FoodScannerScreen
            onBack={() => handleReturnToTabs('home')}
            onMealLogged={() => handleReturnToTabs('home')}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  tabContentContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
});
