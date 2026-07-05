import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LanguageCode } from '../lib/types';
import { getAllLanguages } from '../lib/languages';
import { ENDONYMS, langAccent, langName, t } from '../lib/i18n';
import { colors } from '../lib/theme';

interface Props {
  onStart: (native: LanguageCode, target: LanguageCode) => void;
}

/**
 * Emparejamiento de idiomas: "Yo hablo" (chips con endónimos) y tarjetas
 * del idioma a aprender. Todo el copy sale de t() y reacciona al idioma
 * nativo elegido. Default: hablo inglés, aprendo español.
 */
export function LanguagePairing({ onStart }: Props) {
  const [native, setNative] = useState<LanguageCode>('en');
  const [target, setTarget] = useState<LanguageCode>('es');
  const languages = getAllLanguages();

  const pickNative = (code: LanguageCode) => {
    setNative(code);
    if (code === target) setTarget(code === 'es' ? 'en' : 'es');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t(native, 'pairingTitle')}</Text>
      <Text style={styles.subtitle}>{t(native, 'pairingSubtitle')}</Text>

      <Text style={styles.sectionLabel}>{t(native, 'pairingISpeak')}</Text>
      <View style={styles.chips}>
        {languages.map(l => {
          const active = l.code === native;
          return (
            <Pressable
              key={l.code}
              accessibilityLabel={t(native, 'pairingNativeAria')}
              onPress={() => pickNative(l.code)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={styles.chipFlag}>{l.flag}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {ENDONYMS[l.code]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>{t(native, 'pairingLearnLabel')}</Text>
      <View style={styles.cards}>
        {languages
          .filter(l => l.code !== native)
          .map(l => {
            const active = l.code === target;
            return (
              <Pressable
                key={l.code}
                onPress={() => setTarget(l.code)}
                style={[styles.card, active && styles.cardActive]}
              >
                <Text style={styles.cardFlag}>{l.flag}</Text>
                <View style={styles.cardTextWrap}>
                  <Text style={[styles.cardName, active && styles.cardNameActive]}>
                    {langName(native, l.code)}
                  </Text>
                  <Text style={styles.cardAccent}>{langAccent(native, l.code)}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]} />
              </Pressable>
            );
          })}
      </View>

      <Pressable style={styles.startBtn} onPress={() => onStart(native, target)}>
        <Text style={styles.startText}>{t(native, 'pairingStart')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 84, paddingBottom: 48 },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 36,
    marginBottom: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.iris, backgroundColor: 'rgba(139,156,249,0.12)' },
  chipFlag: { fontSize: 14 },
  chipText: { color: colors.textDim, fontSize: 14 },
  chipTextActive: { color: colors.text, fontWeight: '600' },
  cards: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  cardActive: { borderColor: colors.iris, backgroundColor: 'rgba(139,156,249,0.08)' },
  cardFlag: { fontSize: 28 },
  cardTextWrap: { flex: 1 },
  cardName: { color: colors.text, fontSize: 17, fontWeight: '600' },
  cardNameActive: { color: colors.iris },
  cardAccent: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  radioActive: { borderColor: colors.iris, backgroundColor: colors.iris },
  startBtn: {
    marginTop: 40,
    backgroundColor: colors.iris,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startText: { color: '#0a0c18', fontSize: 17, fontWeight: '700' },
});
