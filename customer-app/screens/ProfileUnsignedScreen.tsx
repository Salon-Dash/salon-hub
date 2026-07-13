import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '../constants/design';
import { tabBarBottomOffset } from '../constants/layout';
import { colors, spacing } from '../constants/theme';
import type { FontFamilies } from '../types/fonts';
import { isValidEmail } from '../utils/email';
import { impactLight } from '../utils/haptics';

type Props = {
  fonts: FontFamilies;
  bookingGate?: boolean;
  onClose?: () => void;
  onSignedIn?: (
    payload:
      | { mode: 'login' | 'register'; fullName: string; email: string; password: string }
  ) => Promise<void>;
};

export function ProfileUnsignedScreen({ fonts, bookingGate, onClose, onSignedIn }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomPad = tabBarBottomOffset(insets) + 16;

  const onEmailChange = (t: string) => {
    setEmail(t);
    if (emailError) setEmailError(null);
  };

  const onContinue = () => {
    if (isSubmitting) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Please enter your email.');
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError('That doesn’t look like a valid email. Use a format like name@example.com.');
      return;
    }
    if (!password.trim() || password.trim().length < 8) {
      setEmailError('Password must be at least 8 characters.');
      return;
    }
    if (mode === 'register' && fullName.trim().length < 2) {
      setEmailError('Please add your full name.');
      return;
    }
    setEmailError(null);
    impactLight();
    setIsSubmitting(true);
    onSignedIn?.({
      mode: mode === 'register' ? 'register' : 'login',
      fullName: fullName.trim(),
      email: trimmed,
      password: password.trim(),
    })
      .catch((e: Error) => setEmailError(e.message))
      .finally(() => setIsSubmitting(false));
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerRow, { paddingTop: insets.top + 4 }]}>
          <View style={styles.headerSpacer} />
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
        </View>

        <Text style={[typography.screenTitle, { fontFamily: fonts.bold }]}>
          {bookingGate ? 'Continue booking' : mode === 'login' ? 'Log in' : 'Sign up'}
        </Text>
        <Text style={[styles.subtitle, typography.bodyMuted, { fontFamily: fonts.regular }]}>
          {bookingGate
            ? 'Sign in or create an account to finish your booking.'
            : 'Create an account or log in to book and manage your appointments'}
        </Text>

        <View style={styles.socialBlock}>
          <Pressable onPress={() => setMode('login')} style={[styles.modeBtn, mode === 'login' && styles.modeBtnOn]}>
            <Text style={[styles.modeText, { fontFamily: fonts.semibold }]}>Login</Text>
          </Pressable>
          <Pressable onPress={() => setMode('register')} style={[styles.modeBtn, mode === 'register' && styles.modeBtnOn]}>
            <Text style={[styles.modeText, { fontFamily: fonts.semibold }]}>Register</Text>
          </Pressable>
        </View>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={[styles.orText, { fontFamily: fonts.semibold }]}>OR</Text>
          <View style={styles.orLine} />
        </View>

        <Text style={[styles.fieldHint, typography.caption, { fontFamily: fonts.regular }]}>
          Enter your credentials to continue and manage your bookings.
        </Text>

        {mode === 'register' ? (
          <TextInput
            style={[styles.input, { fontFamily: fonts.regular, marginBottom: 8 }]}
            placeholder="Full name"
            placeholderTextColor={colors.textLight}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        ) : null}

        <TextInput
          style={[
            styles.input,
            emailError ? styles.inputError : null,
            { fontFamily: fonts.regular },
          ]}
          placeholder="Email address"
          placeholderTextColor={colors.textLight}
          value={email}
          onChangeText={onEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          accessibilityLabel="Email address"
          accessibilityHint="Used to send you a secure sign-in link"
        />
        <TextInput
          style={[
            styles.input,
            emailError ? styles.inputError : null,
            { fontFamily: fonts.regular, marginTop: 8 },
          ]}
          placeholder="Password"
          placeholderTextColor={colors.textLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        {mode === 'login' ? (
          <Pressable
            onPress={() =>
              Alert.alert(
                'Reset password',
                'Password reset is not available in the app yet. Use support or register a new account.',
              )
            }
            style={styles.forgotWrap}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
          >
            <Text style={[styles.forgotText, { fontFamily: fonts.semibold }]}>Forgot password?</Text>
          </Pressable>
        ) : null}
        {emailError ? (
          <Text
            style={[styles.fieldError, { fontFamily: fonts.regular }]}
            accessibilityLiveRegion="polite"
          >
            {emailError}
          </Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.continueBtn, pressed && styles.pressed]}
          onPress={onContinue}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Continue with email"
          {...(Platform.OS === 'android'
            ? { android_ripple: { color: 'rgba(255,255,255,0.22)' } }
            : {})}
        >
          <Text style={[styles.continueText, { fontFamily: fonts.bold }]}>
            {isSubmitting
              ? 'Please wait...'
              : mode === 'login'
                ? 'Log in'
                : 'Create account'}
          </Text>
        </Pressable>

        <View style={styles.footerLinks}>
          <Pressable
            style={styles.footerItem}
            onPress={() =>
              Linking.openURL('mailto:support@salon-hub.com?subject=Salon%20Hub%20support').catch(() => {})
            }
            accessibilityRole="button"
          >
            <Ionicons name="help-buoy-outline" size={18} color={colors.accent} style={styles.footerIcon} />
            <Text style={[styles.footerLinkText, { fontFamily: fonts.semibold }]}>Support</Text>
          </Pressable>
        </View>
        {/* Removed: "Sign in as a professional" (needs the dashboard URL) and the
            language switcher (i18n deferred) — both were dead no-op buttons. */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SocialRow({
  fonts,
  icon,
  label,
  onPress,
}: {
  fonts: FontFamilies;
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...(Platform.OS === 'android'
        ? { android_ripple: { color: 'rgba(0,0,0,0.06)' } }
        : {})}
    >
      <View style={styles.socialIconSlot}>{icon}</View>
      <Text style={[styles.socialLabel, { fontFamily: fonts.semibold }]}>{label}</Text>
      <View style={styles.socialIconSlot} />
    </Pressable>
  );
}

const ICON_SLOT = 36;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerSpacer: {
    flex: 1,
  },
  subtitle: {
    marginBottom: 24,
  },
  socialBlock: {
    marginBottom: 8,
    flexDirection: 'row',
    gap: 8,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 6,
  },
  forgotText: {
    fontSize: 14,
    color: colors.accent,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  modeBtnOn: {
    borderColor: colors.primaryButton,
    backgroundColor: '#f8f4ff',
  },
  modeText: { fontSize: 14, color: colors.text },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: colors.background,
  },
  socialIconSlot: {
    width: ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    minHeight: 1,
  },
  orText: {
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: 12,
  },
  fieldHint: {
    marginBottom: 10,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    fontSize: 16,
    color: colors.text,
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorSurface,
  },
  fieldError: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
    marginTop: 8,
    marginBottom: 4,
  },
  continueBtn: {
    backgroundColor: colors.primaryButton,
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  continueText: {
    color: '#ffffff',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.9,
  },
  businessBlock: {
    marginTop: 32,
    alignItems: 'center',
  },
  businessTitle: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  link: {
    fontSize: 16,
    color: colors.accent,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 36,
    paddingBottom: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  footerIcon: {
    marginRight: 6,
  },
  footerLinkText: {
    fontSize: 15,
    color: colors.accent,
  },
});
