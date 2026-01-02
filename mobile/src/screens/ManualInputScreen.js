import React, { useState } from 'react';
import { 
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function ManualInputScreen({ navigation }) {
  //State for search query and results
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // State for the list of ingredients selected by the user
  const [selectedIngredients, setSelectedIngredients] = useState([]);

  // Search function
  const searchIngredients = async (text) => {
    setQuery(text);
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ingredients/search`, {
        params: { query: text },
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setIsSearching(false);
    }
  };

  // select ingredients
  const handleSelect = (item) => {
    if (!selectedIngredients.find(i => i.id === item.id)) {
      setSelectedIngredients([...selectedIngredients, item]);
    }
    setQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  };

  // remove ingredient from selected list
  const handleRemove = (id) => {
    setSelectedIngredients(selectedIngredients.filter(item => item.id !== id));
  };

  // Navigates to the results screen
  const handleFindRecipes = () => {
    if (selectedIngredients.length === 0) {
      alert("Please choose at least one ingredient.");
      return;
    }
    
    const ids = selectedIngredients.map(i => i.id);
    
    navigation.navigate('SmartRecipeResults', { 
      type: 'manual',
      selectedIds: ids 
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Ingredient</Text>
      <Text style={styles.subtitle}>Add the ingredients you have on hand, and we'll find the recipes that suit you best.</Text>

      {/* SEARCH BOX SECTION */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={{marginRight: 10}} />
        <TextInput
          style={styles.input}
          placeholder="Search for ingredients (e.g., chicken, rice)..."
          value={query}
          onChangeText={searchIngredients}
        />
        {isSearching && <ActivityIndicator size="small" color="#000" />}
      </View>

      {/* SEARCH RESULTS */}
      {searchResults.length > 0 && (
        <View style={styles.resultsList}>
          <FlatList
            data={searchResults}
            keyExtractor={item => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
                <Text>{item.name}</Text>
                <Ionicons name="add-circle-outline" size={20} color="#4CAF50" />
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* SELECTED INGREDIENTS */}
      <View style={styles.chipsContainer}>
        {selectedIngredients.map((item) => (
          <View key={item.id} style={styles.chip}>
            <Text style={styles.chipText}>{item.name}</Text>
            <TouchableOpacity onPress={() => handleRemove(item.id)}>
              <Ionicons name="close-circle" size={18} color="#fff" style={{marginLeft: 5}} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/*  BUTTON */}
      <View style={{flex: 1, justifyContent: 'flex-end', marginBottom: 20}}>
        <TouchableOpacity 
          style={[styles.button, selectedIngredients.length === 0 && styles.buttonDisabled]} 
          onPress={handleFindRecipes}
          disabled={selectedIngredients.length === 0}
        >
          <Text style={styles.buttonText}>Find Recipes ({selectedIngredients.length})</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" style={{marginLeft: 10}} />
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 5, marginBottom: 20 },
  
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 15, height: 50,
    borderWidth: 1, borderColor: '#EEE'
  },
  input: { flex: 1, fontSize: 16 },
  
  resultsList: {
    maxHeight: 200, backgroundColor: '#fff', 
    borderWidth: 1, borderColor: '#eee', borderRadius: 10, marginTop: 5
  },
  resultItem: {
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    flexDirection: 'row', justifyContent: 'space-between'
  },

  chipsContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#333', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 15
  },
  chipText: { color: '#fff', fontWeight: '600' },

  button: {
    backgroundColor: '#000', height: 55, borderRadius: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 5, elevation: 5
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});