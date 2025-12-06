import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#007AFF',
  white: '#FFFFFF',
  text: '#333333',
  lightGray: '#F5F5F7',
  darkGray: '#A9A9A9',
};

const slides = [
  {
    id: '1',
    icon: 'map-marked-alt',
    title: 'Find Rides Easily',
    subtitle: 'Quickly find and book rides to your destination with just a few taps.',
  },
  {
    id: '2',
    icon: 'shield-alt',
    title: 'Safety is Our Priority',
    subtitle: 'Track your ride in real-time and share your journey with loved ones.',
  },
  {
    id: '3',
    icon: 'wallet',
    title: 'Seamless Payments',
    subtitle: 'Pay for your rides securely and conveniently within the app.',
  },
];

const Slide = ({ item }) => {
  return (
    <View style={styles.slide}>
      <FontAwesome5 name={item.icon} size={100} color={COLORS.primary} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );
};

const OnboardingScreen = ({ navigation }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const ref = useRef(null);

  const updateCurrentSlideIndex = e => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentSlideIndex(currentIndex);
  };

  const goToNextSlide = () => {
    const nextSlideIndex = currentSlideIndex + 1;
    if (nextSlideIndex < slides.length) {
      const offset = nextSlideIndex * width;
      ref?.current?.scrollToOffset({ offset });
      setCurrentSlideIndex(nextSlideIndex);
    }
  };

  const skip = () => {
    navigation.replace('Login');
  };

  const getStarted = () => {
    navigation.replace('Login');
  };

  const Footer = () => {
    return (
      <View style={styles.footerContainer}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentSlideIndex === index && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          {currentSlideIndex === slides.length - 1 ? (
            <TouchableOpacity style={styles.getStartedButton} onPress={getStarted}>
              <Text style={styles.buttonText}>GET STARTED</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.btn, { backgroundColor: 'transparent' }]}
                onPress={skip}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: COLORS.darkGray }}>
                  SKIP
                </Text>
              </TouchableOpacity>
              <View style={{ width: 15 }} />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={goToNextSlide}
                style={styles.btn}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: COLORS.white }}>
                  NEXT
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={ref}
        onMomentumScrollEnd={updateCurrentSlideIndex}
        contentContainerStyle={{ height: '75%' }}
        showsHorizontalScrollIndicator={false}
        horizontal
        data={slides}
        pagingEnabled
        renderItem={({ item }) => <Slide item={item} />}
      />
      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    paddingHorizontal: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 40,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.darkGray,
    fontSize: 16,
    marginTop: 10,
    maxWidth: '80%',
    textAlign: 'center',
    lineHeight: 23,
  },
  footerContainer: {
    height: '25%',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  indicator: {
    height: 10,
    width: 10,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 3,
    borderRadius: 5,
  },
  indicatorActive: {
    backgroundColor: COLORS.primary,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  getStartedButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 15,
    color: COLORS.white,
  },
});

export default OnboardingScreen;