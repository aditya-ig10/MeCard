import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

const CustomizationButton = ({ onPress, animatedStyle, children, styles }) => (
  <Animated.View style={animatedStyle}>
    <TouchableOpacity
      style={styles.circleButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  </Animated.View>
);

export default CustomizationButton;