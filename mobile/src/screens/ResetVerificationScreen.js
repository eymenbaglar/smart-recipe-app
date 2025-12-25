import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
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
      
      // Başarılıysa Yeni Şifre ekranına git (Email ve Kodu da taşıyoruz)
      navigation.navigate('NewPassword', { email: email, code: code });

    } catch (error) {
      const msg = error.response?.data?.error || "The code could not be verified.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="lock-open-outline" size={60} color="#FF6F61" style={{alignSelf:'center', marginBottom:20}} />
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to your {email} address.</Text>

      <TextInput
        style={styles.input}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        textAlign="center"
      />

      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign:'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 24, letterSpacing: 5, backgroundColor:'#f9f9f9' },
  button: { backgroundColor: '#FF6F61', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});