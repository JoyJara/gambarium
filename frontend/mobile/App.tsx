import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, FlatList, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Cambia esta IP por la de tu computadora
const WS_URL = 'ws://192.168.1.159:8080';

type Reading = { tempC: number; tempF: number; ph?: number; ts: number };

type Msg =
  | { type: 'status'; message: string; at: number }
  | { type: 'reading'; tempC: number; tempF: number; ph?: number; ts: number };

export default function App() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [useCelsius, setUseCelsius] = useState(true);
  const [readings, setReadings] = useState<Reading[]>([]);

  const pushReading = (r: Reading) =>
    setReadings((prev) => {
      const next = [r, ...prev].slice(0, 60);
      return next;
    });

  useEffect(() => {
    let retryTimer: NodeJS.Timeout | null = null;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (ev) => {
        try {
          const msg: Msg = JSON.parse(String(ev.data));
          if (msg.type === 'reading') {
            pushReading({
              tempC: msg.tempC,
              tempF: msg.tempF,
              ph: msg.ph,
              ts: msg.ts,
            });
          }
        } catch {}
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        setConnected(false);
        if (!retryTimer) {
          retryTimer = setTimeout(connect, 1500);
        }
      };
    };

    connect();
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, []);

  const latest = readings[0];
  const valueTemp = useMemo(() => {
    if (!latest) return '--';
    return useCelsius ? `${latest.tempC.toFixed(2)} °C` : `${latest.tempF.toFixed(2)} °F`;
  }, [latest, useCelsius]);

  const valuePh = useMemo(() => {
    if (!latest || latest.ph === undefined) return '--';
    return latest.ph.toFixed(2);
  }, [latest]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <Text style={styles.title}>Acuario • Tiempo real</Text>
          <View style={[styles.badge, { backgroundColor: connected ? '#16a34a' : '#dc2626' }]}>
            <Text style={styles.badgeText}>{connected ? 'Online' : 'Offline'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Temperatura actual</Text>
          <Text style={styles.value}>{valueTemp}</Text>
          <Text style={styles.sub}>{latest ? new Date(latest.ts).toLocaleTimeString() : '—'}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.chip, useCelsius && styles.chipActive]} onPress={() => setUseCelsius(true)}>
              <Text style={[styles.chipText, useCelsius && styles.chipTextActive]}>°C</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, !useCelsius && styles.chipActive]} onPress={() => setUseCelsius(false)}>
              <Text style={[styles.chipText, !useCelsius && styles.chipTextActive]}>°F</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>pH actual</Text>
          <Text style={styles.value}>{valuePh}</Text>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Últimas lecturas</Text>
          <FlatList
            data={readings}
            keyExtractor={(item) => String(item.ts)}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <Text style={styles.itemTemp}>
                  {useCelsius ? `${item.tempC.toFixed(2)} °C` : `${item.tempF.toFixed(2)} °F`} | pH {item.ph?.toFixed(2) ?? '--'}
                </Text>
                <Text style={styles.itemTime}>{new Date(item.ts).toLocaleTimeString()}</Text>
              </View>
            )}
          />
        </View>

        <Text style={styles.footer}>Conectando a {WS_URL} ({Platform.OS})</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220' },
  contentWrapper: { flex: 1, paddingHorizontal: 20, paddingVertical: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: 'white', fontSize: 20, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: 'white', fontWeight: '700' },

  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  label: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  value: { color: 'white', fontSize: 48, fontWeight: '800', letterSpacing: 1 },
  sub: { color: '#9ca3af', marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#1f2937' },
  chipActive: { backgroundColor: 'white' },
  chipText: { color: '#9ca3af', fontWeight: '700' },
  chipTextActive: { color: '#111827' },

  listCard: { flex: 1, backgroundColor: '#111827', borderRadius: 16, padding: 16 },
  listTitle: { color: 'white', fontWeight: '700', fontSize: 16, marginBottom: 8 },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#374151',
  },
  itemTemp: { color: 'white', fontWeight: '600' },
  itemTime: { color: '#9ca3af' },
  footer: { textAlign: 'center', color: '#6b7280', marginTop: 8 },
});
