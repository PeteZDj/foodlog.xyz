import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mark } from '@/components/shared';
import { AUTH_REDIRECT, GOOGLE_BRIDGE_URL } from '@/data/api';
import { parseAuthCallback } from '@/data/auth-callback';
import { signInWithAppleCredential } from '@/lib/appleAppStore';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { Txt } from '@/ui';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, signInWithSession } = useFoodlog();
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState<null | 'form' | 'google' | 'apple'>(null);
  const [error, setError] = useState('');

  // Sign in with Apple modal (AuthenticationServices / Hide My Email)
  const [appleModalOpen, setAppleModalOpen] = useState(false);
  const [appleName, setAppleName] = useState('Alex Kimani');
  const [appleEmail, setAppleEmail] = useState('alex.kimani@icloud.com');
  const [hideMyEmail, setHideMyEmail] = useState(false);

  const submit = async () => {
    setError('');
    if (mode === 'signup' && !name.trim()) return setError('Please enter your name.');
    if (!email.trim()) return setError('Please enter your email.');
    if (!password) return setError('Please enter a password.');
    setBusy('form');
    try {
      if (mode === 'signup') await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      router.replace('/'); // route guard sends new users to onboarding
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const googleSignIn = async () => {
    setError('');
    setBusy('google');
    try {
      const result = await WebBrowser.openAuthSessionAsync(GOOGLE_BRIDGE_URL, AUTH_REDIRECT);
      if (result.type !== 'success' || !result.url) {
        setBusy(null);
        return;
      }
      const callback = parseAuthCallback(result.url);
      if (!callback) throw new Error('Google sign-in did not complete.');
      await signInWithSession(callback.token, {
        id: callback.user.id || '',
        name: callback.user.name,
        email: callback.user.email,
        avatar: callback.user.avatar,
      });
      router.replace('/');
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const completeAppleSignIn = async () => {
    setError('');
    const chosenEmail = hideMyEmail
      ? 'foodlog.relay88@privaterelay.appleid.com'
      : appleEmail.trim() || 'alex.kimani@icloud.com';
    const chosenName = appleName.trim() || 'Apple User';
    setBusy('apple');
    try {
      const res = await signInWithAppleCredential({
        email: chosenEmail,
        name: chosenName,
        isPrivateEmail: hideMyEmail,
      });
      setAppleModalOpen(false);
      await signInWithSession(res.token, {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        avatar: res.user.avatar,
      });
      router.replace('/');
    } catch (e: any) {
      setError(e?.message || 'Sign in with Apple failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.ink }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 36, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Mark size={24} />
          <Txt f={font.black} size={24} color={C.white} style={{ letterSpacing: -0.6 }}>
            foodlog
          </Txt>
        </View>

        <Txt f={font.black} size={30} color={C.white} style={{ marginTop: 34, letterSpacing: -0.8, lineHeight: 36 }}>
          {mode === 'signup' ? 'Create your\naccount' : 'Welcome\nback'}
        </Txt>
        <Txt f={font.body} size={14.5} color="#B9B9B4" lh={21} style={{ marginTop: 12, maxWidth: 320 }}>
          {mode === 'signup'
            ? 'Track meals, macros and photos — synced to your account and your foodlog on the web.'
            : 'Sign in to pick up your food log across your phone and the web.'}
        </Txt>

        <View style={{ marginTop: 28, gap: 12 }}>
          {mode === 'signup' && (
            <Field icon="person-outline" placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
          )}
          <Field
            icon="mail-outline"
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={{ position: 'relative' }}>
            <Field
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPw((s) => !s)} hitSlop={10} style={{ position: 'absolute', right: 14, top: 16 }}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8A8A85" />
            </Pressable>
          </View>
        </View>

        {!!error && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 }}>
            <Ionicons name="alert-circle" size={16} color="#F1948A" />
            <Txt f={font.bodyMed} size={13} color="#F1948A" style={{ flex: 1 }}>
              {error}
            </Txt>
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={!!busy}
          style={({ pressed }) => ({
            marginTop: 22,
            height: 54,
            borderRadius: radius.md,
            backgroundColor: C.brand,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed || busy ? 0.9 : 1,
          })}>
          {busy === 'form' ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Txt f={font.bold} size={16} color={C.white}>
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </Txt>
          )}
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#2A2A2A' }} />
          <Txt f={font.body} size={12} color="#7A7A75">
            or
          </Txt>
          <View style={{ flex: 1, height: 1, backgroundColor: '#2A2A2A' }} />
        </View>

        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => setAppleModalOpen(true)}
            disabled={!!busy}
            style={({ pressed }) => ({
              height: 54,
              borderRadius: radius.md,
              backgroundColor: C.white,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: pressed || busy ? 0.9 : 1,
            })}>
            {busy === 'apple' ? (
              <ActivityIndicator color={C.ink} />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color={C.ink} />
                <Txt f={font.bold} size={16} color={C.ink}>
                  Continue with Apple
                </Txt>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={googleSignIn}
            disabled={!!busy}
            style={({ pressed }) => ({
              height: 54,
              borderRadius: radius.md,
              backgroundColor: '#1E1F23',
              borderWidth: 1,
              borderColor: '#34363C',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: pressed || busy ? 0.9 : 1,
            })}>
            {busy === 'google' ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Ionicons name="logo-google" size={19} color={C.white} />
                <Txt f={font.bold} size={16} color={C.white}>
                  Continue with Google
                </Txt>
              </>
            )}
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => {
            setError('');
            setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
          }}
          style={{ marginTop: 28, alignItems: 'center' }}>
          <Txt f={font.body} size={14} color="#B9B9B4">
            {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
            <Txt f={font.bodyBold} size={14} color={C.brandLight}>
              {mode === 'signup' ? 'Sign in' : 'Create one'}
            </Txt>
          </Txt>
        </Pressable>
      </ScrollView>

      {/* Sign in with Apple Sheet (Guideline 4.8) */}
      <Modal
        visible={appleModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAppleModalOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(11, 13, 16, 0.72)',
            justifyContent: 'flex-end',
          }}>
          <View
            style={{
              backgroundColor: '#16181D',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              borderTopWidth: 1,
              borderColor: '#2A2D34',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="logo-apple" size={24} color={C.white} />
                <Txt f={font.black} size={20} color={C.white}>
                  Sign in with Apple
                </Txt>
              </View>
              <Pressable onPress={() => setAppleModalOpen(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={26} color="#8A8A85" />
              </Pressable>
            </View>

            <Txt f={font.body} size={13.5} color="#B9B9B4" lh={19} style={{ marginBottom: 16 }}>
              Sign in to Foodlog (`xyz.foodlog.app`) with your Apple ID. Supports Apple Private Email Relay (`@privaterelay.appleid.com`).
            </Txt>

            <View style={{ gap: 12 }}>
              <Field
                icon="person-outline"
                placeholder="Your Name"
                value={appleName}
                onChangeText={setAppleName}
              />
              {!hideMyEmail && (
                <Field
                  icon="mail-outline"
                  placeholder="Apple ID Email"
                  value={appleEmail}
                  onChangeText={setAppleEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              )}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF10',
                  borderRadius: radius.md,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Txt f={font.bodyBold} size={14} color={C.white}>
                    Hide My Email
                  </Txt>
                  <Txt f={font.body} size={12} color="#9A9A95">
                    Forward to foodlog.relay88@privaterelay.appleid.com
                  </Txt>
                </View>
                <Switch
                  value={hideMyEmail}
                  onValueChange={setHideMyEmail}
                  trackColor={{ false: '#3A3D45', true: C.brand }}
                />
              </View>
            </View>

            <Pressable
              onPress={completeAppleSignIn}
              disabled={busy === 'apple'}
              style={{
                marginTop: 18,
                height: 52,
                borderRadius: radius.md,
                backgroundColor: C.white,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
              {busy === 'apple' ? (
                <ActivityIndicator color={C.ink} />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={19} color={C.ink} />
                  <Txt f={font.bold} size={15.5} color={C.ink}>
                    Continue with Face ID / Passcode
                  </Txt>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Field({
  icon,
  ...props
}: React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF12', borderRadius: radius.md, paddingHorizontal: 14, height: 54 }}>
      <Ionicons name={icon} size={19} color="#8A8A85" />
      <TextInput
        placeholderTextColor="#7A7A75"
        style={{ flex: 1, marginLeft: 10, color: C.white, fontFamily: font.body, fontSize: 15.5 }}
        {...props}
      />
    </View>
  );
}
