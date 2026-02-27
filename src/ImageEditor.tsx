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
import Svg, {
  Rect,
  Ellipse,
  Line,
  Path,
  Polygon,
  Defs,
  ClipPath,
  Image as SvgImage,
} from 'react-native-svg';
import {captureRef} from 'react-native-view-shot';
import {launchImageLibrary} from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

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

const CANVAS_SIZE = screenWidth;
const MIN_OVERLAY_SIZE = 60;
const INITIAL_OVERLAY_SIZE = 160;
const RESIZE_HANDLE_HIT = 32;
const CROP_INITIAL = {
  x: CANVAS_SIZE * 0.1,
  y: CANVAS_SIZE * 0.1,
  width: CANVAS_SIZE * 0.8,
  height: CANVAS_SIZE * 0.8,
};

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
  '#F97316',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#6366F1',
  '#3B82F6',
  '#06B6D4',
  '#14B8A6',
  '#22C55E',
  '#84CC16',
  '#EAB308',
  '#F59E0B',
  '#78350F',
  '#7F1D1D',
  '#4C1D95',
  '#1E3A8A',
  '#064E3B',
  '#365314',
  '#831843',
  '#FECACA',
  '#FED7AA',
  '#FEF08A',
  '#BBF7D0',
  '#BAE6FD',
  '#DDD6FE',
  '#FBCFE8',
  '#D1FAE5',
  '#E0F2FE',
  '#F3F4F6',
  '#6B7280',
  '#374151',
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolType = 'none' | 'draw' | 'text' | 'shape' | 'image' | 'crop';
type ShapeType =
  | 'rectangle'
  | 'oval'
  | 'line'
  | 'arrow'
  | 'triangle'
  | 'star'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'heart'
  | 'cross'
  | 'rounded-rect'
  | 'parallelogram'
  | 'octagon';

type ClipShapeType = 'none' | Exclude<ShapeType, 'line' | 'arrow'>;

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
  clipShape: ClipShapeType;
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

// ─── SVG path helpers ─────────────────────────────────────────────────────────

const regularPolygonPoints = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sides: number,
): string => {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    pts.push(
      `${(cx + rx * Math.cos(angle)).toFixed(1)},${(
        cy +
        ry * Math.sin(angle)
      ).toFixed(1)}`,
    );
  }
  return pts.join(' ');
};

const buildStarPath = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): string => {
  const irx = rx * 0.4;
  const iry = ry * 0.4;
  let d = '';
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const ex = i % 2 === 0 ? rx : irx;
    const ey = i % 2 === 0 ? ry : iry;
    const px = (cx + ex * Math.cos(angle)).toFixed(1);
    const py = (cy + ey * Math.sin(angle)).toFixed(1);
    d += i === 0 ? `M${px},${py}` : `L${px},${py}`;
  }
  return d + 'Z';
};

const buildHeartPath = (
  px: number,
  py: number,
  w: number,
  h: number,
): string => {
  const X = (t: number) => (px + t * w).toFixed(1);
  const Y = (t: number) => (py + t * h).toFixed(1);
  return [
    `M${X(0.5)},${Y(0.35)}`,
    `C${X(0.5)},${Y(0.2)} ${X(0.3)},${Y(0.15)} ${X(0.2)},${Y(0.25)}`,
    `C${X(0.1)},${Y(0.35)} ${X(0.12)},${Y(0.48)} ${X(0.25)},${Y(0.58)}`,
    `L${X(0.5)},${Y(0.82)}`,
    `L${X(0.75)},${Y(0.58)}`,
    `C${X(0.88)},${Y(0.48)} ${X(0.9)},${Y(0.35)} ${X(0.8)},${Y(0.25)}`,
    `C${X(0.7)},${Y(0.15)} ${X(0.5)},${Y(0.2)} ${X(0.5)},${Y(0.35)}Z`,
  ].join(' ');
};

// Returns an SVG shape element in 0-100 normalized coordinate space for ClipPath
const buildClipPathShape = (
  shape: Exclude<ClipShapeType, 'none'>,
): React.ReactElement | null => {
  switch (shape) {
    case 'rectangle':
      return <Rect x={0} y={0} width={100} height={100} />;
    case 'rounded-rect':
      return <Rect x={0} y={0} width={100} height={100} rx={20} ry={20} />;
    case 'oval':
      return <Ellipse cx={50} cy={50} rx={50} ry={50} />;
    case 'triangle':
      return <Polygon points="50,2 2,98 98,98" />;
    case 'diamond':
      return <Polygon points="50,2 98,50 50,98 2,50" />;
    case 'star':
      return <Path d={buildStarPath(50, 50, 48, 48)} />;
    case 'heart':
      return <Path d={buildHeartPath(2, 4, 96, 92)} />;
    case 'pentagon':
      return <Polygon points={regularPolygonPoints(50, 54, 48, 46, 5)} />;
    case 'hexagon':
      return <Polygon points={regularPolygonPoints(50, 50, 48, 48, 6)} />;
    case 'cross':
      return (
        <Path d="M33,0 L67,0 L67,33 L100,33 L100,67 L67,67 L67,100 L33,100 L33,67 L0,67 L0,33 L33,33 Z" />
      );
    case 'parallelogram':
      return <Polygon points="20,0 100,0 80,100 0,100" />;
    case 'octagon':
      return <Polygon points={regularPolygonPoints(50, 50, 48, 48, 8)} />;
    default:
      return null;
  }
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
      {item.clipShape !== 'none' ? (
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox="0 0 100 100"
          preserveAspectRatio="none">
          <Defs>
            <ClipPath id={`clip-${item.id}-${item.clipShape}`}>
              {buildClipPathShape(item.clipShape as Exclude<ClipShapeType, 'none'>)}
            </ClipPath>
          </Defs>
          <SvgImage
            x={0}
            y={0}
            width={100}
            height={100}
            href={item.uri}
            clipPath={`url(#clip-${item.id}-${item.clipShape})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </Svg>
      ) : (
        <Image
          source={{uri: item.uri}}
          style={styles.overlayImage}
          resizeMode="cover"
        />
      )}
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
          <MaterialIcons
            name="open-in-full"
            size={12}
            color={AppColors.white}
          />
        </View>
      )}
    </Animated.View>
  );
};

// ─── Shape panel config ───────────────────────────────────────────────────────

const SHAPE_PANEL_CONFIG: {type: ShapeType; icon: string; label: string}[] = [
  {type: 'rectangle', icon: 'crop-square', label: 'Rect'},
  {type: 'rounded-rect', icon: 'rounded-corner', label: 'Round'},
  {type: 'oval', icon: 'radio-button-unchecked', label: 'Oval'},
  {type: 'triangle', icon: 'change-history', label: 'Triangle'},
  {type: 'diamond', icon: 'diamond', label: 'Diamond'},
  {type: 'star', icon: 'star-border', label: 'Star'},
  {type: 'heart', icon: 'favorite-border', label: 'Heart'},
  {type: 'pentagon', icon: 'pentagon', label: 'Penta'},
  {type: 'hexagon', icon: 'hexagon', label: 'Hexa'},
  {type: 'octagon', icon: 'octagon', label: 'Octa'},
  {type: 'cross', icon: 'add', label: 'Cross'},
  {type: 'parallelogram', icon: 'view-day', label: 'Para'},
  {type: 'line', icon: 'remove', label: 'Line'},
  {type: 'arrow', icon: 'arrow-forward', label: 'Arrow'},
];

// ─── Image clip panel config ──────────────────────────────────────────────────

const CLIP_PANEL_CONFIG: {key: ClipShapeType; icon: string; label: string}[] = [
  {key: 'none', icon: 'image', label: 'None'},
  ...SHAPE_PANEL_CONFIG.filter(
    s => s.type !== 'line' && s.type !== 'arrow',
  ).map(s => ({key: s.type as ClipShapeType, icon: s.icon, label: s.label})),
];

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
    if (item.type === 'triangle') {
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Polygon
            points={`${(pad + w / 2).toFixed(1)},${pad} ${pad},${pad + h} ${
              pad + w
            },${pad + h}`}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    if (item.type === 'star') {
      const cx = pad + w / 2;
      const cy = pad + h / 2;
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Path
            d={buildStarPath(cx, cy, w / 2, h / 2)}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    if (item.type === 'diamond') {
      const cx = pad + w / 2;
      const cy = pad + h / 2;
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Polygon
            points={`${cx},${pad} ${pad + w},${cy} ${cx},${
              pad + h
            } ${pad},${cy}`}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    if (item.type === 'pentagon') {
      const cx = pad + w / 2;
      const cy = pad + h / 2;
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Polygon
            points={regularPolygonPoints(cx, cy, w / 2, h / 2, 5)}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    if (item.type === 'hexagon') {
      const cx = pad + w / 2;
      const cy = pad + h / 2;
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Polygon
            points={regularPolygonPoints(cx, cy, w / 2, h / 2, 6)}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    if (item.type === 'heart') {
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Path
            d={buildHeartPath(pad, pad, w, h)}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      );
    }
    if (item.type === 'cross') {
      const tx = w / 3;
      const ty = h / 3;
      const d = [
        `M${(pad + tx).toFixed(1)},${pad}`,
        `L${(pad + w - tx).toFixed(1)},${pad}`,
        `L${(pad + w - tx).toFixed(1)},${(pad + ty).toFixed(1)}`,
        `L${(pad + w).toFixed(1)},${(pad + ty).toFixed(1)}`,
        `L${(pad + w).toFixed(1)},${(pad + h - ty).toFixed(1)}`,
        `L${(pad + w - tx).toFixed(1)},${(pad + h - ty).toFixed(1)}`,
        `L${(pad + w - tx).toFixed(1)},${(pad + h).toFixed(1)}`,
        `L${(pad + tx).toFixed(1)},${(pad + h).toFixed(1)}`,
        `L${(pad + tx).toFixed(1)},${(pad + h - ty).toFixed(1)}`,
        `L${pad},${(pad + h - ty).toFixed(1)}`,
        `L${pad},${(pad + ty).toFixed(1)}`,
        `L${(pad + tx).toFixed(1)},${(pad + ty).toFixed(1)}Z`,
      ].join(' ');
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Path
            d={d}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    if (item.type === 'rounded-rect') {
      const r = Math.min(w, h) * 0.2;
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Rect
            x={pad}
            y={pad}
            width={w}
            height={h}
            rx={r}
            ry={r}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
          />
        </Svg>
      );
    }
    if (item.type === 'parallelogram') {
      const skew = w * 0.2;
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Polygon
            points={`${(pad + skew).toFixed(1)},${pad} ${pad + w},${pad} ${(
              pad +
              w -
              skew
            ).toFixed(1)},${pad + h} ${pad},${pad + h}`}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    if (item.type === 'octagon') {
      const cx = pad + w / 2;
      const cy = pad + h / 2;
      return (
        <Svg width={w + pad * 2} height={h + pad * 2}>
          <Polygon
            points={regularPolygonPoints(cx, cy, w / 2, h / 2, 8)}
            stroke={color}
            strokeWidth={sw}
            fill={fill}
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
          <MaterialIcons
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
        <MaterialIcons
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

  // Base image (stateful so crop can update it)
  const [currentImageUri, setCurrentImageUri] = useState(imageUri);

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

  // Crop
  const cropBoxRef = useRef(CROP_INITIAL);
  const [cropBox, setCropBox] = useState(CROP_INITIAL);
  const cropDragStartRef = useRef({x: 0, y: 0});
  const cropResizeStartRef = useRef({width: 0, height: 0});
  const [cropStagingUri, setCropStagingUri] = useState('');
  const cropCaptureRef = useRef<any>(null);

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
        const completedPath = currentPathRef.current;
        const completedColor = strokeColorRef.current;
        const completedStrokeWidth = strokeWidthRef.current;
        currentPathRef.current = '';
        setLiveDrawPath('');
        setIsDrawing(false);
        if (completedPath) {
          setDrawPaths(prev => [...prev, {
            id: Date.now().toString(),
            points: completedPath,
            color: completedColor,
            strokeWidth: completedStrokeWidth,
          }]);
        }
      },
    }),
  ).current;

  // ── Crop PanResponders ───────────────────────────────────────────────────────

  const cropDragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        cropDragStartRef.current = {
          x: cropBoxRef.current.x,
          y: cropBoxRef.current.y,
        };
      },
      onPanResponderMove: (_, gs) => {
        const newX = Math.max(
          0,
          Math.min(
            CANVAS_SIZE - cropBoxRef.current.width,
            cropDragStartRef.current.x + gs.dx,
          ),
        );
        const newY = Math.max(
          0,
          Math.min(
            CANVAS_SIZE - cropBoxRef.current.height,
            cropDragStartRef.current.y + gs.dy,
          ),
        );
        cropBoxRef.current = {...cropBoxRef.current, x: newX, y: newY};
        setCropBox(prev => ({...prev, x: newX, y: newY}));
      },
      onPanResponderRelease: () => {},
    }),
  ).current;

  const cropResizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        cropResizeStartRef.current = {
          width: cropBoxRef.current.width,
          height: cropBoxRef.current.height,
        };
      },
      onPanResponderMove: (_, gs) => {
        const newW = Math.max(
          60,
          Math.min(
            CANVAS_SIZE - cropBoxRef.current.x,
            cropResizeStartRef.current.width + gs.dx,
          ),
        );
        const newH = Math.max(
          60,
          Math.min(
            CANVAS_SIZE - cropBoxRef.current.y,
            cropResizeStartRef.current.height + gs.dy,
          ),
        );
        cropBoxRef.current = {...cropBoxRef.current, width: newW, height: newH};
        setCropBox(prev => ({...prev, width: newW, height: newH}));
      },
      onPanResponderRelease: () => {},
    }),
  ).current;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const setTool = (tool: ToolType) => {
    deselectAll();
    setActiveTool(prev => {
      const next = prev === tool ? 'none' : tool;
      setShowShapePanel(next === 'shape');
      if (next === 'crop') {
        cropBoxRef.current = CROP_INITIAL;
        setCropBox(CROP_INITIAL);
      }
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

  const updateImageClipShape = (shape: ClipShapeType) => {
    if (!selectedOverlayId) return;
    setImageOverlays(prev =>
      prev.map(img =>
        img.id === selectedOverlayId ? {...img, clipShape: shape} : img,
      ),
    );
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
              clipShape: 'none',
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

  const applyCrop = async () => {
    try {
      setIsSaving(true);
      deselectAll();
      setActiveTool('none');
      await new Promise(r => setTimeout(r, 200));
      const fullUri = await captureRef(canvasRef, {format: 'png', quality: 1});
      // Step 2: stage the crop region in the hidden capture view
      setCropStagingUri(fullUri);
      await new Promise(r => setTimeout(r, 300));
      const croppedUri = await captureRef(cropCaptureRef, {format: 'jpg', quality: 1});
      pushHistory();
      setCurrentImageUri(croppedUri);
      setTexts([]);
      setImageOverlays([]);
      setDrawPaths([]);
      setShapes([]);
      deselectAll();
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      cropBoxRef.current = CROP_INITIAL;
      setCropBox(CROP_INITIAL);
      setCropStagingUri('');
    } catch (e) {
      console.log('Crop error:', e);
    } finally {
      setIsSaving(false);
    }
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
          <Ionicons
            name="arrow-back"
            size={24}
            color={AppColors.black}
          />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={history.length === 0}
            style={styles.headerIconBtn}>
            <MaterialIcons
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
          {currentImageUri && (
            <Image
              source={{uri: currentImageUri}}
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

          {/* Crop overlay */}
          {activeTool === 'crop' && (
            <View
              style={StyleSheet.absoluteFill}
              pointerEvents="box-none">
              {/* Dark mask – top */}
              <View
                style={[
                  styles.cropDim,
                  {top: 0, left: 0, right: 0, height: cropBox.y},
                ]}
              />
              {/* Dark mask – bottom */}
              <View
                style={[
                  styles.cropDim,
                  {
                    top: cropBox.y + cropBox.height,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  },
                ]}
              />
              {/* Dark mask – left */}
              <View
                style={[
                  styles.cropDim,
                  {
                    top: cropBox.y,
                    left: 0,
                    width: cropBox.x,
                    height: cropBox.height,
                  },
                ]}
              />
              {/* Dark mask – right */}
              <View
                style={[
                  styles.cropDim,
                  {
                    top: cropBox.y,
                    left: cropBox.x + cropBox.width,
                    right: 0,
                    height: cropBox.height,
                  },
                ]}
              />
              {/* Crop selection box (drag to move) */}
              <View
                style={[
                  styles.cropBox,
                  {
                    top: cropBox.y,
                    left: cropBox.x,
                    width: cropBox.width,
                    height: cropBox.height,
                  },
                ]}
                {...cropDragResponder.panHandlers}>
                {/* Corner lines for visual polish */}
                <View style={[styles.cropCorner, styles.cropCornerTL]} />
                <View style={[styles.cropCorner, styles.cropCornerTR]} />
                <View style={[styles.cropCorner, styles.cropCornerBL]} />
                {/* Resize handle – bottom-right corner */}
                <View
                  style={styles.cropResizeHandle}
                  hitSlop={{
                    top: RESIZE_HANDLE_HIT,
                    left: RESIZE_HANDLE_HIT,
                    bottom: RESIZE_HANDLE_HIT,
                    right: RESIZE_HANDLE_HIT,
                  }}
                  {...cropResizeResponder.panHandlers}>
                  <MaterialIcons name="open-in-full" size={12} color="#FFFFFF" />
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Hidden crop staging view – always mounted so ref is valid */}
      <View
        ref={cropCaptureRef}
        collapsable={false}
        pointerEvents="none"
        style={{
          position: 'absolute',
          opacity: 0.001,
          width: Math.max(1, Math.round(cropBox.width)),
          height: Math.max(1, Math.round(cropBox.height)),
          overflow: 'hidden',
          top: 0,
          left: 0,
          zIndex: -1,
        }}>
        {cropStagingUri ? (
          <Image
            source={{uri: cropStagingUri}}
            style={{
              position: 'absolute',
              left: -Math.round(cropBox.x),
              top: -Math.round(cropBox.y),
              width: CANVAS_SIZE,
              height: CANVAS_SIZE,
            }}
            resizeMode="cover"
          />
        ) : null}
      </View>

      {/* ── Shape Type Panel ── */}
      {showShapePanel && (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.shapePanelOuter}
            contentContainerStyle={styles.shapePanelInner}>
            {SHAPE_PANEL_CONFIG.map(({type, icon, label}) => {
              const active = activeShapeType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => handleAddShape(type)}
                  style={[
                    styles.shapePanelBtn,
                    active && styles.shapePanelBtnActive,
                  ]}>
                  <MaterialIcons
                    name={icon as any}
                    size={22}
                    color={active ? AppColors.white : AppColors.black}
                  />
                  <Text
                    style={[
                      styles.shapePanelLabel,
                      active && styles.shapePanelLabelActive,
                    ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {/* Fill toggle */}
            <TouchableOpacity
              onPress={() => updateShapeFilled(!shapeFilled)}
              style={[
                styles.shapePanelBtn,
                shapeFilled && styles.shapePanelBtnActive,
              ]}>
              <MaterialIcons
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
          </ScrollView>
        </View>
      )}

      {/* ── Image Clip Panel ── */}
      {selectedOverlayId && (() => {
        const overlay = imageOverlays.find(img => img.id === selectedOverlayId);
        const currentClip = overlay?.clipShape ?? 'none';
        return (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shapePanelOuter} contentContainerStyle={styles.shapePanelInner}>
              {CLIP_PANEL_CONFIG.map(({key, icon, label}) => {
                const active = currentClip === key;
                return (
                  <TouchableOpacity key={key} onPress={() => updateImageClipShape(key)}
                    style={[styles.shapePanelBtn, active && styles.shapePanelBtnActive]}>
                    <MaterialIcons name={icon as any} size={22} color={active ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.shapePanelLabel, active && styles.shapePanelLabelActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );
      })()}

      {/* ── Crop Panel (Apply / Cancel) ── */}
      {activeTool === 'crop' && (
        <View style={styles.cropPanel}>
          <Text style={styles.cropPanelHint}>Drag to move · corner to resize</Text>
          <View style={styles.cropPanelBtns}>
            <TouchableOpacity onPress={() => setTool('crop')} style={[styles.cropBtn, styles.cropBtnCancel]}>
              <Text style={styles.cropBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={applyCrop} disabled={isSaving} style={[styles.cropBtn, styles.cropBtnApply]}>
              {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.cropBtnApplyText}>Apply Crop</Text>}
            </TouchableOpacity>
          </View>
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
            onPress={handlePickImage}
          />
          <ToolButton
            icon="crop"
            label="Crop"
            active={activeTool === 'crop'}
            onPress={() => setTool('crop')}
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
    fontSize: 16,
    fontFamily: AppFonts.poppinsSemiBold,
    color: AppColors.black,
    flex: 1,
    textAlign: 'center',
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
    fontSize: 14,
  },
  canvasWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
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
  // Shape type panel (scrollable outer/inner)
  shapePanelOuter: {
    backgroundColor: AppColors.verylightblue,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderColor,
  },
  shapePanelInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: hp(1.5),
    paddingVertical: hp(0.6),
    gap: hp(0.8),
  },
  // Legacy shapePanel (kept for compatibility)
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
    fontSize: 11,
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
    fontSize: 14,
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
    fontSize: 11,
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
    fontSize: 16,
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
    fontSize: 14,
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
    fontSize: 16,
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
    fontSize: 14,
    color: AppColors.black,
  },
  addBtnText: {
    fontFamily: AppFonts.poppinsSemiBold,
    fontSize: 14,
    color: AppColors.white,
  },
  // Crop overlay
  cropDim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cropCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  cropCornerTL: {top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0},
  cropCornerTR: {top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0},
  cropCornerBL: {bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0},
  cropResizeHandle: {
    position: 'absolute', bottom: -10, right: -10,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: AppColors.primary, borderWidth: 2,
    borderColor: '#FFFFFF', justifyContent: 'center',
    alignItems: 'center', zIndex: 10,
  },
  cropPanel: {
    paddingHorizontal: hp(2),
    paddingVertical: hp(1),
    backgroundColor: AppColors.verylightblue,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderColor,
    gap: hp(0.8),
  },
  cropPanelHint: {
    fontSize: 11,
    fontFamily: AppFonts.poppinsRegular,
    color: AppColors.grey,
    textAlign: 'center',
  },
  cropPanelBtns: {flexDirection: 'row', gap: hp(1)},
  cropBtn: {flex: 1, paddingVertical: hp(1.2), borderRadius: 10, alignItems: 'center'},
  cropBtnCancel: {backgroundColor: AppColors.borderColor},
  cropBtnApply: {backgroundColor: AppColors.primary},
  cropBtnCancelText: {fontFamily: AppFonts.poppinsSemiBold, fontSize: 14, color: AppColors.black},
  cropBtnApplyText: {fontFamily: AppFonts.poppinsSemiBold, fontSize: 14, color: '#FFFFFF'},
});

export default ImageEditor;
