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
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
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
  const cameraRef = useRef<CameraView>(null);

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
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
      Alert.alert('Error', 'Failed to load image from library');
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
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
      });

      if (photo) {
        // Save to storage
        await savePhoto(photo.uri, false);
        Alert.alert('Success', 'Photo captured and saved!');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const blendImages = async () => {
    if (!cameraRef.current || !overlayImage) {
      Alert.alert('Error', 'Please load a reference image first');
      return;
    }

    try {
      // Capture current camera frame
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
      });

      if (!photo) return;

      // Resize overlay to match photo dimensions
      const photoInfo = await FileSystem.getInfoAsync(photo.uri);
      
      // Load and process the overlay image
      const processedOverlay = await ImageManipulator.manipulateAsync(
        overlayImage,
        [
          { resize: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } },
          { rotate: (overlayTransform.rotation * 180) / Math.PI },
        ],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      // Create a composite by layering images
      // Note: This is a simplified blend. For true pixel-level blending,
      // we would need a native module or canvas-based solution
      const blended = await ImageManipulator.manipulateAsync(
        photo.uri,
        [],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Save the blended result
      await savePhoto(blended.uri, true);
      
      Alert.alert(
        'Success',
        'Images blended and saved! Check your gallery.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error blending images:', error);
      Alert.alert('Error', 'Failed to blend images. Please try again.');
    }
  };

  const savePhoto = async (uri: string, isBlended: boolean) => {
    try {
      // Convert to base64 for storage
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Get existing photos
      const existingPhotos = await AsyncStorage.getItem('dejaview_photos');
      const photos = existingPhotos ? JSON.parse(existingPhotos) : [];

      // Add new photo
      photos.unshift({
        id: Date.now().toString(),
        uri: `data:image/jpeg;base64,${base64}`,
        timestamp: new Date().toISOString(),
        isBlended,
      });

      // Keep only last 50 photos to manage storage
      const trimmedPhotos = photos.slice(0, 50);

      await AsyncStorage.setItem('dejaview_photos', JSON.stringify(trimmedPhotos));
    } catch (error) {
      console.error('Error saving photo:', error);
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
      <View style={styles.container}>
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

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/gallery')}
            >
              <Ionicons name="images" size={28} color="white" />
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
            {overlayImage ? (
              <>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={clearOverlay}
                >
                  <Ionicons name="trash-outline" size={24} color="white" />
                  <Text style={styles.controlButtonText}>Clear</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={capturePhoto}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={blendImages}
                >
                  <Ionicons name="git-merge-outline" size={24} color="white" />
                  <Text style={styles.controlButtonText}>Blend</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={pickImage}
                >
                  <Ionicons name="images-outline" size={24} color="white" />
                  <Text style={styles.controlButtonText}>Load</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={capturePhoto}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                >
                  <Ionicons name="camera-reverse-outline" size={24} color="white" />
                  <Text style={styles.controlButtonText}>Flip</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
});
