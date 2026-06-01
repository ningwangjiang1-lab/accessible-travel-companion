import React from 'react';
import {TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';

/**
 * Tag 可选标签组件
 *
 * 支持选中/未选中/禁用三种状态。
 *
 * UI 设计规范：
 * - 内边距 8px 16px
 * - 圆角 9999px（胶囊形）
 * - 字号 14px
 * - 字重 500（默认）/ 700（选中）
 * - 边框 1.5px solid #E5E7EB
 * - 选中态：bg #E8F1FB, border #2B7BD6, text #2B7BD6
 */

export interface TagProps {
  /** 标签文本 */
  label: string;
  /** 是否选中 */
  selected?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击回调 */
  onPress?: () => void;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const Tag: React.FC<TagProps> = ({
  label,
  selected = false,
  disabled = false,
  onPress,
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight, borderRadius} = useTheme();

  const containerStyle: ViewStyle = {
    backgroundColor: selected ? colors.primaryLight : 'transparent',
    borderWidth: 1.5,
    borderColor: selected ? colors.primary : colors.border,
    borderRadius: borderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
    opacity: disabled ? 0.4 : 1,
  };

  const textStyle = {
    color: selected ? colors.primary : colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: (selected ? fontWeight.bold : fontWeight.medium) as any,
  };

  return (
    <TouchableOpacity
      style={[containerStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{selected, disabled}}>
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
};

export default Tag;
