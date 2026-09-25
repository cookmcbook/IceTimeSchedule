import React, { useContext } from 'react';
import { Linking, Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemeContext } from '../theme/ThemeContext';
import { openExternalUrl } from '../utils/links';
import { SecondaryButton } from './Controls';

// ---------------------------------------------------------------------------
// ABOUT MODAL
// ---------------------------------------------------------------------------
const AUTHOR_NAME = 'Tony Qing';
const AUTHOR_URL = 'https://tonyxqing.github.io';
const AUTHOR_EMAIL = 'tonyqing2022@gmail.com';
// Brand colors are fixed (not themed) so each icon stays recognizable.
const CONTACT_LINKS: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}[] = [
    {
      icon: 'logo-linkedin',
      color: '#0A66C2',
      label: 'LinkedIn',
      accessibilityLabel: 'LinkedIn profile',
      onPress: () =>
        openExternalUrl('https://www.linkedin.com/in/tony-qing-123600192'),
    },
    {
      icon: 'globe-outline',
      color: '#00A86B',
      label: 'Portfolio',
      accessibilityLabel: 'Portfolio, tonyxqing.github.io',
      onPress: () => openExternalUrl(AUTHOR_URL),
    },
    {
      icon: 'mail',
      color: '#EA4335',
      label: 'Email',
      accessibilityLabel: `Email ${AUTHOR_EMAIL}`,
      // mailto: is a fixed constant here, so it bypasses the https-only check.
      onPress: () =>
        void Linking.openURL(`mailto:${AUTHOR_EMAIL}`).catch(() => undefined),
    },
  ];

export const AboutModal = React.memo(function AboutModal({
  visible,
  insetsBottom,
  onClose,
}: {
  visible: boolean;
  insetsBottom: number;
  onClose: () => void;
}) {
  const { styles } = useContext(ThemeContext);
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
          <Text style={styles.modalTitle}>About</Text>
          <Text style={styles.aboutText}>
            StarCenter Times puts every public skate, stick & puck, and drop-in
            session across the Dallas Stars StarCenter rinks on one timeline,
            so finding ice takes seconds instead of clicking through eight
            schedules.
          </Text>
          <Text style={styles.aboutDisclaimer}>
            Unofficial and not affiliated with the Dallas Stars. Schedule data
            comes from the public StarCenter schedule pages. Photos by Gerhard
            Crous, Chris Desort, and Nathanael Desmeules on Unsplash.
          </Text>
          <Pressable
            onPress={() => openExternalUrl(AUTHOR_URL)}
            accessibilityRole="link"
            accessibilityLabel={`Made by ${AUTHOR_NAME}. Opens portfolio`}
            hitSlop={8}
            style={styles.aboutCredit}>
            <Text style={styles.aboutCreditText}>
              Made by <Text style={styles.aboutCreditName}>{AUTHOR_NAME}</Text>
            </Text>
          </Pressable>
          <View style={styles.aboutLinks}>
            {CONTACT_LINKS.map((link) => (
              <Pressable
                key={link.label}
                onPress={link.onPress}
                accessibilityRole="link"
                accessibilityLabel={link.accessibilityLabel}
                style={styles.aboutLinkChip}>
                <Ionicons name={link.icon} size={16} color={link.color} />
                <Text style={styles.aboutLinkChipText}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.aboutEmail} selectable>
            {AUTHOR_EMAIL}
          </Text>
          <View style={{ marginTop: 16 }}>
            <SecondaryButton label="Close" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});
