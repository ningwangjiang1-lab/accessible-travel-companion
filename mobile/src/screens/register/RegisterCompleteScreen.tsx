import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../../theme';
import Button from '../../components/Button/Button';
import {useAuthStore} from '../../store/authStore';

/**
 * RegisterCompleteScreen — 注册完成页
 *
 * 显示欢迎信息 + 返回首页按钮。
 * 由于 authStore.isLoggedIn 已为 true，导航会自动切换到主界面。
 */

const RegisterCompleteScreen: React.FC<{navigation?: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing} = useTheme();
  const {profile} = useAuthStore();

  const modeLabel: Record<string, string> = {
    physical: '♿ 肢体障碍模式',
    visual: '🦯 视障模式',
    hearing: '🦻 听障模式',
    cognitive: '🧠 认知障碍模式',
    none: '👤 通用模式',
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.bg}]}>
      <View style={styles.inner}>
        <View style={[styles.iconCircle, {backgroundColor: colors.successLight}]}>
          <Text style={styles.iconText}>✅</Text>
        </View>

        <Text
          style={[
            styles.title,
            {color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.extrabold as any},
          ]}>
          注册完成！
        </Text>

        <Text
          style={[
            styles.desc,
            {color: colors.textSecondary, fontSize: fontSize.sm},
          ]}>
          欢迎加入无障碍出行陪伴平台
        </Text>

        {/* 当前模式 */}
        {profile && (
          <View
            style={[
              styles.modeTag,
              {
                backgroundColor: colors.primaryLight,
                borderRadius: 9999,
              },
            ]}>
            <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any}}>
              {modeLabel[profile.disability_type] || '已选择出行模式'}
            </Text>
          </View>
        )}

        <Text
          style={[
            styles.hint,
            {color: colors.textTertiary, fontSize: fontSize.xs},
          ]}>
          您可随时在"个人中心 → 用户画像"中修改偏好
        </Text>

        {/* 返回首页按钮 — 导航由 App.tsx 中的 isLoggedIn 状态自动控制 */}
        <View style={styles.btnArea}>
          <Button
            title="开始使用"
            variant="primary"
            size="block"
            onPress={() => {
              if (navigation) {
                navigation.reset({index: 0, routes: [{name: 'Main'}]});
              }
            }}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modeTag: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  hint: {
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 18,
  },
  btnArea: {
    width: '100%',
  },
});

export default RegisterCompleteScreen;
