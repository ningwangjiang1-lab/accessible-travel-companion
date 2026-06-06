import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../../theme';
import Tag from '../../components/Tag/Tag';
import TypeSelector from '../../components/TypeSelector/TypeSelector';
import type {TypeOption} from '../../components/TypeSelector/TypeSelector';

/**
 * Step 3：导航偏好（多选）+ 字体偏好（单选）
 */

const NAV_TAGS = [
  {value: 'barrier_free', icon: '✅', label: '完全无障碍'},
  {value: 'prefer_ramp', icon: '🔽', label: '偏好坡道'},
  {value: 'avoid_overpass', icon: '🌉', label: '避开天桥'},
  {value: 'flat_only', icon: '🟰', label: '仅平坦路'},
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

  // 解析已选导航偏好
  const selectedNav = navPreference
    ? navPreference.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const toggleNav = (value: string) => {
    const next = selectedNav.includes(value)
      ? selectedNav.filter(v => v !== value)
      : [...selectedNav, value];
    onNavChange(next.join(','));
  };

  return (
    <View>
      {/* 导航偏好（多选） */}
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
        可多选，选过的信息会自动保存到个人资料
      </Text>
      <View style={styles.tagsWrap}>
        {NAV_TAGS.map(tag => (
          <Tag
            key={tag.value}
            label={`${tag.icon} ${tag.label}`}
            selected={selectedNav.includes(tag.value)}
            onPress={() => toggleNav(tag.value)}
            style={{marginRight: spacing.sm, marginBottom: spacing.sm}}
          />
        ))}
      </View>

      {/* 分隔 */}
      <View style={{height: 32}} />

      {/* 字体偏好（单选） */}
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
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});

export default StepPreferences;
