import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type NoteViewerProps = {
  visible: boolean;
  noteText: string;
  onClose: () => void;
  onUpdate: (newText: string) => void;
  onDelete: () => void;
};

export function NoteViewer({
  visible,
  noteText,
  onClose,
  onUpdate,
  onDelete,
}: NoteViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(noteText);

  const handleSave = () => {
    if (editedText.trim()) {
      onUpdate(editedText.trim());
      setIsEditing(false);
      onClose();
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete();
            onClose();
          },
        },
      ]
    );
  };

  const handleClose = () => {
    setIsEditing(false);
    setEditedText(noteText);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Text style={styles.title}>📝 Note</Text>
                {!isEditing && (
                  <Pressable onPress={() => setIsEditing(true)}>
                    <Text style={styles.editButton}>Edit</Text>
                  </Pressable>
                )}
              </View>

              {isEditing ? (
                <>
                  <TextInput
                    style={styles.noteInput}
                    value={editedText}
                    onChangeText={setEditedText}
                    multiline
                    numberOfLines={6}
                    autoFocus
                    textAlignVertical="top"
                    placeholder="Enter your note here..."
                    placeholderTextColor="#94a3b8"
                  />

                  <View style={styles.buttonGroup}>
                    <Pressable
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => {
                        setIsEditing(false);
                        setEditedText(noteText);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.button, styles.saveButton]}
                      onPress={handleSave}
                      disabled={!editedText.trim()}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.noteContent}>
                    <Text style={styles.noteText}>{noteText}</Text>
                  </View>

                  <View style={styles.buttonGroup}>
                    <Pressable
                      style={[styles.button, styles.deleteButton]}
                      onPress={handleDelete}
                    >
                      <Text style={styles.deleteButtonText}>Delete Note</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.button, styles.closeButton]}
                      onPress={handleClose}
                    >
                      <Text style={styles.closeButtonText}>Close</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
  },
  noteContent: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    minHeight: 100,
  },
  noteText: {
    fontSize: 16,
    color: '#0f172a',
    lineHeight: 24,
  },
  noteInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    minHeight: 120,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    backgroundColor: '#1e40af',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  closeButton: {
    backgroundColor: '#1e40af',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
