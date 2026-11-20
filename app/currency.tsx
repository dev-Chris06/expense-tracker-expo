/**
 * Choix de la devise (une seule pour toute l'app).
 *
 * Changer de devise ne convertit pas les montants avec un taux de change :
 * les chiffres déjà tapés restent les mêmes (5 000 F → 5 000 €). L'écran le
 * dit clairement avant de valider.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { CURRENCIES, type Currency } from "@/constants/currencies";
import { type Palette, useColors } from "@/constants/theme";
import { countTransactions } from "@/db/backup";
import { changeCurrency } from "@/db/settings";
import { setCurrentCurrency, useCurrency } from "@/utils/currency";
import { formatAmount, formatCount } from "@/utils/formatters";

/** 1 500 F, 1 500,50 € : montre si la devise a des centimes. */
function exampleAmount(currency: Currency): number {
  const factor = 10 ** currency.decimales;
  return 1500 * factor + (currency.decimales > 0 ? factor / 2 : 0);
}

export default function CurrencyScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const current = useCurrency();

  const apply = (next: Currency) => {
    try {
      changeCurrency(current, next);
      setCurrentCurrency(next.code);
      if (router.canGoBack()) router.back();
    } catch {
      Alert.alert("Changement impossible", "La devise n'a pas été changée. Réessaie.");
    }
  };

  const choose = (next: Currency) => {
    if (next.code === current.code) return;
    let count = 0;
    try {
      count = countTransactions();
    } catch {
      // On pose quand même la question, sans le nombre.
    }
    if (count === 0) {
      apply(next);
      return;
    }
    const example = 500_000 * 10 ** current.decimales;
    Alert.alert(
      `Passer en ${next.nom} ?`,
      `Tes ${formatCount(count)}, budgets et récurrences gardent leurs chiffres, sans taux de change : ` +
        `${formatAmount(example, current)} deviendra ${formatAmount(example * 10 ** (next.decimales - current.decimales), next)}.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Changer", onPress: () => apply(next) },
      ],
    );
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        La devise de tous tes montants. Choisis celle que tu utilises au quotidien.
      </Text>
      <View style={styles.card} accessibilityRole="radiogroup">
        {CURRENCIES.map((currency, index) => {
          const selected = currency.code === current.code;
          return (
            <Pressable
              key={currency.code}
              onPress={() => choose(currency)}
              style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${currency.nom}, ${currency.code}`}
            >
              <View style={styles.symbol}>
                <Text style={styles.symbolText} numberOfLines={1} adjustsFontSizeToFit>
                  {currency.symbole}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.name}>{currency.nom}</Text>
                <Text style={styles.code}>
                  {currency.code} · {formatAmount(exampleAmount(currency), currency)}
                </Text>
              </View>
              {selected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 12, paddingBottom: 32 },
    intro: { color: c.textMuted, fontSize: 14, lineHeight: 20, marginHorizontal: 4 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: "hidden",
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider },
    pressed: { opacity: 0.7 },
    symbol: {
      width: 44,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    symbolText: { color: c.text, fontSize: 15, fontWeight: "700" },
    flex: { flex: 1, gap: 2 },
    name: { color: c.text, fontSize: 15, fontWeight: "600" },
    code: { color: c.textMuted, fontSize: 13 },
  });
