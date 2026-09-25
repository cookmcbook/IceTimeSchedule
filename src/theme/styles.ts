import { StyleSheet } from 'react-native';

import {
  CONTROL_HEIGHT,
  EVENT_HEIGHT,
  HEADER_HEIGHT,
  HOUR_WIDTH,
  LABEL_WIDTH,
  MIN_TAP_TARGET,
  RADIUS,
  VT_CARD_GAP,
  VT_CARD_HEIGHT,
  VT_HEADER_HEIGHT,
  VT_ROW_PADDING,
  VT_TIME_COLUMN_WIDTH,
} from '../constants';
import type { ThemeColors } from './colors';

// ---------------------------------------------------------------------------
// STYLES
// Chips, pills, and buttons all share RADIUS / CONTROL_HEIGHT so nothing in
// the UI is a one-off shape or size. Every tap target below is sized to at
// least MIN_TAP_TARGET (44pt) per Apple HIG / Material guidance.
// ---------------------------------------------------------------------------
export function createStyles(UI: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: UI.bg,
    },
    // Page-level bottom padding (on top of the safe-area inset), so the
    // schedule ends above the bottom edge of the screen.
    container: {
      flex: 1,
      paddingBottom: 24,
    },
    // Title and buttons sit on the left: both header photos put their subject
    // on the right, where the buttons used to cover the skater's raised boot.
    heading: {
      width: '100%',
      paddingHorizontal: 18,
      paddingTop: 14,
      overflow: 'hidden',
      alignItems: 'flex-start',
      backgroundColor: UI.bg,
    },
    headerImage: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
    headerFade: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
    },
    headingActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    themeButton: {
      height: CONTROL_HEIGHT,
      minWidth: MIN_TAP_TARGET,
      paddingHorizontal: 12,
      borderRadius: RADIUS,
      borderWidth: 1,
      borderColor: UI.border,
      backgroundColor: UI.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrow: {
      color: UI.victoryGreen,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.6,
    },
    title: {
      color: UI.textPrimary,
      fontSize: 24,
      fontWeight: '800',
      marginTop: 3,
    },
    disclaimer: {
      color: UI.textMuted,
      fontSize: 9,
      fontWeight: '600',
      marginTop: 3,
    },

    // Search + filter trigger
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 14,
      marginTop: 14,
    },
    search: {
      flex: 1,
      height: CONTROL_HEIGHT,
      borderRadius: RADIUS,
      backgroundColor: UI.surfaceAlt,
      color: UI.textPrimary,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: UI.border,
    },
    filterButton: {
      height: CONTROL_HEIGHT,
      minWidth: MIN_TAP_TARGET,
      paddingHorizontal: 14,
      borderRadius: RADIUS,
      backgroundColor: UI.surfaceAlt,
      borderWidth: 1,
      borderColor: UI.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    filterButtonText: {
      color: UI.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    filterBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: UI.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: {
      color: UI.accentText,
      fontSize: 10,
      fontWeight: '800',
    },

    // Uniform chip: used for dates (with a custom two-line inner layout) and
    // every filter option in the sheet. minHeight matches CONTROL_HEIGHT
    // (44pt) to keep every chip a legal tap target even with short labels.
    chip: {
      minHeight: CONTROL_HEIGHT,
      minWidth: MIN_TAP_TARGET,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: RADIUS,
      backgroundColor: UI.surface,
      borderWidth: 1,
      borderColor: UI.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: UI.accent,
      borderColor: UI.accent,
    },
    chipText: {
      color: UI.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    chipTextActive: {
      color: UI.accentText,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 4,
    },

    dateNavigator: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10,
    },
    dateNavButton: {
      flex: 0.85,
      height: 64,
      borderRadius: RADIUS,
      borderWidth: 1,
      borderColor: UI.border,
      backgroundColor: UI.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    dateNavButtonDisabled: {
      opacity: 0.35,
    },
    dateNavArrow: {
      color: UI.textPrimary,
      fontSize: 22,
      lineHeight: 22,
      fontWeight: '800',
    },
    dateNavText: {
      color: UI.textMuted,
      fontSize: 10,
      fontWeight: '700',
      marginTop: 2,
    },
    selectedDatePanel: {
      flex: 1.35,
      height: 64,
      borderRadius: RADIUS,
      backgroundColor: UI.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    selectedDateDayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    selectedDateDay: {
      color: UI.accentText,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    selectedDateText: {
      color: UI.accentText,
      fontSize: 15,
      fontWeight: '900',
      marginTop: 2,
    },
    selectedDateToday: {
      color: UI.accentMuted,
      fontSize: 8,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      marginTop: 1,
    },
    todayButton: {
      width: 52,
      height: 52,
      alignSelf: 'center',
      borderRadius: RADIUS,
      borderWidth: 1,
      borderColor: UI.border,
      backgroundColor: UI.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    todayButtonText: {
      color: UI.textPrimary,
      fontSize: 9,
      fontWeight: '800',
      marginTop: 3,
    },
    datePickerList: {
      maxHeight: 440,
    },
    calendarMonth: {
      marginBottom: 12,
    },
    calendarMonthTitle: {
      color: UI.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 6,
    },
    // Each week is its own row of seven flex: 1 cells, so the columns stay
    // equal-width and aligned without percentage widths or wrapping.
    calendarWeek: {
      flexDirection: 'row',
    },
    calendarWeekdayCell: {
      flex: 1,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarCell: {
      flex: 1,
      height: 42,
      padding: 2,
    },
    calendarWeekday: {
      color: UI.textMuted,
      fontSize: 11,
      fontWeight: '800',
    },
    calendarDay: {
      flex: 1,
      borderRadius: RADIUS,
      borderWidth: 1,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Outlines only the selectable dates, so days with no schedule data read
    // as plain background.
    calendarDayAvailable: {
      borderColor: UI.border,
      backgroundColor: UI.surface,
    },
    calendarDayToday: {
      borderColor: UI.victoryGreen,
    },
    calendarDayActive: {
      backgroundColor: UI.accent,
      borderColor: UI.accent,
    },
    calendarDayText: {
      color: UI.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    calendarDayTextUnavailable: {
      color: UI.textMuted,
      opacity: 0.4,
    },
    calendarDayTextActive: {
      color: UI.accentText,
    },

    timelineContainer: {
      flex: 1,
      borderTopWidth: 1,
      borderColor: UI.borderSubtle,
    },
    verticalTimeline: {
      flex: 1,
    },
    verticalTimelineContent: {
      width: '100%',
    },
    timelineFrame: {
      width: '100%',
      flexDirection: 'row',
    },
    timelineHeaderRow: {
      width: '100%',
      height: HEADER_HEIGHT,
      flexDirection: 'row',
      backgroundColor: UI.surfaceAlt,
    },
    timelineScroller: {
      flexGrow: 0,
      flexShrink: 0,
    },
    labelColumn: {
      width: LABEL_WIDTH,
      flexGrow: 0,
      flexShrink: 0,
      backgroundColor: UI.surface,
      borderRightWidth: 1,
      borderRightColor: UI.silver,
      zIndex: 2,
    },
    labelHeader: {
      flexGrow: 0,
      flexShrink: 0,
      justifyContent: 'center',
      paddingHorizontal: 12,
      backgroundColor: UI.surface,
      borderRightWidth: 1,
      borderRightColor: UI.silver,
      borderBottomWidth: 1,
      borderBottomColor: UI.border,
    },
    labelHeaderText: {
      color: UI.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.4,
    },
    laneLabel: {
      justifyContent: 'center',
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: UI.borderSubtle,
    },
    // "N more ⌄" pill at the bottom of the location column while rink lanes
    // are still below the visible area; the gradient fades the names under it.
    laneMoreHint: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      width: LABEL_WIDTH,
      height: 56,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 10,
      zIndex: 3,
    },
    laneLabelAlt: {
      backgroundColor: UI.timelineRowAlt,
    },
    locationText: {
      color: UI.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    timeHeaderViewport: {
      overflow: 'hidden',
    },
    timeHeader: {
      backgroundColor: UI.surfaceAlt,
      borderBottomWidth: 1,
      borderBottomColor: UI.border,
      position: 'relative',
    },
    hourLabel: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: HOUR_WIDTH,
      paddingLeft: 8,
      justifyContent: 'center',
      borderLeftWidth: 1,
      borderLeftColor: UI.border,
    },
    hourLabelText: {
      color: UI.silver,
      fontSize: 11,
      fontWeight: '700',
    },
    // Transparent: the stripe color and grid lines come from
    // TimelineBackground, drawn once behind all lanes.
    lane: {
      borderBottomWidth: 1,
      borderBottomColor: UI.borderSubtle,
      position: 'relative',
    },
    laneStripe: {
      backgroundColor: UI.bg,
    },
    laneAlt: {
      backgroundColor: UI.timelineRowAlt,
    },
    gridLine: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      borderLeftWidth: 1,
      borderLeftColor: UI.borderSubtle,
    },
    // Matches vtCard, with the activity color as a top stripe (borderTopColor,
    // set per card) instead of a left one. Text uses the vtCard* styles.
    event: {
      position: 'absolute',
      height: EVENT_HEIGHT,
      borderRadius: RADIUS,
      borderWidth: 1,
      borderColor: UI.border,
      borderTopWidth: 4,
      backgroundColor: UI.surface,
      paddingHorizontal: 8,
      justifyContent: 'center',
    },
    currentTimeLine: {
      position: 'absolute',
      top: 0,
      width: 1.5,
      backgroundColor: '#FF4D4F',
      zIndex: 20,
      elevation: 20,
    },
    currentTimeDot: {
      position: 'absolute',
      top: -4,
      left: -3.25,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FF4D4F',
    },

    // Vertical timeline: time rows x location columns
    vtHeaderRow: {
      width: '100%',
      height: VT_HEADER_HEIGHT,
      flexDirection: 'row',
      backgroundColor: UI.surfaceAlt,
    },
    vtCorner: {
      width: VT_TIME_COLUMN_WIDTH,
      height: VT_HEADER_HEIGHT,
    },
    vtHeaderViewport: {
      flexGrow: 0,
      flexShrink: 0,
      overflow: 'hidden',
      borderBottomWidth: 1,
      borderBottomColor: UI.border,
    },
    vtHeaderTrack: {
      flexDirection: 'row',
      height: '100%',
    },
    vtHeaderCell: {
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderLeftWidth: 1,
      borderLeftColor: UI.border,
    },
    vtHeaderText: {
      color: UI.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    // "N more ›" pill pinned to the header's right edge while rink columns
    // are still off-screen; the fade softens the names sliding under it.
    vtMoreHint: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      zIndex: 3,
    },
    vtMoreFade: {
      width: 28,
      height: '100%',
    },
    vtMorePillBacking: {
      height: '100%',
      justifyContent: 'center',
      paddingRight: 8,
      backgroundColor: UI.surfaceAlt,
      borderBottomWidth: 1,
      borderBottomColor: UI.border,
    },
    vtMorePill: {
      height: 26,
      paddingLeft: 10,
      paddingRight: 6,
      borderRadius: 13,
      backgroundColor: UI.accent,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    vtMorePillText: {
      color: UI.accentText,
      fontSize: 11,
      fontWeight: '800',
    },
    vtBody: {
      flexDirection: 'row',
    },
    vtTimeColumn: {
      width: VT_TIME_COLUMN_WIDTH,
      flexGrow: 0,
      flexShrink: 0,
      backgroundColor: UI.bg,
      zIndex: 2,
    },
    // The continuous timeline line; each row's dot sits on top of it.
    vtLine: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: UI.borderSubtle,
    },
    vtTimeCell: {
      position: 'relative',
    },
    vtTimeLabel: {
      position: 'absolute',
      top: VT_ROW_PADDING,
      left: 4,
      width: 54,
      alignItems: 'flex-end',
    },
    vtTimeText: {
      color: UI.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    vtTimePeriod: {
      color: UI.textMuted,
      fontSize: 10,
      fontWeight: '700',
      marginTop: 1,
    },
    vtDot: {
      position: 'absolute',
      top: VT_ROW_PADDING + 4,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: UI.bg,
    },
    vtRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: UI.borderSubtle,
    },
    vtRowNow: {
      backgroundColor: UI.timelineRowAlt,
    },
    vtCell: {
      paddingVertical: VT_ROW_PADDING,
      paddingHorizontal: 6,
      gap: VT_CARD_GAP,
      borderLeftWidth: 1,
      borderLeftColor: UI.borderSubtle,
    },
    vtCard: {
      height: VT_CARD_HEIGHT,
      borderRadius: RADIUS,
      borderWidth: 1,
      borderColor: UI.border,
      borderLeftWidth: 4,
      backgroundColor: UI.surface,
      paddingHorizontal: 8,
      justifyContent: 'center',
    },
    vtCardTitle: {
      color: UI.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    vtCardRink: {
      color: UI.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    vtCardTime: {
      color: UI.textMuted,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 1,
    },
    vtEmpty: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 48,
      paddingHorizontal: 24,
    },
    vtEmptyTitle: {
      color: UI.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    vtEmptyText: {
      color: UI.textMuted,
      fontSize: 13,
      marginTop: 6,
      textAlign: 'center',
    },

    emptyState: {
      flex: 1,
      alignItems: 'center',
    },
    // Edge-to-edge rink photo with the meme caption pinned top and bottom.
    // The black backing plus the dimmed image keeps the white text readable
    // in both themes.
    memePanel: {
      width: '100%',
      aspectRatio: 1.5,
      maxHeight: 420,
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: '#000000',
      overflow: 'hidden',
    },
    memeImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      opacity: 0.55,
    },
    memeText: {
      color: '#FFFFFF',
      fontSize: 30,
      lineHeight: 36,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    memeTextFallback: {
      fontWeight: '900',
    },
    memeTextOutline: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      color: '#000000',
    },

    // Modals share one card + button system
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.82)',
      justifyContent: 'flex-end',
      padding: 14,
    },
    modalCard: {
      backgroundColor: UI.surfaceAlt,
      borderRadius: 22,
      padding: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: UI.border,
    },
    modalAccent: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 5,
    },
    modalTitle: {
      color: UI.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 14,
    },
    aboutText: {
      color: UI.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    aboutCredit: {
      alignSelf: 'flex-start',
      marginTop: 10,
    },
    aboutCreditText: {
      color: UI.textMuted,
      fontSize: 11,
    },
    aboutCreditName: {
      color: UI.textSecondary,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    aboutLinks: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    aboutLinkChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 12,
      borderRadius: RADIUS,
      borderWidth: 1,
      borderColor: UI.border,
      backgroundColor: UI.surface,
    },
    aboutLinkChipText: {
      color: UI.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    aboutEmail: {
      color: UI.textMuted,
      fontSize: 11,
      marginTop: 8,
    },
    aboutDisclaimer: {
      color: UI.textMuted,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 14,
    },
    sectionLabel: {
      color: UI.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
      marginTop: 14,
    },
    activityGroup: {
      marginTop: 10,
    },
    activityGroupLabel: {
      color: UI.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 8,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
    modalTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    modalNavigationButton: {
      width: MIN_TAP_TARGET,
      height: MIN_TAP_TARGET,
      borderRadius: RADIUS,
      borderWidth: 1,
      borderColor: UI.border,
      backgroundColor: UI.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalEyebrow: {
      color: UI.silver,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginTop: 4,
    },
    modalHeadline: {
      color: UI.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      marginTop: 8,
    },
    modalTime: {
      color: UI.textSecondary,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 8,
    },
    modalDescription: {
      color: UI.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 12,
    },
    sessionActionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 18,
    },
    sessionActionButton: {
      minHeight: CONTROL_HEIGHT + 2,
      flexGrow: 1,
      flexBasis: '47%',
      borderRadius: RADIUS,
      borderWidth: 1,
      borderColor: UI.border,
      backgroundColor: UI.surface,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    sessionActionText: {
      color: UI.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    registrationButton: {
      backgroundColor: UI.accent,
      borderColor: UI.accent,
    },
    registrationButtonText: {
      color: UI.accentText,
    },
    // Used instead of registrationButton when MatchConfidence is a guess
    // ('exact-id-ambiguous') rather than a certain match — dashed border and
    // neutral fill instead of the solid accent color, so it visually reads
    // as "tentative" rather than "confirmed."
    registrationButtonGuess: {
      backgroundColor: UI.surface,
      borderColor: UI.textMuted,
      borderStyle: 'dashed',
    },
    guessNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    guessNoticeText: {
      flex: 1,
      color: UI.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },

    // Uniform button pair, reused for Reset/Done/Apply everywhere
    primaryButton: {
      height: CONTROL_HEIGHT + 4,
      borderRadius: RADIUS,
      backgroundColor: UI.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: UI.accentText,
      fontWeight: '800',
      fontSize: 14,
    },
    secondaryButton: {
      height: CONTROL_HEIGHT + 4,
      borderRadius: RADIUS,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: UI.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: UI.textPrimary,
      fontWeight: '800',
      fontSize: 14,
    },
  });
}

export type AppStyles = ReturnType<typeof createStyles>;
