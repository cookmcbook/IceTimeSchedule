import React, { useContext } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemeContext } from '../theme/ThemeContext';
import type { Session } from '../types';
import { activityColor } from '../utils/colors';
import { openExternalUrl } from '../utils/links';
import { PrimaryButton } from './Controls';

// ---------------------------------------------------------------------------
// SESSION DETAIL MODAL
// ---------------------------------------------------------------------------
export const SessionDetailModal = React.memo(function SessionDetailModal({
  session,
  hasAddress,
  onDirections,
  onShare,
  onClose,
  insetsBottom,
}: {
  session: Session | null;
  hasAddress: boolean;
  onDirections: (session: Session) => void;
  onShare: (session: Session) => void;
  onClose: () => void;
  insetsBottom: number;
}) {
  const { styles, colors: UI } = useContext(ThemeContext);

  return (
    <Modal
      visible={session !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { paddingBottom: insetsBottom + 16 }]}
          onPress={() => undefined}>
          <View
            style={[
              styles.modalAccent,
              { backgroundColor: activityColor(session?.Activity || '') },
            ]}
          />

          <View style={styles.modalTopRow}>
            <Text style={[styles.modalEyebrow, { flex: 1 }]}>
              {session?.Location}
              {session?.Rink ? ` · ${session.Rink}` : ''}
            </Text>

            {session && hasAddress ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Directions to ${session.Location}`}
                onPress={() => onDirections(session)}
                style={styles.modalNavigationButton}>
                <Ionicons
                  name="navigate-outline"
                  size={21}
                  color={UI.textPrimary}
                />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.modalHeadline}>{session?.Activity}</Text>

          <Text style={styles.modalTime}>
            {session?.Date} · {session?.Time}
          </Text>

          {session?.Description ? (
            <Text style={styles.modalDescription}>{session.Description}</Text>
          ) : null}

          {session ? (
            <View style={styles.sessionActionGrid}>
              <Pressable
                onPress={() => onShare(session)}
                accessibilityRole="button"
                accessibilityLabel="Share reminder"
                style={styles.sessionActionButton}>
                <Ionicons
                  name="share-social-outline"
                  size={18}
                  color={UI.textPrimary}
                />
                <Text style={styles.sessionActionText}>Share reminder</Text>
              </Pressable>

              {session.SourceUrl ? (
                <Pressable
                  onPress={() => openExternalUrl(session.SourceUrl)}
                  accessibilityRole="button"
                  accessibilityLabel="Open official schedule"
                  style={styles.sessionActionButton}>
                  <Ionicons
                    name="link-outline"
                    size={18}
                    color={UI.textPrimary}
                  />
                  <Text style={styles.sessionActionText}>Official schedule</Text>
                </Pressable>
              ) : null}

              {session.RegistrationUrl ? (
                <Pressable
                  onPress={() => openExternalUrl(session.RegistrationUrl)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    session.MatchConfidence === 'exact'
                      ? 'Register for this session'
                      : 'Register. Closest signup match, confirm the activity and time before paying'
                  }
                  style={[
                    styles.sessionActionButton,
                    session.MatchConfidence === 'exact'
                      ? styles.registrationButton
                      : styles.registrationButtonGuess,
                  ]}>
                  <Ionicons
                    name={
                      session.MatchConfidence === 'exact'
                        ? 'ticket-outline'
                        : 'help-circle-outline'
                    }
                    size={18}
                    color={
                      session.MatchConfidence === 'exact'
                        ? UI.accentText
                        : UI.textPrimary
                    }
                  />
                  <Text
                    style={[
                      styles.sessionActionText,
                      session.MatchConfidence === 'exact' &&
                      styles.registrationButtonText,
                    ]}>
                    Register
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {session?.RegistrationUrl && session.MatchConfidence !== 'exact' ? (
            <View style={styles.guessNotice}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={UI.textMuted}
              />
              <Text style={styles.guessNoticeText}>
                Closest signup match. Confirm the activity and time before you
                pay.
              </Text>
            </View>
          ) : null}

          <View style={{ marginTop: 14 }}>
            <PrimaryButton label="Done" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});
