import React, { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

// Define DateObject type inline since it's not exported in some versions
type DateObject = {
  year: number;
  month: number;
  day: number;
  dateString: string;
  timestamp: number;
};

import { useServices } from '@/contexts/ServicesContext';

export function ServicesOverlay() {
  const {
    isOverlayOpen,
    closeOverlay,
    currentMonth,
    setCurrentMonth,
    ensureYearLoaded,
    availableDates,
    loadingDates,
    selectedDate,
    selectDate,
    services,
    loadingServices,
    selectResource,
  } = useServices();

  useEffect(() => {
    if (!isOverlayOpen) return;
    const [yearStr] = currentMonth.split('-');
    ensureYearLoaded(Number(yearStr)).catch(() => undefined);
  }, [currentMonth, ensureYearLoaded, isOverlayOpen]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    availableDates.forEach((date) => {
      marks[date] = {
        marked: true,
        dotColor: '#2563eb',
        disableTouchEvent: false,
        selected: selectedDate === date,
        selectedColor: '#2563eb',
        selectedTextColor: '#ffffff',
      };
    });

    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = {
        selected: true,
        selectedColor: '#2563eb',
        selectedTextColor: '#ffffff',
      };
    }

    return marks;
  }, [availableDates, selectedDate]);

  const handleDayPress = (day: DateObject) => {
    const iso = day.dateString;
    if (!availableDates.has(iso)) return;
    selectDate(iso).catch(() => undefined);
  };

  const handleMonthChange = (month: DateObject) => {
    const nextMonth = `${month.year}-${String(month.month).padStart(2, '0')}`;
    setCurrentMonth(nextMonth);
    ensureYearLoaded(month.year).catch(() => undefined);
  };

  return (
    <Modal visible={isOverlayOpen} transparent animationType="fade" onRequestClose={closeOverlay}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select a Service</Text>
            <Pressable onPress={closeOverlay} accessibilityRole="button">
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
          <View style={styles.calendarWrapper}>
            {loadingDates ? (
              <ActivityIndicator size="large" color="#2563eb" />
            ) : (
              <Calendar
                current={`${currentMonth}-01`}
                onDayPress={handleDayPress}
                onMonthChange={handleMonthChange}
                markedDates={markedDates}
                disableAllTouchEventsForDisabledDays
                theme={{
                  selectedDayBackgroundColor: '#2563eb',
                  todayTextColor: '#2563eb',
                  arrowColor: '#2563eb',
                  textDisabledColor: '#cbd5f5',
                  dotColor: '#2563eb',
                }}
              />
            )}
          </View>
          <View style={styles.servicesHeader}>
            <Text style={styles.servicesTitle}>Services</Text>
            {selectedDate ? (
              <Text style={styles.servicesSubTitle}>{selectedDate}</Text>
            ) : (
              <Text style={styles.servicesSubTitle}>Select a date to view services</Text>
            )}
          </View>
          <ScrollView contentContainerStyle={styles.servicesList}>
            {loadingServices ? (
              <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
            ) : !selectedDate ? (
              <Text style={styles.emptyText}>Choose a date to view available services.</Text>
            ) : services.length === 0 ? (
              <Text style={styles.emptyText}>No services available for the selected date.</Text>
            ) : (
              services.map((service) => (
                <View key={service.id} style={styles.serviceCard}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  {service.resources.map((resource) => (
                    <Pressable
                      key={resource.url}
                      style={styles.resourceButton}
                      onPress={() => selectResource(service, resource)}
                    >
                      <Text style={styles.resourceButtonText}>{resource.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  calendarWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  servicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  servicesSubTitle: {
    fontSize: 14,
    color: '#475569',
  },
  servicesList: {
    paddingBottom: 16,
    gap: 12,
  },
  serviceCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  resourceButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  resourceButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    marginTop: 12,
  },
  loader: {
    marginTop: 16,
  },
});