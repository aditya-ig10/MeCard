import React from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const IconOverlay = ({
  visible,
  onClose,
  iconSearchQuery,
  setIconSearchQuery,
  iconLibrary,
  icon,
  setIcon,
  styles,
  overlayStyle,
}) => {
  const filteredIcons = iconLibrary.filter(
    (iconItem) =>
      iconItem.name.toLowerCase().includes(iconSearchQuery.toLowerCase()) ||
      iconItem.keywords.some((keyword) =>
        keyword.toLowerCase().includes(iconSearchQuery.toLowerCase())
      )
  );

  const renderIconItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.iconItem, icon === item.name && styles.selectedIconItem]}
      onPress={() => {
        setIcon(item.name);
        onClose();
      }}
    >
      <Ionicons
        name={item.name}
        size={24}
        color={icon === item.name ? '#007AFF' : '#666666'}
      />
      <Text
        style={[styles.iconText, { color: icon === item.name ? '#007AFF' : '#666666' }]}
      >
        {item.name.replace('-outline', '')}
      </Text>
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlayContainer, overlayStyle]}>
      <View style={styles.overlayContent}>
        <View style={styles.overlayHeader}>
          <Text style={styles.overlayTitle}>Select Icon</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            value={iconSearchQuery}
            onChangeText={setIconSearchQuery}
            placeholder="Search icons..."
            style={styles.searchInput}
            placeholderTextColor="#999999"
          />
        </View>
        <FlatList
          data={filteredIcons}
          renderItem={renderIconItem}
          keyExtractor={(item) => item.name}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.iconGrid}
        />
      </View>
    </Animated.View>
  );
};

export default IconOverlay;