# AI Fitness Workout Camera (React Native + Expo + MediaPipe)

A React Native fitness workout application with real-time **MediaPipe AI Pose Landmarker** joint tracking, live camera preview, exercise form analysis, and automated repetition counting for squats and pushups.

## 🚀 Features

- **Live Camera Feed**: Full-screen camera view with front (selfie) and back (rear) camera switching.
- **Real-Time 33-Joint Pose Detection**: Google MediaPipe Pose AI detecting human body joints without hallucination.
- **Accurate Trigonometric Joint Angles**: Real-time knee flex and elbow flex angle measurement ($0^\circ$ when out of frame).
- **Automated Repetition Counter**: Validates full flexion and extension motion cycles for squats and pushups with haptic feedback.
- **Workout Analytics HUD**: Real-time active duration, form accuracy rating (%), and MET-based calorie burn calculations.
- **Workout Summary Modal**: Breakdown of total reps, form score, active time, and calories.

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Pose AI Server
```bash
npm run pose-server
```

### 3. Start the Expo App
```bash
npx expo start --tunnel
```

Scan the generated QR code in the **Expo Go** app on your phone.
