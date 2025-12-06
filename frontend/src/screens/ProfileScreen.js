import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../config';

const COLORS = {
  primary: '#007AFF',
  white: '#FFFFFF',
  text: '#333333',
  lightGray: '#F5F5F7',
  darkGray: '#A9A9A9',
  danger: '#DC3545',
};

const ProfileScreen = () => {
  const [passenger, setPassenger] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  const fetchPassengerProfile = async () => {
    try {
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPassenger(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      Alert.alert('Error', 'Could not fetch your profile. Please try again later.');
      if (error.response && error.response.status === 401) {
        await handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Refetch data when the screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPassengerProfile();
    });

    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    navigation.replace('Login');
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!passenger) {
    return (
      <View style={styles.centered}>
        <Text>Could not load profile.</Text>
        <TouchableOpacity onPress={fetchPassengerProfile}>
            <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileHeader}>
        <Image
          source={{ uri: passenger.profilePictureUrl || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{passenger.name || 'N/A'}</Text>
        <Text style={styles.email}>{passenger.email || 'N/A'}</Text>
      </View>

      <View style={styles.infoContainer}>
        <InfoRow icon="call-outline" label="Phone Number" value={passenger.phoneNumber || 'N/A'} />
        <InfoRow icon="card-outline" label="Member Since" value={passenger.createdAt && passenger.createdAt._seconds ? new Date(passenger.createdAt._seconds * 1000).toLocaleDateString() : 'N/A'} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={24} color={COLORS.primary} style={styles.infoIcon} />
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  retryText: {
    color: COLORS.primary,
    marginTop: 10,
  },
  profileHeader: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  email: {
    fontSize: 16,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  infoContainer: {
    marginTop: 20,
    backgroundColor: COLORS.white,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoIcon: {
    marginRight: 20,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.darkGray,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    margin: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default ProfileScreen;