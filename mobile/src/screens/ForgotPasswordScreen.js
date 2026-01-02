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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; 

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  //Validates email input and sends a request to the backend to for reset code
  const handleSendCode = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      
      Alert.alert("Successful", "A verification code has been sent.", [
        { text: "Tamam", onPress: () => navigation.navigate('ResetVerification', { email: email }) }
      ]);

    } catch (error) {
      console.log("Forgot Password Error:", error.response ? error.response.data : error.message);
      const msg = error.response?.data?.error || "An error occured.";
      Alert.alert("Hata", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Keyboard Management
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        
        
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* Icon Section */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lock-question" size={80} color="#333" />
          </View>

          <Text style={styles.title}>I Forgot My Password</Text>
          <Text style={styles.subtitle}>
            Enter the email address associated with your account, and we'll send you a reset code.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="E-mail Adress"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Code</Text>}
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
    paddingTop: 40 
  },
  
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