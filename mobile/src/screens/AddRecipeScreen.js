import React, { useState , useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function AddRecipeScreen({ navigation , route}) {
  // --- FORM STATE'LERİ ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [calories, setCalories] = useState('');
  const [serving, setServing] = useState('');
  
  // YENİ: Hata durumunu tutacak state
  const [errors, setErrors] = useState({});

  // FOTOĞRAF STATE'İ
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState('');

  // MALZEME STATE'LERİ
  const [query, setQuery] = useState(''); 
  const [searchResults, setSearchResults] = useState([]); 
  const [selectedIngredient, setSelectedIngredient] = useState(null); 
  const [qty, setQty] = useState(''); 
  
  // BİRİM SEÇİMİ
  const [selectedUnit, setSelectedUnit] = useState(''); 
  const [availableUnits, setAvailableUnits] = useState([]); 

  const [addedIngredients, setAddedIngredients] = useState([]); 
  const [loading, setLoading] = useState(false);

  //dolu from gelmesi
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (route.params?.recipeToEdit) {
      const recipe = route.params.recipeToEdit;
      setIsEditing(true);
      setEditingId(recipe.id);

      // Mevcut verileri doldur
      setTitle(recipe.title || '');
      setDescription(recipe.description || '');
      setInstructions(recipe.instructions || recipe.steps || ''); 
      setPrepTime(recipe.prep_time ? String(recipe.prep_time) : '');
      setCalories(recipe.calories ? String(recipe.calories) : '');
      setServing(recipe.serving ? String(recipe.serving) : '');
      
      // Resim varsa göster
      if (recipe.image_url) {
        setImageUri(recipe.image_url);
      }

      // Malzemeleri yükle
      if (recipe.ingredients) {
        let parsedIngredients = [];
        if (typeof recipe.ingredients === 'string') {
            try {
                parsedIngredients = JSON.parse(recipe.ingredients);
            } catch (e) {
                console.log("Ingredients parse error:", e);
            }
        } else if (Array.isArray(recipe.ingredients)) {
            parsedIngredients = recipe.ingredients;
        }
        setAddedIngredients(parsedIngredients);
      }
    }
  }, [route.params]);

  // --- DOĞRULAMA (VALIDATION) FONKSİYONU ---
  const validateForm = () => {
    let newErrors = {};
    let isValid = true;

    // 1. Başlık Kontrolü
    if (!title.trim()) {
      newErrors.title = true;
      isValid = false;
    }

    // 2. Kişi Sayısı Kontrolü
    if (!serving.toString().trim()) {
      newErrors.serving = true;
      isValid = false;
    }

    // 3. Yapılış (Instructions) Kontrolü
    if (!instructions.trim()) {
      newErrors.instructions = true;
      isValid = false;
    }

    // 4. Malzeme Kontrolü (Listenin boş olup olmadığı)
    if (addedIngredients.length === 0) {
      newErrors.ingredients = true;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // --- FOTOĞRAF SEÇME ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'You must grant gallery permission to select photos.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  // --- MALZEME ARAMA ---
  const searchIngredients = async (text) => {
    setQuery(text);
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ingredients/search2?query=${text}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.log("Search error", error);
    }
  };

  // --- BİRİM SEÇENEKLERİ ---
  const getUnitOptions = (defaultUnit) => {
    const liquidUnits = ['ml', 'L'];
    const solidUnits = ['gr', 'kg'];
    const countUnits = ['qty'];

    const unit = defaultUnit ? defaultUnit.toLowerCase() : '';

    if (['ml', 'l', 'lt'].includes(unit)) return liquidUnits;
    if (['gr', 'g', 'kg' , 'gram'].includes(unit)) return solidUnits;
    if (['qty', 'adet', 'count'].includes(unit)) return countUnits;
    
    return [defaultUnit || 'birim'];
  };

  // --- MALZEME SEÇME ---
  const handleSelectIngredient = (item) => {
    setSelectedIngredient(item);
    
    // Birimleri ayarla ve varsayılanı seç
    const options = getUnitOptions(item.unit);
    setAvailableUnits(options);
    setSelectedUnit(options[0]); 

    setQuery(''); 
    setSearchResults([]); 
  };

  // --- MALZEME EKLEME ---
  const addIngredientToList = () => {
    if (!selectedIngredient || !qty || !selectedUnit) {
      Alert.alert("Incomplete Information“, ”Please enter the quantity and unit.");
      return;
    }

    const newIng = {
      id: selectedIngredient.id,
      name: selectedIngredient.name,
      quantity: parseFloat(qty),
      unit: selectedUnit
    };

    setAddedIngredients([...addedIngredients, newIng]);
    
    // Hata varsa temizle (kullanıcı malzeme ekledi çünkü)
    if (errors.ingredients) {
      setErrors(prev => ({ ...prev, ingredients: false }));
    }

    // Resetle
    setSelectedIngredient(null);
    setQty('');
    setSelectedUnit('');
    setAvailableUnits([]);
  };

  const removeIngredient = (index) => {
    const newList = [...addedIngredients];
    newList.splice(index, 1);
    setAddedIngredients(newList);
  };

const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Incomplete Information“, ”Please fill in the required fields.");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      const payload = {
        title,
        description,
        instructions, 
        prepTime: parseInt(prepTime) || 0,
        calories: parseInt(calories) || 0,
        serving: parseInt(serving) || 1,
        // Yeni resim seçilmediyse ve düzenleme modundaysak null gönder (backend eskiyi korur)
        imageUrl: imageBase64 ? imageBase64 : (isEditing ? null : ''), 
        ingredients: addedIngredients
      };

      let url = `${API_URL}/api/recipes`;
      let method = 'POST';
      let successMessage = "Your recipe has been submitted! It will be published after admin approval.";

      if (isEditing) {
        url = `${API_URL}/api/recipes/${editingId}`; 
        method = 'PUT'; 
        successMessage = "Your recipe has been successfully updated and resubmitted for approval.";
      }

      await axios({
        method: method,
        url: url,
        data: payload,
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert("Successful", successMessage, [
        { text: "Okay", onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "The operation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{flex:1}}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        <Text style={styles.headerTitle}>{isEditing ? "Edit Recipe" : "Share New Recipe"}</Text>
        <Text style={styles.subTitle}>Your recipe will be subject to admin approval.</Text>

        {/* --- TEMEL BİLGİLER --- */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Recipe Name <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput 
            style={[styles.input, errors.title && styles.inputError]} 
            value={title} 
            onChangeText={(text) => {
              setTitle(text);
              if(errors.title) setErrors({...errors, title: false});
            }} 
            placeholder="Example: Stuffed eggplant" 
          />
          
          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={styles.input} 
            value={description} 
            onChangeText={setDescription} 
            placeholder="Brief summary..." 
          />

          {/* FOTOĞRAF */}
          <Text style={styles.label}>Recipe Photo</Text>
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={40} color="#666" />
                <Text style={{color:'#666', marginTop:5}}>Select from Gallery</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.row}>
             <View style={{flex:1, marginRight:5}}>
                <Text style={styles.label}>Time (min)</Text>
                <TextInput style={styles.input} value={prepTime} onChangeText={setPrepTime} keyboardType="numeric" />
             </View>
             <View style={{flex:1, marginHorizontal:5}}>
                <Text style={styles.label}>Calorie</Text>
                <TextInput style={styles.input} value={calories} onChangeText={setCalories} keyboardType="numeric" />
             </View>
             <View style={{flex:1, marginLeft:5}}>
                <Text style={styles.label}>
                  Serving <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput 
                  style={[styles.input, errors.serving && styles.inputError]} 
                  value={serving} 
                  onChangeText={(text) => {
                    setServing(text);
                    if(errors.serving) setErrors({...errors, serving: false});
                  }} 
                  keyboardType="numeric" 
                />
             </View>
          </View>
        </View>

        {/* --- MALZEMELER --- */}
        <View style={[styles.section, { zIndex: 1000 }]}> 
          <Text style={styles.sectionHeader}>
            Ingredients <Text style={styles.requiredStar}>*</Text>
          </Text>

          {!selectedIngredient ? (
            <View style={{ position: 'relative', zIndex: 2000 }}>
              <TextInput 
                style={[styles.input, {borderColor: '#2196F3'}]} 
                value={query} 
                onChangeText={searchIngredients} 
                placeholder="Search ingredients... (e.g.: Milk)" 
              />
              
              {/* DROPDOWN */}
              {searchResults.length > 0 && (
                <View style={styles.searchResultsContainer}>
                  <ScrollView nestedScrollEnabled={true} style={{maxHeight: 150}}>
                    {searchResults.map((item) => (
                      <TouchableOpacity 
                        key={item.id}
                        style={styles.searchResultItem}
                        onPress={() => handleSelectIngredient(item)}
                      >
                        <Text style={{fontWeight:'bold'}}>{item.name}</Text>
                        <Text style={{color:'#999', fontSize:10}}>Default: {item.unit}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          ) : (
            // --- SEÇİM EKRANI (BİRİMLİ) ---
            <View style={styles.selectedIngBox}>
              <View style={styles.rowBetween}>
                <Text style={{fontWeight:'bold', fontSize:18, color: '#333'}}>{selectedIngredient.name}</Text>
                <TouchableOpacity onPress={() => setSelectedIngredient(null)}>
                   <Ionicons name="close-circle" size={26} color="#FF3B30" />
                </TouchableOpacity>
              </View>
              
              <View style={{ marginTop: 15 }}>
                <Text style={styles.label}>Amount</Text>
                <TextInput 
                  style={[styles.input, {backgroundColor: 'white'}]} 
                  value={qty} 
                  onChangeText={setQty} 
                  keyboardType="numeric" 
                  placeholder="0" 
                />
              </View>

              {/* BİRİM SEÇİMİ */}
              <Text style={styles.label}>Unit</Text>
              <View style={styles.unitContainer}>
                {availableUnits.map((u, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[
                      styles.unitChip, 
                      selectedUnit === u && styles.unitChipSelected
                    ]}
                    onPress={() => setSelectedUnit(u)}
                  >
                    <Text style={[
                      styles.unitText, 
                      selectedUnit === u && styles.unitTextSelected
                    ]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity style={styles.addBtn} onPress={addIngredientToList}>
                <Text style={{color:'white', fontWeight:'bold'}}>Add to List</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* EKLENENLER LİSTESİ */}
          {addedIngredients.length > 0 ? (
            <View style={styles.addedList}>
              {addedIngredients.map((ing, index) => (
                <View key={index} style={styles.addedItem}>
                  <Text style={{flex:1, fontSize:15}}>• {ing.quantity} {ing.unit} {ing.name}</Text>
                  <TouchableOpacity onPress={() => removeIngredient(index)}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            // Malzeme listesi boşsa ve hata varsa uyarı göster
            errors.ingredients && (
              <Text style={styles.errorText}>Please add at least one ingredient.</Text>
            )
          )}
        </View>

        {/* --- YAPILIŞ --- */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Preparation <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput 
            style={[
              styles.input, 
              {height: 100, textAlignVertical: 'top'},
              errors.instructions && styles.inputError
            ]} 
            value={instructions} 
            onChangeText={(text) => {
              setInstructions(text);
              if(errors.instructions) setErrors({...errors, instructions: false});
            }} 
            multiline 
            placeholder="Step-by-step instructions..." 
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.submitBtnText}>
                {isEditing ? "Update and Send" : "Share the Recipe"}
            </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5', paddingBottom: 50 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subTitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  
  section: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 14 },
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },

  // YENİ STİLLER (VALIDATION)
  requiredStar: {
    color: '#e74c3c',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 1.5,
    backgroundColor: '#fff5f5'
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600'
  },

  // IMAGE PICKER
  imagePickerBtn: { 
    height: 150, backgroundColor: '#f9f9f9', borderRadius: 8, 
    borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginBottom: 15, overflow: 'hidden'
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },

  // SEARCH DROPDOWN (ABSOLUTE)
  searchResultsContainer: { 
    position: 'absolute', top: 50, left: 0, right: 0,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, 
    zIndex: 9999, elevation: 5 
  },
  searchResultItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },

  // UNIT CHIPS
  selectedIngBox: { backgroundColor: '#E3F2FD', padding: 15, borderRadius: 8 },
  unitContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  unitChip: { 
    paddingHorizontal: 12, paddingVertical: 6, 
    backgroundColor: 'white', borderRadius: 20, 
    borderWidth: 1, borderColor: '#2196F3' 
  },
  unitChipSelected: { backgroundColor: '#2196F3' },
  unitText: { color: '#2196F3', fontSize: 12, fontWeight: 'bold' },
  unitTextSelected: { color: 'white' },

  addBtn: { backgroundColor: '#2196F3', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  addedList: { marginTop: 15 },
  addedItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  
  submitBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});