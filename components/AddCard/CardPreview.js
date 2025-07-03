import React from 'react';
import { View, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const CardPreview = ({
  colors,
  icon,
  cardName,
  nfcId,
  customNumber,
  material,
  cardAnimatedStyle,
  shimmerStyle,
  styles,
}) => (
  <Animated.View style={[styles.previewContainer, cardAnimatedStyle]}>
    <LinearGradient
      colors={colors}
      style={[
        styles.previewCard,
        {
          opacity:
            material === 'matte'
              ? 1
              : material === 'glossy'
              ? 0.9
              : material === 'metallic'
              ? 0.95
              : material === 'textured'
              ? 0.85
              : 1,
        },
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <BlurView intensity={10} style={styles.surfaceBlur} />
      <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
          style={styles.shimmer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
      <View style={styles.previewHeader}>
        <View style={styles.materialContainer}>
          <Text style={styles.previewMaterialText}>
            {material.charAt(0).toUpperCase() + material.slice(1)}
          </Text>
        </View>
      </View>
      <Animated.View entering={FadeIn.delay(700)} style={styles.previewContent}>
        <View style={styles.previewIconContainer}>
          <Ionicons name={icon} size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.previewTitle} numberOfLines={1} adjustsFontSizeToFit>
          {cardName || 'Card Name'}
        </Text>
        <View style={styles.titleUnderline} />
      </Animated.View>
      <Animated.View entering={FadeIn.delay(900)} style={styles.previewBottom}>
        <View style={styles.numberContainer}>
          <Text style={styles.numberLabel}>CARD NUMBER</Text>
          <Text style={styles.previewNumber} numberOfLines={1} adjustsFontSizeToFit>
            {(nfcId || customNumber || '0000 0000 0000').replace(/(.{4})/g, '$1 ').trim()}
          </Text>
        </View>
      </Animated.View>
      <View style={styles.decorativeElement1} />
      <View style={styles.decorativeElement2} />
      <View style={styles.decorativeElement3} />
    </LinearGradient>
  </Animated.View>
);

export default CardPreview;