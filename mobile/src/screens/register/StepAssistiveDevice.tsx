import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../../theme';
import TypeSelector from '../../components/TypeSelector/TypeSelector';
import type {TypeOption} from '../../components/TypeSelector/TypeSelector';

/**
 * Step 2：选择辅助器具
 *
 * 6 种辅具选择：
 * - 轮椅 / 拐杖 / 盲杖 / 导盲犬 / 助听器 / 无需辅具
 */

const DEVICE_OPTIONS: TypeOption[] = [
  {value: 'wheelchair', icon: '🦽', label: '轮椅', description: '手动或电动轮椅'},
  {value: 'crutches', icon: '🩼', label: '拐杖', description: '腋下拐或手杖'},
  {value: 'cane', icon: '🦯', label: '盲杖', description: '视障导航用'},
  {value: 'guide_dog', icon: '🦮', label: '导盲犬', description: '导盲犬陪同出行'},
  {value: 'hearing_aid', icon: '🦻', label: '助听器', description: '助听设备'},
  {value: 'none', icon: '🚶', label: '无需辅具', description: '不使用辅助器具'},
];

interface StepAssistiveDeviceProps {
  value: string;
  onChange: (value: string) => void;
}

const StepAssistiveDevice: React.FC<StepAssistiveDeviceProps> = ({value, onChange}) => {
  const {colors, fontSize, fontWeight, spacing} = useTheme();

  return (
    <View>
      <Text
        style={[
          styles.heading,
          {color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, marginBottom: spacing.sm},
        ]}>
        使用哪些辅助器具？
      </Text>
      <Text
        style={[
          styles.subheading,
          {color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.xl},
        ]}>
        这将帮助我们规划更合适的无障碍路线
      </Text>
      <TypeSelector
        options={DEVICE_OPTIONS}
        selectedValue={value || undefined}
        onSelect={onChange}
      />
      {/* 跳过按钮 */}
      <Text
        style={{
          textAlign: 'center',
          color: colors.textTertiary,
          fontSize: fontSize.xs,
          marginTop: spacing.lg,
        }}>
        可稍后在个人中心修改
      </Text>
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

export default StepAssistiveDevice;
