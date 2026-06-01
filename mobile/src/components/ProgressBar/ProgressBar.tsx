import React from 'react';
import {View, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';

/**
 * ProgressBar 进度条组件
 *
 * UI 设计规范：
 * - 高度 6px（可自定义）
 * - 背景 #E5E7EB
 * - 圆角 9999px
 * - 默认填充 #2B7BD6
 * - .success: #10B981
 * - .warning: #F59E0B
 * - 过渡 width 0.6s
 */

export type ProgressBarVariant = 'default' | 'success' | 'warning';

export interface ProgressBarProps {
  /** 进度值 0-1 */
  progress: number;
  /** 颜色变体 */
  variant?: ProgressBarVariant;
  /** 高度（默认 6px） */
  height?: number;
  /** 渐变填充色（用于路线进度线，覆盖 variant） */
  gradientColors?: string[];
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const variantColor: Record<ProgressBarVariant, string> = {
  default: '#2B7BD6',
  success: '#10B981',
  warning: '#F59E0B',
};

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = 'default',
  height = 6,
  gradientColors,
  style,
  accessibilityLabel,
}) => {
  const {colors} = useTheme();
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const fillColor = gradientColors ? undefined : variantColor[variant];

  return (
    <View
      style={[
        {
          height,
          backgroundColor: colors.border,
          borderRadius: 9999,
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel ?? `进度 ${Math.round(clampedProgress * 100)}%`}
      accessibilityRole="progressbar">
      {gradientColors ? (
        // 多色渐变填充（路线进度线）
        <View style={{flexDirection: 'row', height: '100%', width: `${clampedProgress * 100}%`}}>
          {gradientColors.map((color, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: color,
              }}
            />
          ))}
        </View>
      ) : (
        // 单色填充
        <View
          style={{
            height: '100%',
            width: `${clampedProgress * 100}%`,
            backgroundColor: fillColor,
            borderRadius: 9999,
          }}
        />
      )}
    </View>
  );
};

export default ProgressBar;
