import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ActionButton = ({
  onPress,
  disabled,
  iconName,
  text,
  buttonStyle,
  textStyle,
  styles,
}) => (
  <TouchableOpacity
    style={[styles.actionButton, buttonStyle, disabled && styles.buttonDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <Ionicons name={iconName} size={24} color={textStyle.color} />
    <Text style={[styles.buttonText, textStyle]}>{text}</Text>
  </TouchableOpacity>
);

export default ActionButton;