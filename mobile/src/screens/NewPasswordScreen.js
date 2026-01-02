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
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function NewPasswordScreen({ route, navigation }) {
  // Data from the ResetVerification page
  const { email, code } = route.params; 
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  //Validates inputs
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "The passwords don't match.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "The password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      // Send new password to backend
      await axios.post(`${API_URL}/api/auth/reset-password`, { 
        email, 
        code, 
        newPassword 
      });
      
      Alert.alert("Successful", "Your password has been successfully updated! You can log in now.", [
        { text: "Sign In", onPress: () => navigation.navigate('Login') }
      ]);

    } catch (error) {
      console.log("Reset Password Error:", error.response ? error.response.data : error.message);
      const msg = error.response?.data?.error || "The password could not be reset.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    //  Keyboard Management
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Dismiss Keyboard */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        
        {/* Scroll Feature */}
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Icon: Password Reset */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lock-reset" size={80} color="#333" />
          </View>

          <Text style={styles.title}>New Password</Text>
          <Text style={styles.subtitle}>
            Set a new and strong password for your account.
          </Text>

          {/* New Password Input */}
          <TextInput
            style={styles.input}
            placeholder="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={true}
            placeholderTextColor="#999"
          />

          {/* Confirm Password Input */}
          <TextInput
            style={styles.input}
            placeholder="New Password (Again)"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={true} 
            placeholderTextColor="#999"
          />

          <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Password</Text>}
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
    marginBottom: 15, 
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  button: { 
    backgroundColor: '#333', 
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center',
    marginTop: 10 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  }
});