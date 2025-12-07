import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { BACKEND_URL } from '../config'; 

const SignUpScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [nic, setNic] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !mobileNo) {
      Alert.alert('Error', 'Please fill in all required fields: Name, Email, Password, and Mobile No.');
      return;
    }

    setIsLoading(true);

    const payload = {
      name,
      email,
      password,
      dob,
      nic,
      bloodGroup,
      mobileNo,
      role: 'passenger', // Role is fixed as per requirement
    };

    try {
      await axios.post(`${BACKEND_URL}/api/user/register`, payload);
      
      Alert.alert(
        'Success',
        'Your account has been created successfully. Please log in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'An unknown error occurred.';
      Alert.alert('Sign Up Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join our community today!</Text>

          <TextInput style={styles.input} placeholder="Full Name*" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Email Address*" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password*" value={password} onChangeText={setPassword} secureTextEntry />
          <TextInput style={styles.input} placeholder="Mobile Number*" value={mobileNo} onChangeText={setMobileNo} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Date of Birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} />
          <TextInput style={styles.input} placeholder="NIC Number" value={nic} onChangeText={setNic} />
          <TextInput style={styles.input} placeholder="Blood Group" value={bloodGroup} onChangeText={setBloodGroup} />

          <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'gray', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loginText: { color: '#007AFF', textAlign: 'center', marginTop: 20, fontSize: 16 },
});

export default SignUpScreen;