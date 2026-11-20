/**
 * Choix de la devise (une seule pour toute l'app), parmi toutes les devises
 * en usage dans le monde, avec recherche par nom, code ou pays. La devise du
 * pays réglé dans le téléphone est proposée en premier.
 *
 * Changer de devise ne convertit pas les montants avec un taux de change :
 * les chiffres déjà tapés restent les mêmes (5 000 F → 5 000 €). L'écran le
 * dit clairement avant de valider.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { CURRENCIES, type Currency } from "@/constants/currencies";
import { type Palette, useColors } from "@/constants/theme";
import { countTransactions } from "@/db/backup";
import { changeCurrency } from "@/db/settings";
import { setCurrentCurrency, useCurrency } from "@/utils/currency";
import { formatAmount, formatCount } from "@/utils/formatters";
import { detectLocalCurrency } from "@/utils/localCurrency";
import { currencyMatches } from "@/utils/search";

/** 1 500 F, 1 500,50 € : montre si la devise a des centimes. */
function exampleAmount(currency: Currency): number {
  const factor = 10 ** currency.decimales;
  return 1500 * factor + (currency.decimales > 0 ? factor / 2 : 0);
}

/** « Bénin, Burkina Faso, Côte d’Ivoire +5 » */
function countriesLabel(currency: Currency): string {
  const shown = currency.pays.slice(0, 3).join(", ");
  return currency.pays.length > 3
    ? `${shown} +${currency.pays.length - 3}`
    : shown;
}

export default function CurrencyScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const current = useCurrency();
  const [query, setQuery] = useState("");
  const [local] = useState(detectLocalCurrency);

  const results = useMemo(
    () => CURRENCIES.filter((c) => currencyMatches(c, query)),
    [query],
  );
  const searching = query.trim() !== "";

  const apply = (next: Currency) => {
    try {
      changeCurrency(current, next);
      setCurrentCurrency(next.code);
      if (router.canGoBack()) router.back();
    } catch {
      Alert.alert(
        "Changement impossible",
        "La devise n'a pas été changée. Réessaie.",
      );
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
    const example = 5000 * 10 ** current.decimales;
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

  const row = (
    currency: Currency,
    options: { first?: boolean; hint?: string } = {},
  ) => {
    const selected = currency.code === current.code;
    return (
      <Pressable
        onPress={() => choose(currency)}
        style={({ pressed }) => [
          styles.row,
          !options.first && styles.divider,
          pressed && styles.pressed,
        ]}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${currency.nom}, ${currency.code}`}
      >
        <View style={styles.symbol}>
          <Text
            style={styles.symbolText}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {currency.symbole}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.name}>{currency.nom}</Text>
          <Text style={styles.detail} numberOfLines={1}>
            {options.hint ??
              `${currency.code} · ${formatAmount(exampleAmount(currency), currency)}`}
          </Text>
          <Text style={styles.countries} numberOfLines={1}>
            {countriesLabel(currency)}
          </Text>
        </View>
        {selected && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </Pressable>
    );
  };

  // Hors de la liste : la recherche reste en haut quand on fait défiler.
  const searchBar = (
    <View style={styles.searchBar}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Pays ou devise (Bénin, euro, naira…)"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Rechercher un pays ou une devise"
        />
        {searching && (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Effacer"
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );

  const header = (
    <View style={styles.header}>
      {!searching && (
        <>
          <Text style={styles.section}>ACTUELLE</Text>
          <View style={styles.card}>{row(current, { first: true })}</View>
          {local && local.currency.code !== current.code && (
            <>
              <Text style={styles.section}>
                {local.country
                  ? `POUR TON PAYS (${local.country.toUpperCase()})`
                  : "POUR TON PAYS"}
              </Text>
              <View style={styles.card}>
                {row(local.currency, { first: true })}
              </View>
            </>
          )}
          <Text style={styles.section}>
            TOUTES LES DEVISES ({CURRENCIES.length})
          </Text>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.page}>
      {searchBar}
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.content}
        data={results}
        keyExtractor={(c) => c.code}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.listCard,
              index === 0 && styles.listTop,
              index === results.length - 1 && styles.listBottom,
            ]}
          >
            {row(item, { first: index === 0 })}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Aucune devise ne correspond à « {query.trim()} ».
          </Text>
        }
        initialNumToRender={20}
      />
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 16, paddingBottom: 32 },
    searchBar: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: c.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    header: { gap: 8, marginBottom: 8 },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
    },
    searchInput: { flex: 1, minHeight: 46, color: c.text, fontSize: 15 },
    section: {
      marginTop: 8,
      marginLeft: 4,
      color: c.textMuted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.6,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: "hidden",
    },
    listCard: {
      backgroundColor: c.surface,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: "hidden",
    },
    listTop: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    listBottom: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.divider,
    },
    pressed: { opacity: 0.7 },
    symbol: {
      width: 48,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    symbolText: { color: c.text, fontSize: 15, fontWeight: "700" },
    flex: { flex: 1, gap: 1 },
    name: { color: c.text, fontSize: 15, fontWeight: "600" },
    detail: { color: c.textMuted, fontSize: 13 },
    countries: { color: c.textMuted, fontSize: 12 },
    empty: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: "center",
      marginTop: 24,
    },
  });
