import React, { useEffect, useRef, useState } from 'react'; 
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native'; // Import more components
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthRequest, makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons';
import { BACKEND_URL } from '../config';
import logo from '../../assets/logo.png';

WebBrowser.maybeCompleteAuthSession();

const AUTH0_DOMAIN = 'dev-j4cwj6o18hb2ay8w.us.auth0.com';
const AUTH0_CLIENT_ID = 'ORPjvT8DuzUGgEmIY7eZiHS3O8EBJWkO';

// Auth0 discovery document
const discovery = {
  authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
  tokenEndpoint: `https://${AUTH0_DOMAIN}/oauth/token`,
  revocationEndpoint: `https://${AUTH0_DOMAIN}/oauth/revoke`,
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const hasHandledResponse = useRef(false);

  // State for manual login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const redirectUri = makeRedirectUri({ useProxy: true });

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: AUTH0_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: redirectUri,
      extraParams: {
        audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      },
    },
    discovery
  );

  useEffect(() => {
    // Check the response and ensure we haven't handled it yet.
    if (response && !hasHandledResponse.current) {
      // Mark that we are handling this response.
      hasHandledResponse.current = true;

      if (response.type === 'success') {
        const { code } = response.params;
        exchangeCodeForToken(code, request);
      } else if (response.type === 'error') {
        Alert.alert('Authentication Error', response.error_description || 'Something went wrong');
        hasHandledResponse.current = false;
      } else {
        hasHandledResponse.current = false;
      }
    }
  }, [response, request]);

  const handleManualLogin = async () => {
    if (!email || !password) {
      Alert.alert('Login Failed', 'Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    console.log('[Login] Starting login...');
    console.log('[Login] BACKEND_URL:', BACKEND_URL);
    console.log('[Login] Email:', email);
    try {
      console.log('[Login] POSTing to:', `${BACKEND_URL}/api/user/login`);
      const res = await axios.post(`${BACKEND_URL}/api/user/login`, {
        email,
        password,
      });

      console.log('[Login] Response status:', res.status);
      console.log('[Login] Response data:', JSON.stringify(res.data));

      const { token } = res.data;

      if (!token) {
        console.error('[Login] ERROR: No token in response!', res.data);
        Alert.alert('Login Failed', 'Server did not return a token.');
        return;
      }

      console.log('[Login] Token received, saving to AsyncStorage...');
      await AsyncStorage.setItem('userToken', token);
      console.log('[Login] Token saved. Navigating to MainTabs...');
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      console.log('[Login] navigation.reset called');
    } catch (error) {
      console.error('[Login] Request failed!');
      console.error('[Login] Error message:', error.message);
      console.error('[Login] Response status:', error.response?.status);
      console.error('[Login] Response data:', JSON.stringify(error.response?.data));
      Alert.alert('Login Failed', error.response?.data?.message || error.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const exchangeCodeForToken = async (code, authRequest) => {
    try {
      const tokenResponse = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
        client_id: AUTH0_CLIENT_ID,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: authRequest?.codeVerifier,
      });

      const { access_token } = tokenResponse.data;
      sendAuth0TokenToBackend(access_token);

    } catch (error) {
      console.error('Failed to exchange code for token:', error.response?.data || error.message);
      Alert.alert('Login Failed', 'Could not verify login with Auth0.');
      hasHandledResponse.current = false;
    }
  };

  const sendAuth0TokenToBackend = async (accessToken) => {
    try {
      const backendResponse = await axios.post(
        `${BACKEND_URL}/api/auth/auth0-login`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      const { token } = backendResponse.data;
      await AsyncStorage.setItem('userToken', token);
      navigation.replace('MainTabs');
    } catch (error) {
      console.error('Backend login failed:', error);
      Alert.alert('Login Failed', 'Could not log you into the application.');
      hasHandledResponse.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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

        {/* --- Separator --- */}
        <View style={styles.separatorContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>OR</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* --- Social Login Button --- */}
        <TouchableOpacity
          style={[styles.button, styles.socialLoginButton]}
          onPress={() => {
            hasHandledResponse.current = false;
            promptAsync();
          }}
          disabled={!request || isLoading}
        >
          <Text style={styles.buttonText}>Continue with Google, Facebook...</Text>
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
    backgroundColor: '#00B8A9',
  },
  socialLoginButton: {
    backgroundColor: '#4285F4',
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
    color: '#00B8A9',
    fontWeight: 'bold',
  },
});

export default LoginScreen;