import React, { useEffect, useState } from 'react'; 
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons';
import { BACKEND_URL } from '../config';
import { updateLastActivity } from '../utils/authUtils';
import * as Google from 'expo-auth-session/providers/google';
import logo from '../../assets/logo.png';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Firebase Google Sign-In using expo-auth-session
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    expoClientId: '525212256594-csailp63qiomntb6f9srkbc6as3avjv7.apps.googleusercontent.com',
    androidClientId: '525212256594-REPLACE_WITH_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: '525212256594-f2mjfe9emr5qqq6id044oh9kk88tj64n.apps.googleusercontent.com',
    webClientId: '525212256594-csailp63qiomntb6f9srkbc6as3avjv7.apps.googleusercontent.com',
  });

  // Handle Firebase Google Sign-In response
  useEffect(() => {
    if (googleResponse?.type === 'success' && googleResponse.authentication) {
      handleGoogleSignInWithFirebase(googleResponse.authentication.accessToken);
    }
  }, [googleResponse]);

  const handleManualLogin = async () => {
    try {
      setIsLoading(true);
      
      // Use backend email/password authentication
      const res = await axios.post(`${BACKEND_URL}/api/user/login`, {
        email,
        password,
      });

      const { token, id, _id, uid } = res.data;
      await AsyncStorage.setItem('userToken', token);
      const resolvedUserId = id || _id || uid;
      if (resolvedUserId) {
        await AsyncStorage.setItem('userId', String(resolvedUserId));
      }
      await updateLastActivity();
      Alert.alert('Login Success');
      navigation.replace('MainTabs');
    } catch (error) {
      // console.error('Manual login failed:', error.response?.data || error.message);
      Alert.alert('Login Failed', error.response?.data?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignInWithFirebase = async (accessToken) => {
    try {
      setIsLoading(true);
      
      // Get user info from Google
      const userInfoResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
      );
      
      const userInfo = userInfoResponse.data;
      
      // Send user info to backend for authentication
      const response = await axios.post(`${BACKEND_URL}/api/user/google-login`, {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: accessToken,
      });

      const { token, id, _id, uid } = response.data;
      await AsyncStorage.setItem('userToken', token);
      const resolvedUserId = id || _id || uid;
      if (resolvedUserId) {
        await AsyncStorage.setItem('userId', String(resolvedUserId));
      }
      await updateLastActivity();
      Alert.alert('Login Success', 'Welcome back!');
      navigation.replace('MainTabs');
    } catch (error) {
      console.error('Google login failed:', error.message);
      Alert.alert('Login Failed', error.response?.data?.message || 'Could not log you in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await googlePromptAsync({ useProxy: true });
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('Error', 'Failed to initiate Google Sign-In');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <View style={styles.header}>
          <Image source={logo} style={{ width: 200, height: 200, marginTop: 20 }} />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity
          style={[styles.button, styles.manualLoginButton]}
          onPress={handleManualLogin}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <View style={styles.separatorContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>OR</Text>
          <View style={styles.separatorLine} />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={!googleRequest || isLoading}
        >
          <View style={styles.googleButtonContent}>
            <FontAwesome name="google" size={20} color="#fff" style={styles.googleIcon} />
            <Text style={styles.buttonText}>Continue with Google</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signUpContainer}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.signUpText}>
            Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  keyboardAvoidingContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', marginTop: 20 },
  subtitle: { fontSize: 18, color: 'gray', marginTop: 8 },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  manualLoginButton: {
    backgroundColor: '#007AFF',
  },
  googleButton: {
    backgroundColor: '#DB4437',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  separatorText: {
    marginHorizontal: 10,
    color: '#888',
    fontWeight: 'bold',
  },
  signUpContainer: {
    marginTop: 25,
    alignItems: 'center',
  },
  signUpText: {
    color: '#666',
    fontSize: 16,
  },
  signUpLink: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default LoginScreen;
