import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  PanResponder,
  Animated,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import Svg, {Rect, Ellipse, Line, Path} from 'react-native-svg';
import {captureRef} from 'react-native-view-shot';
import {launchImageLibrary} from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppStyles from '../../styles/AppStyles'; // Remove or update path
// import {AppColors} from '../../utils'; // Remove or update path
// import AppFonts from '../../utils/appFonts'; // Remove or update path
// import {hp, screenWidth} from '../../utils/constant'; // Remove or update path
// import GlobalIcon from '../../components/GlobalIcon'; // Remove or update path
// import {size} from '../../utils/responsiveFonts'; // Remove or update path

// Basic constants to replace missing imports
const screenWidth = 375; // Default iPhone width
const hp = (percentage: number) => (percentage / 100) * 812; // Default iPhone height
const AppColors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  background: '#F2F2F7',
  text: '#000000',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#8E8E93',
  grey: '#8E8E93',
  border: '#C6C6C8',
  borderColor: '#C6C6C8',
  lightGrey: '#E5E5EA',
  red: '#FF3B30',
  verylightblue: '#E3F2FD',
};
const AppFonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  poppinsRegular: 'System',
  poppinsMedium: 'System',
  poppinsSemiBold: 'System',
  poppinsBold: 'System',
  sizes: {
    small: 12,
    medium: 14,
    large: 16,
    xlarge: 18,
    xxlarge: 20,
  }
};
const AppStyles = {
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  }
};
const size = ((fontSize: number) => fontSize) as any;
(size as any).md = 16;
(size as any).default = 14;
(size as any).xs = 12;
(size as any).s = 14;
const GlobalIcon = ({ library, name, size = 24, color = '#000' }: { library?: string; name: string; size?: number; color?: string }) => {
  if (library === 'Ionicons') {
    return <Ionicons name={name as any} size={size} color={color} />;
  } else if (library === 'MaterialIcons') {
    return <MaterialIcons name={name as any} size={size} color={color} />;
  }
  // Fallback to text representation
  const iconMap: { [key: string]: string } = {
    'arrow-back': '←',
    'undo': '↶',
    'open-in-full': '⤢',
    'brush': '🖌️',
    'text-fields': 'T',
    'crop-square': '⬜',
    'circle': '⭕',
    'horizontal-rule': '─',
    'arrow-forward': '→',
    'format-color-fill': '🪣',
    'check': '✓',
    'close': '✕',
    'add': '+',
    'image': '🖼️',
    'save': '💾',
  };
  
  return (
    <Text style={{ fontSize: size, color, textAlign: 'center', minWidth: size }}>
      {iconMap[name] || name}
    </Text>
  );
};

const CANVAS_SIZE = screenWidth;
const MIN_OVERLAY_SIZE = 60;
const INITIAL_OVERLAY_SIZE = 160;
const RESIZE_HANDLE_HIT = 32;

const COLORS = [
  '#FFFFFF',
  '#1F1F1F',
  '#FF4105',
  '#375DFB',
  '#FFB400',
  '#4CC77B',
  '#FF0066',
  '#00CFFF',
  '#A855F7',
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolType = 'none' | 'draw' | 'text' | 'shape' | 'image';
type ShapeType = 'rectangle' | 'oval' | 'line' | 'arrow';

interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
}

interface ImageOverlayItem {
  id: string;
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DrawPath {
  id: string;
  points: string;
  color: string;
  strokeWidth: number;
}

interface ShapeItem {
  id: string;
  type: ShapeType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
  filled: boolean;
  fillColor: string;
}

// ─── HistorySnapshot ──────────────────────────────────────────────────────────

interface Snapshot {
  texts: TextItem[];
  imageOverlays: ImageOverlayItem[];
  drawPaths: DrawPath[];
  shapes: ShapeItem[];
}

// ─── DraggableText ────────────────────────────────────────────────────────────

const DraggableText = ({
  item,
  isSelected,
  onSelect,
  onDoubleTap,
}: {
  item: TextItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleTap: (id: string) => void;
}) => {
  const pan = useRef(new Animated.ValueXY({x: item.x, y: item.y})).current;
  const lastTap = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          onDoubleTap(item.id);
        }
        lastTap.current = now;
        pan.setOffset({x: (pan.x as any)._value, y: (pan.y as any)._value});
        pan.setValue({x: 0, y: 0});
        onSelect(item.id);
      },
      onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => pan.flattenOffset(),
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.draggableText,
        pan.getLayout(),
        isSelected && styles.draggableTextSelected,
      ]}
      {...panResponder.panHandlers}>
      <Text
        style={{
          color: item.color,
          fontSize: item.fontSize,
          fontFamily: item.bold
            ? AppFonts.poppinsBold
            : AppFonts.poppinsRegular,
          fontStyle: item.italic ? 'italic' : 'normal',
          fontWeight: item.bold ? 'bold' : 'normal',
        }}>
        {item.text}
      </Text>
    </Animated.View>
  );
};

// ─── DraggableImage ───────────────────────────────────────────────────────────

const DraggableImage = ({
  item,
  isSelected,
  onSelect,
}: {
  item: ImageOverlayItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) => {
  const posAnim = useRef(new Animated.ValueXY({x: item.x, y: item.y})).current;
  const widthAnim = useRef(new Animated.Value(item.width)).current;
  const heightAnim = useRef(new Animated.Value(item.height)).current;
  const widthVal = useRef(item.width);
  const heightVal = useRef(item.height);
  const startW = useRef(item.width);
  const startH = useRef(item.height);

  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        posAnim.setOffset({
          x: (posAnim.x as any)._value,
          y: (posAnim.y as any)._value,
        });
        posAnim.setValue({x: 0, y: 0});
        onSelect(item.id);
      },
      onPanResponderMove: Animated.event(
        [null, {dx: posAnim.x, dy: posAnim.y}],
        {useNativeDriver: false},
      ),
      onPanResponderRelease: () => posAnim.flattenOffset(),
    }),
  ).current;

  const resizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startW.current = widthVal.current;
        startH.current = heightVal.current;
        widthAnim.setOffset(widthVal.current);
        heightAnim.setOffset(heightVal.current);
        widthAnim.setValue(0);
        heightAnim.setValue(0);
        widthAnim.addListener(({value}) => {
          widthVal.current = value;
        });
        heightAnim.addListener(({value}) => {
          heightVal.current = value;
        });
      },
      onPanResponderMove: (_, gs) => {
        widthAnim.setValue(Math.max(MIN_OVERLAY_SIZE - startW.current, gs.dx));
        heightAnim.setValue(Math.max(MIN_OVERLAY_SIZE - startH.current, gs.dy));
      },
      onPanResponderRelease: () => {
        widthAnim.flattenOffset();
        heightAnim.flattenOffset();
        widthAnim.removeAllListeners();
        heightAnim.removeAllListeners();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.imageOverlay,
        posAnim.getLayout(),
        {width: widthAnim, height: heightAnim},
        isSelected && styles.imageOverlaySelected,
      ]}
      {...dragResponder.panHandlers}>
      <Image
        source={{uri: item.uri}}
        style={styles.overlayImage}
        resizeMode="cover"
      />
      {isSelected && (
        <View
          style={styles.resizeHandle}
          hitSlop={{
            top: RESIZE_HANDLE_HIT,
            left: RESIZE_HANDLE_HIT,
            bottom: RESIZE_HANDLE_HIT,
            right: RESIZE_HANDLE_HIT,
          }}
          {...resizeResponder.panHandlers}>
          <GlobalIcon
            library="MaterialIcons"
            name="open-in-full"
            size={12}
            color={AppColors.white}
          />
        </View>
      )}
    </Animated.View>
  );
};

// ─── DraggableShape ───────────────────────────────────────────────────────────

const DraggableShape = ({
  item,
  isSelected,
  onSelect,
}: {
  item: ShapeItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) => {
  const isLineType = item.type === 'line' || item.type === 'arrow';
  const initW = Math.max(Math.abs(item.x2 - item.x1), 30);
  const initH = isLineType
    ? item.strokeWidth + 24
    : Math.max(Math.abs(item.y2 - item.y1), 20);
  const pad = Math.ceil(item.strokeWidth / 2) + 4;
  const minX = Math.min(item.x1, item.x2);
  const minY = Math.min(item.y1, item.y2);

  const posAnim = useRef(new Animated.ValueXY({x: 0, y: 0})).current;
  const [shapeW, setShapeW] = useState(initW);
  const [shapeH, setShapeH] = useState(initH);
  const startW = useRef(initW);
  const startH = useRef(initH);
  const shapeWRef = useRef(initW);
  const shapeHRef = useRef(initH);

  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        posAnim.setOffset({
          x: (posAnim.x as any)._value,
          y: (posAnim.y as any)._value,
        });
        posAnim.setValue({x: 0, y: 0});
        onSelect(item.id);
      },
      onPanResponderMove: Animated.event(
        [null, {dx: posAnim.x, dy: posAnim.y}],
        {
          useNativeDriver: false,
        },
      ),
      onPanResponderRelease: () => posAnim.flattenOffset(),
    }),
  ).current;

  const resizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startW.current = shapeWRef.current;
        startH.current = shapeHRef.current;
      },
      onPanResponderMove: (_, gs) => {
        const nw = Math.max(30, startW.current + gs.dx);
        const nh = isLineType ? initH : Math.max(20, startH.current + gs.dy);
        shapeWRef.current = nw;
        shapeHRef.current = nh;
        setShapeW(nw);
        setShapeH(nh);
      },
      onPanResponderRelease: () => {},
    }),
  ).current;

  const sw = item.strokeWidth;
  const color = item.color;
  const fill = item.filled ? item.fillColor : 'none';
  const w = shapeW;
  const h = shapeH;

  const renderSvg = () => {
    if (item.type === 'rectangle') {
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Rect
            x={pad}
            y={pad}
            width={w}
            height={h}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
          />
        </Svg>
      );
    }
    if (item.type === 'oval') {
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Ellipse
            cx={pad + w / 2}
            cy={pad + h / 2}
            rx={w / 2}
            ry={h / 2}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
          />
        </Svg>
      );
    }
    if (item.type === 'line') {
      const svgH = sw + 8;
      return (
        <Svg width={w + pad * 2} height={svgH}>
          <Line
            x1={pad}
            y1={svgH / 2}
            x2={w + pad}
            y2={svgH / 2}
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </Svg>
      );
    }
    if (item.type === 'arrow') {
      const hl = Math.max(16, sw * 4);
      const svgH = hl + sw + 4;
      const midY = svgH / 2;
      const endX = w + pad;
      return (
        <Svg width={w + pad * 2} height={svgH}>
          <Line
            x1={pad}
            y1={midY}
            x2={endX}
            y2={midY}
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <Path
            d={`M ${endX - hl * 0.7} ${midY - hl * 0.5} L ${endX} ${midY} L ${
              endX - hl * 0.7
            } ${midY + hl * 0.5}`}
            stroke={color}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    return null;
  };

  return (
    <Animated.View
      style={[
        {position: 'absolute', left: minX - pad, top: minY - pad},
        posAnim.getLayout(),
        isSelected && styles.shapeSelected,
      ]}
      {...dragResponder.panHandlers}>
      {renderSvg()}
      {isSelected && (
        <View
          style={styles.resizeHandle}
          hitSlop={{
            top: RESIZE_HANDLE_HIT,
            left: RESIZE_HANDLE_HIT,
            bottom: RESIZE_HANDLE_HIT,
            right: RESIZE_HANDLE_HIT,
          }}
          {...resizeResponder.panHandlers}>
          <GlobalIcon
            library="MaterialIcons"
            name="open-in-full"
            size={10}
            color={AppColors.white}
          />
        </View>
      )}
    </Animated.View>
  );
};

// ─── ToolButton ───────────────────────────────────────────────────────────────

const ToolButton = ({
  icon,
  label,
  active,
  onPress,
  disabled,
  danger,
  iconRotate,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  iconRotate?: string;
}) => {
  const iconColor = disabled
    ? AppColors.lightGrey
    : danger
    ? AppColors.red
    : active
    ? AppColors.primary
    : AppColors.black;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.toolBtn, active && styles.toolBtnActive]}>
      <View
        style={iconRotate ? {transform: [{rotate: iconRotate}]} : undefined}>
        <GlobalIcon
          library="MaterialIcons"
          name={icon as any}
          size={22}
          color={iconColor}
        />
      </View>
      <Text style={[styles.toolLabel, {color: iconColor}]}>{label}</Text>
    </TouchableOpacity>
  );
};

// ─── ImageEditor ──────────────────────────────────────────────────────────────

interface ImageEditorProps {
  imageUri?: string;
  onSave?: (uri: string) => void;
  onClose?: () => void;
}

export type { ImageEditorProps };

const ImageEditor = ({ imageUri, onSave, onClose }: ImageEditorProps) => {
  const canvasRef = useRef<any>(null);

  // Image transforms
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Layers
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [imageOverlays, setImageOverlays] = useState<ImageOverlayItem[]>([]);
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);
  const [shapes, setShapes] = useState<ShapeItem[]>([]);

  // Selection
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    null,
  );
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Tool
  const [activeTool, setActiveTool] = useState<ToolType>('none');
  const [activeShapeType, setActiveShapeType] =
    useState<ShapeType>('rectangle');
  const [showShapePanel, setShowShapePanel] = useState(false);

  // Draw state (using refs to avoid stale closures in PanResponder)
  const currentPathRef = useRef('');
  const [liveDrawPath, setLiveDrawPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  // Shape refs (for closures)
  const activeShapeTypeRef = useRef<ShapeType>('rectangle');
  const strokeColorRef = useRef('#FFFFFF');
  const strokeWidthRef = useRef(4);
  const shapeFilledRef = useRef(false);
  const shapeFillColorRef = useRef('#FFFFFF');

  // Styling
  const [strokeColor, setStrokeColor] = useState('#FFFFFF');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fontSize, setFontSize] = useState(24);
  const [shapeFilled, setShapeFilled] = useState(false);
  // const [shapeFillColor] = useState('#FFFFFF'); // Unused variable
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);

  // Modals
  const [showTextModal, setShowTextModal] = useState(false);
  const [inputText, setInputText] = useState('');
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Undo history
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const hasSelection = selectedTextId || selectedOverlayId || selectedShapeId;

  // Keep refs in sync with state (for PanResponder closures)
  const syncRef = (ref: React.MutableRefObject<any>, val: any) => {
    ref.current = val;
  };

  // ── History ──────────────────────────────────────────────────────────────────

  const pushHistory = (
    t = texts,
    io = imageOverlays,
    dp = drawPaths,
    sh = shapes,
  ) => {
    setHistory(prev => [
      ...prev.slice(-19),
      {
        texts: [...t],
        imageOverlays: [...io],
        drawPaths: [...dp],
        shapes: [...sh],
      },
    ]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setTexts(prev?.texts || []);
    setImageOverlays(prev?.imageOverlays || []);
    setDrawPaths(prev?.drawPaths || []);
    setShapes(prev?.shapes || []);
    setHistory(h => h.slice(0, -1));
    deselectAll();
  };

  // ── Selection ─────────────────────────────────────────────────────────────────

  const selectText = (id: string) => {
    setSelectedTextId(id);
    setSelectedOverlayId(null);
    setSelectedShapeId(null);
  };

  const selectOverlay = (id: string) => {
    setSelectedOverlayId(id);
    setSelectedTextId(null);
    setSelectedShapeId(null);
  };

  const selectShape = (id: string) => {
    setSelectedShapeId(id);
    setSelectedTextId(null);
    setSelectedOverlayId(null);
  };

  const deselectAll = () => {
    setSelectedTextId(null);
    setSelectedOverlayId(null);
    setSelectedShapeId(null);
  };

  // ── Draw PanResponder ────────────────────────────────────────────────────────

  const drawPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => {
        const {locationX, locationY} = evt.nativeEvent;
        const start = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        currentPathRef.current = start;
        setLiveDrawPath(start);
        setIsDrawing(true);
      },
      onPanResponderMove: evt => {
        const {locationX, locationY} = evt.nativeEvent;
        const next = `${currentPathRef.current} L${locationX.toFixed(
          1,
        )},${locationY.toFixed(1)}`;
        currentPathRef.current = next;
        setLiveDrawPath(next);
      },
      onPanResponderRelease: () => {
        if (currentPathRef.current) {
          setDrawPaths(prev => {
            const updated = [
              ...prev,
              {
                id: Date.now().toString(),
                points: currentPathRef.current,
                color: strokeColorRef.current,
                strokeWidth: strokeWidthRef.current,
              },
            ];
            return updated;
          });
        }
        currentPathRef.current = '';
        setLiveDrawPath('');
        setIsDrawing(false);
      },
    }),
  ).current;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const setTool = (tool: ToolType) => {
    deselectAll();
    setActiveTool(prev => {
      const next = prev === tool ? 'none' : tool;
      setShowShapePanel(next === 'shape');
      return next;
    });
  };

  // Place a default-sized shape at the top-right of the canvas
  const handleAddShape = (type: ShapeType) => {
    syncRef(activeShapeTypeRef, type);
    setActiveShapeType(type);

    const margin = 20;
    const shapeW = 120;
    const shapeH = type === 'line' || type === 'arrow' ? 0 : 80;
    const x1 = CANVAS_SIZE - margin - shapeW;
    const y1 = margin;
    const x2 = CANVAS_SIZE - margin;
    const y2 = y1 + shapeH;

    const newShape: ShapeItem = {
      id: Date.now().toString(),
      type,
      x1,
      y1,
      x2,
      y2,
      color: strokeColorRef.current,
      strokeWidth: strokeWidthRef.current,
      filled: shapeFilledRef.current,
      fillColor: shapeFillColorRef.current,
    };
    pushHistory();
    setShapes(prev => [...prev, newShape]);
    selectShape(newShape.id);
  };

  const updateStrokeColor = (color: string) => {
    syncRef(strokeColorRef, color);
    setStrokeColor(color);
    if (selectedTextId) {
      setTexts(prev =>
        prev.map(t => (t.id === selectedTextId ? {...t, color} : t)),
      );
    }
    if (selectedShapeId) {
      setShapes(prev =>
        prev.map(s => (s.id === selectedShapeId ? {...s, color} : s)),
      );
    }
  };

  const updateStrokeWidth = (delta: number) => {
    const next = Math.max(1, Math.min(20, strokeWidth + delta));
    syncRef(strokeWidthRef, next);
    setStrokeWidth(next);
    if (selectedShapeId) {
      setShapes(prev =>
        prev.map(s =>
          s.id === selectedShapeId ? {...s, strokeWidth: next} : s,
        ),
      );
    }
  };

  const updateFontSize = (delta: number) => {
    const next = Math.max(12, Math.min(72, fontSize + delta));
    setFontSize(next);
    if (selectedTextId) {
      setTexts(prev =>
        prev.map(t => (t.id === selectedTextId ? {...t, fontSize: next} : t)),
      );
    }
  };

  const updateShapeFilled = (val: boolean) => {
    syncRef(shapeFilledRef, val);
    setShapeFilled(val);
  };

  const handlePickImage = () => {
    try {
      launchImageLibrary(
        {
          mediaType: 'photo', 
          quality: 1,
          includeBase64: false,
          maxWidth: 2000,
          maxHeight: 2000,
        }, 
        response => {
          console.log('Image picker response:', response);
          
          // Handle various error scenarios
          if (response.didCancel) {
            console.log('User cancelled image picker');
            return;
          }
          
          if (response.errorCode) {
            console.log('Image picker error:', response.errorCode, response.errorMessage);
            Alert.alert('Error', `Failed to open gallery: ${response.errorMessage || 'Unknown error'}`);
            return;
          }
          
          // Add comprehensive null checks for response and assets
          if (!response) {
            console.log('Image picker: No response received');
            Alert.alert('Error', 'Failed to open gallery. Please try again.');
            return;
          }
          
          if (!response.assets || response.assets.length === 0) {
            console.log('Image picker: No assets available');
            Alert.alert('No Images', 'No images found in gallery. Please select a different app.');
            return;
          }
          
          const asset = response.assets[0];
          if (!asset) {
            console.log('Image picker: Invalid asset structure');
            Alert.alert('Error', 'Invalid image format. Please try again.');
            return;
          }
          
          if (!asset.uri) {
            console.log('Image picker: Asset URI missing');
            Alert.alert('Error', 'Selected image has no URI. Please try again.');
            return;
          }
          
          const uri = asset.uri;
          console.log('Image picker: Successfully selected image:', uri);
          pushHistory();
          const id = Date.now().toString();
          setImageOverlays(prev => [
            ...prev,
            {
              id,
              uri,
              x: CANVAS_SIZE / 2 - INITIAL_OVERLAY_SIZE / 2,
              y: CANVAS_SIZE / 2 - INITIAL_OVERLAY_SIZE / 2,
              width: INITIAL_OVERLAY_SIZE,
              height: INITIAL_OVERLAY_SIZE,
            },
          ]);
          selectOverlay(id);
        });
    } catch (error) {
      console.log('Image picker crashed:', error);
      Alert.alert(
        'Gallery Error', 
        'Failed to open gallery. Please check app permissions and try again.',
        [{ text: 'OK', onPress: () => {} }]
      );
    }
  };

  const handleRotate = () => {
    pushHistory();
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFlipH = () => {
    pushHistory();
    setFlipH(prev => !prev);
  };

  const handleFlipV = () => {
    pushHistory();
    setFlipV(prev => !prev);
  };

  const handleAddText = () => {
    if (!inputText.trim()) return;
    pushHistory();
    if (editingTextId) {
      setTexts(prev =>
        prev.map(t =>
          t.id === editingTextId
            ? {
                ...t,
                text: inputText.trim(),
                color: strokeColor,
                fontSize,
                bold: textBold,
                italic: textItalic,
              }
            : t,
        ),
      );
      setEditingTextId(null);
    } else {
      const id = Date.now().toString();
      setTexts(prev => [
        ...prev,
        {
          id,
          text: inputText.trim(),
          x: CANVAS_SIZE / 2 - 60,
          y: CANVAS_SIZE / 2 - 20,
          color: strokeColor,
          fontSize,
          bold: textBold,
          italic: textItalic,
        },
      ]);
      selectText(id);
    }
    setInputText('');
    setShowTextModal(false);
  };

  const handleDoubleTapText = (id: string) => {
    const item = texts.find(t => t.id === id);
    if (!item) return;
    setInputText(item.text);
    setStrokeColor(item.color);
    syncRef(strokeColorRef, item.color);
    setFontSize(item.fontSize);
    setTextBold(item.bold);
    setTextItalic(item.italic);
    setEditingTextId(id);
    setShowTextModal(true);
  };

  const handleDeleteSelected = () => {
    if (!hasSelection) return;
    pushHistory();
    if (selectedTextId) {
      setTexts(prev => prev.filter(t => t.id !== selectedTextId));
      setSelectedTextId(null);
    } else if (selectedOverlayId) {
      setImageOverlays(prev =>
        prev.filter(img => img.id !== selectedOverlayId),
      );
      setSelectedOverlayId(null);
    } else if (selectedShapeId) {
      setShapes(prev => prev.filter(s => s.id !== selectedShapeId));
      setSelectedShapeId(null);
    }
  };

  const handleClearAll = () => {
    Alert.alert('Clear Canvas', 'Remove all drawings, text and shapes?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          pushHistory();
          setTexts([]);
          setImageOverlays([]);
          setDrawPaths([]);
          setShapes([]);
          deselectAll();
        },
      },
    ]);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      deselectAll();
      setActiveTool('none');
      await new Promise(resolve => setTimeout(resolve, 200));
      const uri = await captureRef(canvasRef, {format: 'jpg', quality: 0.95});
      onSave?.(uri);
      onClose?.();
    } catch (e) {
      console.log('ImageEditor capture error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const imageTransform = {
    transform: [
      {rotate: `${rotation}deg`},
      {scaleX: flipH ? -1 : 1},
      {scaleY: flipV ? -1 : 1},
    ],
  };

  return (
    <View style={[AppStyles.body, {
      paddingVertical: hp(3)
    }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose || (() => {})}
          style={styles.headerIconBtn}>
          <GlobalIcon
            library="Ionicons"
            name="arrow-back"
            size={24}
            color={AppColors.black}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Image</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={history.length === 0}
            style={styles.headerIconBtn}>
            <GlobalIcon
              library="MaterialIcons"
              name="undo"
              size={24}
              color={
                history.length === 0 ? AppColors.lightGrey : AppColors.black
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveBtn}>
            {isSaving ? (
              <ActivityIndicator size="small" color={AppColors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Canvas ── */}
      <View style={styles.canvasWrapper}>
        <View ref={canvasRef} collapsable={false} style={styles.canvas}>
          {/* Background image */}
          {imageUri && (
            <Image
              source={{uri: imageUri}}
              style={[styles.canvasImage, imageTransform]}
              resizeMode="cover"
            />
          )}

          {/* Draw SVG layer (freehand paths + shape preview) */}
          <Svg style={StyleSheet.absoluteFill}>
            {drawPaths.map(p => (
              <Path
                key={p.id}
                d={p.points}
                stroke={p.color}
                strokeWidth={p.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {isDrawing && liveDrawPath ? (
              <Path
                d={liveDrawPath}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>

          {/* Image overlays */}
          {imageOverlays.map(item => (
            <DraggableImage
              key={item.id}
              item={item}
              isSelected={selectedOverlayId === item.id}
              onSelect={selectOverlay}
            />
          ))}

          {/* Placed shapes (draggable) */}
          {shapes.map(item => (
            <DraggableShape
              key={item.id}
              item={item}
              isSelected={selectedShapeId === item.id}
              onSelect={selectShape}
            />
          ))}

          {/* Text overlays */}
          {texts.map(item => (
            <DraggableText
              key={item.id}
              item={item}
              isSelected={selectedTextId === item.id}
              onSelect={selectText}
              onDoubleTap={handleDoubleTapText}
            />
          ))}

          {/* Transparent draw overlay – captures all touches in draw mode */}
          {activeTool === 'draw' && (
            <View
              style={[StyleSheet.absoluteFill, {zIndex: 99}]}
              {...drawPanResponder.panHandlers}
            />
          )}
        </View>
      </View>

      {/* ── Shape Type Panel ── */}
      {showShapePanel && (
        <View style={styles.shapePanel}>
          {(['rectangle', 'oval', 'line', 'arrow'] as ShapeType[]).map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => handleAddShape(type)}
              style={[
                styles.shapePanelBtn,
                activeShapeType === type && styles.shapePanelBtnActive,
              ]}>
              <GlobalIcon
                library="MaterialIcons"
                name={
                  type === 'rectangle'
                    ? 'crop-square'
                    : type === 'oval'
                    ? 'radio-button-unchecked'
                    : type === 'line'
                    ? 'remove'
                    : 'arrow-forward'
                }
                size={22}
                color={
                  activeShapeType === type ? AppColors.white : AppColors.black
                }
              />
              <Text
                style={[
                  styles.shapePanelLabel,
                  activeShapeType === type && styles.shapePanelLabelActive,
                ]}>
                {type === 'rectangle'
                  ? 'Rect'
                  : type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Fill toggle */}
          <TouchableOpacity
            onPress={() => updateShapeFilled(!shapeFilled)}
            style={[
              styles.shapePanelBtn,
              shapeFilled && styles.shapePanelBtnActive,
            ]}>
            <GlobalIcon
              library="MaterialIcons"
              name="format-color-fill"
              size={22}
              color={shapeFilled ? AppColors.white : AppColors.black}
            />
            <Text
              style={[
                styles.shapePanelLabel,
                shapeFilled && styles.shapePanelLabelActive,
              ]}>
              Fill
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Color + Stroke/Font controls ── */}
      <View style={styles.controls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorRow}>
          {COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => updateStrokeColor(c)}
              style={[
                styles.colorDot,
                {backgroundColor: c},
                strokeColor === c && styles.colorDotSelected,
              ]}
            />
          ))}
        </ScrollView>

        <View style={styles.adjRow}>
          <TouchableOpacity
            onPress={() =>
              activeTool === 'text' ? updateFontSize(-2) : updateStrokeWidth(-1)
            }
            style={styles.sizeBtn}>
            <Text style={styles.sizeBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.sizeValue}>
            {activeTool === 'text' ? `${fontSize}px` : `${strokeWidth}pt`}
          </Text>
          <TouchableOpacity
            onPress={() =>
              activeTool === 'text' ? updateFontSize(2) : updateStrokeWidth(1)
            }
            style={styles.sizeBtn}>
            <Text style={styles.sizeBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Toolbar ── */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.toolbarScroll}
          contentContainerStyle={styles.toolbar}>
          <ToolButton
            icon="brush"
            label="Draw"
            active={activeTool === 'draw'}
            onPress={() => setTool('draw')}
          />
          <ToolButton
            icon="crop-square"
            label="Shapes"
            active={activeTool === 'shape'}
            onPress={() => setTool('shape')}
          />
          <ToolButton
            icon="text-fields"
            label="Text"
            active={activeTool === 'text'}
            onPress={() => {
              setTool('text');
              setShowTextModal(true);
            }}
          />
          <ToolButton
            icon="photo-library"
            label="Gallery"
            active={false}
            disabled={true}
            onPress={handlePickImage}
          />
          <ToolButton
            icon="rotate-right"
            label="Rotate"
            active={false}
            onPress={handleRotate}
          />
          <ToolButton
            icon="flip"
            label="Flip H"
            active={flipH}
            onPress={handleFlipH}
          />
          <ToolButton
            icon="flip"
            label="Flip V"
            active={flipV}
            onPress={handleFlipV}
            iconRotate="90deg"
          />
          <ToolButton
            icon="delete"
            label="Delete"
            active={false}
            disabled={!hasSelection}
            onPress={handleDeleteSelected}
            danger
          />
          <ToolButton
            icon="layers-clear"
            label="Clear"
            active={false}
            onPress={handleClearAll}
            danger
          />
        </ScrollView>
      </View>

      {/* ── Add / Edit Text Modal ── */}
      <Modal
        visible={showTextModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowTextModal(false);
          setInputText('');
          setEditingTextId(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTextId ? 'Edit Text' : 'Add Text'}
            </Text>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Enter your text..."
              placeholderTextColor={AppColors.grey}
              style={[
                styles.textInput,
                {
                  color: strokeColor,
                  fontSize,
                  fontWeight: textBold ? 'bold' : 'normal',
                  fontStyle: textItalic ? 'italic' : 'normal',
                },
              ]}
              autoFocus
              multiline
            />
            {/* Bold / Italic / Font size */}
            <View style={styles.textStyleRow}>
              <TouchableOpacity
                onPress={() => setTextBold(b => !b)}
                style={[
                  styles.textStyleBtn,
                  textBold && styles.textStyleBtnActive,
                ]}>
                <Text
                  style={[
                    styles.textStyleLabel,
                    textBold && styles.textStyleLabelActive,
                  ]}>
                  B
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTextItalic(i => !i)}
                style={[
                  styles.textStyleBtn,
                  textItalic && styles.textStyleBtnActive,
                ]}>
                <Text
                  style={[
                    styles.textStyleLabel,
                    {fontStyle: 'italic'},
                    textItalic && styles.textStyleLabelActive,
                  ]}>
                  I
                </Text>
              </TouchableOpacity>
              <View style={styles.fontSizeInModal}>
                <TouchableOpacity
                  onPress={() => updateFontSize(-2)}
                  style={styles.sizeBtn}>
                  <Text style={styles.sizeBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.sizeValue}>{fontSize}px</Text>
                <TouchableOpacity
                  onPress={() => updateFontSize(2)}
                  style={styles.sizeBtn}>
                  <Text style={styles.sizeBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Color picker */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => updateStrokeColor(c)}
                  style={[
                    styles.colorDot,
                    {backgroundColor: c},
                    strokeColor === c && styles.colorDotSelected,
                  ]}
                />
              ))}
            </ScrollView>
            <View style={AppStyles.rowBetween}>
              <TouchableOpacity
                onPress={() => {
                  setShowTextModal(false);
                  setInputText('');
                  setEditingTextId(null);
                }}
                style={[styles.modalBtn, styles.cancelBtn]}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddText}
                style={[styles.modalBtn, styles.addBtn]}>
                <Text style={styles.addBtnText}>
                  {editingTextId ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: hp(2),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderColor,
  },
  headerIconBtn: {
    padding: hp(0.5),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hp(1),
  },
  headerTitle: {
    fontSize: size.md,
    fontFamily: AppFonts.poppinsSemiBold,
    color: AppColors.black,
  },
  saveBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: hp(2.5),
    paddingVertical: hp(0.8),
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  saveBtnText: {
    color: AppColors.white,
    fontFamily: AppFonts.poppinsSemiBold,
    fontSize: size.default,
  },
  canvasWrapper: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  canvasImage: {
    width: '100%',
    height: '100%',
  },
  // Image overlay
  imageOverlay: {
    position: 'absolute',
    overflow: 'hidden',
  },
  imageOverlaySelected: {
    borderWidth: 1.5,
    borderColor: AppColors.primary,
    borderRadius: 4,
  },
  overlayImage: {
    width: '100%',
    height: '100%',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    borderWidth: 2,
    borderColor: AppColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  // Shape selected highlight
  shapeSelected: {
    borderWidth: 1,
    borderColor: AppColors.primary,
    borderStyle: 'dashed',
  },
  // Draggable text
  draggableText: {
    position: 'absolute',
    padding: 4,
  },
  draggableTextSelected: {
    borderWidth: 1,
    borderColor: AppColors.primary,
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  // Shape type panel
  shapePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: hp(1.5),
    paddingVertical: hp(0.6),
    backgroundColor: AppColors.verylightblue,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderColor,
    gap: hp(0.8),
  },
  shapePanelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: hp(1),
    paddingVertical: hp(0.5),
    borderRadius: 8,
    gap: 5,
  },
  shapePanelBtnActive: {
    backgroundColor: AppColors.primary,
  },
  shapePanelLabel: {
    fontSize: size.xs,
    fontFamily: AppFonts.poppinsRegular,
    color: AppColors.black,
  },
  shapePanelLabelActive: {
    color: AppColors.white,
  },
  // Controls bar
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: hp(2),
    paddingVertical: hp(0.7),
    backgroundColor: AppColors.white,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderColor,
    gap: hp(1),
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hp(0.8),
    paddingRight: hp(1),
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: AppColors.borderColor,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: AppColors.primary,
    transform: [{scale: 1.15}],
  },
  adjRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hp(0.5),
  },
  sizeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: AppColors.verylightblue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeBtnText: {
    fontSize: 18,
    color: AppColors.primary,
    fontFamily: AppFonts.poppinsBold,
    lineHeight: 22,
  },
  sizeValue: {
    fontSize: size.s,
    fontFamily: AppFonts.poppinsMedium,
    color: AppColors.black,
    minWidth: 36,
    textAlign: 'center',
  },
  // Toolbar
  toolbarScroll: {
    backgroundColor: AppColors.white,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderColor,
    flexShrink: 0,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.8),
    paddingHorizontal: hp(1),
    gap: hp(0.3),
  },
  toolBtn: {
    alignItems: 'center',
    gap: 2,
    minWidth: 54,
    paddingVertical: hp(0.4),
    paddingHorizontal: hp(0.4),
    borderRadius: 8,
  },
  toolBtnActive: {
    backgroundColor: AppColors.verylightblue,
  },
  toolLabel: {
    fontSize: size.xs,
    fontFamily: AppFonts.poppinsRegular,
    color: AppColors.black,
  },
  // Text modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: hp(2.5),
    gap: hp(1.5),
  },
  modalTitle: {
    fontSize: size.md,
    fontFamily: AppFonts.poppinsSemiBold,
    color: AppColors.black,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: AppColors.borderColor,
    borderRadius: 10,
    paddingHorizontal: hp(1.5),
    paddingVertical: hp(1.2),
    fontSize: size.default,
    fontFamily: AppFonts.poppinsRegular,
    color: AppColors.black,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textStyleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hp(1),
  },
  textStyleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: AppColors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textStyleBtnActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  textStyleLabel: {
    fontSize: size.md,
    fontFamily: AppFonts.poppinsBold,
    color: AppColors.black,
  },
  textStyleLabelActive: {
    color: AppColors.white,
  },
  fontSizeInModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hp(0.5),
    marginLeft: 'auto',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: hp(1.5),
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: AppColors.borderColor,
    marginRight: hp(1),
  },
  addBtn: {
    backgroundColor: AppColors.primary,
    marginLeft: hp(1),
  },
  cancelBtnText: {
    fontFamily: AppFonts.poppinsSemiBold,
    fontSize: size.default,
    color: AppColors.black,
  },
  addBtnText: {
    fontFamily: AppFonts.poppinsSemiBold,
    fontSize: size.default,
    color: AppColors.white,
  },
});

export default ImageEditor;
