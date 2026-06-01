import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../../theme';
import TypeSelector from '../../components/TypeSelector/TypeSelector';
import type {TypeOption} from '../../components/TypeSelector/TypeSelector';

/**
 * Step 3：导航偏好 + 字体偏好
 */

const NAV_OPTIONS: TypeOption[] = [
  {
    value: 'barrier_free',
    icon: '✅',
    label: '无障碍优先',
    description: '综合最优的无障碍路线',
  },
  {
    value: 'avoid_overpass',
    icon: '🌉',
    label: '避开天桥',
    description: '优先选择地下通道或斑马线',
  },
  {
    value: 'prefer_ramp',
    icon: '🔽',
    label: '优先坡道',
    description: '尽量走坡道而非台阶',
  },
  {
    value: 'flat_only',
    icon: '➡️',
    label: '只走平路',
    description: '完全避免台阶和陡坡',
  },
];

const FONT_OPTIONS: TypeOption[] = [
  {value: 'standard', icon: '🔤', label: '标准字号', description: '14-16px'},
  {value: 'large', icon: '🔠', label: '大字号', description: '放大 1.2 倍'},
  {value: 'extra_large', icon: '📢', label: '超大字号', description: '放大 1.5 倍'},
];

interface StepPreferencesProps {
  navPreference: string;
  fontPreference: string;
  onNavChange: (value: string) => void;
  onFontChange: (value: string) => void;
}

const StepPreferences: React.FC<StepPreferencesProps> = ({
  navPreference,
  fontPreference,
  onNavChange,
  onFontChange,
}) => {
  const {colors, fontSize, fontWeight, spacing} = useTheme();

  return (
    <View>
      {/* 导航偏好 */}
      <Text
        style={[
          styles.heading,
          {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, marginBottom: spacing.sm},
        ]}>
        导航偏好
      </Text>
      <Text
        style={[
          styles.subheading,
          {color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.md},
        ]}>
        选择适合您出行方式的路线规划偏好
      </Text>
      <TypeSelector
        options={NAV_OPTIONS}
        selectedValue={navPreference}
        onSelect={onNavChange}
      />

      {/* 分隔 */}
      <View style={{height: 32}} />

      {/* 字体偏好 */}
      <Text
        style={[
          styles.heading,
          {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, marginBottom: spacing.sm},
        ]}>
        字体大小
      </Text>
      <Text
        style={[
          styles.subheading,
          {color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.md},
        ]}>
        选择让您阅读舒适的字体大小
      </Text>
      <TypeSelector
        options={FONT_OPTIONS}
        selectedValue={fontPreference}
        onSelect={onFontChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  heading: {
    textAlign: 'center',
  },
  subheading: {
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default StepPreferences;
