import React, { useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, spacing, typography } from '../theme';

function parseToDate(iso: string): Date {
  const t = iso?.trim();
  if (t && /^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return new Date(`${t}T12:00:00`);
  }
  return new Date();
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEB_DATE_INPUT_STYLE: Record<string, string | number> = {
  width: '100%',
  padding: '12px 16px',
  fontSize: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: colors.primary[100],
  color: colors.text.primary,
  backgroundColor: colors.background.white,
  boxSizing: 'border-box',
  outlineWidth: 0,
};

function formatDisplay(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return '';
  return parseToDate(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type Props = {
  label: string;
  value: string;
  onChange: (isoYYYYMMDD: string) => void;
  disabled?: boolean;
  hint?: string;
};

/** Native calendar on iOS/Android; browser date picker on web. */
export function CalendarDateField({ label, value, onChange, disabled, hint }: Props) {
  const [open, setOpen] = useState(false);
  const pickerValue = useMemo(() => parseToDate(value), [value]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        <AppText style={styles.label}>{label}</AppText>
        {React.createElement('input', {
          type: 'date',
          value: value?.trim() || '',
          disabled: disabled ?? false,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
          style: WEB_DATE_INPUT_STYLE as React.CSSProperties,
        })}
        {hint ? <AppText style={styles.hint}>{hint}</AppText> : null}
      </View>
    );
  }

  const display = formatDisplay(value);

  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>{label}</AppText>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display || 'no date selected'}`}
      >
        <AppText style={[styles.triggerText, !display && styles.triggerPlaceholder]}>
          {display || 'Select date'}
        </AppText>
        <Ionicons name="calendar-outline" size={22} color={colors.logo.chambray} />
      </TouchableOpacity>
      {hint ? <AppText style={styles.hint}>{hint}</AppText> : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHeader}>
                <AppText style={styles.sheetTitle}>{label}</AppText>
                <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                  <AppText style={styles.done}>Done</AppText>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="inline"
                onChange={(_, d) => {
                  if (d) onChange(toISODate(d));
                }}
                themeVariant="light"
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          onChange={(ev, d) => {
            setOpen(false);
            if (ev.type === 'set' && d) onChange(toISODate(d));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs / 2,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.white,
  },
  triggerDisabled: {
    opacity: 0.55,
  },
  triggerText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  triggerPlaceholder: {
    color: colors.text.secondary,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary[100],
  },
  sheetTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  done: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.logo.chambray,
  },
});
