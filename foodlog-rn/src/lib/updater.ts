// In-app APK auto-updater for sideloaded Android builds. (Portable across apps.)
//
// Flow: fetch a small version manifest -> compare its versionCode against the
// installed build's versionCode -> if newer, download the APK in-app and hand
// it to Android's package installer (no browser / file-manager needed).
//
// Android note: sideloaded installs are never fully silent. The OS still shows
// its own "install/update this app?" confirmation, and the first time it will
// ask the user to allow installs from this app (REQUEST_INSTALL_PACKAGES).
// After that first grant every future update is: open app -> Update -> Install.

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import {
  cacheDirectory,
  createDownloadResumable,
  getContentUriAsync,
} from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

/** URL of the JSON version manifest (single source of truth for this app). */
export const MANIFEST_URL = (extra.updateManifestUrl as string) || '';

/** This app's key inside the manifest. */
export const UPDATE_SLUG = (extra.updateSlug as string) || 'app';

export interface UpdateInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  notes?: string;
  mandatory?: boolean;
  sizeMB?: number;
}

/** Installed Android versionCode (integer). 0 if unknown / non-Android. */
export function getInstalledVersionCode(): number {
  const raw = Application.nativeBuildVersion;
  const n = raw ? parseInt(String(raw), 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

/** Installed versionName, e.g. "1.1.0". */
export function getInstalledVersionName(): string {
  return Application.nativeApplicationVersion || '—';
}

/** Fetch the latest published build info for this app, or null on any failure. */
export async function fetchLatest(): Promise<UpdateInfo | null> {
  if (Platform.OS !== 'android' || !MANIFEST_URL) return null;
  try {
    const res = await fetch(`${MANIFEST_URL}?ts=${Date.now()}`, {
      headers: { 'cache-control': 'no-cache' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    const json = JSON.parse(text);
    const info = json?.apps?.[UPDATE_SLUG] ?? json?.[UPDATE_SLUG] ?? null;
    if (!info || typeof info.versionCode !== 'number' || !info.apkUrl) return null;
    return info as UpdateInfo;
  } catch {
    return null;
  }
}

/** Returns update info only if a strictly newer build is available. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const latest = await fetchLatest();
  if (!latest) return null;
  return latest.versionCode > getInstalledVersionCode() ? latest : null;
}

/**
 * Download the APK (reporting 0..1 progress) and launch the system installer.
 * Throws on download failure; the install prompt itself is handled by Android.
 */
export async function downloadAndInstall(
  apkUrl: string,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('Updates are only supported on Android.');
  }
  const target = `${cacheDirectory ?? ''}${UPDATE_SLUG}-update-${Date.now()}.apk`;
  const task = createDownloadResumable(apkUrl, target, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) {
      onProgress?.(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    }
  });
  const result = await task.downloadAsync();
  if (!result?.uri) throw new Error('Download failed');

  // Android 7+ requires a content:// URI (via FileProvider) for the install intent.
  const contentUri = await getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
    data: contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}
