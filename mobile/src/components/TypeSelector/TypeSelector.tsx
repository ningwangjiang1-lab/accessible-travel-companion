import React from 'react';
import {TouchableOpacity, View, Text, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';

/**
 * TypeSelector 类型选择器（2 列网格）
 *
 * 用于残障类型选择、陪行类型选择等场景。
 *
 * UI 设计规范：
 * - 2 列网格布局
 * - 卡片式选项：图标 + 标题 + 描述
 * - 选中态：蓝色边框 + 浅蓝背景
 * - 未选中态：灰色边框 + 白色背景
 */

export interface TypeOption {
  /** 选项标识 */
  value: string;
  /** emoji 图标 */
  icon: string;
  /** 标题 */
  label: string;
  /** 描述文字 */
  description?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export interface TypeSelectorProps {
  /** 选项列表 */
  options: TypeOption[];
  /** 当前选中值 */
  selectedValue?: string;
  /** 选中回调 */
  onSelect: (value: string) => void;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const TypeSelector: React.FC<TypeSelectorProps> = ({
  options,
  selectedValue,
  onSelect,
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight, borderRadius, spacing} = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.md,
        },
        style,
      ]}>
      {options.map(option => {
        const isSelected = selectedValue === option.value;
        const isDisabled = option.disabled;

        return (
          <TouchableOpacity
            key={option.value}
            style={{
              width: '47%', // 2 列网格（留出 gap 空间）
              backgroundColor: isSelected ? colors.primaryLight : colors.surface,
              borderRadius: borderRadius.lg,
              borderWidth: 2,
              borderColor: isSelected ? colors.primary : colors.border,
              padding: spacing.lg,
              alignItems: 'center',
              opacity: isDisabled ? 0.4 : 1,
            }}
            onPress={() => !isDisabled && onSelect(option.value)}
            disabled={isDisabled}
            activeOpacity={0.7}
            accessibilityLabel={`${option.label}${option.description ? ', ' + option.description : ''}`}
            accessibilityRole="button"
            accessibilityState={{selected: isSelected, disabled: isDisabled}}>
            <Text style={{fontSize: 32, marginBottom: spacing.sm}}>{option.icon}</Text>
            <Text
              style={{
                color: isSelected ? colors.primary : colors.textPrimary,
                fontSize: fontSize.base,
                fontWeight: (isSelected ? fontWeight.bold : fontWeight.medium) as any,
                textAlign: 'center',
                marginBottom: option.description ? spacing.xs : 0,
              }}>
              {option.label}
            </Text>
            {option.description ? (
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: fontSize.xs,
                  textAlign: 'center',
                }}>
                {option.description}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default TypeSelector;
