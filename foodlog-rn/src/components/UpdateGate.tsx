// Drop-in auto-update gate. Mount once near the app root. (Portable across apps.)
// Checks for a newer APK on launch + whenever the app returns to the foreground,
// and offers a one-tap download + install. Self-contained styling (no theme dep);
// the accent colour is read from expoConfig.extra.updateAccent.

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  checkForUpdate,
  downloadAndInstall,
  getInstalledVersionName,
  UPDATE_SLUG,
  type UpdateInfo,
} from '@/lib/updater';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
const ACCENT = (extra.updateAccent as string) || '#2563EB';
const DISMISS_KEY = `${UPDATE_SLUG}.update.dismissedCode`;

type Phase = 'idle' | 'available' | 'downloading' | 'error';

export function UpdateGate() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const checking = useRef(false);
  const appState = useRef(AppState.currentState);

  const run = useCallback(async () => {
    if (checking.current || phase === 'downloading') return;
    checking.current = true;
    try {
      const update = await checkForUpdate();
      if (!update) return;
      if (!update.mandatory) {
        const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
        if (dismissed && parseInt(dismissed, 10) >= update.versionCode) return;
      }
      setInfo(update);
      setPhase('available');
    } finally {
      checking.current = false;
    }
  }, [phase]);

  useEffect(() => {
    const t = setTimeout(run, 2500);
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') run();
      appState.current = next;
    });
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [run]);

  const onUpdate = useCallback(async () => {
    if (!info) return;
    setPhase('downloading');
    setProgress(0);
    setError(null);
    try {
      await downloadAndInstall(info.apkUrl, setProgress);
      setPhase('available');
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Update failed. Please try again.');
      setPhase('error');
    }
  }, [info]);

  const onLater = useCallback(async () => {
    if (info && !info.mandatory) {
      await AsyncStorage.setItem(DISMISS_KEY, String(info.versionCode));
    }
    setInfo(null);
    setPhase('idle');
  }, [info]);

  const visible = phase !== 'idle' && !!info;
  if (!visible || !info) return null;

  const downloading = phase === 'downloading';
  const pct = Math.round(progress * 100);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={info.mandatory ? undefined : onLater}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={[styles.iconWrap, { backgroundColor: ACCENT + '22' }]}>
            <Ionicons name="rocket" size={26} color={ACCENT} />
          </View>

          <Text style={styles.title}>Update available</Text>
          <Text style={styles.version}>
            {getInstalledVersionName()} → v{info.versionName}
            {info.sizeMB ? `  ·  ${info.sizeMB} MB` : ''}
          </Text>

          {!!info.notes && <Text style={styles.notes}>{info.notes}</Text>}

          {downloading && (
            <View style={styles.progressBlock}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(4, pct)}%`, backgroundColor: ACCENT }]} />
              </View>
              <Text style={styles.progressText}>Downloading… {pct}%</Text>
            </View>
          )}

          {phase === 'error' && !!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.primary, { backgroundColor: ACCENT }, downloading && styles.primaryBusy]}
            disabled={downloading}
            onPress={onUpdate}
          >
            {downloading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>{phase === 'error' ? 'Retry update' : 'Update now'}</Text>
            )}
          </Pressable>

          {!info.mandatory && !downloading && (
            <Pressable style={styles.secondary} onPress={onLater}>
              <Text style={styles.secondaryText}>Later</Text>
            </Pressable>
          )}

          {info.mandatory && <Text style={styles.mandatoryNote}>This update is required to continue.</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,13,16,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 34,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontWeight: '800', fontSize: 20, color: '#0B0D10' },
  version: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  notes: { fontSize: 14, color: '#374151', lineHeight: 20, marginTop: 12 },
  progressBlock: { marginTop: 18 },
  track: { height: 8, borderRadius: 999, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999 },
  progressText: { fontSize: 12, color: '#6B7280', marginTop: 8 },
  error: { fontSize: 13, color: '#DC2626', marginTop: 12 },
  primary: {
    marginTop: 20,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBusy: { opacity: 0.85 },
  primaryText: { fontWeight: '700', fontSize: 16, color: '#FFFFFF' },
  secondary: { marginTop: 10, height: 46, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontWeight: '600', fontSize: 15, color: '#6B7280' },
  mandatoryNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },
});
