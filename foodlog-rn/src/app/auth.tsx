import * as Linking from 'expo-linking';
import { router } from 'expo-router';
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
  const { signInWithSession } = useFoodlog();
  const [error, setError] = useState('');
  // A cold start delivers the URL immediately and the effect can run twice in
  // development; make sure sign-in is only attempted once.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    // Wait for the URL - on a cold start it arrives a tick after mount.
    if (url === null) return;

    const callback = parseAuthCallback(url);

    if (!callback) {
      handled.current = true;
      setError('That sign-in link was incomplete. Please try again.');
      return;
    }

    handled.current = true;

    signInWithSession(callback.token, {
      id: callback.user.id || '',
      name: callback.user.name,
      email: callback.user.email,
      avatar: callback.user.avatar,
    })
      .then(() => router.replace('/'))
      .catch((e: any) => setError(e?.message || 'Could not finish signing you in.'));
  }, [url, signInWithSession]);

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
