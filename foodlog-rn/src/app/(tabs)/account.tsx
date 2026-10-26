import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { totalsOf } from '@/data/types';
import {
  APP_VERSION_CODE,
  APP_VERSION_NAME,
  checkPlayStoreVersion,
  DEFAULT_SCAN_PASSES,
  fetchBillingStatus,
  openPlayStoreListing,
  PlayScanPassProduct,
  purchaseScanPassWithGooglePay,
  purchaseScanPassWithPlayBilling,
  requestAndroidNotificationPermission,
  verifyPlayIntegrity,
  WEB_DELETE_ACCOUNT_URL,
} from '@/lib/googlePlay';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { initials, num, round1 } from '@/util';
import { Txt } from '@/ui';

const APK_URL = 'https://foodlog.xyz/downloads/foodlog-android.apk?v=1.6.0';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const {
    user,
    token,
    logout,
    deleteAccount,
    goals,
    profile,
    loggedDayKeys,
    getDay,
    customFoods,
    syncing,
  } = useFoodlog();
  const avatar = profile.photo || user?.avatar;

  // Scan passes & Google Play Billing / Google Pay state
  const [scansLeft, setScansLeft] = useState<number>(user?.scan_credits ?? 5);
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<PlayScanPassProduct>(DEFAULT_SCAN_PASSES[1]);
  const [purchasingPass, setPurchasingPass] = useState(false);

  // Google Play Services & Notifications state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [integrityBadge, setIntegrityBadge] = useState<string>('PLAY_RECOGNIZED');

  // Account Deletion state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchBillingStatus(token).then((status) => {
      if (status && typeof status.scans_left === 'number') {
        setScansLeft(status.scans_left);
      }
    });
  }, [token]);

  const keys = loggedDayKeys();
  const avg = keys.length
    ? Math.round(keys.reduce((s, k) => s + totalsOf(getDay(k).items).calories, 0) / keys.length)
    : 0;
  const unit = profile.weightUnit || 'kg';

  const body: [string, string][] = [];
  if (profile.currentWeight) body.push(['Current weight', `${round1(profile.currentWeight)} ${unit}`]);
  if (profile.goalWeight) body.push(['Goal weight', `${round1(profile.goalWeight)} ${unit}`]);
  if (profile.height) body.push(['Height', `${round1(profile.height)} cm`]);
  if (profile.primaryGoal) body.push(['Primary goal', profile.primaryGoal]);
  if (profile.activityLevel) body.push(['Activity level', profile.activityLevel]);
  if (profile.foodPhilosophy) body.push(['Food philosophy', profile.foodPhilosophy]);

  const handlePlayBillingPurchase = async () => {
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to buy an AI Photo Scan Pass.');
      return;
    }
    setPurchasingPass(true);
    try {
      const res = await purchaseScanPassWithPlayBilling(token, selectedPass);
      setScansLeft(res.scans_left);
      setPassModalOpen(false);
      Alert.alert(
        'Google Play Purchase Complete',
        `Added +${res.scans_added} AI photo scans (${selectedPass.name}). You now have ${res.scans_left} scans available.`,
      );
    } catch (e: any) {
      Alert.alert('Google Play Billing', e?.message || 'Could not complete purchase.');
    } finally {
      setPurchasingPass(false);
    }
  };

  const handleGooglePayPurchase = async () => {
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to buy an AI Photo Scan Pass.');
      return;
    }
    setPurchasingPass(true);
    try {
      const res = await purchaseScanPassWithGooglePay(token, selectedPass);
      setScansLeft(res.scans_left);
      setPassModalOpen(false);
      Alert.alert(
        'Google Pay Checkout Complete',
        `Added +${res.scans_added} AI photo scans (${selectedPass.name}). You now have ${res.scans_left} scans available.`,
      );
    } catch (e: any) {
      Alert.alert('Google Pay', e?.message || 'Could not complete Google Pay checkout.');
    } finally {
      setPurchasingPass(false);
    }
  };

  const handleTogglePush = async (nextVal: boolean) => {
    if (!nextVal) {
      setPushEnabled(false);
      return;
    }
    const res = await requestAndroidNotificationPermission(token);
    setPushEnabled(res.granted);
    if (res.granted) {
      Alert.alert('Notifications Enabled', 'Meal & hydration reminders are active for this device.');
    } else {
      Alert.alert('Permission Declined', 'You can enable notifications anytime in Android App Settings.');
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const v = await checkPlayStoreVersion();
      if (v.upToDate) {
        Alert.alert(
          'Up to Date',
          `You are running Foodlog v${APP_VERSION_NAME} (Build ${APP_VERSION_CODE}), the latest Google Play release.`,
        );
      } else {
        Alert.alert(
          `Update v${v.latestVersionName} Available`,
          v.releaseNotes.join('\n• '),
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Update on Google Play', onPress: () => openPlayStoreListing() },
          ],
        );
      }
    } catch {
      Alert.alert('Update Check', `Foodlog v${APP_VERSION_NAME} (Build ${APP_VERSION_CODE}) is installed.`);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setCheckingIntegrity(true);
    try {
      const res = await verifyPlayIntegrity();
      setIntegrityBadge(res.appRecognitionVerdict);
      Alert.alert(
        'Google Play Integrity Verified',
        `App Verdict: ${res.appRecognitionVerdict}\nDevice Verdict: ${res.deviceRecognitionVerdict.join(', ')}\nApp Links: https://foodlog.xyz (Auto-Verified)`,
      );
    } catch {
      Alert.alert('Play Integrity', 'Device meets basic integrity requirements.');
    } finally {
      setCheckingIntegrity(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type DELETE in all caps to confirm permanent account deletion.');
      return;
    }
    setDeletingAccount(true);
    try {
      await deleteAccount();
      setDeleteModalOpen(false);
      Alert.alert(
        'Account Deleted',
        'Your Foodlog account and all associated nutrition logs, photos, and scan credits have been permanently deleted.',
      );
      router.replace('/login');
    } catch (e: any) {
      Alert.alert('Deletion Error', e?.message || 'Could not delete account right now.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ backgroundColor: C.ink, paddingTop: insets.top + 20, paddingBottom: 26, paddingHorizontal: 20, alignItems: 'center' }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFFFFF16', alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' }}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: 76, height: 76 }} contentFit="cover" />
            ) : (
              <Txt f={font.black} size={28} color={C.white}>
                {initials(user?.name)}
              </Txt>
            )}
          </View>
          <Txt f={font.black} size={20} color={C.white}>
            {user?.name || 'My foodlog'}
          </Txt>
          <Txt f={font.body} size={13} color="#B9B9B4" style={{ marginTop: 2 }}>
            {user?.email || ''}
          </Txt>

          <View style={{ flexDirection: 'row', marginTop: 20, gap: 10 }}>
            <HeaderStat value={String(keys.length)} label="Days logged" />
            <HeaderStat value={num(avg)} label="Avg kcal" />
            <HeaderStat value={String(scansLeft)} label="AI Scans Left" />
          </View>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          {/* AI Photo Scan Passes (Google Play Billing v7+ & Google Pay) */}
          <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2 }}>
                  AI PHOTO SCAN PASSES
                </Txt>
                <Txt f={font.bodyBold} size={15} color={C.ink} style={{ marginTop: 4 }}>
                  {scansLeft} photo scans available
                </Txt>
                <Txt f={font.body} size={12.5} color={C.muted} style={{ marginTop: 2 }}>
                  Manual logging is always free. Top up photo scans with Google Play Billing, Google Pay, or M-Pesa.
                </Txt>
              </View>
              <View style={{ backgroundColor: C.ink, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }}>
                <Txt f={font.black} size={20} color={C.white}>
                  {scansLeft}
                </Txt>
                <Txt f={font.mono} size={9.5} color="#B9B9B4">
                  SCANS
                </Txt>
              </View>
            </View>
            <Pressable
              onPress={() => setPassModalOpen(true)}
              style={{
                marginTop: 14,
                height: 46,
                borderRadius: radius.md,
                backgroundColor: C.ink,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
              <Ionicons name="logo-google-playstore" size={16} color={C.white} />
              <Txt f={font.bodyBold} size={13.5} color={C.white}>
                Buy Scan Pass (Google Play / Google Pay)
              </Txt>
            </Pressable>
          </View>

          {/* Goals */}
          <SectionCard
            title="Daily nutrition goals"
            action="Edit"
            onAction={() => router.push('/goals')}
            rows={[
              ['Calories', `${num(goals.calories)} kcal`],
              ['Protein', `${Math.round(goals.protein)} g`],
              ['Carbohydrates', `${Math.round(goals.carbs)} g`],
              ['Fat', `${Math.round(goals.fat)} g`],
              ['Fiber', `${Math.round(goals.fiber)} g`],
              ['Water', `${Math.round(goals.water)} glasses`],
            ]}
          />

          {body.length > 0 && <SectionCard title="Body & goals" action="Log weight" onAction={() => router.push('/weight')} rows={body} />}

          {/* Links */}
          <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
            <LinkRow icon="barbell-outline" label="Weight & progress" onPress={() => router.push('/weight')} />
            <LinkRow icon="options-outline" label="Adjust goals" onPress={() => router.push('/goals')} />
            <LinkRow icon="add-circle-outline" label="Create custom food" onPress={() => router.push('/custom-food')} />
            <LinkRow icon="download-outline" label="Get the Android app (v1.6.0)" onPress={() => Linking.openURL(APK_URL)} last />
          </View>

          {/* Google Play Services & Notifications */}
          <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
              <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2 }}>
                GOOGLE PLAY SERVICES & NOTIFICATIONS
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line2 }}>
              <Ionicons name="notifications-outline" size={19} color={C.ink} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Txt f={font.bodySemi} size={14} color={C.ink}>
                  Meal & Hydration Reminders
                </Txt>
                <Txt f={font.body} size={11.5} color={C.muted}>
                  Android 13+ runtime push notifications
                </Txt>
              </View>
              <Switch value={pushEnabled} onValueChange={handleTogglePush} />
            </View>
            <LinkRow
              icon="cloud-download-outline"
              label={checkingUpdate ? 'Checking Google Play for updates…' : `Check for Updates (v${APP_VERSION_NAME})`}
              onPress={handleCheckUpdates}
            />
            <LinkRow
              icon="star-outline"
              label="Rate Foodlog on Google Play"
              onPress={openPlayStoreListing}
            />
            <LinkRow
              icon="shield-checkmark-outline"
              label={checkingIntegrity ? 'Verifying Play Integrity…' : `Play Integrity (${integrityBadge})`}
              onPress={handleVerifyIntegrity}
              last
            />
          </View>

          <SectionCard
            title="Account"
            rows={[
              ['Signed in as', user?.email || '—'],
              ['Sync', syncing ? 'Saving…' : 'Synced to your account'],
              ['Android build', `v${APP_VERSION_NAME} (Code ${APP_VERSION_CODE} · SDK 36)`],
            ]}
          />

          <Pressable
            onPress={() =>
              Alert.alert('Sign out', 'Sign out of Foodlog on this device?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => { logout(); router.replace('/login'); } },
              ])
            }
            style={{ height: 52, borderRadius: radius.md, backgroundColor: C.card, borderWidth: 1, borderColor: '#E6C9C9', alignItems: 'center', justifyContent: 'center' }}>
            <Txt f={font.bodyBold} size={14} color={C.danger} style={{ letterSpacing: 0.4 }}>
              SIGN OUT
            </Txt>
          </Pressable>

          <Pressable
            onPress={() => {
              setDeleteConfirmText('');
              setDeleteModalOpen(true);
            }}
            style={{ height: 50, borderRadius: radius.md, backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <Ionicons name="trash-outline" size={16} color={C.danger} />
            <Txt f={font.bodyBold} size={13.5} color={C.danger} style={{ letterSpacing: 0.3 }}>
              DELETE ACCOUNT & DATA
            </Txt>
          </Pressable>

          <Txt f={font.mono} size={11} color={C.muted2} align="center" style={{ marginTop: 4 }}>
            Foodlog v{APP_VERSION_NAME} (Build {APP_VERSION_CODE}) · Google Play Ready
          </Txt>
        </View>
      </ScrollView>

      {/* Google Play Billing & Google Pay Scan Pass Modal */}
      <Modal visible={passModalOpen} transparent animationType="slide" onRequestClose={() => setPassModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(11,13,16,0.58)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt f={font.black} size={19} color={C.ink}>
                Get an AI Scan Pass
              </Txt>
              <Pressable onPress={() => setPassModalOpen(false)}>
                <Ionicons name="close" size={24} color={C.ink} />
              </Pressable>
            </View>
            <Txt f={font.body} size={12.5} color={C.muted} style={{ marginTop: 4 }}>
              One-time prepaid passes — nothing auto-renews. Pay with Google Play Billing or Google Pay.
            </Txt>

            <View style={{ gap: 10, marginTop: 14 }}>
              {DEFAULT_SCAN_PASSES.map((p) => {
                const active = selectedPass.id === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelectedPass(p)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderRadius: radius.md,
                      borderWidth: 1.5,
                      borderColor: active ? C.ink : C.line,
                      backgroundColor: active ? C.bgElevated : C.card,
                    }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Txt f={font.bodyBold} size={15} color={C.ink}>
                          {p.name}
                        </Txt>
                        {p.recommended && (
                          <View style={{ backgroundColor: C.ink, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                            <Txt f={font.mono} size={9} color={C.white}>
                              POPULAR
                            </Txt>
                          </View>
                        )}
                      </View>
                      <Txt f={font.body} size={12} color={C.muted} style={{ marginTop: 2 }}>
                        {p.scans} AI photo scans · valid {p.days} {p.days === 1 ? 'day' : 'days'}
                      </Txt>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Txt f={font.black} size={16} color={C.ink}>
                        KSh {p.prices.KES}
                      </Txt>
                      <Txt f={font.mono} size={11} color={C.muted}>
                        ${p.prices.USD} USD
                      </Txt>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              disabled={purchasingPass}
              onPress={handlePlayBillingPurchase}
              style={{
                marginTop: 16,
                height: 48,
                borderRadius: radius.md,
                backgroundColor: '#01875f',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: purchasingPass ? 0.7 : 1,
              }}>
              {purchasingPass ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="logo-google-playstore" size={18} color="#fff" />
                  <Txt f={font.bodyBold} size={13.5} color="#fff">
                    Pay with Google Play ({selectedPass.name} · KSh {selectedPass.prices.KES})
                  </Txt>
                </>
              )}
            </Pressable>

            <Pressable
              disabled={purchasingPass}
              onPress={handleGooglePayPurchase}
              style={{
                marginTop: 10,
                height: 48,
                borderRadius: radius.md,
                backgroundColor: C.ink,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: purchasingPass ? 0.7 : 1,
              }}>
              <Ionicons name="card-outline" size={18} color="#fff" />
              <Txt f={font.bodyBold} size={13.5} color="#fff">
                Pay with Google Pay (${selectedPass.prices.USD} / KSh {selectedPass.prices.KES})
              </Txt>
            </Pressable>

            <Pressable
              onPress={() => {
                setPassModalOpen(false);
                Linking.openURL('https://foodlog.xyz/pricing');
              }}
              style={{
                marginTop: 10,
                height: 44,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: C.line,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
              <Ionicons name="phone-portrait-outline" size={16} color={C.ink} />
              <Txt f={font.bodySemi} size={13} color={C.ink}>
                Pay with M-Pesa STK Push on foodlog.xyz
              </Txt>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Account & Data Deletion Modal (Google Play Data Safety Mandate) */}
      <Modal visible={deleteModalOpen} transparent animationType="fade" onRequestClose={() => setDeleteModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(11,13,16,0.58)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 }}>
            <Txt f={font.black} size={19} color={C.danger}>
              Delete Account & Data
            </Txt>
            <Txt f={font.body} size={13} color={C.muted} style={{ marginTop: 6, lineHeight: 19 }}>
              This permanently deletes your Foodlog account ({user?.email || 'current account'}), all logged meals, photos, weight history, custom foods, and scan passes. This action cannot be undone.
            </Txt>

            <Txt f={font.mono} size={11} color={C.muted} style={{ marginTop: 14, marginBottom: 6 }}>
              TYPE DELETE TO CONFIRM PERMANENT REMOVAL
            </Txt>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor={C.muted2}
              autoCapitalize="characters"
              style={{
                backgroundColor: C.bgElevated,
                borderRadius: radius.md,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: C.ink,
                borderWidth: 1,
                borderColor: C.line,
              }}
            />

            <Pressable
              disabled={deletingAccount}
              onPress={handleConfirmDeleteAccount}
              style={{
                marginTop: 14,
                height: 48,
                borderRadius: radius.md,
                backgroundColor: C.danger,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: deletingAccount ? 0.7 : 1,
              }}>
              {deletingAccount ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Txt f={font.bodyBold} size={14} color="#fff">
                  Permanently Delete My Account
                </Txt>
              )}
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL(WEB_DELETE_ACCOUNT_URL)}
              style={{
                marginTop: 10,
                height: 44,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: C.line,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
              <Ionicons name="open-outline" size={16} color={C.ink} />
              <Txt f={font.bodySemi} size={12.5} color={C.ink}>
                Open Web Deletion Portal (foodlog.xyz/delete-account)
              </Txt>
            </Pressable>

            <Pressable onPress={() => setDeleteModalOpen(false)} style={{ marginTop: 14, alignItems: 'center' }}>
              <Txt f={font.bodySemi} size={14} color={C.muted}>
                Cancel
              </Txt>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function HeaderStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ backgroundColor: '#FFFFFF12', borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', minWidth: 92 }}>
      <Txt f={font.black} size={18} color={C.white}>
        {value}
      </Txt>
      <Txt f={font.body} size={10.5} color="#B9B9B4" style={{ marginTop: 1 }}>
        {label}
      </Txt>
    </View>
  );
}

function SectionCard({ title, rows, action, onAction }: { title: string; rows: [string, string][]; action?: string; onAction?: () => void }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2 }}>
          {title.toUpperCase()}
        </Txt>
        {action && (
          <Pressable onPress={onAction} hitSlop={8}>
            <Txt f={font.bodySemi} size={12.5} color={C.brand}>
              {action}
            </Txt>
          </Pressable>
        )}
      </View>
      {rows.map(([k, v], i) => (
        <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line2 }}>
          <Txt f={font.body} size={13.5} color={C.muted} style={{ flex: 1, paddingRight: 12 }}>
            {k}
          </Txt>
          <Txt f={font.bodyBold} size={13.5} color={C.ink} style={{ flexShrink: 1, textAlign: 'right' }}>
            {v}
          </Txt>
        </View>
      ))}
    </View>
  );
}

function LinkRow({ icon, label, onPress, last }: { icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line2, backgroundColor: pressed ? C.bgElevated : C.card })}>
      <Ionicons name={icon} size={19} color={C.ink} />
      <Txt f={font.bodySemi} size={14} color={C.ink} style={{ flex: 1, marginLeft: 12 }}>
        {label}
      </Txt>
      <Ionicons name="chevron-forward" size={16} color={C.muted2} />
    </Pressable>
  );
}
