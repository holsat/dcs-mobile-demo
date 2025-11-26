import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERENCES_KEY = 'dcs:preferences';

export type Preferences = {
  altarServerAnnotationsEnabled: boolean;
  notesEnabled: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  altarServerAnnotationsEnabled: true,
  notesEnabled: true,
};

type PreferencesContextValue = {
  preferences: Preferences;
  updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => Promise<void>;
  resetPreferences: () => Promise<void>;
  loading: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Preferences;
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: Preferences) => {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw error;
    }
  };

  const updatePreference = useCallback(async <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  }, [preferences]);

  const resetPreferences = useCallback(async () => {
    setPreferences(DEFAULT_PREFERENCES);
    await savePreferences(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo<PreferencesContextValue>(() => ({
    preferences,
    updatePreference,
    resetPreferences,
    loading,
  }), [preferences, updatePreference, resetPreferences, loading]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
