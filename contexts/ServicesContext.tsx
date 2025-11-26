import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';

import { DcsService, DcsServiceResource, fetchServiceDates, fetchServicesForDate } from '@/lib/dcs';
import { ServicesOverlay } from '@/components/ServicesOverlay';

type SelectedResource = {
  url: string;
  label: string;
  language: string;
  serviceTitle: string;
  date: string;
};

type ServicesContextValue = {
  isOverlayOpen: boolean;
  openOverlay: () => void;
  closeOverlay: () => void;
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
  availableDates: Set<string>;
  ensureYearLoaded: (year: number) => Promise<void>;
  loadingDates: boolean;
  selectedDate?: string;
  selectDate: (isoDate: string) => Promise<void>;
  services: DcsService[];
  loadingServices: boolean;
  selectedResource?: SelectedResource;
  selectResource: (service: DcsService, resource: DcsServiceResource) => void;
  clearSelectedResource: () => void;
};

const ServicesContext = createContext<ServicesContextValue | undefined>(undefined);

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [availableDatesByYear, setAvailableDatesByYear] = useState<Map<number, Set<string>>>(new Map());
  const [loadingDates, setLoadingDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [services, setServices] = useState<DcsService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedResource, setSelectedResource] = useState<SelectedResource | undefined>();

  const openOverlay = useCallback(() => {
    const now = new Date();
    setCurrentMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    setIsOverlayOpen(true);
  }, []);

  const closeOverlay = useCallback(() => {
    setIsOverlayOpen(false);
  }, []);

  const ensureYearLoaded = useCallback(async (year: number) => {
    if (availableDatesByYear.has(year)) return;
    setLoadingDates(true);
    try {
      const dates = await fetchServiceDates(year);
      setAvailableDatesByYear((prev) => new Map(prev).set(year, dates));
    } catch (error) {
      console.error('Failed to load service dates', error);
      Alert.alert('Unable to load services index', 'Please check your connection and try again.');
    } finally {
      setLoadingDates(false);
    }
  }, [availableDatesByYear]);

  const selectDate = useCallback(async (isoDate: string) => {
    setSelectedDate(isoDate);
    setServices([]);
    setLoadingServices(true);
    try {
      const data = await fetchServicesForDate(isoDate);
      setServices(data);
    } catch (error) {
      console.error('Failed to load services for date', error);
      Alert.alert('Unable to load services', 'Please try a different date or check your connection.');
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  const selectResource = useCallback((service: DcsService, resource: DcsServiceResource) => {
    setSelectedResource({
      url: resource.url,
      label: resource.label,
      language: resource.language,
      serviceTitle: service.title,
      date: selectedDate ?? '',
    });
    setIsOverlayOpen(false);
    
    // Force navigation to home tab when a service is selected
    // This fixes the issue where selecting a service would navigate to Settings tab
    try {
      // Use setTimeout to let overlay close animation finish first
      setTimeout(() => {
        router.push('/(tabs)');
      }, 100);
    } catch (error) {
      console.log('Navigation to home tab failed:', error);
    }
  }, [selectedDate]);

  const clearSelectedResource = useCallback(() => {
    setSelectedResource(undefined);
  }, []);

  const availableDates = useMemo(() => {
    const year = Number(currentMonth.slice(0, 4));
    return availableDatesByYear.get(year) ?? new Set<string>();
  }, [availableDatesByYear, currentMonth]);

  const value = useMemo<ServicesContextValue>(() => ({
    isOverlayOpen,
    openOverlay,
    closeOverlay,
    currentMonth,
    setCurrentMonth,
    availableDates,
    ensureYearLoaded,
    loadingDates,
    selectedDate,
    selectDate,
    services,
    loadingServices,
    selectedResource,
    selectResource,
    clearSelectedResource,
  }), [
    isOverlayOpen,
    openOverlay,
    closeOverlay,
    currentMonth,
    availableDates,
    ensureYearLoaded,
    loadingDates,
    selectedDate,
    selectDate,
    services,
    loadingServices,
    selectedResource,
    selectResource,
    clearSelectedResource,
  ]);

  return (
    <ServicesContext.Provider value={value}>
      {children}
      <ServicesOverlay />
    </ServicesContext.Provider>
  );
}

export function useServices() {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
}