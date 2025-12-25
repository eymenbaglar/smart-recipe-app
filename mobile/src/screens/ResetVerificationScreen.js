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
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function ResetVerificationScreen({ route, navigation }) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      // Kodu doğrula
      await axios.post(`${API_URL}/api/auth/verify-reset-code`, { email, code });
      
      // Başarılıysa Yeni Şifre ekranına git
      navigation.navigate('NewPassword', { email: email, code: code });

    } catch (error) {
      console.log("Verify Reset Code Error:", error.response ? error.response.data : error.message);
      const msg = error.response?.data?.error || "Kod doğrulanamadı.";
      Alert.alert("Hata", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. ADIM: Klavye Yönetimi
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* 2. ADIM: Boşluğa tıklayınca klavyeyi kapat */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        
        {/* 3. ADIM: Kaydırma ve Merkezleme */}
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* İkon: Kilit Açılıyor Sembolü */}
          <View style={styles.iconContainer}>
            <Ionicons name="lock-open-outline" size={80} color="#333" />
          </View>

          <Text style={styles.title}>Kodu Girin</Text>
          <Text style={styles.subtitle}>
            {email} adresine gönderilen 6 haneli sıfırlama kodunu girin.
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
    flexGrow: 1,              // İçerik az olsa bile ekranı doldur
    justifyContent: 'center', // İçeriği dikeyde ortala
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
    marginBottom: 30,
    lineHeight: 20
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20, 
    fontSize: 24, 
    letterSpacing: 8, // Rakamlar arası boşluk (Kod olduğu belli olsun diye)
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