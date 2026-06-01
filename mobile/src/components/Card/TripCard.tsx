import React from 'react';
import {View, Text, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';
import ProgressBar from '../ProgressBar/ProgressBar';

/**
 * TripCard 当前行程卡片
 *
 * 首页 Dashboard 使用，显示进行中的行程。
 *
 * UI 设计规范：
 * - 起点 · 终点 · 距离 · 时间 · 陪行人
 * - 进度线（绿→蓝→红渐变 90deg）
 */

export interface TripCardProps {
  /** 起点名称 */
  startLocation: string;
  /** 终点名称 */
  endLocation: string;
  /** 距离（如 "3.2km"） */
  distance: string;
  /** 预计时间（如 "25分钟"） */
  duration: string;
  /** 陪行人姓名 */
  companionName?: string;
  /** 行程进度 0-1 */
  progress?: number;
  /** 点击回调 */
  onPress?: () => void;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const TripCard: React.FC<TripCardProps> = ({
  startLocation,
  endLocation,
  distance,
  duration,
  companionName,
  progress = 0,
  onPress,
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...shadows.sm.ios,
          elevation: shadows.sm.android.elevation,
          marginBottom: spacing.md,
        },
        style,
      ]}>
      {/* 行程信息 */}
      <View style={{marginBottom: spacing.md}}>
        {/* 起点 */}
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm}}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.success,
              marginRight: spacing.sm,
            }}
          />
          <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, flex: 1}}>
            {startLocation}
          </Text>
        </View>

        {/* 进度线 + 距离 */}
        <View style={{flexDirection: 'row', marginBottom: spacing.sm, paddingLeft: 4}}>
          <ProgressBar
            progress={progress}
            height={4}
            gradientColors={[colors.success, colors.primary, colors.danger]}
            style={{flex: 1, alignSelf: 'center', marginLeft: 0}}
          />
        </View>

        {/* 终点 */}
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.danger,
              marginRight: spacing.sm,
            }}
          />
          <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, flex: 1}}>
            {endLocation}
          </Text>
        </View>
      </View>

      {/* 底部信息 */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
        }}>
        <Text style={{color: colors.textSecondary, fontSize: fontSize.xs}}>
          {distance} · {duration}
        </Text>
        {companionName ? (
          <Text style={{color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.medium as any}}>
            👤 {companionName}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export default TripCard;
