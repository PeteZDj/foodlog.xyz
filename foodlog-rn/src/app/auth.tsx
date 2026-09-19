import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Mark } from '@/components/shared';
import { parseAuthCallback } from '@/data/auth-callback';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { Txt } from '@/ui';

/**
 * Deep-link landing screen for `foodlog://auth`.
 *
 * On Android the Google bridge's redirect is often handled by the OS rather
 * than being intercepted by the in-app auth session. Without a route at this
 * path, Expo Router showed "Unmatched Route" and sign-in dead-ended here.
 *
 * This screen finishes the job: it reads the token off the deep link, signs the
 * user in, and sends them into the app.
 */
export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const searchParams = useLocalSearchParams<{ token?: string; id?: string; name?: string; email?: string; user?: string }>();
  const { signInWithSession } = useFoodlog();
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    // Helper to finish sign in once callback payload is resolved
    const completeAuth = (callback: ReturnType<typeof parseAuthCallback>) => {
      if (!callback || handled.current) return;
      handled.current = true;
      signInWithSession(callback.token, {
        id: callback.user.id || '',
        name: callback.user.name,
        email: callback.user.email,
        avatar: callback.user.avatar,
      })
        .then(() => router.replace('/'))
        .catch((e: any) => setError(e?.message || 'Could not finish signing you in.'));
    };

    // 1. Check if Expo Router already parsed the query string into route params
    if (searchParams?.token) {
      const q = new URLSearchParams(searchParams as Record<string, string>).toString();
      const cb = parseAuthCallback(`foodlog://auth?${q}`);
      if (cb) {
        completeAuth(cb);
        return;
      }
    }

    // 2. Check full Linking URL (hash or query)
    if (url) {
      const cb = parseAuthCallback(url);
      if (cb) {
        completeAuth(cb);
        return;
      }
    }

    // 3. Fallback: check initial URL in case useURL() was not yet populated on cold start
    Linking.getInitialURL().then((initUrl) => {
      if (handled.current || !initUrl) return;
      const cb = parseAuthCallback(initUrl);
      if (cb) completeAuth(cb);
    }).catch(() => {});
  }, [url, searchParams, signInWithSession]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!handled.current) {
        setError('Sign-in took too long or was incomplete. Please try again.');
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 18 }}>
      <Mark size={28} />

      {error ? (
        <>
          <Txt f={font.bold} size={17} color={C.white} style={{ textAlign: 'center' }}>
            Sign-in didn't complete
          </Txt>
          <Txt size={14} color={C.white} style={{ textAlign: 'center', opacity: 0.7 }}>
            {error}
          </Txt>
          <Pressable
            onPress={() => router.replace('/login')}
            style={{ marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.pill, backgroundColor: C.white }}>
            <Txt f={font.bold} size={15} color={C.ink}>
              Back to sign in
            </Txt>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color={C.white} />
          <Txt size={15} color={C.white} style={{ opacity: 0.7 }}>
            Signing you in…
          </Txt>
        </>
      )}
    </View>
  );
}
