import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Annotation, AnnotationPosition, IconType } from '@/types/annotations';

const ANNOTATIONS_STORAGE_KEY = '@dcs_annotations';

type AnnotationsContextValue = {
  annotations: Annotation[];
  getAnnotationsForService: (serviceType: string) => Annotation[];
  addIconAnnotation: (serviceType: string, iconType: IconType, position: AnnotationPosition) => Promise<void>;
  addNoteAnnotation: (serviceType: string, noteText: string, position: AnnotationPosition) => Promise<void>;
  updateNoteAnnotation: (id: string, noteText: string) => Promise<void>;
  removeAnnotation: (id: string) => Promise<void>;
  isLoading: boolean;
};

const AnnotationsContext = createContext<AnnotationsContextValue | undefined>(undefined);

export function AnnotationsProvider({ children }: { children: React.ReactNode }) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load annotations from storage on mount
  useEffect(() => {
    loadAnnotations();
  }, []);

  const loadAnnotations = async () => {
    try {
      const stored = await AsyncStorage.getItem(ANNOTATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAnnotations(parsed);
      }
    } catch (error) {
      console.error('Failed to load annotations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnnotations = async (newAnnotations: Annotation[]) => {
    try {
      await AsyncStorage.setItem(ANNOTATIONS_STORAGE_KEY, JSON.stringify(newAnnotations));
      setAnnotations(newAnnotations);
    } catch (error) {
      console.error('Failed to save annotations:', error);
    }
  };

  const getAnnotationsForService = useCallback((serviceType: string) => {
    return annotations.filter(a => a.serviceType === serviceType);
  }, [annotations]);

  const addIconAnnotation = useCallback(async (
    serviceType: string,
    iconType: IconType,
    position: AnnotationPosition
  ) => {
    const newAnnotation: Annotation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'icon',
      iconType,
      position,
      serviceType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveAnnotations([...annotations, newAnnotation]);
  }, [annotations]);

  const addNoteAnnotation = useCallback(async (
    serviceType: string,
    noteText: string,
    position: AnnotationPosition
  ) => {
    const newAnnotation: Annotation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'note',
      noteText,
      position,
      serviceType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveAnnotations([...annotations, newAnnotation]);
  }, [annotations]);

  const updateNoteAnnotation = useCallback(async (id: string, noteText: string) => {
    const updated = annotations.map(a => 
      a.id === id ? { ...a, noteText, updatedAt: Date.now() } : a
    );
    await saveAnnotations(updated);
  }, [annotations]);

  const removeAnnotation = useCallback(async (id: string) => {
    const filtered = annotations.filter(a => a.id !== id);
    await saveAnnotations(filtered);
  }, [annotations]);

  const value = useMemo(() => ({
    annotations,
    getAnnotationsForService,
    addIconAnnotation,
    addNoteAnnotation,
    updateNoteAnnotation,
    removeAnnotation,
    isLoading,
  }), [
    annotations,
    getAnnotationsForService,
    addIconAnnotation,
    addNoteAnnotation,
    updateNoteAnnotation,
    removeAnnotation,
    isLoading,
  ]);

  return <AnnotationsContext.Provider value={value}>{children}</AnnotationsContext.Provider>;
}

export function useAnnotations() {
  const context = useContext(AnnotationsContext);
  if (!context) {
    throw new Error('useAnnotations must be used within an AnnotationsProvider');
  }
  return context;
}
