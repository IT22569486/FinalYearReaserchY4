import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';
import apiClient from '../api/axiosConfig';
import { useSession } from '../context/SessionContext';
import { updateLastActivity } from '../utils/authUtils';

const COLORS = {
  primary: '#007AFF',
  white: '#FFFFFF',
  text: '#333333',
  lightGray: '#F5F5F7',
  darkGray: '#A9A9A9',
  danger: '#DC3545',
};

const BLOOD_GROUP_OPTIONS = [
  { label: 'A+', value: 'A+' },
  { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB-', value: 'AB-' },
  { label: 'O+', value: 'O+' },
  { label: 'O-', value: 'O-' },
];

const ProfileScreen = () => {
  const [passenger, setPassenger] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    mobileNo: '',
    nic: '',
    dob: '',
    bloodGroup: '',
  });
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const { refreshSession, handleLogout: sessionLogout } = useSession();

  const fetchPassengerProfile = async () => {
    try {
      // Update activity timestamp
      await updateLastActivity();
      await refreshSession();
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await apiClient.get('/api/user/profile');

      setPassenger(response.data);
      setFormData({
        mobileNo: response.data?.mobileNo || '',
        nic: response.data?.nic || '',
        dob: response.data?.dob || '',
        bloodGroup: response.data?.bloodGroup || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      if (error.message !== 'Token expired') {
        Alert.alert('Error', 'Could not fetch your profile. Please try again later.');
      }
      // 401 errors are handled by axios interceptor
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
    await sessionLogout('User logged out');
  };

  const handleSaveProfile = async () => {
    try {
      await updateLastActivity();
      await refreshSession();

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await apiClient.put('/api/user/profile', {
        mobileNo: formData.mobileNo,
        nic: formData.nic,
        dob: formData.dob,
        bloodGroup: formData.bloodGroup,
      });

      const updatedUser = response.data?.user || {
        ...passenger,
        ...formData,
      };

      setPassenger(updatedUser);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Could not update profile. Please try again.');
    }
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDobDateValue = () => {
    if (!formData.dob) return new Date();
    const [year, month, day] = formData.dob.split('-').map(Number);
    if (!year || !month || !day) return new Date();
    return new Date(year, month - 1, day);
  };

  const handleDobChange = (_event, selectedDate) => {
    setShowDobPicker(false);
    if (selectedDate) {
      setFormData((prev) => ({ ...prev, dob: formatDate(selectedDate) }));
    }
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
        <View style={styles.avatar}>
          <Ionicons name="person-circle" size={100} color={COLORS.primary} />
        </View>
        <Text style={styles.name}>{passenger.name || 'N/A'}</Text>
        <Text style={styles.email}>{passenger.email || 'N/A'}</Text>
        <Text style={styles.role}>{passenger.role ? passenger.role.charAt(0).toUpperCase() + passenger.role.slice(1) : 'Passenger'}</Text>
      </View>

      <ScrollView style={styles.infoContainer}>
        <InfoRow icon="person-outline" label="User ID" value={passenger.id || 'N/A'} />
        {isEditing ? (
          <View style={styles.editContainer}>
            <Text style={styles.editLabel}>Mobile Number</Text>
            <TextInput
              style={styles.editInput}
              placeholder="Enter mobile number"
              value={formData.mobileNo}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, mobileNo: text }))}
              keyboardType="phone-pad"
            />

            <Text style={styles.editLabel}>NIC</Text>
            <TextInput
              style={styles.editInput}
              placeholder="Enter NIC"
              value={formData.nic}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, nic: text }))}
            />

            <Text style={styles.editLabel}>Date of Birth</Text>
            <TouchableOpacity style={styles.editInput} onPress={() => setShowDobPicker(true)}>
              <Text style={[styles.datePickerText, !formData.dob && styles.datePickerPlaceholder]}>
                {formData.dob || 'YYYY-MM-DD'}
              </Text>
            </TouchableOpacity>
            {showDobPicker && (
              <DateTimePicker
                value={getDobDateValue()}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={handleDobChange}
              />
            )}

            <Text style={styles.editLabel}>Blood Group</Text>
            <View style={styles.pickerWrapper}>
              <RNPickerSelect
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, bloodGroup: value || '' }))
                }
                items={BLOOD_GROUP_OPTIONS}
                value={formData.bloodGroup || null}
                placeholder={{ label: 'Select blood group', value: null }}
                useNativeAndroidPickerStyle={false}
                style={pickerSelectStyles}
                Icon={() => <Ionicons name="chevron-down" size={20} color={COLORS.darkGray} />}
              />
            </View>
          </View>
        ) : (
          <>
            <InfoRow icon="call-outline" label="Mobile Number" value={passenger.mobileNo || 'Not provided'} />
            <InfoRow icon="id-card-outline" label="NIC" value={passenger.nic || 'Not provided'} />
            <InfoRow icon="cake-outline" label="Date of Birth" value={passenger.dob || 'Not provided'} />
            <InfoRow icon="water-outline" label="Blood Group" value={passenger.bloodGroup || 'Not provided'} />
          </>
        )}
        <InfoRow icon="calendar-outline" label="Member Since" value={passenger.createdAt ? new Date(passenger.createdAt).toLocaleDateString() : 'N/A'} />
      </ScrollView>

      <View style={styles.buttonContainer}>
        {isEditing ? (
          <>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Ionicons name="checkmark-outline" size={20} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Save Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
              <Ionicons name="close-outline" size={20} color={COLORS.primary} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
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
  role: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 8,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: COLORS.white,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: COLORS.white,
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
  editContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  editLabel: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginBottom: 6,
    marginTop: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  datePickerText: {
    fontSize: 16,
    color: COLORS.text,
  },
  datePickerPlaceholder: {
    color: COLORS.darkGray,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: COLORS.lightGray,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  refreshButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    padding: 15,
    borderRadius: 12,
    borderWidth: 0,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    backgroundColor: COLORS.white,
    marginBottom: 2,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 36,
  },
  inputAndroid: {
    fontSize: 16,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 36,
  },
  placeholder: {
    color: COLORS.darkGray,
  },
  iconContainer: {
    top: 12,
    right: 12,
  },
});

export default ProfileScreen;