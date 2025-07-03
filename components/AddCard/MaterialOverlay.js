import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const MaterialOverlay = ({ visible, onClose, materials, material, setMaterial, styles, overlayStyle }) => {
  const renderMaterialItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.materialItem, material === item.value && styles.selectedMaterialItem]}
      onPress={() => {
        setMaterial(item.value);
        onClose();
      }}
    >
      <Text
        style={[styles.materialText, { color: material === item.value ? '#007AFF' : '#666666' }]}
      >
        {item.name}
      </Text>
      <Text style={styles.materialDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlayContainer, overlayStyle]}>
      <View style={styles.overlayContent}>
        <View style={styles.overlayHeader}>
          <Text style={styles.overlayTitle}>Select Material</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={materials}
          renderItem={renderMaterialItem}
          keyExtractor={(item) => item.value}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.materialGrid}
        />
      </View>
    </Animated.View>
  );
};

export default MaterialOverlay;