import React from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const ColorOverlay = ({
  visible,
  onClose,
  colorPalettes,
  colors,
  setColors,
  customColor1,
  setCustomColor1,
  customColor2,
  setCustomColor2,
  updateCustomColors,
  styles,
  overlayStyle,
}) => {
  const renderColorPalette = ({ item }) => {
    const isSelected = colors[0] === item.colors[0] && colors[1] === item.colors[1];
    return (
      <TouchableOpacity
        style={[styles.colorPaletteItem, isSelected && styles.selectedColorPalette]}
        onPress={() => {
          setColors(item.colors);
          setCustomColor1(item.colors[0]);
          setCustomColor2(item.colors[1]);
          onClose();
        }}
      >
        <LinearGradient
          colors={item.colors}
          style={styles.colorGradientPreview}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Text style={styles.colorPaletteName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlayContainer, overlayStyle]}>
      <View style={styles.overlayContent}>
        <View style={styles.overlayHeader}>
          <Text style={styles.overlayTitle}>Select Colors</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Predefined Palettes</Text>
          <FlatList
            data={colorPalettes}
            renderItem={renderColorPalette}
            keyExtractor={(item, index) => index.toString()}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.colorGrid}
          />
          <Text style={styles.sectionTitle}>Custom Gradient</Text>
          <View style={styles.customColorContainer}>
            <View style={styles.colorInputRow}>
              <Text style={styles.colorLabel}>Color 1:</Text>
              <TextInput
                value={customColor1}
                onChangeText={setCustomColor1}
                placeholder="#000000"
                onBlur={updateCustomColors}
                style={styles.colorInput}
                placeholderTextColor="#999999"
              />
              <View
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(customColor1)
                      ? customColor1
                      : '#ccc',
                  },
                ]}
              />
            </View>
            <View style={styles.colorInputRow}>
              <Text style={styles.colorLabel}>Color 2:</Text>
              <TextInput
                value={customColor2}
                onChangeText={setCustomColor2}
                placeholder="#666666"
                onBlur={updateCustomColors}
                style={styles.colorInput}
                placeholderTextColor="#999999"
              />
              <View
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(customColor2)
                      ? customColor2
                      : '#ccc',
                  },
                ]}
              />
            </View>
            <TouchableOpacity
              style={styles.applyCustomButton}
              onPress={updateCustomColors}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Apply Custom Gradient</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
};

export default ColorOverlay;