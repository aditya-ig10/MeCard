import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const NfcPopup = ({ visible, onCancel, breathingStyle, styles }) => {
  if (!visible) return null;

  return (
    <View style={styles.nfcPopupContainer}>
      <View style={styles.nfcPopupContent}>
        <Text style={styles.nfcPopupText}>Ready to Scan?</Text>
        <Text style={styles.nfcPopupSubText}>Place your Card at the Back</Text>
        <Animated.View style={[breathingStyle, { marginBottom: 20 }]}>
          <View style={styles.breathingCircle}>
            <Ionicons name="wifi-outline" size={48} color="#007AFF" />
          </View>
        </Animated.View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default NfcPopup;