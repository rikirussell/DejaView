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
  Animated,
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
  const [zoom, setZoom] = useState(0);
  const [mode, setMode] = useState<'PHOTO' | 'VIDEO'>('PHOTO');
  const [cameraReady, setCameraReady] = useState(false);
  const [videoQuality, setVideoQuality] = useState<'4K' | '1080p' | '720p'>('4K');
  const cameraRef = useRef<CameraView>(null);
  const cameraViewRef = useRef<View>(null);
  const readyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const blinkAnimRef = useRef<Animated.CompositeAnimation | null>(null);

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
    
    // Set camera ready after safe delay (workaround for SDK bug)
    readyTimeoutRef.current = setTimeout(() => {
      setCameraReady(true);
      console.log('Camera marked as ready');
    }, 3000); // 3 seconds should be enough for camera initialization
    
    return () => {
      // Lock back to portrait when leaving camera
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
      }
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
        const asset = result.assets[0];
        setOverlayImage(asset.uri);
        
        // Calculate scale to COVER screen (fill completely) while maintaining aspect ratio
        const imageAspect = asset.width / asset.height;
        const screenAspect = SCREEN_WIDTH / SCREEN_HEIGHT;
        let initialScale = 1;
        
        // Always scale to cover the entire screen
        if (imageAspect > screenAspect) {
          // Image is wider - scale to width to fill screen
          initialScale = SCREEN_WIDTH / asset.width;
        } else {
          // Image is taller or same - scale to height to fill screen
          initialScale = SCREEN_HEIGHT / asset.height;
        }
        
        // Make sure we scale up enough to cover
        const scaleX = SCREEN_WIDTH / asset.width;
        const scaleY = SCREEN_HEIGHT / asset.height;
        initialScale = Math.max(scaleX, scaleY); // Use the larger scale to ensure full coverage
        
        // Reset transform with proper initial scale
        setOverlayTransform({
          translateX: 0,
          translateY: 0,
          scale: initialScale,
          rotation: 0,
        });
        setBaseScale(initialScale);
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
    if (!cameraRef.current) return;

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
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const blendImages = async () => {
    if (!cameraRef.current || !overlayImage) {
      Alert.alert('Error', 'Please load a reference image first');
      return;
    }

    try {
      // Step 1: Capture camera photo at full resolution
      const cameraPhoto = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: true,
        exif: true,
      });

      if (!cameraPhoto) return;

      // Step 2: For now, just save the camera photo
      // True pixel blending requires native modules or canvas processing
      // The overlay serves as a visual reference during capture
      await savePhotoToLibrary(cameraPhoto.uri, true);
      
      Alert.alert(
        'Blend Saved',
        `Camera photo saved with overlay reference at ${Math.round(overlayOpacity * 100)}% opacity. Note: For true pixel-level blending, consider post-processing in a photo editor.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error blending images:', error);
      Alert.alert('Error', 'Failed to blend images. Please try again.');
    }
  };

  const toggleRecording = async () => {
    if (!cameraRef.current) return;

    // Check if camera is ready
    if (!cameraReady) {
      Alert.alert(
        'Please Wait', 
        'Camera is still initializing. Please wait a few seconds after opening the camera before recording.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      if (isRecording) {
        // Stop recording
        cameraRef.current.stopRecording();
        setIsRecording(false);
        stopBlinkAnimation();
      } else {
        // Start recording
        setIsRecording(true);
        startBlinkAnimation();
        
        // Quality settings based on selection
        const qualitySettings = {
          '4K': { videoBitrate: 50000000 }, // 50 Mbps - highest quality
          '1080p': { videoBitrate: 20000000 }, // 20 Mbps - high quality  
          '720p': { videoBitrate: 10000000 }, // 10 Mbps - good quality
        };
        
        const video = await cameraRef.current.recordAsync({
          maxDuration: 300, // 5 minutes max
          ...qualitySettings[videoQuality],
          mute: false,
        });

        if (video) {
          // Save to Photos
          await savePhotoToLibrary(video.uri, false);
          Alert.alert('Success', 'Video saved to Photos!');
        }
        setIsRecording(false);
        stopBlinkAnimation();
      }
    } catch (error: any) {
      console.error('Error recording video:', error);
      setIsRecording(false);
      stopBlinkAnimation();
      if (error.message?.includes('not ready')) {
        Alert.alert(
          'Camera Not Ready', 
          'The camera is still initializing. Please wait 3-5 seconds after opening the camera screen before starting a video recording.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to record video. Please try again.');
      }
    }
  };

  const handlePinchZoom = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const scale = event.nativeEvent.scale;
      setZoom(Math.min(Math.max(zoom * scale, 0), 1));
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

  // Start blinking animation for REC indicator
  const startBlinkAnimation = () => {
    blinkAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    blinkAnimRef.current.start();
  };

  // Stop blinking animation
  const stopBlinkAnimation = () => {
    if (blinkAnimRef.current) {
      blinkAnimRef.current.stop();
      blinkAnimRef.current = null;
    }
    blinkAnim.setValue(1);
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
        {/* Camera View with Pinch Zoom */}
        <PinchGestureHandler onGestureEvent={handlePinchZoom}>
          <View style={styles.camera}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              zoom={zoom}
              mode={mode === 'VIDEO' ? 'video' : 'picture'}
              enableTorch={false}
            />

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

          {/* Zoom Slider */}
          <View style={styles.zoomControl}>
            <Ionicons name="remove" size={20} color="white" />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={zoom}
              onValueChange={setZoom}
              minimumTrackTintColor="#FFD60A"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbTintColor="#FFD60A"
            />
            <Ionicons name="add" size={20} color="white" />
          </View>

          {/* Video Quality Controls (only show in VIDEO mode) */}
          {mode === 'VIDEO' && (
            <View style={styles.videoQualityControls}>
              <TouchableOpacity onPress={() => setVideoQuality('4K')}>
                <Text style={[styles.qualityText, videoQuality === '4K' && styles.qualityTextActive]}>
                  4K
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVideoQuality('1080p')}>
                <Text style={[styles.qualityText, videoQuality === '1080p' && styles.qualityTextActive]}>
                  1080p
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVideoQuality('720p')}>
                <Text style={[styles.qualityText, videoQuality === '720p' && styles.qualityTextActive]}>
                  720p
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            <TouchableOpacity onPress={() => setMode('PHOTO')}>
              <Text style={[styles.modeText, mode === 'PHOTO' && styles.modeTextActive]}>
                PHOTO
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('VIDEO')}>
              <Text style={[styles.modeText, mode === 'VIDEO' && styles.modeTextActive]}>
                VIDEO
              </Text>
            </TouchableOpacity>
          </View>

          {/* Camera Ready Indicator (for VIDEO mode) */}
          {mode === 'VIDEO' && !cameraReady && (
            <View style={styles.readyIndicator}>
              <Text style={styles.readyText}>Initializing camera...</Text>
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

            {/* Single Capture Button - Changes based on mode */}
            <TouchableOpacity
              style={[
                styles.captureButton,
                mode === 'VIDEO' && styles.videoButton,
                isRecording && styles.recordingButton
              ]}
              onPress={mode === 'VIDEO' ? toggleRecording : capturePhoto}
            >
              <View style={[
                styles.captureButtonInner,
                mode === 'VIDEO' && styles.videoButtonInner,
                isRecording && styles.recordingInner
              ]} />
            </TouchableOpacity>

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

          </View>
        </PinchGestureHandler>

        {/* Small REC Indicator in Corner */}
        {isRecording && (
          <Animated.View style={[styles.recIndicator, { opacity: blinkAnim }]}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>REC</Text>
          </Animated.View>
        )}
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
  recIndicator: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff0000',
    marginRight: 6,
  },
  recText: {
    color: '#ff0000',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modeSelector: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  modeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  modeTextActive: {
    color: '#FFD60A',
    fontWeight: '600',
    fontSize: 18,
  },
  videoButton: {
    borderColor: '#FF3B30',
  },
  videoButtonInner: {
    backgroundColor: '#FF3B30',
  },
  readyIndicator: {
    position: 'absolute',
    bottom: 160,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  readyText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  aspectRatioControls: {
    position: 'absolute',
    top: 100,
    right: 16,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 12,
  },
  aspectText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  aspectTextActive: {
    color: '#FFD60A',
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  videoQualityControls: {
    position: 'absolute',
    top: 100,
    left: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  qualityText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  qualityTextActive: {
    color: '#FF3B30',
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  cropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropFrame: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    borderWidth: 0,
    borderColor: 'transparent',
    // Default 4:3 - full screen, no mask
  },
  cropFrame11: {
    // 1:1 Square - show square in center
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    borderTopWidth: Math.max((SCREEN_HEIGHT - SCREEN_WIDTH) / 2, 0),
    borderBottomWidth: Math.max((SCREEN_HEIGHT - SCREEN_WIDTH) / 2, 0),
    borderColor: 'rgba(0, 0, 0, 0.7)',
    backgroundColor: 'transparent',
  },
  cropFrame169: {
    // 16:9 Widescreen - show wider rectangle
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (9 / 16),
    borderTopWidth: Math.max((SCREEN_HEIGHT - SCREEN_WIDTH * (9 / 16)) / 2, 0),
    borderBottomWidth: Math.max((SCREEN_HEIGHT - SCREEN_WIDTH * (9 / 16)) / 2, 0),
    borderColor: 'rgba(0, 0, 0, 0.7)',
    backgroundColor: 'transparent',
  },
});
