import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,  
  Platform,        
  TouchableWithoutFeedback, 
  Keyboard,          
  ScrollView            
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons'; 

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function VerificationScreen({ route, navigation }) {
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
      await axios.post(`${API_URL}/api/auth/verify`, { email, code });
      
      Alert.alert("Success", "Your account has been verified! You can log in.", [
        { text: "Log In", onPress: () => navigation.navigate('Login') }
      ]);

    } catch (error) {
      console.log("Validation error:", error.response ? error.response.data : error.message);
      const msg = error.response?.data?.error || "The code could not be verified.";
      Alert.alert("Error", msg);
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

          <Text style={styles.title}>Verification Code</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to {email}.
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
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
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
    marginBottom: 20, 
    fontSize: 24, 
    letterSpacing: 8, 
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