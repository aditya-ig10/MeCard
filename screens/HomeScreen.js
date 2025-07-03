import React, { useState, useRef, useEffect } from 'react';
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
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CardItem from '../components/CardItem';
import * as Font from 'expo-font';

const loadFonts = async () => {
  await Font.loadAsync({
    'SFProDisplay-Regular': require('../assets/fonts/SFProDisplay-Regular.ttf'),
    'SFProText-Regular': require('../assets/fonts/SFProText-Regular.ttf'),
  });
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85;
const CARD_MARGIN = 20;
const SNAP_WIDTH = CARD_WIDTH + CARD_MARGIN;

const STORAGE_KEY = '@cards';

const generateUniqueId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

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
            material: card.material || 'matte',
            borderStyle: card.borderStyle || 'solid',
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

  // FIXED: Improved new card handling logic
  useEffect(() => {
    const newCard = route.params?.newCard;
    if (newCard && isMountedRef.current) {
      console.log('Received new card:', newCard);
      
      setCards(prevCards => {
        const newCardWithId = {
          ...newCard,
          uniqueId: newCard.uniqueId || generateUniqueId(),
          material: newCard.material || 'matte',
          borderStyle: newCard.borderStyle || 'solid',
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
          }, 0);
  
          return updatedCards;
        });
        setForceUpdate(prev => prev + 1);
      }
    }, [route.params?.newCard, navigation]);

  // Removed focus listener - relying on existing useEffect for route.params

  // FIXED: Separate function to reload cards from storage
  const loadCardsFromStorage = async () => {
    try {
      const storedCards = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedCards && isMountedRef.current) {
        const parsedCards = JSON.parse(storedCards);
        const migratedCards = parsedCards.map(card => ({
          ...card,
          uniqueId: card.uniqueId || generateUniqueId(),
          material: card.material || 'matte',
          borderStyle: card.borderStyle || 'solid',
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
    const index = Math.round(event.nativeEvent.contentOffset.x / SNAP_WIDTH);
    safeSetActiveIndex(index);
  };

  const deleteCard = (cardId, cardTitle) => {
    if (!isMountedRef.current) return;
    
    Alert.alert(
      'Delete Card',
      `Are you sure you want to delete "${cardTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (!isMountedRef.current) return;
            
            setCards(prevCards => {
              const updatedCards = prevCards.filter(card => card.uniqueId !== cardId);
              console.log('After deletion, cards:', updatedCards);
              setTimeout(() => {
                if (isMountedRef.current) {
                  if (activeIndex >= updatedCards.length && updatedCards.length > 0) {
                    setActiveIndex(updatedCards.length - 1);
                  } else if (updatedCards.length === 0) {
                    setActiveIndex(0);
                  }
                  
                  if (enabledCardId === cardId) {
                    setEnabledCardId(null);
                  }
                }
              }, 0);
              return updatedCards;
            });
            setForceUpdate(prev => prev + 1);
          },
        },
      ]
    );
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

  const renderCard = ({ item, index }) => {
    return (
      <View style={styles.cardContainer} key={item.uniqueId}>
        <CardItem
          title={item.title}
          number={item.number}
          colors={item.colors}
          icon={item.icon}
          material={item.material}
          borderStyle={item.borderStyle}
          isEnabled={enabledCardId === item.uniqueId}
          onToggleNFC={() => enableCardForNFC(item.uniqueId, item.title)}
          onDelete={() => deleteCard(item.uniqueId, item.title)}
        />
      </View>
    );
  };

  const renderPagination = () => {
    if (cards.length <= 1) return null;

    return (
      <View style={styles.pagination}>
        {cards.map((_, index) => (
          <View
            key={`dot-${index}`}
            style={[
              styles.paginationDot,
              {
                backgroundColor: index === activeIndex ? '#000000' : '#999999',
                transform: [{ scale: index === activeIndex ? 1.2 : 0.8 }],
              }
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
            material: newCard.material || 'matte',
            borderStyle: newCard.borderStyle || 'solid',
          };

          // Check for duplicates
          const exists = prevCards.some(
            (card) => card.uniqueId === newCardWithId.uniqueId
          );

          if (exists) {
            console.log('Card already exists, skipping addition:', newCardWithId);
            return prevCards;
          }

          const updatedCards = [...prevCards, newCardWithId];
          console.log('Updated cards after addition:', updatedCards);

          // Scroll to the new card
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
                <Ionicons name="card-outline" size={80} color="#000000" />
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
                  renderItem={renderCard}
                  keyExtractor={item => item.uniqueId}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={SNAP_WIDTH}
                  snapToAlignment="center"
                  decelerationRate={0.92}
                  pagingEnabled={false}
                  contentContainerStyle={styles.carousel}
                  onScroll={scrollHandler}
                  scrollEventThrottle={16}
                  bounces={false}
                  getItemLayout={(data, index) => ({
                    length: SNAP_WIDTH,
                    offset: SNAP_WIDTH * index,
                    index,
                  })}
                  extraData={forceUpdate}
                  initialNumToRender={3}
                  maxToRenderPerBatch={5}
                  windowSize={10}
                />
              </View>
              {renderPagination()}
            </>
          )}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

export default HomeScreenContent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#000000',
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
    color: '#666666',
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
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    fontFamily: 'SFProDisplay-Regular',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'SFProText-Regular',
  },
  carouselContainer: {
    height: 680,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carousel: {
    paddingHorizontal: (screenWidth - CARD_WIDTH) / 2,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN / 2,
    justifyContent: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});