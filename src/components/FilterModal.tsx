import React, { useContext } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { ThemeContext } from '../theme/ThemeContext';
import { Chip, PrimaryButton, SecondaryButton } from './Controls';

// ---------------------------------------------------------------------------
// FILTER MODAL
// ---------------------------------------------------------------------------
export const FilterModal = React.memo(function FilterModal({
  visible,
  locations,
  activityGroups,
  selectedLocations,
  selectedActivities,
  onToggleLocation,
  onToggleActivity,
  onClearLocations,
  onClearActivities,
  onReset,
  onClose,
  insetsBottom,
}: {
  visible: boolean;
  locations: string[];
  activityGroups: { name: string; activities: string[] }[];
  selectedLocations: Set<string>;
  selectedActivities: Set<string>;
  onToggleLocation: (value: string) => void;
  onToggleActivity: (value: string) => void;
  onClearLocations: () => void;
  onClearActivities: () => void;
  onReset: () => void;
  onClose: () => void;
  insetsBottom: number;
}) {
  const { styles } = useContext(ThemeContext);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { paddingBottom: insetsBottom + 16 }]}
          onPress={() => undefined}>
          <Text style={styles.modalTitle}>Filters</Text>

          <ScrollView
            style={{ maxHeight: 380 }}
            showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Location</Text>
            <View style={styles.chipWrap}>
              <Chip
                label="All"
                active={selectedLocations.size === 0}
                onPress={onClearLocations}
              />
              {locations.map((location) => (
                <Chip
                  key={location}
                  label={location}
                  active={selectedLocations.has(location)}
                  onPress={onToggleLocation}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Activities</Text>
            <View style={styles.chipWrap}>
              <Chip
                label="All"
                active={selectedActivities.size === 0}
                onPress={onClearActivities}
              />
            </View>
            {activityGroups.map((group) => (
              <View key={group.name} style={styles.activityGroup}>
                <Text style={styles.activityGroupLabel}>{group.name}</Text>
                <View style={styles.chipWrap}>
                  {group.activities.map((activity) => (
                    <Chip
                      key={activity}
                      label={activity}
                      active={selectedActivities.has(activity)}
                      onPress={onToggleActivity}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Reset" onPress={onReset} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Done" onPress={onClose} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});
