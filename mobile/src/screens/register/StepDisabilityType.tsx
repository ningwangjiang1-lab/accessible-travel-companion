import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../../theme';
import TypeSelector from '../../components/TypeSelector/TypeSelector';
import type {TypeOption} from '../../components/TypeSelector/TypeSelector';

/**
 * Step 1：选择残障类型
 *
 * 4 种类型卡片式选择：
 * - ♿ 肢体障碍
 * - 🦯 视障
 * - 🦻 听障
 * - 🧠 认知障碍
 */

const DISABILITY_OPTIONS: TypeOption[] = [
  {
    value: 'physical',
    icon: '♿',
    label: '肢体障碍',
    description: '使用轮椅/拐杖等辅具',
  },
  {
    value: 'visual',
    icon: '🦯',
    label: '视障',
    description: '需要语音导航与盲道指引',
  },
  {
    value: 'hearing',
    icon: '🦻',
    label: '听障',
    description: '需要文字提示与振动提醒',
  },
  {
    value: 'cognitive',
    icon: '🧠',
    label: '认知障碍',
    description: '需要简化界面与导航指引',
  },
];

interface StepDisabilityTypeProps {
  value: string;
  onChange: (value: string) => void;
}

const StepDisabilityType: React.FC<StepDisabilityTypeProps> = ({value, onChange}) => {
  const {colors, fontSize, fontWeight, spacing} = useTheme();

  return (
    <View>
      <Text
        style={[
          styles.heading,
          {color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, marginBottom: spacing.sm},
        ]}>
        选择您的出行需求
      </Text>
      <Text
        style={[
          styles.subheading,
          {color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.xl},
        ]}>
        我们将根据您的选择提供个性化的导航和陪伴服务
      </Text>
      <TypeSelector
        options={DISABILITY_OPTIONS}
        selectedValue={value}
        onSelect={onChange}
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

export default StepDisabilityType;
