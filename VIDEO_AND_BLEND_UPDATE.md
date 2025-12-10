# DejaView - Video Recording & Blend Fix

## ✅ Issues Resolved

### 1. **Fixed Jimp Error**
**Problem**: `Property '__dirname' doesn't exist` error
**Root Cause**: Jimp uses Node.js APIs not available in React Native
**Solution**: Removed Jimp and used native screen capture with `react-native-view-shot`

### 2. **Improved Blend Function**
**Problem**: Blend wasn't mixing images properly
**Solution**: 
- Captures camera view WITH overlay visible
- Hides UI elements temporarily (guides, buttons, sliders)
- Uses current opacity slider value in the blend
- Saves clean composite image to Photos

### 3. **Added Video Recording**
**New Feature**: Full video recording capability with overlay support

---

## 🎥 Video Recording Feature

### Purpose:
Perfect for **movie production** and **cinematography** - align shots from different takes or recreate scenes from reference footage.

### How It Works:

**Main Recording Button (Large):**
- Tap once to **start recording**
- Button turns RED with square inner shape
- "Recording..." indicator appears at top
- Tap again to **stop recording**
- Video automatically saved to Photos/DejaView album

**Photo Button (Small):**
- Located below the main button
- Take still photos while NOT recording
- Works independently of video

### Video Recording Features:

✅ **Overlay Support**
- Load a reference video frame or image
- Overlay stays visible during recording
- Helps match angles and framing

✅ **High Quality**
- Records at 1080p
- Up to 5 minutes per clip
- Full resolution output

✅ **With or Without Overlay**
- Can record with overlay for alignment
- Or record without overlay for clean footage

✅ **Visual Feedback**
- Recording indicator at top
- Red button shows active state
- Clear start/stop interaction

---

## 📸 Updated Blend Function

### What It Does:
Creates a composite image mixing camera view and overlay based on slider opacity.

### Process:

1. **Hide UI Elements**
   - Temporarily hides alignment guides
   - No sliders, buttons in final image
   
2. **Capture Composite**
   - Screenshots the camera view with overlay
   - Overlay opacity from slider is preserved
   - Full resolution capture

3. **Save to Photos**
   - Saves to DejaView album
   - Shows blend percentage in success message

### Opacity Slider Controls Blend:
- **0%**: Minimal overlay visibility
- **50%**: Equal blend of both images
- **100%**: Maximum overlay visibility

### Clean Output:
- ✅ Camera image
- ✅ Overlay image (with opacity)
- ❌ NO UI elements
- ❌ NO guides
- ❌ NO buttons

---

## 🎬 Movie Production Use Cases

### Shot Matching:
```
Scenario: Recreating Scene 5, Take 3

1. Load reference frame from previous take
2. Position camera on set
3. Overlay shows exact framing needed
4. START RECORDING
5. Actor performs action
6. STOP RECORDING
7. Perfect match with previous take!
```

### Continuity Shots:
```
Scenario: Matching actor position across days

Day 1: Record master shot
Day 2: Load Day 1 frame as overlay
       Align actor to match position
       Record matching shot
Result: Seamless continuity
```

### Coverage Matching:
```
Scenario: Over-the-shoulder reverses

Shot A: Record master
Shot B: Load Shot A frame
        Flip camera angle
        Use overlay to match eyelines
        Record reverse angle
Result: Perfect matching coverage
```

### Location Scouting:
```
Scenario: Pre-viz on location

1. Load storyboard frame
2. Visit location with camera
3. Use overlay to match composition
4. Record test footage with overlay
5. Review if location works for scene
```

---

## 🎨 Updated UI Layout

### Top Bar:
```
[Close]  [Spacer]  [Grid Toggle]
```

### Middle (When Overlay Loaded):
```
┌─────────────────────────┐
│  Opacity Slider         │
│  [Eye] ████░░░░░░ 50%   │
└─────────────────────────┘
```

### Bottom Controls:
```
Without Overlay:
[Load]  [(●) Record]  [Flip]
         [📷 Photo]

With Overlay:
[Clear] [(●) Record]  [Blend]
         [📷 Photo]
```

### During Recording:
```
Top: [🔴 Recording...]

Bottom: 
[Clear] [(■) Stop]  [Blend]
         [📷 Photo]
```

---

## 🎯 Feature Summary

### Photo Capture:
- **Still Photo**: Tap photo button (small)
- **Blend**: Tap "Blend" button (with overlay)
- **Output**: Saved to Photos immediately

### Video Recording:
- **Start/Stop**: Tap main button (large)
- **Duration**: Up to 5 minutes
- **Quality**: 1080p
- **Output**: Saved to Photos immediately

### Overlay System:
- **Load**: From Photos library
- **Adjust**: Pan, pinch, rotate, opacity
- **Guides**: Toggle grid on/off
- **Clear**: Remove overlay

---

## 📱 Complete Workflow Examples

### Example 1: Historical Photo Recreation (Photo)
```
1. Visit Paris street where parents photographed in 1970
2. Load their 1970 photo from gallery
3. Adjust opacity slider to 50%
4. Walk around to match position
5. Align buildings using overlay
6. Tap "Blend" button
7. Result: Your photo merged with 1970 photo
```

### Example 2: Movie Scene Matching (Video)
```
1. Load reference take frame
2. Position actors on marks
3. Adjust overlay to match composition
4. TAP RECORD (large button)
5. Action! Actors perform scene
6. TAP STOP when scene complete
7. Result: Video with perfect shot matching
```

### Example 3: Before/After Progress (Both)
```
Photo Series:
1. Take "before" photo of construction
2. Week later: Load "before" as overlay
3. Blend to show progress changes

Video Tour:
1. Load "before" photo
2. START RECORDING
3. Walk through renovated space
4. Overlay shows old state while recording new
5. STOP RECORDING
6. Result: Video showing transformation
```

---

## 🎬 Cinematography Tips

### For Best Shot Matching:

**1. Reference Frame Selection**
- Use a clear frame from master take
- Load before actors arrive on set
- Gives you time to adjust camera

**2. Overlay Opacity**
- Use 30-40% for subtle guidance
- Use 50-60% for precise alignment
- Lower opacity for final recording

**3. Grid Guides**
- Enable for horizon line matching
- Use center lines for symmetry
- Disable before recording for clean view

**4. Multiple Takes**
- Record several with overlay
- Compare alignment after
- Choose best matching shot

**5. Continuity Checking**
- Load previous scene's last frame
- Align actor position before new take
- Ensures seamless editing later

---

## 🔧 Technical Details

### Video Recording Specs:
```javascript
{
  maxDuration: 300,        // 5 minutes (300 seconds)
  quality: '1080p',        // Full HD
  codec: Native,           // Platform default
  audio: true,             // Mic audio included
}
```

### Blend Capture Specs:
```javascript
{
  format: 'jpg',           // JPEG for photos
  quality: 1.0,            // Maximum quality
  result: 'tmpfile',       // Temporary file
  hideUI: true,            // No UI in capture
}
```

### Photo Capture Specs:
```javascript
{
  quality: 1,              // Maximum quality
  skipProcessing: false,   // Full resolution
  exif: true,             // Preserve metadata
}
```

---

## 📋 Button Reference

| Button | Icon | Action | When Available |
|--------|------|--------|----------------|
| Load | 📁 | Load reference image | No overlay loaded |
| Clear | 🗑️ | Remove overlay | Overlay loaded |
| Record (Large) | ● / ■ | Start/Stop video | Always |
| Photo (Small) | 📷 | Capture still | Always |
| Blend | 🔀 | Blend images | Overlay loaded |
| Flip | 🔄 | Switch camera | No overlay |

---

## ⚠️ Important Notes

### Video Overlay Recording:
The overlay is NOT baked into the video. The overlay only serves as a visual guide during recording. If you want the overlay in the video, you would need to use screen recording or post-production compositing.

### Blend is for Photos Only:
The "Blend" feature creates a composite photo. For video compositing, use professional video editing software after recording.

### Storage Location:
All photos and videos save to:
- **App**: Native Photos app
- **Album**: "DejaView" (auto-created)
- **Access**: Full device photo management

---

## ✨ Summary

DejaView now supports:

### Photo Features:
✅ Full resolution capture  
✅ True image blending with opacity control  
✅ Clean output (no UI elements)  
✅ Direct save to Photos  

### Video Features:
✅ 1080p video recording  
✅ Overlay guidance during recording  
✅ Up to 5 minutes per clip  
✅ Red recording indicator  
✅ Direct save to Photos  

### Production Ready:
✅ Movie scene matching  
✅ Shot continuity  
✅ Coverage alignment  
✅ Location pre-viz  
✅ Historical recreation  
✅ Progress documentation  

The app is now a professional tool for both photography recreation and cinematography shot matching! 🎬📸
