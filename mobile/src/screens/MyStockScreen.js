import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import React, { useState } from 'react';
import { 
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, 
  Alert, Keyboard, ActivityIndicator, ScrollView , Modal , KeyboardAvoidingView, Platform, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

const UNIT_TYPES = {
  weight: [
    { label: 'Gram (g)', value: 'gram', factor: 1 },       
    { label: 'Kilogram (kg)', value: 'kg', factor: 1000 }  
  ],
  volume: [
    { label: 'Mililitre (ml)', value: 'ml', factor: 1 },   
    { label: 'Litre (lt)', value: 'lt', factor: 1000 }     
  ],
  count: [
    { label: 'Adet', value: 'qty', factor: 1 }             
  ]
};

export default function MyStockScreen() {
  // Arama & Liste State'leri
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [myStock, setMyStock] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);

  // Form State'leri
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null); 
  
  // düzenleme modu
  const [editingItem, setEditingItem] = useState(null);

  // Öneri Modalı için yeni state'ler
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');

  useFocusEffect(
  useCallback(() => {
    fetchMyStock();
  }, [])
  );

  const fetchMyStock = async () => {
    setLoadingStock(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/refrigerator`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyStock(response.data);
    } catch (error) {
      console.error('Stock Loading Error', error);
    } finally {
      setLoadingStock(false);
    }
  };

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
      console.log('Search Error', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectIngredient = (item) => {
    setSelectedIngredient(item);
    setQuery(item.name);
    setSearchResults([]);
    Keyboard.dismiss();
    
    const defaultUnitList = UNIT_TYPES[item.unit_category] || UNIT_TYPES.count;
    setSelectedUnit(defaultUnitList[0]);
  };
  
  //malzeme önerisi
  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) {
      Alert.alert("Warning", "Please enter a ingredient name.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/api/ingredients/suggest`, 
        { name: suggestionText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuggestionModalVisible(false);
      setSuggestionText('');
      Alert.alert("Thank you", "Your suggestion has been successfully submitted! It will be added to the list after admin approval.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred while sending the suggestion.");
    }
  };

  // düzenleme modu
  const handleEditItem = (item) => {
    const ingredientData = {
      id: item.id, // refrigerator_item id'si
      name: item.name,
      unit_category: item.unit_category
    };

    setSelectedIngredient(ingredientData);
    setEditingItem(item); 
    setQuery(item.name); 

    const qty = parseFloat(item.quantity);
    let defaultUnit;
    let displayQty;

    const unitList = UNIT_TYPES[item.unit_category] || UNIT_TYPES.count;

    if (item.unit_category === 'weight' && qty >= 1000) {
      defaultUnit = unitList.find(u => u.value === 'kg');
      displayQty = (qty / 1000).toString();
    } else if (item.unit_category === 'volume' && qty >= 1000) {
      defaultUnit = unitList.find(u => u.value === 'lt');
      displayQty = (qty / 1000).toString();
    } else {
      defaultUnit = unitList[0];
      displayQty = qty.toString();
    }

    setSelectedUnit(defaultUnit);
    setQuantity(displayQty);
  };

  // kaydet fonksiyonu
  const handleSaveStock = async () => {
    if (!selectedIngredient || !quantity || !selectedUnit) {
      Alert.alert('Error', 'Please enter amount.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const baseQuantity = parseFloat(quantity) * selectedUnit.factor;

      if (editingItem) {
        //güncelleme
        await axios.patch(
          `${API_URL}/api/refrigerator/update/${editingItem.id}`,
          { quantity: baseQuantity },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        Alert.alert('Updated', 'Ingredient amount updated.');
      } else {
        //yeni ekleme
        await axios.post(
          `${API_URL}/api/refrigerator/add`,
          {
            ingredientId: selectedIngredient.id,
            quantity: baseQuantity
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        Alert.alert('Successfull', 'Added to your Stock.');
      }
      
      resetForm();
      fetchMyStock();
      
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'The operation failed.');
    }
  };

  const handleDeleteItem = (itemId) => {
    Alert.alert(
      "Delete", "Do you want to take this product out of the refrigerator?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`${API_URL}/api/refrigerator/delete/${itemId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              fetchMyStock();
            } catch (error) { Alert.alert("Error", "Could not be deleted."); }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setQuery('');
    setQuantity('');
    setSelectedIngredient(null);
    setEditingItem(null);
  };

  const formatQuantity = (qty, unitCategory) => {
    const num = parseFloat(qty);
    if (unitCategory === 'weight') {
      if (num >= 1000) return `${(num / 1000).toFixed(1)} kg`;
      return `${num} g`;
    }
    if (unitCategory === 'volume') {
      if (num >= 1000) return `${(num / 1000).toFixed(1)} lt`;
      return `${num} ml`;
    }
    return `${num} Adet`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Stock</Text>
        <TouchableOpacity 
          style={styles.suggestButton} 
          onPress={() => setSuggestionModalVisible(true)}
        >
          <Text style={styles.suggestButtonText}>+ Suggest Us</Text>
        </TouchableOpacity>
      </View>

      {/* ARAMA KUTUSU */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for ingredient..."
          value={query}
          onChangeText={searchIngredients}
          editable={!editingItem}
        />
        {isSearching && <ActivityIndicator size="small" color="#000" />}
      </View>

      {/* arama sonuçları */}
      {searchResults.length > 0 && !selectedIngredient && (
        <View style={styles.resultsList}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.resultItem} 
                onPress={() => handleSelectIngredient(item)}
              >
                <Text style={styles.resultText}>{item.name}</Text>
                <Text style={styles.resultCategory}>{item.unit_category}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* detay kartı */}
      {selectedIngredient && (
        <View style={styles.detailCard}>
          <Text style={styles.selectedTitle}>
            {editingItem ? 'Edit Amount' : selectedIngredient.name}
          </Text>
          
          {editingItem && (
             <Text style={{textAlign:'center', marginBottom:10, color:'#666'}}>
               {selectedIngredient.name}
             </Text>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
            <View style={styles.unitContainer}>
              {(UNIT_TYPES[selectedIngredient.unit_category] || UNIT_TYPES.count).map((u) => (
                <TouchableOpacity
                  key={u.value}
                  style={[
                    styles.unitButton,
                    selectedUnit?.value === u.value && styles.unitButtonActive
                  ]}
                  onPress={() => setSelectedUnit(u)}
                >
                  <Text style={[
                    styles.unitText,
                    selectedUnit?.value === u.value && styles.unitTextActive
                  ]}>{u.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.addButton, editingItem && styles.updateButton]} 
            onPress={handleSaveStock}
          >
            <Text style={styles.addButtonText}>
              {editingItem ? 'Update' : 'Add to Stock'}
            </Text>
            <Ionicons 
              name={editingItem ? "checkmark-circle-outline" : "add-circle-outline"} 
              size={24} color="white" style={{marginLeft: 5}}
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* liste başlığı */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Your Stock</Text>
        <Text style={styles.listCount}>{myStock.length} Ingredient</Text>
      </View>

      {/* STOK LİSTESİ */}
      {loadingStock ? (
        <ActivityIndicator style={{marginTop: 20}} size="large" color="#4CAF50" />
      ) : (
        <FlatList
          data={myStock}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.stockItem}>
              <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                <View style={styles.stockIconContainer}>
                  <Ionicons 
                    name={item.unit_category === 'weight' ? 'restaurant-outline' : item.unit_category === 'volume' ? 'water-outline' : 'ellipse-outline'} 
                    size={24} color="#4CAF50" 
                  />
                </View>
                <View style={styles.stockInfo}>
                  <Text style={styles.stockName}>{item.name}</Text>
                  <Text style={styles.stockDate}>{formatQuantity(item.quantity, item.unit_category)}</Text>
                </View>
              </View>

              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {/* düzenle */}
                <TouchableOpacity 
                  onPress={() => handleEditItem(item)}
                  style={{marginRight: 10, padding: 5}}
                >
                  <Ionicons name="pencil-outline" size={22} color="#4CAF50" />
                </TouchableOpacity>

                {/* sil */}
                <TouchableOpacity 
                  onPress={() => handleDeleteItem(item.id)}
                  style={{padding: 5}}
                >
                  <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Your stock is still empty</Text>
            </View>
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={suggestionModalVisible}
        onRequestClose={() => setSuggestionModalVisible(false)}
      >
        {/* EN DIŞ KATMAN: KeyboardAvoidingView (Ekranın tamamını kaplar) */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          
          {/* Klavye kapatma alanı */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            
            {/* GRİ ARKA PLAN (Overlay) */}
            <View style={styles.modalOverlay}>
              
              {/* MODAL İÇERİĞİ */}
              {/* Tıklamaların arka plana (klavye kapamaya) gitmemesi için */}
              <TouchableWithoutFeedback> 
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Ingredient Suggestion</Text>
                  <Text style={styles.modalMessage}>
                    Is the ingredient you want not in our app?{"\n"}
                    Make a suggestion, and we'll add it.
                  </Text>
                  
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ingredient Name (e.g., Avocado)"
                    value={suggestionText}
                    onChangeText={setSuggestionText}
                    autoFocus={true} 
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={[styles.modalBtn, styles.cancelBtn]} 
                      onPress={() => setSuggestionModalVisible(false)}
                    >
                      <Text style={styles.btnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.modalBtn, styles.sendBtn]} 
                      onPress={handleSendSuggestion}
                    >
                      <Text style={styles.btnText}>Submit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>

            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 10, color: '#333' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#eee', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  resultsList: { position: 'absolute', top: 130, left: 20, right: 20, backgroundColor: 'white', borderRadius: 10, elevation: 10, zIndex: 999, maxHeight: 200, borderWidth: 1, borderColor: '#eee' },
  resultItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between' },
  resultText: { fontSize: 16, color: '#333' },
  resultCategory: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  detailCard: { marginTop: 20, backgroundColor: 'white', padding: 20, borderRadius: 15, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, marginBottom: 20 },
  selectedTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333', textAlign: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  amountInput: { width: 90, height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, textAlign: 'center', fontSize: 18, marginRight: 15, backgroundColor: '#fafafa' },
  unitContainer: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' },
  unitButtonActive: { backgroundColor: '#333', borderColor: '#333' },
  unitText: { color: '#333', fontSize: 13 },
  unitTextActive: { color: 'white', fontWeight: 'bold' },
  addButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  updateButton: { backgroundColor: '#2196F3' }, 
  addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { marginTop: 15, alignItems: 'center' },
  cancelText: { color: '#FF6B6B', fontSize: 14 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  listCount: { color: '#888', fontSize: 14 },
  stockItem: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  stockIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  stockInfo: { flex: 1 },
  stockName: { fontSize: 16, fontWeight: '600', color: '#333' },
  stockDate: { fontSize: 12, color: '#aaa', marginTop: 2 },
  stockAmountBadge: { backgroundColor: '#f0f0f0', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  stockAmountText: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10, color: '#aaa', fontSize: 16 },
  // Header Alanı
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',        // Yan yana diz
    justifyContent: 'space-between', // Biri sağa biri sola yaslansın
    alignItems: 'center',        // Dikey olarak ortala
    marginBottom: 20,            // Altındaki arama çubuğu ile arasına boşluk koy
    width: '100%',
  },
  suggestButton: {
    backgroundColor: '#333', // Tema rengin
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,

  },
  suggestButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#999',
  },
  sendBtn: {
    backgroundColor: '#4CAF50', // Yeşil onay rengi
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});