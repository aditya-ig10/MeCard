import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  FlatList,
  Dimensions,
  Platform,
  ToastAndroid,
  StatusBar,
  TextInput,
  BackHandler,
} from 'react-native';
import * as Keychain from 'react-native-keychain';
import { MaterialCommunityIcons, Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons'; // Replace Ionicons import
import NfcManager, { NfcEvents } from 'react-native-nfc-manager';
import * as Font from 'expo-font';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  FadeIn,
  Easing,
  cancelAnimation,
  useAnimatedGestureHandler,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { GestureHandlerRootView, PanGestureHandler, NativeViewGestureHandler } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Helper function to calculate luminance and determine text color
const getTextColorForBackground = (colors) => {
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calculate relative luminance
  const getLuminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Get average color from gradient
  const color1 = hexToRgb(colors[0]);
  const color2 = hexToRgb(colors[1]);
  
  if (!color1 || !color2) return '#FFFFFF';
  
  const avgR = (color1.r + color2.r) / 2;
  const avgG = (color1.g + color2.g) / 2;
  const avgB = (color1.b + color2.b) / 2;
  
  const luminance = getLuminance(avgR, avgG, avgB);
  
  // Return dark text for bright backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

// Helper function to generate random shape
const getRandomShape = () => {
  const shapes = ['circle', 'triangle', 'square', 'hexagon'];
  return shapes[Math.floor(Math.random() * shapes.length)];
};

const loadFonts = async () => {
  await Font.loadAsync({
    'SFProDisplay-Regular': require('../assets/fonts/SFProDisplay-Regular.ttf'),
    'SFProText-Regular': require('../assets/fonts/SFProText-Regular.ttf'),
  });
};

const AddCardScreen = ({ navigation, route }) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [cardName, setCardName] = useState('');
  const [icon, setIcon] = useState('card-outline');
  const [colors, setColors] = useState(['#007AFF', '#4DA8FF']);
  const [nfcId, setNfcId] = useState('');
  const [iconOverlayVisible, setIconOverlayVisible] = useState(false);
const [colorOverlayVisible, setColorOverlayVisible] = useState(false);
const [showColorSection, setShowColorSection] = useState(false);
const [showIconSection, setShowIconSection] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [nfcPopupVisible, setNfcPopupVisible] = useState(false);
  const textColor = useMemo(() => getTextColorForBackground(colors), [colors]);
  const flatListRef = React.useRef(null);
  const iconFlatListRef = React.useRef(null);
  const iconScrollY = useSharedValue(0);
  const colorScrollY = useSharedValue(0);
  const breathingScale = useSharedValue(1);
  const iconScale = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const cardElevation = useSharedValue(4);
  const overlayOpacity = useSharedValue(0);
  const overlayTranslateY = useSharedValue(screenHeight * 0.5);
  const iconOverlayHeight = useSharedValue(screenHeight * 0.5);
  const colorOverlayHeight = useSharedValue(screenHeight * 0.5);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const translateY = useSharedValue(0);

  const colorSectionOpacity = useSharedValue(0);
const colorSectionTranslateY = useSharedValue(30);
const iconSectionOpacity = useSharedValue(0);
const iconSectionTranslateY = useSharedValue(30);



const colorSectionStyle = useAnimatedStyle(() => ({
  opacity: colorSectionOpacity.value,
  transform: [{ translateY: colorSectionTranslateY.value }],
}));

const iconSectionStyle = useAnimatedStyle(() => ({
  opacity: iconSectionOpacity.value,
  transform: [{ translateY: iconSectionTranslateY.value }],
}));

  const shape = useMemo(() => getRandomShape(), []);

  const springConfig = {
    damping: 15,
    stiffness: 500,
    mass: 0.5,
  };

  

  const emphasizedEasing = Easing.bezier(0.2, 0, 0, 1);

  const breathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingScale.value }],
  }));

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      cardElevation.value = withSpring(12, springConfig);
      cardScale.value = withSpring(0.98, springConfig);
    },
    onActive: (event) => {
      const maxRotation = 10;
      rotateX.value = interpolate(
        event.translationY,
        [-100, 0, 100],
        [maxRotation, 0, -maxRotation],
        'clamp'
      );
      rotateY.value = interpolate(
        event.translationX,
        [-100, 0, 100],
        [-maxRotation, 0, maxRotation],
        'clamp'
      );
      translateY.value = event.translationY * 0.1;
    },
    onEnd: () => {
      cardElevation.value = withSpring(4, springConfig);
      cardScale.value = withSpring(1, springConfig);
      rotateX.value = withSpring(0, springConfig);
      rotateY.value = withSpring(0, springConfig);
      translateY.value = withSpring(0, springConfig);
    },
  });

  const toggleColorSection = () => {
    if (!showColorSection) {
      setShowColorSection(true);
      setShowIconSection(false);
      // Animate in
      colorSectionOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      colorSectionTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      // Hide icon section
      iconSectionOpacity.value = withTiming(0, { duration: 200 });
      iconSectionTranslateY.value = withTiming(30, { duration: 200 });
    } else {
      // Animate out
      colorSectionOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
      colorSectionTranslateY.value = withTiming(30, { duration: 200, easing: Easing.in(Easing.cubic) });
      setTimeout(() => setShowColorSection(false), 200);
    }
  };
  
  const toggleIconSection = () => {
    if (!showIconSection) {
      setShowIconSection(true);
      setShowColorSection(false);
      // Animate in
      iconSectionOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      iconSectionTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      // Hide color section
      colorSectionOpacity.value = withTiming(0, { duration: 200 });
      colorSectionTranslateY.value = withTiming(30, { duration: 200 });
    } else {
      // Animate out
      iconSectionOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
      iconSectionTranslateY.value = withTiming(30, { duration: 200, easing: Easing.in(Easing.cubic) });
      setTimeout(() => setShowIconSection(false), 200);
    }
  };

  const customGradients = [
    { name: 'Blue Ocean', colors: ['#007AFF', '#4DA8FF'] },
    { name: 'Sunset Glow', colors: ['#FF5733', '#FFC107'] },
    { name: 'Forest Mist', colors: ['#228B22', '#98FB98'] },
    { name: 'Midnight Purple', colors: ['#4B0082', '#8A2BE2'] },
    { name: 'Peach Sunrise', colors: ['#FF7E5F', '#FEB47B'] },
    { name: 'Cool Mint', colors: ['#43CEA2', '#185A9D'] },
    { name: 'Coral Reef', colors: ['#FF9966', '#FF5E62'] },
    { name: 'Aurora Borealis', colors: ['#00C9FF', '#92FE9D'] },
    { name: 'Royal Sapphire', colors: ['#0F2027', '#203A43'] },
    { name: 'Fiery Fuchsia', colors: ['#FC466B', '#3F5EFB'] },
    { name: 'Tropical Lemon', colors: ['#F7971E', '#FFD200'] },
    { name: 'Mystic Sky', colors: ['#373B44', '#4286f4'] },
    { name: 'Candy Pop', colors: ['#FF4E50', '#F9D423'] },
    { name: 'Emerald Dream', colors: ['#348F50', '#56B4D3'] },
    { name: 'Pink Lagoon', colors: ['#B24592', '#F15F79'] },
    { name: 'Blazing Fire', colors: ['#CB2D3E', '#EF473A'] },
    { name: 'Purple Haze', colors: ['#8E2DE2', '#4A00E0'] },
    { name: 'Berry Smoothie', colors: ['#B993D6', '#8CA6DB'] },
    { name: 'Ice Cool', colors: ['#83A4D4', '#B6FBFF'] },
    { name: 'Summer Vibes', colors: ['#F77062', '#FE5196'] },
    { name: 'Deep Space', colors: ['#000000', '#434343'] },
    { name: 'Electric Violet', colors: ['#4776E6', '#8E54E9'] },
    { name: 'Golden Sands', colors: ['#E6DADA', '#274046'] },
    { name: 'Ruby Sunset', colors: ['#F00000', '#DC281E'] },
    { name: 'Aqua Marine', colors: ['#1A2980', '#26D0CE'] },
    { name: 'Blush Pink', colors: ['#DA4453', '#89216B'] },
    { name: 'Velvet Night', colors: ['#141E30', '#243B55'] },
    { name: 'Fire & Ice', colors: ['#00F260', '#0575E6'] },
    { name: 'Caribbean Sea', colors: ['#2193b0', '#6dd5ed'] },
    { name: 'Molten Lava', colors: ['#F00000', '#6B0F1A'] },
    { name: 'Golden Hour', colors: ['#F2994A', '#F2C94C'] },
    { name: 'Plum Wine', colors: ['#614385', '#516395'] },
    { name: 'Lime Light', colors: ['#DCE35B', '#45B649'] },
    { name: 'Rose Gold', colors: ['#B76E79', '#FAA7B8'] },
    { name: 'Neon Party', colors: ['#12c2e9', '#c471ed', '#f64f59'] },
    { name: 'Frozen Lake', colors: ['#83a4d4', '#b6fbff'] },
    { name: 'Copper Sunset', colors: ['#cc2b5e', '#753a88'] },
    { name: 'Shocking Pink', colors: ['#fc00ff', '#00dbde'] },
    { name: 'Mojito', colors: ['#1D976C', '#93F9B9'] },
    { name: 'Pacific Wave', colors: ['#36D1DC', '#5B86E5'] },
    { name: 'Cherry Blossom', colors: ['#eb5757', '#000000'] },
    { name: 'Strawberry Ice', colors: ['#FF416C', '#FF4B2B'] },
    { name: 'Blueberry Pie', colors: ['#4B6CB7', '#182848'] },
    { name: 'Twilight Bliss', colors: ['#232526', '#414345'] },
    { name: 'Orange Crush', colors: ['#f12711', '#f5af19'] },
    { name: 'Cosmic Fusion', colors: ['#833ab4', '#fd1d1d', '#fcb045'] },
    { name: 'Cyan Splash', colors: ['#00d2ff', '#3a7bd5'] },
    { name: 'Black Currant', colors: ['#200122', '#6f0000'] },
  ];
  

  const iconLibrary = [
    { name: 'train', category: 'payment', keywords: ['card', 'credit', 'payment'] },
    { name: 'card', category: 'payment', keywords: ['wallet', 'payment'] },
    { name: 'home', category: 'payment', keywords: ['cash', 'money'] },
    { name: 'car', category: 'places', keywords: ['home', 'house'] },
    { name: 'wine', category: 'transport', keywords: ['car', 'vehicle'] },
    { name: 'airplane', category: 'transport', keywords: ['plane', 'travel'] },
    { name: 'heart', category: 'health', keywords: ['heart', 'health'] },
    { name: 'gift', category: 'shopping', keywords: ['gift', 'present'] },
    { name: 'restaurant', category: 'food', keywords: ['food', 'restaurant'] },
    { name: 'fitness', category: 'health', keywords: ['fitness', 'gym'] },
    { name: 'school', category: 'education', keywords: ['school', 'education'] },
    { name: 'business', category: 'work', keywords: ['business', 'work'] },
    { name: 'medical', category: 'health', keywords: ['medical', 'health'] },
    { name: 'game-controller', category: 'entertainment', keywords: ['game', 'play'] },
    { name: 'musical-notes', category: 'entertainment', keywords: ['music', 'audio'] },
  ];

  useEffect(() => {
    const loadResources = async () => {
      try {
        await loadFonts();
        setFontsLoaded(true);
      } catch (e) {
        console.warn('Font loading error:', e);
      }
    };
    loadResources();
  
    cardScale.value = withSpring(1, { ...springConfig, stiffness: 600 });
  
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      backHandler.remove();
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, [handleBackPress]);

  useEffect(() => {
    if (nfcPopupVisible) {
      function breathingAnimation() {
        'worklet';
        breathingScale.value = withRepeat(
          withSequence(
            withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        );
      }
      breathingAnimation();
      overlayOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      overlayTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) });
      overlayTranslateY.value = withTiming(screenHeight * 0.5, { duration: 300, easing: Easing.in(Easing.cubic) });
      cancelAnimation(breathingScale);
      breathingScale.value = 1;
    }
    return () => {
      cancelAnimation(breathingScale);
    };
  }, [nfcPopupVisible]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { translateY: translateY.value },
      { perspective: 1000 },
    ],
    shadowOpacity: interpolate(cardElevation.value, [4, 12], [0.15, 0.3]),
  }));

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

  

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: overlayTranslateY.value }],
  }));

  useEffect(() => {
    const initNfc = async () => {
      try {
        const isSupported = await NfcManager.isSupported();
        if (isSupported) {
          await NfcManager.start();
        } else {
          Alert.alert('NFC Not Supported', 'This device does not support NFC');
        }
      } catch (ex) {
        console.warn('NFC Init Error:', ex);
      }
    };
    initNfc();
  }, []);

const startNfcScan = async () => {
  try {
    setNfcPopupVisible(true);
    const isEnabled = await NfcManager.isEnabled();
    if (!isEnabled) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Please enable NFC in your device settings', ToastAndroid.LONG);
      } else {
        Alert.alert('NFC Disabled', 'Please enable NFC in your device settings');
      }
      cancelNfcScan();
      return;
    }
    await NfcManager.registerTagEvent();
    NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag) => {
      let cardId = tag.id
        ? Array.isArray(tag.id)
          ? tag.id.map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
          : tag.id.toString()
        : '';
      
      let ndefRecords = [];
      let emvData = null;
      let appIds = [];
      let encryptedKeys = null;

      // Read NDEF Records
      if (tag.ndefMessage) {
        ndefRecords = tag.ndefMessage.map(record => ({
          tnf: record.tnf,
          type: record.type ? String.fromCharCode.apply(null, record.type) : '',
          id: record.id ? String.fromCharCode.apply(null, record.id) : '',
          payload: record.payload ? String.fromCharCode.apply(null, record.payload) : '',
        }));
      }

      // Attempt to read EMV data (for NCMC, using IsoDep)
      try {
        if (Platform.OS === 'android') {
          await NfcManager.requestTechnology('IsoDep'); // Fix: Use string 'IsoDep' instead of NfcTech.IsoDep
          const isoDep = await NfcManager.getTag();
          // Example APDU command to select NCMC application (RuPay AID)
          const selectAid = [0x00, 0xA4, 0x04, 0x00, 0x07, 0xA0, 0x00, 0x00, 0x00, 0x04, 0x10, 0x10, 0x00]; // RuPay AID
          const response = await isoDep.transceive(selectAid);
          emvData = response.map(byte => byte.toString(16).padStart(2, '0')).join('');
          appIds.push('A0000000041010'); // RuPay AID
        }
      } catch (err) {
        console.warn('EMV Data Error:', err);
        // Fallback: Continue even if EMV data can't be read
      } finally {
        if (Platform.OS === 'android') {
          await NfcManager.cancelTechnologyRequest().catch(() => {});
        }
      }

      // Simulate cryptographic keys (DMRC/NCMC keys are proprietary)
      const cryptoKeys = { key: 'sample-key-data' }; // Placeholder, replace with actual key if accessible
      // Encrypt sensitive data
      try {
        if (Keychain) {
          const encrypted = await Keychain.setGenericPassword('metroCardKeys', JSON.stringify(cryptoKeys), {
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
          });
          encryptedKeys = encrypted ? 'encrypted' : null;
        } else {
          console.warn('Keychain not available, skipping encryption');
          encryptedKeys = 'unencrypted:' + JSON.stringify(cryptoKeys);
        }
      } catch (err) {
        console.warn('Encryption Error:', err);
        encryptedKeys = 'error:' + JSON.stringify(cryptoKeys);
      }

      if (!cardId) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Unable to read card ID. Please try again.', ToastAndroid.SHORT);
        } else {
          Alert.alert('Scan Failed', 'Unable to read card ID. Please try again.');
        }
        cancelNfcScan();
        return;
      }

      setNfcId(cardId);
      setCardData({ cardId, ndefRecords, emvData, appIds, encryptedKeys });
      setNfcPopupVisible(false);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Card ID: ${cardId}`, ToastAndroid.LONG);
      } else {
        Alert.alert('NFC Detected', `Card ID: ${cardId}\nRecords: ${ndefRecords.length}\nApp IDs: ${appIds.join(', ')}`);
      }
      NfcManager.unregisterTagEvent();
    });
  } catch (err) {
    console.warn('NFC Scan Error:', err);
    setNfcPopupVisible(false);
    if (err.message && err.message.includes('cancelled')) {
      return;
    }
    if (Platform.OS === 'android') {
      ToastAndroid.show('Failed to scan NFC card. Please try again.', ToastAndroid.SHORT);
    } else {
      Alert.alert('Scan Error', 'Failed to scan NFC card. Please try again.');
    }
  }
};

const [cardData, setCardData] = useState({
  cardId: '',
  ndefRecords: [],
  emvData: null,
  appIds: [],
  encryptedKeys: null,
});

  const cancelNfcScan = async () => {
    try {
      await NfcManager.unregisterTagEvent();
    } catch (err) {
      console.warn('Cancel NFC Error:', err);
    }
    overlayOpacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) });
    overlayTranslateY.value = withTiming(screenHeight * 0.5, { duration: 300, easing: Easing.in(Easing.cubic) });
    cancelAnimation(breathingScale);
    breathingScale.value = 1;
    setTimeout(() => setNfcPopupVisible(false), 300);
  };

  const saveCard = () => {
    if (!cardName.trim()) {
      Alert.alert('Missing Information', 'Please enter a card name.');
      return;
    }
    if (!cardData.cardId) {
      Alert.alert('Missing Information', 'Please scan an NFC card.');
      return;
    }
    const newCard = {
      uniqueId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: cardName,
      number: cardData.cardId,
      colors,
      icon,
      ndefRecords: cardData.ndefRecords,
      emvData: cardData.emvData,
      appIds: cardData.appIds,
      encryptedKeys: cardData.encryptedKeys,
    };
    if (route.params?.onCardAdded) {
      route.params.onCardAdded(newCard);
    }
    navigation.goBack();
    setCardName('');
    setNfcId('');
    setCardData({ cardId: '', ndefRecords: [], emvData: null, appIds: [], encryptedKeys: null });
    setIcon('card-outline');
    setColors(['#007AFF', '#4DA8FF']);
  };

  const toggleIconOverlay = () => {
    if (!iconOverlayVisible) {
      iconScale.value = withSpring(1.2, { ...springConfig, stiffness: 400 });
      setTimeout(() => {
        iconScale.value = withSpring(1, springConfig);
        setIconOverlayVisible(true);
        overlayOpacity.value = withTiming(1, { duration: 100, easing: Easing.out(Easing.cubic) });
        overlayTranslateY.value = withTiming(0, { duration: 100, easing: Easing.out(Easing.cubic) });
        iconOverlayHeight.value = withTiming(screenHeight * 0.5, { duration: 100 });
      }, 100);
    } else {
      overlayOpacity.value = withTiming(0, { duration: 100, easing: Easing.in(Easing.cubic) });
      overlayTranslateY.value = withTiming(screenHeight * 0.5, { duration: 100, easing: Easing.in(Easing.cubic) });
      iconOverlayHeight.value = withTiming(screenHeight * 0.5, { duration: 100 });
      setIconOverlayVisible(false);
    }
  };

  const toggleColorOverlay = () => {
    if (!colorOverlayVisible) {
      setColorOverlayVisible(true);
      overlayOpacity.value = withTiming(1, { duration: 100, easing: Easing.out(Easing.cubic) });
      overlayTranslateY.value = withTiming(0, { duration: 100, easing: Easing.out(Easing.cubic) });
      colorOverlayHeight.value = withTiming(screenHeight * 0.5, { duration: 100 });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 100, easing: Easing.in(Easing.cubic) });
      overlayTranslateY.value = withTiming(screenHeight * 0.5, { duration: 100, easing: Easing.in(Easing.cubic) });
      colorOverlayHeight.value = withTiming(screenHeight * 0.5, { duration: 100 });
      setColorOverlayVisible(false);
    }
  };

  const renderIconItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.iconItem, icon === item.name && styles.selectedIconItem]}
      onPress={() => {
        setIcon(item.name);
        toggleIconOverlay();
      }}
    >
      <Ionicons name={item.name} size={24} color={icon === item.name ? '#007AFF' : '#666666'} />
      <Text style={[styles.iconText, { color: icon === item.name ? '#007AFF' : '#666666' }]}>
        {item.name.replace('-outline', '')}
      </Text>
    </TouchableOpacity>
  );

  const handleBackPress = useCallback(() => {
    if (showColorSection) {
      setShowColorSection(false);
      return true;
    }
    if (showIconSection) {
      setShowIconSection(false);
      return true;
    }
    if (iconOverlayVisible) {
      toggleIconOverlay();
      return true;
    }
    if (colorOverlayVisible) {
      toggleColorOverlay();
      return true;
    }
    if (nfcPopupVisible) {
      cancelNfcScan();
      return true;
    }
    navigation.goBack();
    return true;
  }, [showColorSection, showIconSection, iconOverlayVisible, colorOverlayVisible, nfcPopupVisible, navigation]);

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <Text style={{ fontFamily: 'SFProDisplay-Regular', fontSize: 16, color: '#000' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add New Card</Text>
          </View>
        </View>

        <ScrollView
  contentContainerStyle={styles.scrollContent}
  nestedScrollEnabled={true}
  scrollEnabled={!colorOverlayVisible && !iconOverlayVisible} // Disable when overlays are open
>
<PanGestureHandler onGestureEvent={gestureHandler}>
  <Animated.View style={[styles.previewContainer, cardAnimatedStyle]}>
    <LinearGradient
      colors={colors}
      style={[styles.previewCard]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <BlurView intensity={50} style={styles.surfaceBlur} />
      <View style={styles.previewHeader}>
      <TouchableOpacity 
  style={styles.colorButtonContainer}
  onPress={toggleColorSection}
  activeOpacity={0.7}
>
  <LinearGradient
    colors={colors}
    style={styles.colorPreviewSmall}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  />
</TouchableOpacity>
      </View>
      <Animated.View entering={FadeIn.delay(700)} style={styles.previewContent}>
      <TouchableOpacity 
  style={styles.previewIconContainer}
  onPress={toggleIconSection}
  activeOpacity={0.7}
>
<Ionicons name={icon} size={38} color={textColor} />
</TouchableOpacity>
        <View style={styles.previewTitleContainer}>
        <TextInput
  value={cardName}
  onChangeText={setCardName}
  placeholder="Card Name"
  placeholderTextColor={textColor === '#000000' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
  style={[styles.previewTitle, { color: textColor }]}
  numberOfLines={1}
  maxLength={20}
  multiline={false}
/>
        </View>
        <View style={[styles.titleUnderline, { backgroundColor: textColor === '#000000' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)' }]} />
      </Animated.View>
      <Animated.View entering={FadeIn.delay(900)} style={styles.previewBottom}>
        <View style={styles.numberContainer}>
        <Text style={[styles.numberLabel, { color: textColor === '#000000' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)' }]}>NFC META</Text>
<Text style={[styles.previewNumber, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit>
  {(nfcId || '0000 0000 0000').replace(/(.{4})/g, '$1 ').trim()}
</Text>
        </View>
      </Animated.View>
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
      <TouchableOpacity
        style={styles.stateLayer}
        activeOpacity={0.95}
        onPress={() => {
          cardScale.value = withSequence(
            withTiming(0.98, { duration: 150 }),
            withSpring(1, springConfig)
          );
        }}
      >
        <View style={styles.rippleEffect} />
      </TouchableOpacity>
    </LinearGradient>
  </Animated.View>
</PanGestureHandler>

          {nfcId ? (
            <View style={styles.nfcIdContainer}>
              <Text style={styles.nfcIdLabel}>Scanned Card ID:</Text>
              <Text style={styles.nfcIdText}>{nfcId}</Text>
            </View>
          ) : null}

          {/* Colors Section */}
          {showColorSection && (
  <Animated.View style={[styles.inlineSection, colorSectionStyle]}>
    <Text style={styles.sectionTitle}>Colors</Text>
    <FlatList
      data={customGradients}
      renderItem={({ item }) => {
        const isSelected = colors[0] === item.colors[0] && colors[1] === item.colors[1];
        return (
          <TouchableOpacity
            style={[styles.inlineColorItem, isSelected && styles.selectedInlineColorItem]}
            onPress={() => {
              setColors(item.colors);
            }}
          >
            <LinearGradient
              colors={item.colors}
              style={styles.inlineColorCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </TouchableOpacity>
        );
      }}
      keyExtractor={(item, index) => index.toString()}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.inlineColorsList}
    />
  </Animated.View>
)}

{/* Icons Section */}
{showIconSection && (
  <Animated.View style={[styles.inlineSection, iconSectionStyle]}>
    <Text style={styles.sectionTitle}>Icons</Text>
    <FlatList
  data={iconLibrary}
  renderItem={({ item }) => {
    const isSelected = icon === item.name;
    return (
      <TouchableOpacity
        style={[styles.inlineIconItem, isSelected && styles.selectedInlineIconItem]}
        onPress={() => {
          setIcon(item.name);
        }}
      >
        <Ionicons name={item.name} size={30} color={isSelected ? '#FFFFFF' : '#888'} />
      </TouchableOpacity>
    );
  }}
  keyExtractor={item => item.name}
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.inlineIconsList}
/>
  </Animated.View>
)}

<View style={styles.buttonRow}>
  <TouchableOpacity
    style={[styles.actionButton, styles.nfcButton, nfcPopupVisible && styles.buttonDisabled]}
    onPress={startNfcScan}
    disabled={nfcPopupVisible}
    activeOpacity={0.7}
  >
    <Ionicons name="radio" size={24} color="#444" />
    <Text style={[styles.buttonText, styles.nfcButtonText]}>Scan NFC</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.actionButton, styles.saveButton, !nfcId && styles.buttonDisabled]}
    onPress={saveCard}
    disabled={!nfcId}
    activeOpacity={0.7}
  >
    <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
    <Text style={[styles.buttonText, styles.saveButtonText]}>Save Card</Text>
  </TouchableOpacity>
</View>
        </ScrollView>

        {nfcPopupVisible && (
          <Animated.View style={[styles.nfcPopupContainer, backgroundStyle]}>
            <Animated.View style={[styles.nfcPopupContent, contentStyle]}>
              <View style={styles.overlayHeader}>
                <Text style={styles.nfcPopupText}>Ready to Scan?</Text>
              </View>
              <Text style={styles.nfcPopupSubText}>Place your Card at the Back</Text>
              <Animated.View style={[breathingStyle, { marginBottom: 20 }]}>
                <View style={styles.breathingCircle}>
                  <Ionicons name="radio" size={48} color="#007AFF" />
                </View>
              </Animated.View>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelNfcScan}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingTop: StatusBar.currentHeight || 44,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'SFProDisplay-Regular',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  previewCard: {
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
  previewIconContainer: {
    width: 4,
    height: 4,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineIconsList: {
    paddingHorizontal: 10,
    height: 90,
    marginBottom: -15,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 10,
  },
  colorButtonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 6,
  },
  circleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPreviewSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 10,
    marginTop: 20,
  },
  previewIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 19,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitleContainer: {
    flex: 1,
    marginLeft: 5,
  },
  previewTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    maxWidth: '80%',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    textAlign: 'left',
  },
  titleUnderline: {
    width: 50,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  previewBottom: {
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
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'SFProText-Regular',
    marginBottom: 8,
    marginTop: 14,
    textTransform: 'uppercase',
  },
  previewNumber: {
    fontSize: 19,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: '80%',
  },
  nfcIdContainer: {
    borderRadius: 20,
    width: CARD_WIDTH,
    padding: 12,
    alignSelf: 'center',
    marginVertical: 8,
    alignItems: 'center',
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: '#111',
  },
  nfcIdLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
    fontFamily: 'SFProText-Regular',
    marginBottom: 4,
  },
  nfcIdText: {
    fontSize: 18,
    fontWeight: '400',
    color: '#ffffff',
    fontFamily: 'SFProText-Regular',
  },
  breathingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    width: CARD_WIDTH,
    alignSelf: 'center',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'center',
    width: CARD_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nfcButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#222',
    borderWidth: 0,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'SFProText-Regular',
    marginLeft: 8,
  },
  nfcButtonText: {
    color: '#000000',
    fontFamily: 'SFProText-Regular',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(51, 51, 51, 0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlayContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    width: screenWidth,
    height: screenHeight * 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    overflow: 'hidden',
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'SFProDisplay-Regular',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerHandleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  searchContainer: {
    paddingVertical: 8,
  },
  searchInput: {
    fontSize: 14,
    fontFamily: 'SFProText-Regular',
    color: '#000000',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconGrid: {
    paddingBottom: 100, // Ensure enough space for scrolling
    paddingHorizontal: 8,
  },
  iconItem: {
    flex: 1,
    margin: 6,
    padding: 12,
    borderRadius: 22,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedIconItem: {
    backgroundColor: '#E6F0FA',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  iconText: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'SFProText-Regular',
    marginTop: 4,
    textAlign: 'center',
  },
  colorGrid: {
    paddingBottom: 12,
  },
  colorPaletteItem: {
    flex: 1,
    margin: 4,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedColorPalette: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  colorGradientPreview: {
    height: 40,
    width: '100%',
    borderRadius: 8,
  },
  colorPaletteName: {
    padding: 8,
    fontSize: 11,
    fontWeight: '500',
    color: '#000000',
    fontFamily: 'SFProText-Regular',
    textAlign: 'center',
  },
  gradientCircleGrid: {
    paddingBottom: 150, // Increased padding to ensure all items are accessible
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  gradientCircleItem: {
    flex: 1,
    margin: 6,
    padding: 12,
    borderRadius: 22,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedGradientCircleItem: {
    backgroundColor: '#E6F0FA',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  gradientCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  gradientCircleName: {
    fontSize: 10,
    fontWeight: '500',
    color: '#000000',
    fontFamily: 'SFProText-Regular',
    marginTop: 4,
    textAlign: 'center',
  },
  nfcPopupContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  nfcPopupContent: {
    backgroundColor: '#0f0f0f',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: screenWidth,
    height: screenHeight * 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  nfcPopupText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'SFProDisplay-Regular',
    marginTop: 12,
    textAlign: 'center',
  },
  nfcPopupSubText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    fontFamily: 'SFProDisplay-Regular',
    marginVertical: 2,
    marginBottom: 40,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 50,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'SFProText-Regular',
  },
  decorativeElement1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 1,
  },
  decorativeElement2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    zIndex: 1,
  },
  decorativeElement3: {
    position: 'absolute',
    top: '40%',
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    zIndex: 1,
  },

    stateLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  rippleEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  inlineSection: {
    marginVertical: 16,
    width: CARD_WIDTH,
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 12,
  },
  inlineColorsList: {
    paddingHorizontal: 8,
  },
  inlineColorItem: {
    marginHorizontal: 8,
    padding: 4,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedInlineColorItem: {
    borderColor: '#007AFF',
  },
  inlineColorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  inlineIconsGrid: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inlineIconItem: {
    flex: 1,
    margin: 6,
    padding: 12,
    borderRadius: 40,
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: 'transparent',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedInlineIconItem: {
    borderColor: '#007AFF',
    backgroundColor: '#1a1a1a',
  },
});

export default AddCardScreen;