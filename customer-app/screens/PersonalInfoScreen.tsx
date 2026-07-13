import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api';
import { fadePressed, shadow } from '../constants/design';
import { colors, spacing } from '../constants/theme';
import type { FontFamilies } from '../types/fonts';
import { impactLight } from '../utils/haptics';

type Props = {
  fonts: FontFamilies;
  token: string;
  name: string;
  email: string;
  onBack: () => void;
  onSaved?: (fullName: string) => void;
};

/** Editable view of the signed-in customer's account details (name + phone). */
export function PersonalInfoScreen({ fonts, token, name, email, onBack, onSaved }: Props) {
  const insets = useSafeAreaInsets();

  const initialParts = (name || '').trim().split(/\s+/).filter(Boolean);
  const [firstName, setFirstName] = useState(initialParts[0] ?? '');
  const [lastName, setLastName] = useState(initialParts.slice(1).join(' ') ?? '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the full profile (phone isn't in the auth snapshot) once on mount.
  useEffect(() => {
    let active = true;
    api
      .getProfile(token)
      .then((p) => {
        if (!active) return;
        if (p.firstName) setFirstName(p.firstName);
        if (p.lastName) setLastName(p.lastName);
        setPhone(p.phone ?? '');
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const save = async () => {
    if (!firstName.trim()) {
      Alert.alert('Name required', 'Please enter your first name.');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateProfile(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      onSaved?.(updated.fullName);
      Alert.alert('Saved', 'Your details have been updated.');
      onBack();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    autoCapitalize,
  }: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'phone-pad';
    autoCapitalize?: 'words' | 'none';
  }) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { fontFamily: fonts.regular }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
        style={[styles.input, { fontFamily: fonts.semibold }]}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              impactLight();
              onBack();
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, fadePressed(pressed)]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { fontFamily: fonts.bold }]}>Personal info</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.card}>
              <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
              <View style={styles.divider} />
              <Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
              <View style={styles.divider} />
              <Field
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Add a phone number"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </View>

            <View style={[styles.card, styles.readonlyCard]}>
              <Text style={[styles.fieldLabel, { fontFamily: fonts.regular }]}>Email</Text>
              <Text style={[styles.readonlyValue, { fontFamily: fonts.semibold }]}>{email || '—'}</Text>
              <Text style={[styles.readonlyNote, { fontFamily: fonts.regular }]}>
                Email can't be changed here. Contact support if you need to update it.
              </Text>
            </View>

            <Pressable
              onPress={save}
              disabled={saving}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Save changes"
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.saveBtnText, { fontFamily: fonts.semibold }]}>Save changes</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.screenHorizontal },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    ...shadow.card,
  },
  title: { fontSize: 24, color: colors.text },
  card: { backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, ...shadow.card },
  field: { paddingVertical: 12 },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  input: { fontSize: 16, color: colors.text, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  readonlyCard: { marginTop: 16, paddingVertical: 16 },
  readonlyValue: { fontSize: 16, color: colors.text, marginBottom: 8 },
  readonlyNote: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  saveBtn: {
    marginTop: 24,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, color: '#fff' },
});
