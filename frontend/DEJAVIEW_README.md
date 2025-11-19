# DejaView - Photo Alignment Camera App

**Perfect alignment, every time.**

DejaView is a mobile camera app that helps you perfectly recreate or align shots by overlaying a semi-transparent reference photo on your live camera viewfinder.

## 🎯 Core Features

### 1. **Onion-Skin Overlay System**
- Load any previous photo as a semi-transparent overlay
- View the reference image directly on top of your live camera feed
- Adjustable opacity slider (0-100%)
- Perfect for recreating shots, matching angles, or tracking progress over time

### 2. **Precise Alignment Controls**
- **Pan Gesture**: Drag the overlay to reposition it
- **Pinch Gesture**: Scale the overlay up or down
- **Rotation Gesture**: Rotate the overlay to match your angle
- Real-time manipulation for perfect alignment

### 3. **Alignment Guides**
- Rule of thirds grid (3x3)
- Center cross-hairs
- Toggleable on/off
- Helps with composition and precise alignment

### 4. **Smart Photo Capture**
- **Capture**: Take a new photo while viewing the overlay (saves separately)
- **Blend**: Merge the current camera view with the reference photo
- All photos saved locally with metadata

### 5. **Gallery & Export**
- View all captured and blended photos
- 3-column grid layout
- Badge indicator for blended photos
- **Save to Device**: Export to camera roll
- **Share**: Send to any app
- **Delete**: Remove unwanted photos

## 📱 App Structure

```
DejaView/
├── Home Screen (index.tsx)
│   └── App branding and navigation
├── Camera Screen (camera.tsx)
│   ├── Live camera preview
│   ├── Image picker
│   ├── Onion-skin overlay
│   ├── Gesture controls
│   ├── Opacity slider
│   ├── Alignment guides
│   └── Capture/Blend controls
└── Gallery Screen (gallery.tsx)
    ├── Photo grid
    ├── Photo viewer modal
    └── Export/Share/Delete actions
```

## 🎨 Design

- **Color Scheme**: Black (#0c0c0c) and White with Blue accent (#007AFF)
- **Style**: Modern, minimalist, high-contrast
- **UX**: Touch-optimized, gesture-driven, intuitive
- **Icons**: Ionicons from @expo/vector-icons

## 🔧 Technical Stack

### Core Technologies
- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Language**: TypeScript

### Key Libraries
- **expo-camera**: Camera access and photo capture
- **expo-image-picker**: Gallery photo selection
- **expo-image-manipulator**: Image processing and blending
- **react-native-gesture-handler**: Touch gestures (pan, pinch, rotate)
- **@react-native-async-storage/async-storage**: Local photo storage
- **expo-file-system**: File operations
- **expo-media-library**: Save to camera roll
- **expo-sharing**: Share functionality
- **@react-native-community/slider**: Opacity control

## 💾 Storage

Photos are stored locally on the device using AsyncStorage:
- Format: Base64-encoded JPEG
- Metadata: Timestamp, blended flag, unique ID
- Limit: Last 50 photos (automatic cleanup)
- No backend required - fully client-side

## 🚀 How to Use

1. **Launch App**: Open DejaView and tap "Open Camera"
2. **Load Reference Photo**: Tap the "Load" button to select a previous photo
3. **Adjust Overlay**: 
   - Use the opacity slider to see through the overlay
   - Drag, pinch, or rotate the overlay to align it
   - Toggle grid guides for better alignment
4. **Capture or Blend**:
   - Tap the capture button for a new photo
   - Tap "Blend" to merge the overlay with your current view
5. **View Gallery**: Access all your photos, export, or share them

## 📸 Use Cases

- **Before & After**: Track fitness progress, home renovations, or plant growth
- **Recreate Shots**: Match exact angles from previous photoshoots
- **Product Photography**: Maintain consistent positioning across shots
- **Time-Lapse Setup**: Ensure perfect alignment for time-lapse sequences
- **Creative Effects**: Blend multiple exposures or create artistic overlays

## 🔐 Permissions Required

- **Camera**: Capture photos
- **Photo Library**: Load reference images and save photos
- **Storage**: Save photos locally

All permissions are requested on first use with clear explanations.

## ⚡ Performance

- Real-time gesture handling at 60fps
- Optimized image loading and manipulation
- Efficient base64 storage with automatic cleanup
- Responsive UI on all device sizes

## 🎯 Future Enhancements

Potential features for future versions:
- Cloud backup/sync
- Advanced blending modes (multiply, screen, overlay)
- Custom grid patterns
- Photo history timeline
- Batch export
- Social sharing presets

## 📝 Notes

- Camera functionality works on physical devices and Expo Go
- Web camera may have limited gesture support
- Best experienced on iOS and Android devices
- Photos are stored locally - clearing app data will delete them

---

**Built with ❤️ for photographers, creators, and anyone who needs perfect alignment.**
