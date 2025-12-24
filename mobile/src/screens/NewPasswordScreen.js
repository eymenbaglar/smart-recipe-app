import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function NewPasswordScreen({ route, navigation }) {
  const { email, code } = route.params; // Önceki sayfadan gelen yetki kanıtları
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (password.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Hata", "Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      // Şifreyi güncelle
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        email,
        code,
        newPassword: password
      });
      
      Alert.alert("Başarılı", "Şifreniz değiştirildi. Giriş yapabilirsiniz.", [
        { text: "Giriş Yap", onPress: () => navigation.popToTop() } // En başa (Login) döner
      ]);

    } catch (error) {
      const msg = error.response?.data?.error || "Şifre değiştirilemedi.";
      Alert.alert("Hata", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yeni Şifre Belirle</Text>
      <Text style={styles.subtitle}>Lütfen hesabınız için yeni bir şifre girin.</Text>

      <TextInput
        style={styles.input}
        placeholder="Yeni Şifre"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TextInput
        style={styles.input}
        placeholder="Yeni Şifre (Tekrar)"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Şifreyi Güncelle</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});