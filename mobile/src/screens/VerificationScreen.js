import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

// Config dosyanızdan API_URL'i çekin veya buraya yazın
const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function VerificationScreen({ route, navigation }) {
  // Register ekranından gönderilen email'i alıyoruz
  const { email } = route.params; 
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code completely.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/verify`, {
        email: email,
        code: code
      });

      Alert.alert("Successful", "Your account has been verified! You can log in.", [
        { text: "Okey", onPress: () => navigation.navigate('Login') }
      ]);

    } catch (error) {
      const msg = error.response?.data?.error || "Verification failed.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="mail-open-outline" size={80} color="#FF6F61" style={styles.icon} />
      
      <Text style={styles.title}>Verify Account</Text>
      <Text style={styles.subtitle}>
        Please <Text style={{fontWeight:'bold'}}>{email}</Text> Enter the 6-digit code sent to your email address.
      </Text>

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
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={{marginTop: 20}}>
        <Text style={styles.linkText}>Go back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  icon: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  input: {
    width: '80%', height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    fontSize: 24, letterSpacing: 5, backgroundColor: '#f9f9f9', marginBottom: 20
  },
  button: {
    backgroundColor: '#FF6F61', width: '80%', height: 50, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkText: { color: '#FF6F61', fontSize: 14 }
});