import React, { useContext, useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { ThemeContext } from '../theme/ThemeContext';
import { calendarMonths, formatDate, WEEKDAY_INITIALS } from '../utils/dates';
import { SecondaryButton } from './Controls';

// ---------------------------------------------------------------------------
// DATE PICKER MODAL
// ---------------------------------------------------------------------------
export const DatePickerModal = React.memo(function DatePickerModal({
  visible,
  dates,
  dateDayMap,
  selectedDate,
  today,
  insetsBottom,
  onSelect,
  onClose,
}: {
  visible: boolean;
  dates: string[];
  dateDayMap: Record<string, string>;
  selectedDate: string;
  today: string;
  insetsBottom: number;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const { styles } = useContext(ThemeContext);
  const months = useMemo(() => calendarMonths(dates), [dates]);
  const availableDates = useMemo(() => new Set(dates), [dates]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { paddingBottom: insetsBottom + 16 }]}
          onPress={() => undefined}>
          <Text style={styles.modalTitle}>Choose a date</Text>
          <ScrollView
            style={styles.datePickerList}
            showsVerticalScrollIndicator={false}>
            {months.map((month) => (
              <View key={month.key} style={styles.calendarMonth}>
                <Text style={styles.calendarMonthTitle}>{month.label}</Text>
                <View style={styles.calendarWeek}>
                  {WEEKDAY_INITIALS.map((initial, index) => (
                    <View
                      key={`weekday-${index}`}
                      style={styles.calendarWeekdayCell}>
                      <Text style={styles.calendarWeekday}>{initial}</Text>
                    </View>
                  ))}
                </View>
                {month.weeks.map((week, weekIndex) => (
                  <View key={`week-${weekIndex}`} style={styles.calendarWeek}>
                    {week.map((date, dayIndex) => {
                      if (!date) {
                        return (
                          <View
                            key={`blank-${dayIndex}`}
                            style={styles.calendarCell}
                          />
                        );
                      }

                      const available = availableDates.has(date);
                      const active = date === selectedDate;
                      const isTodayCell = date === today;

                      return (
                        <View key={date} style={styles.calendarCell}>
                          <Pressable
                            disabled={!available}
                            onPress={() => onSelect(date)}
                            accessibilityRole="button"
                            accessibilityLabel={`${dateDayMap[date] || ''} ${formatDate(date)}${isTodayCell ? ', today' : ''}`}
                            accessibilityState={{
                              selected: active,
                              disabled: !available,
                            }}
                            style={[
                              styles.calendarDay,
                              available && styles.calendarDayAvailable,
                              isTodayCell && styles.calendarDayToday,
                              active && styles.calendarDayActive,
                            ]}>
                            <Text
                              style={[
                                styles.calendarDayText,
                                !available && styles.calendarDayTextUnavailable,
                                active && styles.calendarDayTextActive,
                              ]}>
                              {Number(date.slice(8, 10))}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <View style={{ marginTop: 16 }}>
            <SecondaryButton label="Close" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});
