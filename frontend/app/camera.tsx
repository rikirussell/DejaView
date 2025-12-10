import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import Slider from '@react-native-community/slider';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [showGuides, setShowGuides] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1'>('4:3');
  const cameraRef = useRef<CameraView>(null);
  const cameraViewRef = useRef<View>(null);

  // Gesture state for overlay manipulation
  const [overlayTransform, setOverlayTransform] = useState({
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotation: 0,
  });

  const [baseScale, setBaseScale] = useState(1);
  const [baseRotation, setBaseRotation] = useState(0);
  const [lastTranslate, setLastTranslate] = useState({ x: 0, y: 0 });

  useEffect(() => {
    requestPermissions();
    // Unlock all orientations for camera screen
    ScreenOrientation.unlockAsync();
    
    return () => {
      // Lock back to portrait when leaving camera
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const requestPermissions = async () => {
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permission || mediaStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'DejaView needs camera and photo library access to work properly.',
        [{ text: 'OK', onPress: () => requestPermission() }]
      );
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        setOverlayImage(result.assets[0].uri);
        // Reset transform when new image is loaded
        setOverlayTransform({
          translateX: 0,
          translateY: 0,
          scale: 1,
          rotation: 0,
        });
        setBaseScale(1);
        setBaseRotation(0);
        setLastTranslate({ x: 0, y: 0 });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to load image from Photos');
    }
  };

  const handlePanGesture = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setOverlayTransform((prev) => ({
        ...prev,
        translateX: lastTranslate.x + event.nativeEvent.translationX,
        translateY: lastTranslate.y + event.nativeEvent.translationY,
      }));
    } else if (event.nativeEvent.state === State.END) {
      setLastTranslate({
        x: lastTranslate.x + event.nativeEvent.translationX,
        y: lastTranslate.y + event.nativeEvent.translationY,
      });
    }
  };

  const handlePinchGesture = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setOverlayTransform((prev) => ({
        ...prev,
        scale: baseScale * event.nativeEvent.scale,
      }));
    } else if (event.nativeEvent.state === State.END) {
      setBaseScale(baseScale * event.nativeEvent.scale);
    }
  };

  const handleRotationGesture = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setOverlayTransform((prev) => ({
        ...prev,
        rotation: baseRotation + event.nativeEvent.rotation,
      }));
    } else if (event.nativeEvent.state === State.END) {
      setBaseRotation(baseRotation + event.nativeEvent.rotation);
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || !isCameraReady) {
      Alert.alert('Please wait', 'Camera is initializing...');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: true,  // Get full native resolution
        exif: true,
      });

      if (photo) {
        // Save directly to Photos
        await savePhotoToLibrary(photo.uri, false);
        Alert.alert('Success', 'Photo saved to Photos!');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const blendImages = async () => {
    if (!cameraViewRef.current || !overlayImage) {
      Alert.alert('Error', 'Please load a reference image first');
      return;
    }

    try {
      // Hide UI elements temporarily
      const guidesWereVisible = showGuides;
      setShowGuides(false);
      
      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 200));

      // Capture the view with camera + overlay (but no UI)
      const uri = await captureRef(cameraViewRef, {
        format: 'jpg',
        quality: 1.0,
        result: 'tmpfile',
      });

      // Restore UI
      if (guidesWereVisible) {
        setShowGuides(true);
      }

      // Save to Photos
      await savePhotoToLibrary(uri, true);
      
      Alert.alert(
        'Success',
        `Blended image saved! (${Math.round(overlayOpacity * 100)}% overlay opacity)`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error blending images:', error);
      setShowGuides(showGuides); // Restore on error
      Alert.alert('Error', 'Failed to blend images. Please try again.');
    }
  };

  const toggleRecording = async () => {
    if (!cameraRef.current) return;

    if (!isCameraReady) {
      Alert.alert('Please wait', 'Camera is still initializing...');
      return;
    }

    try {
      if (isRecording) {
        // Stop recording
        cameraRef.current.stopRecording();
        setIsRecording(false);
      } else {
        // Start recording
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync({
          maxDuration: 300, // 5 minutes max
          videoBitrate: 10000000, // 10 Mbps for high quality
          mute: false,
        });

        if (video) {
          // Save to Photos
          await savePhotoToLibrary(video.uri, false);
          Alert.alert('Success', 'Video saved to Photos!');
        }
        setIsRecording(false);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to record video');
    }
  };

  const handlePinchZoom = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const scale = event.nativeEvent.scale;
      setZoom(Math.min(Math.max(zoom * scale, 0), 1));
    }
  };

  const cycleAspectRatio = () => {
    if (aspectRatio === '4:3') {
      setAspectRatio('16:9');
    } else if (aspectRatio === '16:9') {
      setAspectRatio('1:1');
    } else {
      setAspectRatio('4:3');
    }
  };

  const savePhotoToLibrary = async (uri: string, isBlended: boolean) => {
    try {
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Need permission to save photos to your library');
        return;
      }

      // Save to Photos
      const asset = await MediaLibrary.createAssetAsync(uri);
      
      // Optionally create or add to a DejaView album
      const album = await MediaLibrary.getAlbumAsync('DejaView');
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('DejaView', asset, false);
      }
    } catch (error) {
      console.error('Error saving photo to library:', error);
      throw error;
    }
  };

  const clearOverlay = () => {
    setOverlayImage(null);
    setOverlayTransform({
      translateX: 0,
      translateY: 0,
      scale: 1,
      rotation: 0,
    });
    setBaseScale(1);
    setBaseRotation(0);
    setLastTranslate({ x: 0, y: 0 });
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Camera permission is required to use DejaView
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container} ref={cameraViewRef} collapsable={false}>
        {/* Camera View */}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        >
          {/* Overlay Image with Gestures */}
          {overlayImage && (
            <RotationGestureHandler onGestureEvent={handleRotationGesture}>
              <PinchGestureHandler onGestureEvent={handlePinchGesture}>
                <PanGestureHandler onGestureEvent={handlePanGesture}>
                  <View
                    style={[
                      styles.overlayContainer,
                      {
                        opacity: overlayOpacity,
                        transform: [
                          { translateX: overlayTransform.translateX },
                          { translateY: overlayTransform.translateY },
                          { scale: overlayTransform.scale },
                          { rotate: `${overlayTransform.rotation}rad` },
                        ],
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: overlayImage }}
                      style={styles.overlayImage}
                      resizeMode="contain"
                    />
                  </View>
                </PanGestureHandler>
              </PinchGestureHandler>
            </RotationGestureHandler>
          )}

          {/* Alignment Guides */}
          {showGuides && (
            <View style={styles.guidesContainer}>
              {/* Grid lines */}
              <View style={[styles.guideLine, styles.verticalLine, { left: '33%' }]} />
              <View style={[styles.guideLine, styles.verticalLine, { left: '66%' }]} />
              <View style={[styles.guideLine, styles.horizontalLine, { top: '33%' }]} />
              <View style={[styles.guideLine, styles.horizontalLine, { top: '66%' }]} />
              {/* Center lines */}
              <View style={[styles.guideLine, styles.centerLine, styles.verticalLine, { left: '50%' }]} />
              <View style={[styles.guideLine, styles.centerLine, styles.horizontalLine, { top: '50%' }]} />
            </View>
          )}

          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>

            <View style={styles.spacer} />

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowGuides(!showGuides)}
            >
              <Ionicons
                name={showGuides ? 'grid' : 'grid-outline'}
                size={28}
                color="white"
              />
            </TouchableOpacity>
          </View>

          {/* Opacity Slider */}
          {overlayImage && (
            <View style={styles.opacityControl}>
              <Ionicons name="eye-outline" size={20} color="white" />
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={overlayOpacity}
                onValueChange={setOverlayOpacity}
                minimumTrackTintColor="#fff"
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbTintColor="#fff"
              />
              <Text style={styles.opacityText}>{Math.round(overlayOpacity * 100)}%</Text>
            </View>
          )}

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={overlayImage ? clearOverlay : pickImage}
            >
              <Ionicons 
                name={overlayImage ? "trash-outline" : "images-outline"} 
                size={24} 
                color="white" 
              />
              <Text style={styles.controlButtonText}>
                {overlayImage ? "Clear" : "Load"}
              </Text>
            </TouchableOpacity>

            <View style={styles.centerButtons}>
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  isRecording && styles.recordingButton
                ]}
                onPress={toggleRecording}
              >
                <View style={[
                  styles.captureButtonInner,
                  isRecording && styles.recordingInner
                ]} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoButton}
                onPress={capturePhoto}
              >
                <Ionicons name="camera" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={overlayImage ? blendImages : () => setFacing(facing === 'back' ? 'front' : 'back')}
            >
              <Ionicons 
                name={overlayImage ? "git-merge-outline" : "camera-reverse-outline"} 
                size={24} 
                color="white" 
              />
              <Text style={styles.controlButtonText}>
                {overlayImage ? "Blend" : "Flip"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Recording Indicator */}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording...</Text>
            </View>
          )}
        </CameraView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  guidesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  guideLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  verticalLine: {
    width: 1,
    height: '100%',
  },
  horizontalLine: {
    height: 1,
    width: '100%',
  },
  centerLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    width: 44,
  },
  opacityControl: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  slider: {
    flex: 1,
    marginHorizontal: 12,
  },
  opacityText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  controlButton: {
    alignItems: 'center',
    padding: 8,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  centerButtons: {
    alignItems: 'center',
    gap: 8,
  },
  photoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  recordingButton: {
    borderColor: '#ff0000',
  },
  recordingInner: {
    borderRadius: 8,
    width: 30,
    height: 30,
    backgroundColor: '#ff0000',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    marginRight: 8,
  },
  recordingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
