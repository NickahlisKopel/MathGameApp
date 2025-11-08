import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  id: string;
  path: string;
  color: string;
  strokeWidth: number;
}

interface DrawingNotepadProps {
  visible: boolean;
  onClose: () => void;
}

const DrawingNotepad: React.FC<DrawingNotepadProps> = ({ visible, onClose }) => {
  const { theme, isDarkMode } = useTheme();
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentColor, setCurrentColor] = useState<string>('#2196F3');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [isEraseMode, setIsEraseMode] = useState<boolean>(false);
  const pathIdRef = useRef<number>(0);
  const sidebarAnim = useRef(new Animated.Value(-250)).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      if (isEraseMode) {
        eraseStroke(locationX, locationY);
      } else {
        const newPath = `M${locationX},${locationY}`;
        setCurrentPath(newPath);
      }
    },

    onPanResponderMove: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      if (isEraseMode) {
        eraseStroke(locationX, locationY);
      } else {
        setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
      }
    },

    onPanResponderRelease: () => {
      if (!isEraseMode && currentPath) {
        const newPath: DrawingPath = {
          id: `path_${pathIdRef.current++}`,
          path: currentPath,
          color: currentColor,
          strokeWidth,
        };
        setPaths(prev => [...prev, newPath]);
        setCurrentPath('');
      }
    },
  });

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const undoLastStroke = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const toggleEraseMode = () => {
    setIsEraseMode(prev => !prev);
  };

  const eraseStroke = (touchX: number, touchY: number) => {
    // Remove paths that intersect with the touch point (simplified erase)
    setPaths(prev => prev.filter((path, index) => {
      // Simple proximity-based erasing - remove if touch is near any part of the path
      const pathCommands = path.path.split(/[ML]/);
      for (let i = 1; i < pathCommands.length; i++) {
        const coords = pathCommands[i].split(',');
        if (coords.length >= 2) {
          const x = parseFloat(coords[0]);
          const y = parseFloat(coords[1]);
          const distance = Math.sqrt((x - touchX) ** 2 + (y - touchY) ** 2);
          if (distance < strokeWidth * 2) {
            return false; // Remove this path
          }
        }
      }
      return true; // Keep this path
    }));
  };

  const toggleSidebar = () => {
    const toValue = sidebarVisible ? -250 : 0;
    setSidebarVisible(!sidebarVisible);
    Animated.timing(sidebarAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const colors = ['#2196F3', '#4CAF50', '#FF5722', '#9C27B0', '#FF9800', '#607D8B', '#000000', '#FFFFFF'];
  const strokeWidths = [2, 4, 6, 10, 15];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
        {/* Header with Hamburger Menu */}
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={[styles.hamburgerButton, { backgroundColor: theme.colors.surface }]} onPress={toggleSidebar}>
            <Text style={[styles.hamburgerText, { color: theme.colors.text }]}>☰</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>📝 Drawing Notepad</Text>
          <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.colors.surface }]} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Large Drawing Canvas */}
          <View style={[styles.canvasContainer, { backgroundColor: isDarkMode ? '#000000' : '#ffffff' }]} {...panResponder.panHandlers}>
            <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
              {/* Render completed paths */}
              {paths.map((pathData) => (
                <Path
                  key={pathData.id}
                  d={pathData.path}
                  stroke={pathData.color}
                  strokeWidth={pathData.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              {/* Render current path being drawn */}
              {currentPath && (
                <Path
                  d={currentPath}
                  stroke={currentColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </Svg>
            
            {/* Canvas Overlay Info */}
            <View style={styles.canvasInfo}>
              <Text style={styles.canvasInfoText}>
                {paths.length + (currentPath ? 1 : 0)} strokes • {isEraseMode ? '🧽 ERASE' : currentColor} • {strokeWidth}px
              </Text>
            </View>
          </View>
        </View>

        {/* Sidebar Overlay */}
        {sidebarVisible && (
          <TouchableOpacity 
            style={styles.sidebarOverlay} 
            onPress={toggleSidebar}
            activeOpacity={1}
          />
        )}

        {/* Animated Sidebar */}
        <Animated.View 
          style={[
            styles.sidebar, 
            { 
              transform: [{ translateX: sidebarAnim }],
              backgroundColor: theme.colors.card
            }
          ]}
        >
          <ScrollView 
            style={styles.sidebarScrollView}
            contentContainerStyle={styles.sidebarContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sidebarTitle, { color: theme.colors.text }]}>🎨 Tools</Text>
            
            {/* Mode Toggle */}
            <View style={styles.sidebarSection}>
              <Text style={[styles.sidebarSectionTitle, { color: theme.colors.textSecondary }]}>Mode</Text>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  { backgroundColor: theme.colors.surface },
                  isEraseMode && styles.selectedModeButton,
                ]}
                onPress={toggleEraseMode}
              >
                <Text style={[
                  styles.modeButtonText,
                  { color: theme.colors.text },
                  isEraseMode && styles.selectedModeButtonText,
                ]}>
                  {isEraseMode ? '🧽 Erase Mode ON' : '✏️ Draw Mode'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Color Palette */}
            <View style={styles.sidebarSection}>
              <Text style={[styles.sidebarSectionTitle, { color: theme.colors.textSecondary }]}>Colors</Text>
              <View style={styles.colorGrid}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color },
                      color === '#FFFFFF' && { borderColor: '#ccc', borderWidth: 2 },
                      currentColor === color && !isEraseMode && styles.selectedColor,
                      isEraseMode && styles.disabledColorButton,
                    ]}
                    onPress={() => {
                      if (!isEraseMode) setCurrentColor(color);
                    }}
                    disabled={isEraseMode}
                  />
                ))}
              </View>
            </View>

            {/* Stroke Width */}
            <View style={styles.sidebarSection}>
              <Text style={[styles.sidebarSectionTitle, { color: theme.colors.textSecondary }]}>
                {isEraseMode ? 'Erase Size' : 'Thickness'}
              </Text>
              <View style={styles.strokeGrid}>
                {strokeWidths.map((width) => (
                  <TouchableOpacity
                    key={width}
                    style={[
                      styles.strokeButton,
                      { backgroundColor: theme.colors.surface },
                      strokeWidth === width && styles.selectedStroke,
                    ]}
                    onPress={() => setStrokeWidth(width)}
                  >
                    <View
                      style={[
                        styles.strokePreview,
                        {
                          width: Math.min(width * 1.5, 20),
                          height: Math.min(width * 1.5, 20),
                          borderRadius: width,
                          backgroundColor: isEraseMode ? '#ff6b6b' : currentColor,
                        },
                      ]}
                    />
                    <Text style={[styles.strokeLabel, { color: theme.colors.text }]}>{width}px</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.sidebarActions}>
              <TouchableOpacity style={styles.sidebarActionButton} onPress={undoLastStroke}>
                <Text style={styles.sidebarActionText}>↶ Undo Last</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sidebarActionButton, styles.clearButton]} 
                onPress={clearCanvas}
              >
                <Text style={[styles.sidebarActionText, styles.clearButtonText]}>🗑️ Clear All</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.sidebarFooter, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.sidebarFooterText, { color: theme.colors.textTertiary }]}>
                Tap outside to close menu
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  hamburgerButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerText: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
    margin: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  canvasInfo: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  canvasInfoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: 'white',
    elevation: 15,
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  sidebarScrollView: {
    flex: 1,
  },
  sidebarContent: {
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
  },
  sidebarSection: {
    marginBottom: 20,
  },
  sidebarSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 3,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  selectedColor: {
    borderColor: '#333',
    borderWidth: 4,
  },
  disabledColorButton: {
    opacity: 0.3,
  },
  modeButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedModeButton: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff5252',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  selectedModeButtonText: {
    color: 'white',
  },
  strokeGrid: {
    alignItems: 'flex-start',
  },
  strokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    width: '100%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStroke: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  strokePreview: {
    marginRight: 12,
  },
  strokeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  sidebarActions: {
    marginTop: 15,
  },
  sidebarActionButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  sidebarActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  clearButtonText: {
    color: 'white',
  },
  sidebarFooter: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  sidebarFooterText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
});

export default DrawingNotepad;
