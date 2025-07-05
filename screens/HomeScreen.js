import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  FadeIn,
  ZoomIn,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Font from 'expo-font';

const loadFonts = async () => {
  await Font.loadAsync({
    'SFProDisplay-Regular': require('../assets/fonts/SFProDisplay-Regular.ttf'),
    'SFProText-Regular': require('../assets/fonts/SFProText-Regular.ttf'),
  });
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.8;
const CARD_HEIGHT = CARD_WIDTH * 1.5;
const STORAGE_KEY = '@cards';

const springConfig = {
  damping: 15,
  stiffness: 500,
  mass: 0.5,
};

const generateUniqueId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Helper function to calculate luminance and determine text color
const getTextColorForBackground = (colors) => {
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getLuminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const color1 = hexToRgb(colors[0]);
  const color2 = hexToRgb(colors[1]);
  
  if (!color1 || !color2) return '#FFFFFF';
  
  const avgR = (color1.r + color2.r) / 2;
  const avgG = (color1.g + color2.g) / 2;
  const avgB = (color1.b + color2.b) / 2;
  
  const luminance = getLuminance(avgR, avgG, avgB);
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

// CardItem Component
// CardItem Component
const CardItem = ({
  title = 'Card',
  number = '',
  colors = [],
  icon = 'card-outline',
  isEnabled = false,
  onToggleNFC = () => {},
  showToast = () => {},
  uniqueId = '',
  isActive = false,
  onDelete = () => {}, // Added for delete functionality
}) => {
  const scale = useSharedValue(isActive ? 1 : 0.9);
  const translateY = useSharedValue(isActive ? 0 : 20);
  const opacity = useSharedValue(isActive ? 1 : 0.7);
  const cardElevation = useSharedValue(isActive ? 8 : 4);
  const buttonScale = useSharedValue(1);
  const nfcIconRotation = useSharedValue(0);
  const deleteButtonScale = useSharedValue(1); // Added for delete button animation
  const overlayOpacity = useSharedValue(0); // Added for delete popup
  const overlayTranslateY = useSharedValue(screenHeight * 0.5); // Added for delete popup
  const [showDeletePopup, setShowDeletePopup] = useState(false); // Added for delete popup
  const shape = useMemo(() => {
    const shapes = ['circle', 'triangle', 'square', 'hexagon'];
    return shapes[Math.floor(Math.random() * shapes.length)];
  }, []); // Added for random shape generation

  const textColor = useMemo(() => getTextColorForBackground(colors), [colors]);

  // Helper function for shape styles
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

  // Animate when card becomes active/inactive
  useEffect(() => {
    scale.value = withSpring(isActive ? 1 : 0.9, springConfig);
    translateY.value = withSpring(isActive ? 0 : 20, springConfig);
    opacity.value = withSpring(isActive ? 1 : 0.7, springConfig);
    cardElevation.value = withSpring(isActive ? 8 : 4, springConfig);
  }, [isActive]);

  // Animate delete popup
  useEffect(() => {
    if (showDeletePopup) {
      overlayOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      overlayTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) });
      overlayTranslateY.value = withTiming(screenHeight * 0.5, { duration: 300, easing: Easing.in(Easing.cubic) });
    }
  }, [showDeletePopup]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
    shadowOpacity: interpolate(cardElevation.value, [4, 8], [0.15, 0.3]),
    shadowRadius: interpolate(cardElevation.value, [4, 8], [4, 12]),
  }));

  const nfcButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: buttonScale.value },
      { rotate: `${nfcIconRotation.value}deg` }
    ],
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deleteButtonScale.value }],
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: overlayTranslateY.value }],
  }));

  const handleNFCPress = () => {
    buttonScale.value = withSequence(
      withTiming(0.85, { duration: 120 }),
      withSpring(1, springConfig)
    );
    
    nfcIconRotation.value = withSequence(
      withTiming(15, { duration: 100 }),
      withTiming(-15, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
    
    onToggleNFC();
  };

  const handleDeletePress = () => {
    deleteButtonScale.value = withSequence(
      withTiming(0.85, { duration: 120 }),
      withSpring(1, springConfig)
    );
    setShowDeletePopup(true);
  };

  const handleConfirmDelete = () => {
    setShowDeletePopup(false);
    setTimeout(() => {
      onDelete(uniqueId, title); // Pass the required parameters
    }, 100);
  };
  

  const handleCancelDelete = () => {
    setShowDeletePopup(false);
  };

  const formattedNumber = number
    ? number.toString().replace(/(.{4})/g, '$1 ').trim()
    : '0000 0000 0000';

  const cardColors = colors.length > 0 ? colors : ['#007AFF', '#4DA8FF'];

  return (
    <Animated.View
  entering={FadeIn.delay(300).duration(400)} // Changed from ZoomIn to FadeIn
  style={[styles.cardContainer, cardAnimatedStyle]}
>
      <LinearGradient
        colors={cardColors}
        style={[styles.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <BlurView intensity={30} style={styles.surfaceBlur} />
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
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
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
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
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
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              }}
            />
          )}
        </View>
        <View style={styles.previewHeader}>
          <TouchableOpacity
            style={styles.deleteButtonContainer}
            onPress={handleDeletePress}
            activeOpacity={0.7}
          >
            <Animated.View style={[styles.deleteButton, deleteButtonStyle]}>
              <Ionicons name="trash-outline" size={18} color={textColor} />
            </Animated.View>
          </TouchableOpacity>
        </View>
        <Animated.View entering={FadeIn.delay(700)} style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={38} color={textColor} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>
              {title}
            </Text>
          </View>
          <View style={[styles.titleUnderline, { backgroundColor: textColor === '#000000' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)' }]} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(900)} style={styles.cardBottom}>
          <View style={styles.numberContainer}>
            <Text style={[styles.numberLabel, { color: textColor === '#000000' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)' }]}>NFC META</Text>
            <Text style={[styles.cardNumber, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit>
              {formattedNumber}
            </Text>
          </View>
          <Animated.View style={[styles.nfcButtonContainer, nfcButtonStyle]}>
            <TouchableOpacity
              style={[styles.cardNfcButton, { backgroundColor: isEnabled ? '#4CAF50' : 'rgba(255, 255, 255, 0.37)' }]}
              onPress={handleNFCPress}
              activeOpacity={1}
            >
              <Ionicons 
                name={isEnabled ? "wifi" : "wifi-outline"} 
                size={28} // Increased size for better appearance
                color={isEnabled ? '#FFFFFF' : textColor}
                style={{ transform: [{ scale: 1.2 }] }} // Slight scale for visual enhancement
              />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
      {showDeletePopup && (
        <Animated.View style={[styles.deletePopupContainer, backgroundStyle]}>
          <Animated.View style={[styles.deletePopupContent, contentStyle]}>
            <Text style={styles.deletePopupText}>Delete Card?</Text>
            <Text style={styles.deletePopupSubText}>
              Are you sure you want to delete "{title}"?
            </Text>
            <View style={styles.deleteButtonRow}>
              <TouchableOpacity
                style={[styles.popupButton, styles.cancelButton]}
                onPress={handleCancelDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.popupButton, styles.deleteConfirmButton]}
                onPress={handleConfirmDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

// HomeScreenContent Component
const HomeScreenContent = ({ navigation, route }) => {
  const [cards, setCards] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [enabledCardId, setEnabledCardId] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const flatListRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const loadResources = async () => {
      try {
        await loadFonts();
        if (isMountedRef.current) {
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Error loading fonts:', error);
      }
    };
    loadResources();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadCards = async () => {
      try {
        const storedCards = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedCards && isMountedRef.current) {
          const parsedCards = JSON.parse(storedCards);
          const migratedCards = parsedCards.map(card => ({
            ...card,
            uniqueId: card.uniqueId || generateUniqueId(),
          }));
          console.log('Loaded cards from AsyncStorage:', migratedCards);
          setCards(migratedCards);
        }
      } catch (error) {
        console.error('Error loading cards:', error);
        if (isMountedRef.current) {
          Alert.alert('Error', 'Failed to load cards.');
        }
      }
    };
    if (isLoaded) {
      loadCards();
    }
  }, [isLoaded]);

  useEffect(() => {
    const saveCards = async () => {
      if (!isMountedRef.current) return;
      
      try {
        if (cards.length > 0) {
          console.log('Saving cards to AsyncStorage:', cards);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
        } else {
          console.log('Removing cards from AsyncStorage');
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error('Error saving cards:', error);
      }
    };
    if (isLoaded) {
      saveCards();
    }
  }, [cards, isLoaded]);

  useEffect(() => {
    const newCard = route.params?.newCard;
    if (newCard && isMountedRef.current) {
      console.log('Received new card:', newCard);
      
      setCards(prevCards => {
        const newCardWithId = {
          ...newCard,
          uniqueId: newCard.uniqueId || generateUniqueId(),
        };
        
        const exists = prevCards.some(card => {
          if (card.uniqueId === newCardWithId.uniqueId) {
            return true;
          }
          return false;
        });
        
        if (exists) {
          console.log('Card already exists, skipping addition:', newCardWithId);
          return prevCards;
        }
        
        const updatedCards = [...prevCards, newCardWithId];
        console.log('Updated cards after addition:', updatedCards);
        
        setTimeout(() => {
          if (flatListRef.current && updatedCards.length > 0 && isMountedRef.current) {
            try {
              const newIndex = updatedCards.length - 1;
              flatListRef.current.scrollToIndex({
                index: newIndex,
                animated: true,
              });
              setActiveIndex(newIndex);
            } catch (error) {
              console.warn('ScrollToIndex failed:', error);
              try {
                flatListRef.current.scrollToEnd({ animated: true });
                setActiveIndex(updatedCards.length - 1);
              } catch (scrollError) {
                console.warn('ScrollToEnd also failed:', scrollError);
              }
            }
            
            if (isMountedRef.current) {
              navigation.setParams({ newCard: null });
              console.log('Cleared newCard navigation param');
            }
          }
        }, 300);
  
        return updatedCards;
      });
      setForceUpdate(prev => prev + 1);
    }
  }, [route.params?.newCard, navigation]);

  const getCurrentCardStatus = () => {
    if (cards.length === 0) return { title: 'No Cards', status: 'inactive', color: '#666' };
    
    const currentCard = cards[activeIndex];
    if (!currentCard) return { title: 'No Card Selected', status: 'inactive', color: '#666' };
    
    const isCurrentCardEnabled = enabledCardId === currentCard.uniqueId;
    
    return {
      title: currentCard.title,
      status: isCurrentCardEnabled ? 'active' : 'inactive',
      color: isCurrentCardEnabled ? '#4CAF50' : '#FF9500'
    };
  };
  

  const loadCardsFromStorage = async () => {
    try {
      const storedCards = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedCards && isMountedRef.current) {
        const parsedCards = JSON.parse(storedCards);
        const migratedCards = parsedCards.map(card => ({
          ...card,
          uniqueId: card.uniqueId || generateUniqueId(),
        }));
        console.log('Reloaded cards from AsyncStorage:', migratedCards);
        setCards(migratedCards);
      }
    } catch (error) {
      console.error('Error reloading cards:', error);
    }
  };

  const safeSetActiveIndex = (index) => {
    if (isMountedRef.current) {
      setActiveIndex(Math.max(0, Math.min(index, cards.length - 1)));
    }
  };

  const scrollHandler = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / (CARD_WIDTH + 32));
    const clampedIndex = Math.max(0, Math.min(index, cards.length - 1));
    
    if (clampedIndex !== activeIndex) {
      safeSetActiveIndex(clampedIndex);
    }
  };

  const deleteCard = (cardId, cardTitle) => {
    if (!isMountedRef.current) return;
    
    setCards(prevCards => {
      const updatedCards = prevCards.filter(card => card.uniqueId !== cardId);
      console.log('After deletion, cards:', updatedCards);
      
      // Handle activeIndex adjustment
      setTimeout(() => {
        if (isMountedRef.current) {
          if (activeIndex >= updatedCards.length && updatedCards.length > 0) {
            setActiveIndex(updatedCards.length - 1);
          } else if (updatedCards.length === 0) {
            setActiveIndex(0);
          }
          
          // Clear enabled card if it was deleted
          if (enabledCardId === cardId) {
            setEnabledCardId(null);
          }
        }
      }, 0);
      
      return updatedCards;
    });
    
    setForceUpdate(prev => prev + 1);
    showToast(`${cardTitle} deleted`);
  };

  const showToast = (message) => {
    if (!isMountedRef.current) return;
    
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message, [{ text: 'OK' }]);
    }
  };

  const enableCardForNFC = (cardId, cardTitle) => {
    if (!isMountedRef.current) return;
    
    if (enabledCardId === cardId) {
      setEnabledCardId(null);
      showToast(`${cardTitle} NFC disabled`);
    } else {
      setEnabledCardId(cardId);
      showToast(`${cardTitle} NFC enabled`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Cards</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                navigation.navigate('AddCard', {
                  onCardAdded: (newCard) => {
                    setCards((prevCards) => {
                      const newCardWithId = {
                        ...newCard,
                        uniqueId: newCard.uniqueId || generateUniqueId(),
                      };

                      const exists = prevCards.some(
                        (card) => card.uniqueId === newCardWithId.uniqueId
                      );

                      if (exists) {
                        console.log('Card already exists, skipping addition:', newCardWithId);
                        return prevCards;
                      }

                      const updatedCards = [...prevCards, newCardWithId];
                      console.log('Updated cards after addition:', updatedCards);

                      setTimeout(() => {
                        if (flatListRef.current && updatedCards.length > 0 && isMountedRef.current) {
                          try {
                            const newIndex = updatedCards.length - 1;
                            flatListRef.current.scrollToIndex({
                              index: newIndex,
                              animated: true,
                            });
                            setActiveIndex(newIndex);
                          } catch (error) {
                            console.warn('ScrollToIndex failed:', error);
                            try {
                              flatListRef.current.scrollToEnd({ animated: true });
                              setActiveIndex(updatedCards.length - 1);
                            } catch (scrollError) {
                              console.warn('ScrollToEnd also failed:', scrollError);
                            }
                          }
                        }
                      }, 300);

                      return updatedCards;
                    });
                    setForceUpdate((prev) => prev + 1);
                  },
                })
              }
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            {cards.length} {cards.length === 1 ? 'card' : 'cards'} available
          </Text>
        </View>
      </SafeAreaView>
      <View style={styles.content}>
        {cards.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="card-outline" size={80} color="#ffffff" />
            </View>
            <Text style={styles.emptyTitle}>No Cards Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first card to get started with contactless payments
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.carouselContainer}>
            <FlatList
  ref={flatListRef}
  data={cards}
  renderItem={({ item, index }) => (
    <CardItem
      title={item.title}
      number={item.number}
      colors={item.colors}
      icon={item.icon}
      isEnabled={enabledCardId === item.uniqueId}
      onToggleNFC={() => enableCardForNFC(item.uniqueId, item.title)}
      showToast={showToast}
      uniqueId={item.uniqueId}
      isActive={index === activeIndex}
      onDelete={(cardId, cardTitle) => deleteCard(cardId, cardTitle)}
    />
  )}
  keyExtractor={item => item.uniqueId}
  horizontal
  showsHorizontalScrollIndicator={false}
  snapToInterval={CARD_WIDTH + 32}
  snapToAlignment="center"
  decelerationRate="fast"
  contentContainerStyle={styles.carousel}
  onMomentumScrollEnd={scrollHandler}
  onScrollEndDrag={scrollHandler}
  scrollEventThrottle={16}
  bounces={false}
  pagingEnabled={false}
  getItemLayout={(data, index) => ({
    length: CARD_WIDTH + 32,
    offset: (CARD_WIDTH + 32) * index,
    index,
  })}
  extraData={`${forceUpdate}-${activeIndex}-${enabledCardId}`}
  initialNumToRender={3}
  maxToRenderPerBatch={3}
  windowSize={5}
  removeClippedSubviews={false}
/>

            </View>
            <View style={styles.statusSection}>
  <View style={styles.statusPill}>
    <View style={[styles.statusIndicator, { backgroundColor: getCurrentCardStatus().color }]} />
    <Text style={styles.statusText}>
      {getCurrentCardStatus().title} - {getCurrentCardStatus().status === 'active' ? 'NFC Active' : 'NFC Inactive'}
    </Text>
  </View>
  {cards.length > 1 && (
    <View style={styles.cardCounter}>
      <Text style={styles.counterText}>
        {activeIndex + 1} of {cards.length}
      </Text>
    </View>
  )}
</View>

          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    fontFamily: 'SFProDisplay-Regular',
  },
  header: {
    paddingTop: StatusBar.currentHeight || 44,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'SFProDisplay-Regular',
  },
  headerButtons: {
    position: 'absolute',
    right: 24,
    top: 16,
    flexDirection: 'row',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#888',
    marginTop: 5,
    fontFamily: 'SFProText-Regular',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    fontFamily: 'SFProDisplay-Regular',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'SFProText-Regular',
  },
  carouselContainer: {
    height: CARD_HEIGHT + 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carousel: {
    paddingHorizontal: (screenWidth - CARD_WIDTH) / 2,
    paddingVertical: 12,
    alignItems: 'center',
  },
  
  
  // cardSlide: {
  //   width: CARD_WIDTH + 16,
  //   height: CARD_HEIGHT,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  inactiveCard: {
    transform: [{ scale: 0.9 }, { translateY: 20 }],
    opacity: 0.7,
  },
  statusSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'SFProText-Regular',
  },
  cardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
  borderRadius: 32, // Changed from 19 to 32 (half of width/height)
  marginBottom: 20,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.2)',
  justifyContent: 'center',
  alignItems: 'center',
},

  cardTitle: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    maxWidth: '80%',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 5,
  },
  titleUnderline: {
    width: 50,
    height: 5,
    borderRadius: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
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
    fontFamily: 'SFProText-Regular',
    marginBottom: 8,
    marginTop: 14,
    textTransform: 'uppercase',
  },
  cardNumber: {
    fontSize: 19,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: '80%',
  },
  nfcButtonContainer: {
    position: 'absolute',
    bottom: 0, // Moved closer to corner
    right: 0,  // Moved closer to corner
  },
  
  deleteButtonContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Changed to dark background
    borderRadius: 16,
    padding: 4,
    zIndex: 10,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16, // Half of width/height for perfect circle
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Add background
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  deletePopupContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  deletePopupContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: screenWidth,
    minHeight: 200, // Changed from fixed height
    maxHeight: screenHeight * 0.4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  
  deletePopupText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 12,
    textAlign: 'center',
  },
  deletePopupSubText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#999',
    fontFamily: 'SFProText-Regular',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  popupButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  deleteConfirmButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'SFProText-Regular',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'SFProText-Regular',
  },
    cardCounter: {
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 12,
    },
    counterText: {
      fontSize: 12,
      fontWeight: '500',
      color: '#888',
      fontFamily: 'SFProText-Regular',
    },
    cardContainer: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      marginHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    
    cardCounter: {
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 12,
    },
    counterText: {
      fontSize: 12,
      fontWeight: '500',
      color: '#888',
      fontFamily: 'SFProText-Regular',
    },
    cardContainer: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
      marginRight: 15,
    },  
    cardNfcButton: {
      width: 42,  // Slightly larger
      height: 42,
      borderRadius: 18, // Half of width/height for perfect circle
      justifyContent: 'center',
      alignItems: 'center',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    
  
});

export default HomeScreenContent;