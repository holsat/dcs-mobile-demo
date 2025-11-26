import React, { useState } from 'react';
import {
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

import { ICON_DEFINITIONS, NOTE_EMOJI, type IconType } from '@/types/annotations';
import { usePreferences } from '@/contexts/PreferencesContext';

type AnnotationSelectorProps = {
  visible: boolean;
  onClose: () => void;
  onSelectIcon: (iconType: IconType) => void;
  onCreateNote: (noteText: string) => void;
};

export function AnnotationSelector({
  visible,
  onClose,
  onSelectIcon,
  onCreateNote,
}: AnnotationSelectorProps) {
  const { preferences } = usePreferences();
  const iconsEnabled = preferences.altarServerAnnotationsEnabled;
  const notesEnabled = preferences.notesEnabled;
  
  // Determine initial mode based on what's enabled
  const getInitialMode = (): 'choose' | 'note' | 'icons' => {
    if (iconsEnabled && !notesEnabled) return 'icons';
    if (!iconsEnabled && notesEnabled) return 'note';
    return 'choose';
  };
  
  const [mode, setMode] = useState<'choose' | 'note' | 'icons'>(getInitialMode());
  const [noteText, setNoteText] = useState('');

  const handleClose = () => {
    setMode(getInitialMode());
    setNoteText('');
    onClose();
  };

  const handleSelectIcon = (iconType: IconType) => {
    onSelectIcon(iconType);
    handleClose();
  };

  const handleCreateNote = () => {
    if (noteText.trim()) {
      onCreateNote(noteText.trim());
      handleClose();
    }
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
          {mode === 'choose' && (
            <>
              <Text style={styles.title}>Add Annotation</Text>
              <Text style={styles.subtitle}>Choose annotation type</Text>
              
              <View style={styles.buttonGroup}>
                {iconsEnabled && (
                  <Pressable
                    style={styles.modeButton}
                    onPress={() => setMode('icons')}
                  >
                    <Text style={styles.modeButtonEmoji}>🔖</Text>
                    <Text style={styles.modeButtonLabel}>Action Icon</Text>
                    <Text style={styles.modeButtonDesc}>Mark liturgical actions</Text>
                  </Pressable>
                )}

                {notesEnabled && (
                  <Pressable
                    style={styles.modeButton}
                    onPress={() => setMode('note')}
                  >
                    <Text style={styles.modeButtonEmoji}>{NOTE_EMOJI}</Text>
                    <Text style={styles.modeButtonLabel}>Note</Text>
                    <Text style={styles.modeButtonDesc}>Add a text note</Text>
                  </Pressable>
                )}
              </View>

              <Pressable style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </>
          )}

          {mode === 'icons' && (
            <>
              <View style={styles.header}>
                {(iconsEnabled && notesEnabled) ? (
                  <Pressable onPress={() => setMode('choose')}>
                    <Text style={styles.backButton}>← Back</Text>
                  </Pressable>
                ) : (
                  <View style={{ width: 60 }} />
                )}
                <Text style={styles.title}>Select Action Icon</Text>
                <View style={{ width: 60 }} />
              </View>
              
              <ScrollView style={styles.scrollView}>
                {ICON_DEFINITIONS.map((icon) => (
                  <Pressable
                    key={icon.type}
                    style={styles.iconOption}
                    onPress={() => handleSelectIcon(icon.type)}
                  >
                    <Text style={styles.iconEmoji}>{icon.emoji}</Text>
                    <View style={styles.iconInfo}>
                      <Text style={styles.iconLabel}>{icon.label}</Text>
                      <Text style={styles.iconDescription}>{icon.description}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {mode === 'note' && (
            <>
              <View style={styles.header}>
                {(iconsEnabled && notesEnabled) ? (
                  <Pressable onPress={() => setMode('choose')}>
                    <Text style={styles.backButton}>← Back</Text>
                  </Pressable>
                ) : (
                  <View style={{ width: 60 }} />
                )}
                <Text style={styles.title}>Add Note</Text>
                <View style={{ width: 60 }} />
              </View>
              
              <TextInput
                style={styles.noteInput}
                placeholder="Enter your note here..."
                placeholderTextColor="#94a3b8"
                value={noteText}
                onChangeText={setNoteText}
                multiline
                numberOfLines={6}
                autoFocus
                textAlignVertical="top"
              />

              <Pressable
                style={[styles.saveButton, !noteText.trim() && styles.saveButtonDisabled]}
                onPress={handleCreateNote}
                disabled={!noteText.trim()}
              >
                <Text style={styles.saveButtonText}>Save Note</Text>
              </Pressable>
            </>
          )}
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
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    fontSize: 16,
    color: '#1e40af',
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  modeButtonEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  modeButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  modeButtonDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  scrollView: {
    maxHeight: 400,
  },
  iconOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  iconInfo: {
    flex: 1,
  },
  iconLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  iconDescription: {
    fontSize: 14,
    color: '#64748b',
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
  saveButton: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
