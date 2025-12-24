import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Pressable
} from 'react-native';
import axios from 'axios';
import Checkbox from 'expo-checkbox'; // TERMİNALDE: npx expo install expo-checkbox

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ToS State'leri
  const [isChecked, setChecked] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const handleRegister = async () => {
    // 1. Validasyonlar
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'The password must be at least 6 characters long.');
      return;
    }

    // 2. Kullanım Koşulları Onayı Kontrolü
    if (!isChecked) {
      Alert.alert("Terms Required", "Please read and accept the Terms of Service to continue.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        username,
        email,
        password
      });

      if (response.status === 201) {
        Alert.alert(
          "Registration Successful", 
          "A verification code has been sent to your email.",
          [
            { 
              text: 'OK',
              onPress: () => navigation.navigate('Verification', { email: email })
            }
          ]
        );
      } else {
        throw new Error('The expected response was not received from the server.');
      }

    } catch (error) {
      console.log("Registration error:", error.response ? error.response.data : error.message);
      
      if (error.response && error.response.data.error) {
         Alert.alert('Error', error.response.data.error);
      } else {
         Alert.alert('Error', 'Registration failed. Please try again.');
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.logo}>👨‍🍳</Text>
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>Welcome to Smart Recipe!</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />

          {/* --- Terms of Service Checkbox --- */}
          <View style={styles.checkboxContainer}>
            <Checkbox
              style={styles.checkbox}
              value={isChecked}
              onValueChange={setChecked}
              color={isChecked ? '#4CAF50' : undefined}
            />
            <View style={{flexDirection:'row', flexWrap:'wrap', marginLeft: 10}}>
              <Text style={styles.checkboxLabel}>I agree to the </Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text style={styles.tosLink}>Terms of Service</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* --------------------------------- */}

          <TouchableOpacity 
            style={[styles.button, (loading || !isChecked) && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Registering...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>Already have an account? Log In</Text>
          </TouchableOpacity>
        </View>

        {/* --- Terms of Service Modal --- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Terms of Service</Text>
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalText}>
                  <Text style={styles.boldText}>1. Introduction</Text>{'\n'}
                  Welcome to Smart Recipe App. By creating an account, you agree to these terms.{'\n\n'}

                  <Text style={styles.boldText}>2. User Accounts</Text>{'\n'}
                  You are responsible for maintaining the security of your account and password.{'\n\n'}

                  <Text style={styles.boldText}>3. Content Ownership</Text>{'\n'}
                  You retain the rights to the recipes and photos you upload. However, by posting content, you grant Smart Recipe App a license to display and share this content.{'\n\n'}

                  <Text style={styles.boldText}>4. Account Deletion & Recipe Retention</Text>{'\n'}
                  If you choose to delete your account, your personal data will be removed. However, any <Text style={styles.boldText}>verified recipes</Text> you have published will <Text style={styles.boldText}>NOT be deleted</Text>. They will remain on the platform to ensure continuity for other users. The authorship of these recipes will be transferred to an anonymized "Admin" account.{'\n\n'}

                  <Text style={styles.boldText}>5. Health Disclaimer</Text>{'\n'}
                  Nutritional information and recipes are for informational purposes only. We are not responsible for any allergic reactions or health issues arising from the use of these recipes.{'\n\n'}

                  <Text style={styles.boldText}>6. Prohibited Conduct</Text>{'\n'}
                  Harassment, spamming, or posting illegal content will result in immediate account termination.
                </Text>
              </ScrollView>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>I Understand</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  // Checkbox Stilleri
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5,
  },
  checkbox: {
    margin: 8,
    borderRadius: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#666',
  },
  tosLink: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },

  button: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#333',
    fontSize: 16,
  },

  // Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '70%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  modalScroll: {
    marginBottom: 15,
  },
  modalText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});