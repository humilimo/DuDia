import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { getProductEmoji, getProductImageUrl } from "@/src/lib/utils/productImage";
import { useTheme, type Tokens } from "@/src/theme";

interface Props {
  name: string;
  photo?: string;
  size?: number;
}

export function ProductAvatar({ name, photo, size = 48 }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const emoji = getProductEmoji(name);
  const [imgFailed, setImgFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <View
      style={[styles.wrap, { width: size, height: size, borderRadius: size / 2.5 }]}
      accessibilityLabel={name}
      accessibilityRole="image"
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.image} />
      ) : emoji ? (
        <Text style={{ fontSize: size * 0.55 }} accessible={false}>
          {emoji}
        </Text>
      ) : !imgFailed ? (
        <Image
          source={{ uri: getProductImageUrl(name) }}
          style={styles.image}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.45 }]}>{initial}</Text>
      )}
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    wrap: {
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: t.palette.primarySoft,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    initial: {
      fontWeight: "900",
      color: t.palette.primary,
    },
  });
}
