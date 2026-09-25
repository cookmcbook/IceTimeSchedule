import { ActionSheetIOS, Linking, Platform } from 'react-native';

function isSafeExternalUrl(url: string): boolean {
  return /^https:\/\//i.test(url);
}

export function openExternalUrl(url: string) {
  if (!url || !isSafeExternalUrl(url)) return;
  void Linking.openURL(url).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// MAPS APP CHOOSER
// Android's `geo:` scheme is an implicit intent — the OS shows its own
// native "Open with" chooser automatically whenever more than one app (Google
// Maps, Waze, etc.) can handle it, so no UI code is needed there. iOS has no
// equivalent system-level chooser for links opened from inside a third-party
// app, so on iOS we build the equivalent ourselves with ActionSheetIOS.
//
// IMPORTANT (iOS only): checking whether Google Maps is installed requires
// declaring the scheme in Info.plist, or Linking.canOpenURL always returns
// false. In an Expo managed app, add to app.json:
//   "ios": { "infoPlist": { "LSApplicationQueriesSchemes": ["comgooglemaps", "waze"] } }
// ---------------------------------------------------------------------------
const GOOGLE_MAPS_IOS_SCHEME = 'comgooglemaps://';
const WAZE_IOS_SCHEME = 'waze://';
const APPLE_MAPS_BASE_URL = 'https://maps.apple.com/?q=';
const GOOGLE_MAPS_WEB_BASE_URL = 'https://www.google.com/maps/search/?api=1&query=';

// A small allowlist beyond isSafeExternalUrl's https-only rule, since native
// map apps are opened via non-https custom URL schemes. Only ever called
// with strings this file constructs itself, never with raw user/API input.
function openMapsUrl(url: string) {
  const isKnownMapsScheme =
    /^https:\/\//i.test(url) ||
    url.startsWith('geo:') ||
    url.startsWith(GOOGLE_MAPS_IOS_SCHEME) ||
    url.startsWith(WAZE_IOS_SCHEME);
  if (!isKnownMapsScheme) return;
  void Linking.openURL(url).catch(() => undefined);
}

export async function openDirectionsForAddress(address: string) {
  if (!address) return;
  const encodedAddress = encodeURIComponent(address);

  if (Platform.OS === 'android') {
    openMapsUrl(`geo:0,0?q=${encodedAddress}`);
    return;
  }

  if (Platform.OS === 'ios') {
    const [googleMapsInstalled, wazeInstalled] = await Promise.all([
      Linking.canOpenURL(GOOGLE_MAPS_IOS_SCHEME).catch(() => false),
      Linking.canOpenURL(WAZE_IOS_SCHEME).catch(() => false),
    ]);

    const options: { label: string; url: string }[] = [
      { label: 'Apple Maps', url: `${APPLE_MAPS_BASE_URL}${encodedAddress}` },
    ];
    if (googleMapsInstalled) {
      options.push({
        label: 'Google Maps',
        url: `${GOOGLE_MAPS_IOS_SCHEME}?q=${encodedAddress}`,
      });
    }
    if (wazeInstalled) {
      options.push({
        label: 'Waze',
        url: `${WAZE_IOS_SCHEME}?q=${encodedAddress}&navigate=yes`,
      });
    }

    // Only one app available (just Apple Maps) — skip the sheet entirely.
    if (options.length === 1) {
      openMapsUrl(options[0].url);
      return;
    }

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...options.map((option) => option.label), 'Cancel'],
        cancelButtonIndex: options.length,
      },
      (buttonIndex) => {
        const selected = options[buttonIndex];
        if (selected) openMapsUrl(selected.url);
      }
    );
    return;
  }

  // Web / other platforms: no installed-app concept, just open Google Maps.
  openMapsUrl(`${GOOGLE_MAPS_WEB_BASE_URL}${encodedAddress}`);
}
