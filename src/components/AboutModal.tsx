import React, { useContext } from 'react';
import { Linking, Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemeContext } from '../theme/ThemeContext';
import { openExternalUrl } from '../utils/links';
import { SecondaryButton } from './Controls';

// ---------------------------------------------------------------------------
// ABOUT MODAL
// ---------------------------------------------------------------------------

// Feature flags for the author section. Flip any to true to show it again.
const SHOW_MADE_BY = false; // "Made by Tony Qing" credit (links to portfolio)
const SHOW_LINKEDIN = false; // LinkedIn button
const SHOW_PORTFOLIO = false; // Portfolio button
const SHOW_EMAIL_BUTTON = true; // Email button (opens a new email)
const SHOW_EMAIL_TEXT = false; // Plain-text email address under the buttons

const AUTHOR_NAME = 'Tony Qing';
const AUTHOR_URL = 'https://tonyxqing.github.io';
const AUTHOR_EMAIL = 'tonyqing2022@gmail.com';
// Brand colors are fixed (not themed) so each icon stays recognizable.
const CONTACT_LINKS: {
  show: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}[] = [
    {
      show: SHOW_LINKEDIN,
      icon: 'logo-linkedin',
      color: '#0A66C2',
      label: 'LinkedIn',
      accessibilityLabel: 'LinkedIn profile',
      onPress: () =>
        openExternalUrl('https://www.linkedin.com/in/tony-qing-123600192'),
    },
    {
      show: SHOW_PORTFOLIO,
      icon: 'globe-outline',
      color: '#00A86B',
      label: 'Portfolio',
      accessibilityLabel: 'Portfolio, tonyxqing.github.io',
      onPress: () => openExternalUrl(AUTHOR_URL),
    },
    {
      show: SHOW_EMAIL_BUTTON,
      icon: 'mail',
      color: '#EA4335',
      label: 'Email',
      accessibilityLabel: `Email ${AUTHOR_EMAIL}`,
      // mailto: is a fixed constant here, so it bypasses the https-only check.
      onPress: () =>
        void Linking.openURL(`mailto:${AUTHOR_EMAIL}`).catch(() => undefined),
    },
  ];
const VISIBLE_CONTACT_LINKS = CONTACT_LINKS.filter((link) => link.show);

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
          {SHOW_MADE_BY ? (
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
          ) : null}
          {VISIBLE_CONTACT_LINKS.length > 0 ? (
            <View style={styles.aboutLinks}>
              {VISIBLE_CONTACT_LINKS.map((link) => (
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
          ) : null}
          {SHOW_EMAIL_TEXT ? (
            <Text style={styles.aboutEmail} selectable>
              {AUTHOR_EMAIL}
            </Text>
          ) : null}
          <View style={{ marginTop: 16 }}>
            <SecondaryButton label="Close" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});
