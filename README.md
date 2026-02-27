# react-native-image-template-editor

A React Native component for creating and editing image templates with drawing, text, shapes, and image overlays.

## Result

<p align="center">
  <img src="assets/image1.png" width="45%" />
  &nbsp;&nbsp;
  <img src="assets/image2.png" width="45%" />
</p>

## 📦 **Installation**

```bash
npm install react-native-image-template-editor
```

## 🔧 **Dependencies**

This package requires the following peer dependencies:

```json
{
  "react-native-svg": "^15.8.0",
  "react-native-view-shot": "^3.8.0",
  "react-native-image-picker": "^7.1.2",
}
```

Install them (if not already installed):

```bash
npm install react-native-svg react-native-view-shot react-native-image-picker
```

### **Additional Setup**

❗ Manual Podfile linking is NOT required for React Native 0.60+ (auto-linking supported). Simply run `cd ios && pod install && cd ..` after installing dependencies.

#### **For Android**
Add to your `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
```

⚠️ **Small Improvement (Recommended for 2026 Android)**

For modern Android (13+), you may want to replace deprecated storage permissions:

```xml
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.CAMERA" />
```

Because:
- `WRITE_EXTERNAL_STORAGE` is deprecated in Android 13+
- Android 13 uses `READ_MEDIA_IMAGES` for media access


Then rebuild:

```bash
npx react-native run-android
```

## 🎨 **Usage**

### **As a Navigation Screen**

```typescript
import React from 'react';
import { ImageEditor } from 'react-native-image-template-editor';

const ImageEditorScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { imageUri, onSave } = route.params as {
    imageUri?: string;
    onSave: (editedImageUri: string) => void;
  };

  return <ImageEditor />;
};
```

### **As a Component (Direct Usage)**

```typescript
import React from 'react';
import { ImageEditor, ImageEditorProps } from 'react-native-image-template-editor';

const MyComponent = () => {
  const handleSave = (savedImageUri: string) => {
    console.log('Image saved:', savedImageUri);
    // Handle saved image
  };

  return (
    <View style={{ flex: 1 }}>
      <ImageEditor
        imageUri="https://example.com/initial-image.jpg"
        onSave={handleSave}
        onClose={() => console.log('Editor closed')}
      />
    </View>
  );
};
```

### **As a Modal**

```typescript
const [showEditor, setShowEditor] = useState(false);

const openImageEditor = () => {
  setShowEditor(true);
};

return (
  <Modal visible={showEditor} animationType="slide">
    <ImageEditor
      imageUri={selectedImageUri}
      onSave={(savedUri) => {
        console.log('Image saved:', savedUri);
        setShowEditor(false);
      }}
      onClose={() => setShowEditor(false)}
    />
  </Modal>
);
```

## 🎯 **Features**

### **Drawing Tools**
- ✏️️ **Freehand Drawing**: Draw with customizable colors and stroke widths
- 🎨 **Shape Tools**: Rectangle, oval, line, arrow with fill options
- 📝 **Text Tool**: Add text with font size, color, bold, italic styling
- 🖼️ **Image Overlay**: Add multiple images with resize and positioning
- 🔄 **Image Transform**: Rotate and flip images

### **Editing Capabilities**
- 🎨 **Layers**: Multiple text, image, and shape layers
- ↩️ **Undo/Redo**: Full history management (20 steps)
- 🎯 **Selection**: Select and edit any element
- 💾 **Export**: Save as high-quality JPG
- 🎨 **Background Images**: Load initial images for editing

### **Professional Icons**
- 📱 **Vector Icons**: Uses Ionicons and MaterialIcons
- 🎨 **Professional UI**: Clean, modern interface
- 🌈 **Theme Support**: Integrates with your app's theme

## 🔧 **Props Interface**

```typescript
interface ImageEditorProps {
  imageUri?: string;        // Initial image to load
  onSave?: (uri: string) => void;  // Save callback function
  onClose?: () => void;       // Close callback function
}
```

## 📱 **Platform Support**

- ✅ **iOS**: Fully compatible with iOS image picker and view shot
- ✅ **Android**: Complete Android support with permissions handling
- ✅ **Expo**: Can be used in Expo managed projects
- ✅ **TypeScript**: Full TypeScript support with type definitions

## 🚀 **Advanced Usage**

### **Custom Styling**
```typescript
const customStyles = {
  header: {
    backgroundColor: '#your-brand-color',
  },
  canvas: {
    borderColor: '#your-accent-color',
  },
};

<ImageEditor style={customStyles} />
```

### **Programmatic Control**
```typescript
const editorRef = useRef(null);

// Save programmatically
const saveImage = async () => {
  if (editorRef.current) {
    const uri = await captureRef(editorRef.current, {
      format: 'jpg',
      quality: 0.9,
    });
    console.log('Saved:', uri);
  }
};

// Clear canvas
const clearCanvas = () => {
  // Clear all layers
};
```

## 📞 **Support**

For issues, feature requests, or contributions:

- **GitHub**: [github.com/saadahmed333/react-native-image-template-editor](https://github.com/saadahmed333/react-native-image-template-editor)
- **Documentation**: Check this README for comprehensive usage examples
- **Issues**: Report bugs with detailed reproduction steps
- **Community**: Join discussions for tips and best practices

## 📄 **License**

MIT License - Free for commercial and personal use.

---

**Version**: 0.1.4
**Last Updated**: February 2026

This ImageEditor provides a complete solution for image editing needs in React Native applications with professional error handling and extensive customization options.

Made with [create-react-native-library]
