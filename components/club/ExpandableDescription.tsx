import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  text: string;
  collapsedLines?: number;
}

export default function ExpandableDescription({ text, collapsedLines = 3 }: Props) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  if (!text || text.trim().length === 0) return null;

  return (
    <View style={styles.card}>
      <Text
        style={styles.text}
        numberOfLines={expanded ? undefined : collapsedLines}
        onTextLayout={(e) => {
          if (e.nativeEvent.lines.length > collapsedLines) setOverflows(true);
        }}
      >
        {text}
      </Text>
      {overflows && (
        <TouchableOpacity onPress={() => setExpanded((x) => !x)} hitSlop={6}>
          <Text style={styles.toggle}>
            {expanded ? t.clubDetails.showLess : t.clubDetails.showMore}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(20, 24, 35, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    gap: 6,
  },
  text: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    lineHeight: 21,
    color: '#A8B0BF',
  },
  toggle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12.5,
    color: '#00CFFF',
    marginTop: 2,
  },
});
