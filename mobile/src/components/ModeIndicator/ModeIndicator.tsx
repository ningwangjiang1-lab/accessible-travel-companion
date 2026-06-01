import React from 'react';
import {View, Text, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';

/**
 * ModeIndicator 当前模式指示器
 *
 * 显示用户当前的残障模式标签。只读显示，根据注册信息自动确定。
 *
 * 4 种模式：
 * - physical     ♿ 肢体障碍模式
 * - visual       🦯 视障模式
 * - hearing      🦻 听障模式
 * - cognitive    🧠 认知障碍模式
 *
 * UI 设计规范：
 * - 背景半透明胶囊
 * - 图标 + 文字
 */

export type DisabilityMode = 'physical' | 'visual' | 'hearing' | 'cognitive';

export interface ModeIndicatorProps {
  /** 残障模式 */
  mode: DisabilityMode;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const MODE_CONFIG: Record<DisabilityMode, {icon: string; label: string}> = {
  physical: {icon: '♿', label: '肢体障碍模式'},
  visual: {icon: '🦯', label: '视障模式'},
  hearing: {icon: '🦻', label: '听障模式'},
  cognitive: {icon: '🧠', label: '认知障碍模式'},
};

const ModeIndicator: React.FC<ModeIndicatorProps> = ({
  mode,
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight, borderRadius} = useTheme();
  const config = MODE_CONFIG[mode];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.primaryLight,
          borderRadius: borderRadius.full,
          paddingVertical: 6,
          paddingHorizontal: 12,
          alignSelf: 'flex-start',
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel ?? config.label}
      accessibilityRole="text">
      <Text style={{fontSize: fontSize.base, marginRight: 4}}>{config.icon}</Text>
      <Text
        style={{
          color: colors.primary,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium as any,
        }}>
        {config.label}
      </Text>
    </View>
  );
};

export default ModeIndicator;
