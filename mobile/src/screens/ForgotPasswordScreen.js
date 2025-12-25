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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // İkonlar

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert("Hata", "Lütfen e-posta adresinizi girin.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      
      Alert.alert("Başarılı", "Doğrulama kodu gönderildi.", [
        { text: "Tamam", onPress: () => navigation.navigate('ResetVerification', { email: email }) }
      ]);

    } catch (error) {
      console.log("Forgot Password Error:", error.response ? error.response.data : error.message);
      const msg = error.response?.data?.error || "Bir hata oluştu.";
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
      {/* 2. ADIM: Klavyeyi Kapatma */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        
        {/* 3. ADIM: Kaydırma Özelliği */}
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          {/* Geri Dön Butonu */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* İkon */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lock-question" size={80} color="#333" />
          </View>

          <Text style={styles.title}>Şifremi Unuttum</Text>
          <Text style={styles.subtitle}>
            Hesabınıza bağlı e-posta adresini girin, size bir sıfırlama kodu gönderelim.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="E-posta Adresi"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kod Gönder</Text>}
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40 // Üstten biraz boşluk (Back button için)
  },
  // Geri butonunu artık absolute yerine akış içinde kullanıyoruz ki kaydırmada sorun çıkarmasın
  backButton: { 
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 5
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 10,
    textAlign: 'center'
  },
  subtitle: { 
    fontSize: 16, 
    color: '#666', 
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20, 
    fontSize: 16,
    backgroundColor: '#f9f9f9'
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