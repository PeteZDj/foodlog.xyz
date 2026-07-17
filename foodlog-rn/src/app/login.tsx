import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mark } from '@/components/shared';
import { AUTH_REDIRECT, GOOGLE_BRIDGE_URL } from '@/data/api';
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
  const [busy, setBusy] = useState<null | 'form' | 'google'>(null);
  const [error, setError] = useState('');

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
      const hash = result.url.split('#')[1] || result.url.split('?')[1] || '';
      const params = new URLSearchParams(hash);
      const token = params.get('token');
      if (!token) throw new Error('Google sign-in did not complete.');
      let avatar: string | undefined;
      const userB64 = params.get('user');
      const atob = (globalThis as any).atob as ((s: string) => string) | undefined;
      if (userB64 && typeof atob === 'function') {
        try {
          const u = JSON.parse(decodeURIComponent(escape(atob(userB64))));
          avatar = u.avatar;
        } catch { /* avatar optional */ }
      }
      await signInWithSession(token, {
        id: params.get('id') || undefined,
        name: params.get('name') || 'Foodlog user',
        email: params.get('email') || '',
        avatar,
      });
      router.replace('/');
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed. Please try again.');
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

        <Pressable
          onPress={googleSignIn}
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
          {busy === 'google' ? (
            <ActivityIndicator color={C.ink} />
          ) : (
            <>
              <Ionicons name="logo-google" size={19} color={C.ink} />
              <Txt f={font.bold} size={16} color={C.ink}>
                Continue with Google
              </Txt>
            </>
          )}
        </Pressable>

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
