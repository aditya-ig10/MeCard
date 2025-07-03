import React from 'react';
import { View, Text } from 'react-native';

const NfcIdDisplay = ({ nfcId, styles }) => {
  if (!nfcId) return null;

  return (
    <View style={styles.nfcIdContainer}>
      <Text style={styles.nfcIdLabel}>Scanned Card ID:</Text>
      <Text style={styles.nfcIdText}>{nfcId}</Text>
    </View>
  );
};

export default NfcIdDisplay;