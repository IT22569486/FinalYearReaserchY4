import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ScreenLockOverlay = ({ visible, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    // Simple unlock - just tap to unlock (no PIN required by default)
    onUnlock && onUnlock();
    setPin('');
  };

  const handlePinUnlock = async () => {
    if (pin.length < 1) {
      handleUnlock();
      return;
    }
    setLoading(true);
    // Optionally validate PIN here if you set one
    onUnlock && onUnlock();
    setPin('');
    setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={64} color="#fff" />
          </View>

          <Text style={styles.title}>Screen Locked</Text>
          <Text style={styles.subtitle}>
            Your session has been locked due to inactivity
          </Text>

          <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock}>
            <Ionicons name="lock-open-outline" size={24} color="#007AFF" />
            <Text style={styles.unlockButtonText}>Tap to Unlock</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Your session is still active
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 10,
    marginBottom: 20,
  },
  unlockButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
});

export default ScreenLockOverlay;
