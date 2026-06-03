import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../../theme';
import TypeSelector from '../../components/TypeSelector/TypeSelector';
import type {TypeOption} from '../../components/TypeSelector/TypeSelector';

/**
 * Step 0：选择身份类型
 *
 * 仅 2 个选项，互斥无交集：
 * - ♿ 我是残障人士 → 继续选择残障类型、辅具
 * - 👤 我不是残障人士 → 跳过残障画像，直接设偏好
 *
 * 志愿者/专业陪护等角色在 App 内通过升级获得（非注册时选择）。
 */

export const IDENTITY_OPTIONS: TypeOption[] = [
  {
    value: 'disabled',
    icon: '♿',
    label: '我是残障人士',
    description: '需要无障碍导航、辅具适配和出行陪伴服务',
  },
  {
    value: 'non_disabled',
    icon: '👤',
    label: '我不是残障人士',
    description: '使用设施查询等功能，也可申请成为志愿者或陪护',
  },
];

interface StepIdentityProps {
  value: string;
  onChange: (value: string) => void;
}

const StepIdentity: React.FC<StepIdentityProps> = ({value, onChange}) => {
  const {colors, fontSize, fontWeight, spacing} = useTheme();

  return (
    <View>
      <Text
        style={[
          styles.heading,
          {color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, marginBottom: spacing.sm},
        ]}>
        选择您的身份
      </Text>
      <Text
        style={[
          styles.subheading,
          {color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.xl},
        ]}>
        我们将根据您的身份提供最适合的出行服务
      </Text>
      <TypeSelector
        options={IDENTITY_OPTIONS}
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

export default StepIdentity;
