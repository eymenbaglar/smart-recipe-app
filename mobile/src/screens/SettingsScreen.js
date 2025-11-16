import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  //Mevcut kullanıcıyı getir
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setUsername(parsedUser.username);
          setEmail(parsedUser.email);
        }
      } catch (e) {
        Alert.alert('Error', 'User data could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  //kaydet butonu
  const handleSave = async () => {
    if (!username || !email) {
      Alert.alert('Error', 'All fields must be filled in.');
      return;
    }

    setSaving(true);
    try {
      //token'ı hafızadan getir
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No entry found. Please log in again.');
        return;
      }

      //backend'e güncelleme isteği gönderme
      const response = await axios.patch(
        `${API_URL}/api/profile`, 
        {
          username: username,
          email: email,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      //hafızadaki user'ı güncelle
      const updatedUser = response.data.user;
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      Alert.alert('Success', 'Your Profile Updated.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.error('Update Error:', error.response?.data?.error || error.message);
      Alert.alert('Error', error.response?.data?.error || 'Update has been failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>UserName</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <Text style={styles.label}>E-mail</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleSave} 
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider} />
      <TouchableOpacity 
        style={styles.linkButton} 
        onPress={() => navigation.navigate('ChangePassword')}
      >
        <Text style={styles.linkButtonText}>Change Password</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#000',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    width: '100%',
    marginVertical: 30,
  },
  linkButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#f0f0f0', 
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

