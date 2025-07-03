import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Easing,
  FadeIn,
  ZoomIn,
  BounceIn,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { DefaultTheme } from 'react-native-paper';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

const springConfig = {
  damping: 15,
  stiffness: 500,
  mass: 0.5,
};

const emphasizedEasing = Easing.bezier(0.2, 0, 0, 1);

// Helper function to generate random shape
const getRandomShape = () => {
  const shapes = ['circle', 'triangle', 'square', 'hexagon'];
  return shapes[Math.floor(Math.random() * shapes.length)];
};

const CardItem = ({
  title = 'Card',
  number = '',
  colors = [],
  icon = 'card-outline',
  borderStyle = 'solid',
  isEnabled = false,
  onToggleNFC = () => {},
  onDelete = () => {},
  theme = DefaultTheme,
}) => {
  const scale = useSharedValue(1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardElevation = useSharedValue(4);
  const nfcPulse = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const deleteButtonScale = useSharedValue(1);

  // Random shape for this card instance
  const shape = useMemo(() => getRandomShape(), []);

  useEffect(() => {
    scale.value = withDelay(200, withSpring(1, { ...springConfig, stiffness: 600 }));
    if (isEnabled) {
      nfcPulse.value = withSequence(
        withTiming(1, { duration: 1000, easing: emphasizedEasing }),
        withTiming(0.4, { duration: 1000, easing: emphasizedEasing })
      );
      const interval = setInterval(() => {
        nfcPulse.value = withSequence(
          withTiming(1, { duration: 1000, easing: emphasizedEasing }),
          withTiming(0.4, { duration: 1000, easing: emphasizedEasing })
        );
      }, 2000);
      return () => clearInterval(interval);
    } else {
      nfcPulse.value = withTiming(0, { duration: 300 });
    }
  }, [isEnabled]);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      cardElevation.value = withSpring(12, springConfig);
      scale.value = withSpring(0.98, springConfig);
    },
    onActive: (event) => {
      const maxRotation = 10;
      rotateX.value = interpolate(
        event.translationY,
        [-100, 0, 100],
        [maxRotation, 0, -maxRotation],
        'clamp'
      );
      rotateY.value = interpolate(
        event.translationX,
        [-100, 0, 100],
        [-maxRotation, 0, maxRotation],
        'clamp'
      );
      translateY.value = event.translationY * 0.1;
    },
    onEnd: () => {
      cardElevation.value = withSpring(4, springConfig);
      scale.value = withSpring(1, springConfig);
      rotateX.value = withSpring(0, springConfig);
      rotateY.value = withSpring(0, springConfig);
      translateY.value = withSpring(0, springConfig);
    },
  });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { translateY: translateY.value },
      { perspective: 1000 },
    ],
    shadowOpacity: interpolate(cardElevation.value, [4, 12], [0.15, 0.3]),
  }));

  const nfcAnimatedStyle = useAnimatedStyle(() => ({
    opacity: nfcPulse.value,
    transform: [{ scale: interpolate(nfcPulse.value, [0, 1], [0.8, 1.2]) }],
  }));

  const nfcButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deleteButtonScale.value }],
  }));

  const handleNFCPress = () => {
    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, springConfig)
    );
    onToggleNFC();
  };

  const handleDeletePress = () => {
    deleteButtonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, springConfig)
    );
    onDelete();
  };

  const formattedNumber = number
    ? number.toString().replace(/(.{4})/g, '$1 ').trim()
    : '0000 0000 0000';

  const cardColors = colors.length > 0 ? colors : [theme.colors.primary, theme.colors.secondary];

  // Dynamic shape styles
  const getShapeStyle = (baseStyle, shapeType) => {
    switch (shapeType) {
      case 'triangle':
        return {
          ...baseStyle,
          width: 0,
          height: 0,
          borderLeftWidth: baseStyle.width / 2,
          borderRightWidth: baseStyle.width / 2,
          borderBottomWidth: baseStyle.height,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: baseStyle.backgroundColor,
          backgroundColor: 'transparent',
          borderRadius: 0,
        };
      case 'square':
        return {
          ...baseStyle,
          borderRadius: 0,
        };
      case 'hexagon':
        return {
          ...baseStyle,
          width: baseStyle.width * 0.866,
          height: baseStyle.height,
          backgroundColor: 'transparent',
          borderRadius: 0,
          overflow: 'visible',
          transform: [{ rotate: '30deg' }],
        };
      case 'circle':
      default:
        return baseStyle;
    }
  };

  const decorativeElement1 = getShapeStyle(
    {
      position: 'absolute',
      top: -40,
      right: -40,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      zIndex: 1,
    },
    shape
  );

  const decorativeElement2 = getShapeStyle(
    {
      position: 'absolute',
      bottom: -50,
      left: -50,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      zIndex: 1,
    },
    shape
  );

  const decorativeElement3 = getShapeStyle(
    {
      position: 'absolute',
      top: '40%',
      right: -30,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      zIndex: 1,
    },
    shape
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View
          entering={ZoomIn.delay(300).springify()}
          style={[styles.cardContainer, cardAnimatedStyle]}
        >
          <LinearGradient
            colors={cardColors}
            style={[
              styles.card,
              {
                borderStyle: borderStyle === 'none' ? 'solid' : borderStyle,
                borderWidth: borderStyle === 'none' ? 0 : 2,
                borderColor: borderStyle === 'none' ? 'transparent' : 'rgba(255, 255, 255, 0.8)',
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <BlurView intensity={50} style={styles.surfaceBlur} />
            <Animated.View entering={FadeIn.delay(500)} style={styles.cardHeader}>
              <View style={styles.buttonRow}>
                <Animated.View style={nfcButtonStyle}>
                  <TouchableOpacity
                    style={[styles.actionButton, isEnabled && styles.nfcActiveButton]}
                    onPress={handleNFCPress}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isEnabled ? 'wifi' : 'wifi-outline'}
                      size={24}
                      color={isEnabled ? '#007AFF' : '#666666'}
                    />
                  </TouchableOpacity>
                </Animated.View>
                <Animated.View style={deleteButtonStyle}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={handleDeletePress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>
            <Animated.View entering={FadeIn.delay(700)} style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <Ionicons name={icon} size={38} color="#FFFFFF" />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {title}
              </Text>
              <View style={styles.titleUnderline} />
            </Animated.View>
            <Animated.View entering={FadeIn.delay(900)} style={styles.cardBottom}>
              <View style={styles.numberContainer}>
                <Text style={styles.numberLabel}>CARD NUMBER</Text>
                <Text style={styles.cardNumber} numberOfLines={1} adjustsFontSizeToFit>
                  {formattedNumber}
                </Text>
              </View>
              {isEnabled && (
                <Animated.View entering={BounceIn.delay(1100)} style={styles.nfcIndicatorContainer}>
                  <Animated.View style={[styles.nfcPulse, nfcAnimatedStyle]}>
                    <LinearGradient
                      colors={['rgba(0, 122, 255, 0.4)', 'rgba(0, 122, 255, 0.2)']}
                      style={styles.nfcPulseGradient}
                    />
                  </Animated.View>
                  <View style={styles.nfcIconContainer}>
                    <Ionicons name="wifi" size={20} color="#FFFFFF" />
                  </View>
                </Animated.View>
              )}
            </Animated.View>
            <TouchableOpacity
              style={styles.stateLayer}
              activeOpacity={0.95}
              onPress={() => {
                scale.value = withSequence(
                  withTiming(0.98, { duration: 150 }),
                  withSpring(1, springConfig)
                );
              }}
            >
              <View style={styles.rippleEffect} />
            </TouchableOpacity>
            <View style={decorativeElement1}>
              {shape === 'hexagon' && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: decorativeElement1.width,
                    height: decorativeElement1.height,
                    backgroundColor: decorativeElement1.backgroundColor,
                    clipPath:
                      'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  }}
                />
              )}
            </View>
            <View style={decorativeElement2}>
              {shape === 'hexagon' && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: decorativeElement2.width,
                    height: decorativeElement2.height,
                    backgroundColor: decorativeElement2.backgroundColor,
                    clipPath:
                      'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  }}
                />
              )}
            </View>
            <View style={decorativeElement3}>
              {shape === 'hexagon' && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: decorativeElement3.width,
                    height: decorativeElement3.height,
                    backgroundColor: decorativeElement3.backgroundColor,
                    clipPath:
                      'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  }}
                />
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    alignItems: 'center',
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    padding: 24,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  surfaceBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  nfcActiveButton: {
    backgroundColor: '#E6F0FA',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.4)',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderWidth: 0,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 10,
    marginTop: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 19,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    maxWidth: '80%',
  },
  titleUnderline: {
    width: 50,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 10,
    marginBottom: 10,
  },
  numberContainer: {
    flex: 1,
    paddingRight: 20,
  },
  numberLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'SFProText-Regular',
    marginBottom: 8,
    marginTop: 14,
    textTransform: 'uppercase',
  },
  cardNumber: {
    fontSize: 19,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: '80%',
  },
  nfcIndicatorContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  nfcPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  nfcPulseGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  nfcIconContainer: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  stateLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  rippleEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});

export default CardItem;