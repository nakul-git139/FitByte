import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WorkoutCameraScreen } from './src/components/WorkoutCameraScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <WorkoutCameraScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
