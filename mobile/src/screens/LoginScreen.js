// mobile/src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const token = response.data.token || response.data.data?.token || response.data.accessToken;
      const user = response.data.user || response.data.data?.user;

      if (token) {
        await AsyncStorage.setItem('token', token);
        
        if (user) {
          await AsyncStorage.setItem('user', JSON.stringify(user));
        }

Alert.alert('Başarılı', 'Giriş yapıldı!', [
  { 
    text: 'Tamam', 
    onPress: () => navigation.replace('Main') 
  }
]);
      } else {
        Alert.alert("Hata", "Sunucu cevap verdi ama token bulunamadı. Lütfen terminal loglarını kontrol et.");
      }

    } catch (error) {
      console.log("HATA OLUŞTU!");
      if (error.response) {
        console.log("Sunucu Hatası Verisi:", error.response.data);
        console.log("Sunucu Hatası Statüsü:", error.response.status);
        Alert.alert('Hata', error.response.data.message || 'Sunucu hatası');
      } else if (error.request) {
        console.log("Sunucuya ulaşılamıyor. İstek:", error.request);
        Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamıyor. İnternetini veya IP adresini kontrol et.');
      } else {
        console.log("Hata Mesajı:", error.message);
        Alert.alert('Hata', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🍳</Text>
        <Text style={styles.title}>Smart Recipe</Text>
        <Text style={styles.subtitle}>Malzemelerinle lezzetli tarifler keşfet!</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="E-posta"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          placeholder="Şifre"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>Hesabınız yok mu? Kayıt Olun</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  logo: {
    fontSize: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  formContainer: {
    flex: 2,
    padding: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#4CAF50',
    fontSize: 16,
  },
});