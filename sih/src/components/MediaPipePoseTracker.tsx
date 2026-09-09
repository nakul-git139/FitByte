import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { CameraFacing } from '../types/workout';
import { PoseLandmark } from '../types/pose';
import { POSE_DETECTOR_HTML } from '../server/poseHtml';

interface MediaPipePoseTrackerProps {
  facing: CameraFacing;
  visible: boolean;
  onPoseData?: (data: {
    jointCount: number;
    kneeAngle: number;
    elbowAngle: number;
    facing?: CameraFacing;
    landmarks: PoseLandmark[];
  }) => void;
  onFacingChange?: (facing: CameraFacing) => void;
}

export const MediaPipePoseTracker: React.FC<MediaPipePoseTrackerProps> = ({
  facing,
  visible,
  onPoseData,
  onFacingChange,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Whenever facing prop changes from React Native, notify the WebView immediately
  useEffect(() => {
    if (webViewRef.current) {
      const message = JSON.stringify({ action: 'SWITCH_CAMERA', facing });
      webViewRef.current.postMessage(message);
      webViewRef.current.injectJavaScript(
        `if (window.switchCameraTo) { window.switchCameraTo("${facing}"); } true;`
      );
    }
  }, [facing]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={webViewRef}
        source={{ html: POSE_DETECTOR_HTML, baseUrl: 'https://cdn.jsdelivr.net' }}
        originWhitelist={['*']}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        androidLayerType="hardware"
        onLoadEnd={() => {
          setLoading(false);
          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({ action: 'SWITCH_CAMERA', facing }));
            webViewRef.current.injectJavaScript(
              `if (window.switchCameraTo) { window.switchCameraTo("${facing}"); } true;`
            );
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          setError(nativeEvent.description || 'Failed to connect to Pose AI server');
          setLoading(false);
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'POSE_DATA' && onPoseData) {
              onPoseData({
                jointCount: data.jointCount || 0,
                kneeAngle: data.kneeAngle || 0,
                elbowAngle: data.elbowAngle || 0,
                facing: data.facing,
                landmarks: data.landmarks || [],
              });

              if (data.facing && data.facing !== facing && onFacingChange) {
                onFacingChange(data.facing);
              }
            }
          } catch {
            // Ignore parse errors
          }
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Connecting Real-Time MediaPipe AI...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Pose Tracker Notice</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '700',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '800',
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
