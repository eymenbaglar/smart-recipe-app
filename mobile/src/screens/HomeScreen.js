import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      {/* Başlık Mesajı */}
      <Text style={styles.title}>Hello, User!</Text>
      <Text style={styles.subtitle}>What we gonna cook today?</Text>

      {/* Recipe Wizard Butonu */}
      <TouchableOpacity 
        style={styles.wizardButton}
        onPress={() => { /* Recipe Wizard'a git */ }}
      >
        <Text style={styles.wizardButtonText}>Recipe Wizard</Text>
      </TouchableOpacity>

      {/* Popüler Tarifler Alanı */}
      <Text style={styles.popularTitle}>Take a look to popular recipes!</Text>
      
      {/* Tarifler için Placeholder */}
      <View style={styles.recipePlaceholder}>
        <Text style={styles.placeholderText}>Popüler tarifler buraya gelecek</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 20,
  },
  wizardButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#000',
    alignItems: 'center',
    marginBottom: 30,
  },
  wizardButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  popularTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  recipePlaceholder: {
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'gray',
    fontSize: 16,
  },
});