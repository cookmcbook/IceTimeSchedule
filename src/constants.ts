// ---------------------------------------------------------------------------
// LAYOUT / DESIGN CONSTANTS
// One shared scale so every chip, pill, and button in the app matches.
// CONTROL_HEIGHT meets the 44x44pt minimum tap target recommended by Apple's
// HIG and Android's Material guidelines; every interactive control below is
// built from this constant so nothing falls under that floor.
// ---------------------------------------------------------------------------
export const LABEL_WIDTH = 128;
export const HOUR_WIDTH = 120;
// Tall enough for the three-line card shared with the vertical timeline.
export const EVENT_HEIGHT = 62;
export const EVENT_GAP = 5;
export const LANE_PADDING = 7;
export const HEADER_HEIGHT = 46;

export const RADIUS = 4;

export const HEADER_MIN_HEIGHT = 130;
export const HEADER_MAX_HEIGHT = 200;
// Left-edge fade over the header photo. It runs across the photo's empty left
// 55% (the subjects sit right of that; the photos are also progressively
// blurred there) and always covers the title. Alphas are evenly spaced stops,
// eased so the fade lingers near solid and then trails off softly.
export const HEADER_FADE_FRACTION = 0.55;
export const HEADER_TITLE_ZONE = 300;
export const HEADER_FADE_ALPHAS = [1, 0.92, 0.72, 0.45, 0.2, 0.06, 0] as const;

export const CONTROL_HEIGHT = 44;
export const MIN_TAP_TARGET = 44;

// Vertical timeline (time rows x location columns). Card and row heights are
// fixed so the pinned time column and the sideways-scrolling grid, which are
// separate views, always line up row for row.
export const VT_TIME_COLUMN_WIDTH = 84;
export const VT_LINE_X = 70;
export const VT_MIN_COLUMN_WIDTH = 168;
export const VT_HEADER_HEIGHT = 40;
export const VT_CARD_HEIGHT = 62;
export const VT_CARD_GAP = 6;
export const VT_ROW_PADDING = 8;

export const ACTIVITY_GROUPS = [
  {
    name: 'Skating',
    activities: ['Freestyle', 'Skating Academy', 'Skating Pro Time'],
  },
  {
    name: 'Adult Hockey',
    activities: ['Adult Drop-In', 'Adult Stick & Puck'],
  },
  {
    name: 'Youth Hockey',
    activities: [
      'Parent Child',
      'Youth Open Hockey',
      'AT&T High School Hockey',
      'Hockey Academy',
      'Rookies',
    ],
  },
  {
    name: 'Open Ice',
    activities: ['Hockey Pro Time', 'Open Hockey'],
  },
  {
    name: 'Public Skating',
    activities: ['Public Skate'],
  },
  {
    name: 'Other',
    activities: ['Camps & Clinics'],
  },
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Skating: '#8B5CF6',
  'Adult Hockey': '#006847',
  'Youth Hockey': '#2F80ED',
  'Open Ice': '#F2994A',
  'Public Skating': '#00A6A6',
  Other: '#C4458A',
};

// activity -> color, built once so each event card is a map lookup instead
// of a scan through every group's activity list.
export const ACTIVITY_COLORS = new Map<string, string>(
  ACTIVITY_GROUPS.flatMap((group) =>
    group.activities.map(
      (activity): [string, string] => [activity, CATEGORY_COLORS[group.name]]
    )
  )
);

export const THEME_STORAGE_KEY = 'starcenter-theme';
export const FILTER_STORAGE_KEY = 'starcenter-filters';
export const TIMELINE_VIEW_STORAGE_KEY = 'starcenter-timeline-view';
