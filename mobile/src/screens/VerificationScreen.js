import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,   // 1. Eklenen
  Platform,               // 2. Eklenen
  TouchableWithoutFeedback, // 3. Eklenen
  Keyboard,               // 4. Eklenen
  ScrollView              // 5. Eklenen
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons'; // İkon ekledik (İstersen kaldırabilirsin)

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function VerificationScreen({ route, navigation }) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert("Hata", "Lütfen 6 haneli kodu girin.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/verify`, { email, code });
      
      Alert.alert("Başarılı", "Hesabınız doğrulandı! Giriş yapabilirsiniz.", [
        { text: "Giriş Yap", onPress: () => navigation.navigate('Login') }
      ]);

    } catch (error) {
      console.log("Doğrulama hatası:", error.response ? error.response.data : error.message);
      const msg = error.response?.data?.error || "Kod doğrulanamadı.";
      Alert.alert("Hata", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. ADIM: Klavye açılınca ekranı ittiren kapsayıcı
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* 2. ADIM: Boşluğa tıklayınca klavyeyi kapatan kapsayıcı */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        
        {/* 3. ADIM: Küçük ekranlarda kaydırma özelliği sağlayan kapsayıcı */}
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled" // Butonların çalışmasını engellemesin diye
          showsVerticalScrollIndicator={false}
        >

          {/* --- İÇERİK BAŞLANGICI --- */}
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark-outline" size={80} color="#333" />
          </View>

          <Text style={styles.title}>Doğrulama Kodu</Text>
          <Text style={styles.subtitle}>
            {email} adresine gönderilen 6 haneli kodu girin.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            textAlign="center"
            placeholderTextColor="#ccc"
          />

          <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Doğrula</Text>}
          </TouchableOpacity>
          {/* --- İÇERİK BİTİŞİ --- */}

        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  scrollContainer: {
    flexGrow: 1,            // İçerik az olsa bile ekranı kapla
    justifyContent: 'center', // Ortala
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#333', 
    textAlign:'center', 
    marginBottom: 10 
  },
  subtitle: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 30 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20, 
    fontSize: 24, 
    letterSpacing: 8, // Rakamlar arası boşluk
    backgroundColor:'#f9f9f9',
    color: '#333'
  },
  button: { 
    backgroundColor: '#333', 
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  }
});