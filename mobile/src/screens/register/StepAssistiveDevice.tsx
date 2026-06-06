import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../../theme';
import Tag from '../../components/Tag/Tag';

/**
 * Step 2：选择辅助器具（多选）
 */

const DEVICE_TAGS = [
  {value: '轮椅', icon: '🦽', label: '轮椅'},
  {value: '拐杖', icon: '🩼', label: '拐杖'},
  {value: '盲杖', icon: '🦯', label: '盲杖'},
  {value: '助听器', icon: '🦻', label: '助听器'},
  {value: '助行器', icon: '🚶', label: '助行器'},
  {value: '导盲犬', icon: '🦮', label: '导盲犬'},
];

interface StepAssistiveDeviceProps {
  /** 逗号分隔的已选值 */
  value: string;
  onChange: (value: string) => void;
}

const StepAssistiveDevice: React.FC<StepAssistiveDeviceProps> = ({value, onChange}) => {
  const {colors, fontSize, fontWeight, spacing} = useTheme();

  // 解析已选值
  const selected = value
    ? value.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const toggle = (deviceValue: string) => {
    const next = selected.includes(deviceValue)
      ? selected.filter(v => v !== deviceValue)
      : [...selected, deviceValue];
    onChange(next.join(','));
  };

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
        可多选，选过的信息会自动保存到个人资料
      </Text>
      <View style={styles.tagsWrap}>
        {DEVICE_TAGS.map(tag => (
          <Tag
            key={tag.value}
            label={`${tag.icon} ${tag.label}`}
            selected={selected.includes(tag.value)}
            onPress={() => toggle(tag.value)}
            style={{marginRight: spacing.sm, marginBottom: spacing.sm}}
          />
        ))}
      </View>
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

export default StepAssistiveDevice;
