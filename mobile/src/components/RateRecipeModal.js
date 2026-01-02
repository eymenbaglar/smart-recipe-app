import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RateRecipeModal({ visible, onClose, onSubmit, initialData }) {
  

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  //form synchronization
  //handles distinction between creating a new review and editing an existing one
  useEffect(() => {
    if (visible) {
      setRating(initialData?.rating || 0);
      setComment(initialData?.comment || '');
    }
  }, [visible, initialData]);

  //submitting the modal informations
  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    await onSubmit(rating, comment);
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      {/* Push the Screen Up When the Keyboard Opens */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Close the keyboard by clicking on the space */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            
            <View style={styles.modalContent}>
              {/* If the content overflows, scroll */}
              <ScrollView 
                contentContainerStyle={{ alignItems: 'center' }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                
                <Text style={styles.title}>Rate this Recipe</Text>
                <Text style={styles.subtitle}>How was your meal?</Text>

                {/* Ratings */}
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                      <Ionicons 
                        name={star <= rating ? "star" : "star-outline"} 
                        size={32} 
                        color="#FFD700" 
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Comment Space */}
                <TextInput
                  style={styles.input}
                  placeholder="Write a comment (optional)..."
                  multiline
                  value={comment}
                  onChangeText={setComment}
                  returnKeyType="done" 
                  blurOnSubmit={true}
                />

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelText}>Not Now</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.submitButton, rating === 0 && styles.disabledButton]} 
                    onPress={handleSubmit}
                    disabled={rating === 0 || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitText}>Submit Review</Text>
                    )}
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </View>
            
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    width: '85%', 
    maxHeight: '80%',
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  starsContainer: { flexDirection: 'row', gap: 10, marginBottom: 20, justifyContent: 'center' },
  input: { 
    width: '100%', minWidth: 250, height: 100, 
    borderColor: '#ddd', borderWidth: 1, borderRadius: 10, 
    padding: 10, textAlignVertical: 'top', marginBottom: 20, backgroundColor: '#FAFAFA' 
  },
  buttonContainer: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 10 },
  cancelButton: { flex: 1, padding: 15, alignItems: 'center' },
  cancelText: { color: '#666', fontWeight: 'bold' },
  submitButton: { flex: 1, backgroundColor: '#000', borderRadius: 10, padding: 15, alignItems: 'center' },
  disabledButton: { backgroundColor: '#ccc' },
  submitText: { color: '#fff', fontWeight: 'bold' }
});