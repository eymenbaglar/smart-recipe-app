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
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function NewPasswordScreen({ route, navigation }) {
  // ResetVerification sayfasından gelen veriler
  const { email, code } = route.params; 
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Hata", "Şifreler birbiriyle uyuşmuyor.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      // Backend'e yeni şifreyi gönder
      await axios.post(`${API_URL}/api/auth/reset-password`, { 
        email, 
        code, 
        newPassword 
      });
      
      Alert.alert("Başarılı", "Şifreniz başarıyla güncellendi! Giriş yapabilirsiniz.", [
        { text: "Giriş Yap", onPress: () => navigation.navigate('Login') }
      ]);

    } catch (error) {
      console.log("Reset Password Error:", error.response ? error.response.data : error.message);
      const msg = error.response?.data?.error || "Şifre sıfırlanamadı.";
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
        
        {/* 3. ADIM: Kaydırma */}
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* İkon: Şifre Yenileme */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lock-reset" size={80} color="#333" />
          </View>

          <Text style={styles.title}>Yeni Şifre</Text>
          <Text style={styles.subtitle}>
            Hesabınız için yeni ve güçlü bir şifre belirleyin.
          </Text>

          {/* Yeni Şifre Input */}
          <TextInput
            style={styles.input}
            placeholder="Yeni Şifre"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={true} // Şifreyi gizle
            placeholderTextColor="#999"
          />

          {/* Şifre Tekrar Input */}
          <TextInput
            style={styles.input}
            placeholder="Yeni Şifre (Tekrar)"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={true} // Şifreyi gizle
            placeholderTextColor="#999"
          />

          <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Şifreyi Güncelle</Text>}
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
    marginBottom: 15, // Inputlar arası biraz daha az boşluk
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  button: { 
    backgroundColor: '#333', 
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center',
    marginTop: 10 // Butonu biraz aşağı it
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  }
});