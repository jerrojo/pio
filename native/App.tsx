import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageCode } from './lib/types';
import { LanguagePairing } from './screens/LanguagePairing';
import { Conversation } from './screens/Conversation';
import { colors } from './lib/theme';

interface Pair {
  native: LanguageCode;
  target: LanguageCode;
}

const PAIR_KEY = 'pio-pair-v1';

/**
 * Pío nativo: dos pantallas. El par de idiomas se recuerda entre sesiones;
 * cambiarlo siempre está a un toque desde la conversación.
 */
export default function App() {
  const [pair, setPair] = useState<Pair | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PAIR_KEY)
      .then(raw => {
        if (raw) setPair(JSON.parse(raw) as Pair);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const start = (native: LanguageCode, target: LanguageCode) => {
    const next = { native, target };
    setPair(next);
    AsyncStorage.setItem(PAIR_KEY, JSON.stringify(next)).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {!ready ? null : pair ? (
        <Conversation
          userLanguage={pair.native}
          targetLanguage={pair.target}
          onChangeLanguages={() => setPair(null)}
        />
      ) : (
        <LanguagePairing onStart={start} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
