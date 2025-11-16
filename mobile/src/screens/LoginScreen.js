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

export default function LoginScreen({ navigation, onLoginSuccess }) {
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
        email: email.trim(),
        password: password.trim()
      });

      const { token, user } = response.data;

      // Token geldiyse kaydet
      if (token) {
        await AsyncStorage.setItem('token', token);
        if (user) {
          await AsyncStorage.setItem('user', JSON.stringify(user));
        }

        // 2. App.js'ye "Giriş yaptım" haberini yolla
        // Bu, isLoggedIn state'ini 'true' yapacak
        if (onLoginSuccess) {
          onLoginSuccess();
        }

        // 3. Başarılı uyarısı (Bu, yönlendirmeden önce görünmeyebilir, normaldir)
        Alert.alert('Başarılı', 'Giriş yapıldı!');

        // 4. Manuel yönlendirmeyi SİLİYORUZ.
        // navigation.replace('Main') // <- BU SATIR HATA VERİYORDU, SİLDİK.

      } else {
        // Bu log'u önceki hatadan dolayı ekliyorum (Token gelmezse)
        console.error("Sunucu yanıt döndü ama token içermiyor.");
        Alert.alert("Hata", "Kimlik doğrulama anahtarı (token) alınamadı.");
      }

    } catch (error) {
      console.log("Login hatası:", error.response ? error.response.data : error.message);
      if (error.response && error.response.status === 401) {
        Alert.alert('Hata', 'E-posta veya şifre hatalı.');
      } else if (error.request) {
        Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamıyor.');
      } else {
        Alert.alert('Hata', 'Giriş başarısız. Bilgilerinizi kontrol edin.');
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
    backgroundColor: '#333',
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
    color: '#333',
    fontSize: 16,
  },
});