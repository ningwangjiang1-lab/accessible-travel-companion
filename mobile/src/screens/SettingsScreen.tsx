import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useTheme} from '../theme';
import {useAuthStore} from '../store/authStore';
import Card from '../components/Card/Card';
import Divider from '../components/Divider/Divider';

/**
 * SettingsScreen — 设置
 *
 * 页面结构：
 * 1. 通知设置
 * 2. 隐私与安全
 * 3. 通用
 * 4. 关于
 *
 * 依赖：Step 3 组件库、Step 5 authStore
 */

interface SettingRow {
  icon: string;
  label: string;
  type: 'toggle' | 'navigate' | 'info';
  value?: string;
  toggleKey?: string;
}

const SettingsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();
  const {user, profile} = useAuthStore();

  // ---- Toggle 状态 ----
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);

  const handleToggle = (key: string) => {
    switch (key) {
      case 'push': setPushEnabled(prev => !prev); break;
      case 'sms': setSmsEnabled(prev => !prev); break;
      case 'sound': setSoundEnabled(prev => !prev); break;
      case 'vibrate': setVibrateEnabled(prev => !prev); break;
    }
  };

  const toggleValue = (key: string): boolean => {
    switch (key) {
      case 'push': return pushEnabled;
      case 'sms': return smsEnabled;
      case 'sound': return soundEnabled;
      case 'vibrate': return vibrateEnabled;
      default: return false;
    }
  };

  /** 清除缓存 */
  const handleClearCache = () => {
    Alert.alert('清除缓存', '清除后不会丢失个人数据，但需重新加载部分内容。确定继续？', [
      {text: '取消', style: 'cancel'},
      {
        text: '清除',
        onPress: () => {
          Alert.alert('✅ 已清除', '缓存已清除');
        },
      },
    ]);
  };

  /** 功能占位 */
  const handleComingSoon = (feature: string) => {
    Alert.alert('提示', `${feature}功能将在后续版本中开放`);
  };

  // ---- 设置分组 ----
  const sections: {title: string; items: SettingRow[]}[] = [
    {
      title: '🔔 通知设置',
      items: [
        {icon: '📲', label: '推送通知', type: 'toggle', toggleKey: 'push'},
        {icon: '💬', label: '短信通知', type: 'toggle', toggleKey: 'sms'},
        {icon: '🔊', label: '声音提醒', type: 'toggle', toggleKey: 'sound'},
        {icon: '📳', label: '振动', type: 'toggle', toggleKey: 'vibrate'},
      ],
    },
    {
      title: '🔒 隐私与安全',
      items: [
        {icon: '🔑', label: '修改密码', type: 'navigate'},
        {icon: '📱', label: '设备管理', type: 'navigate'},
        {icon: '📍', label: '位置权限', type: 'info', value: '已开启'},
        {icon: '📷', label: '相机权限', type: 'info', value: '未开启'},
      ],
    },
    {
      title: '⚙️ 通用',
      items: [
        {icon: '🌐', label: '语言', type: 'info', value: '简体中文'},
        {icon: '🗑️', label: '清除缓存', type: 'navigate'},
        {icon: '📊', label: '数据用量', type: 'navigate'},
      ],
    },
    {
      title: 'ℹ️ 关于',
      items: [
        {icon: '📋', label: '用户协议', type: 'navigate'},
        {icon: '🔏', label: '隐私政策', type: 'navigate'},
        {icon: '📖', label: '帮助中心', type: 'navigate'},
        {icon: '💬', label: '意见反馈', type: 'navigate'},
        {icon: '📦', label: '版本', type: 'info', value: 'v1.0.0 (Beta)'},
      ],
    },
  ];

  return (
    <View style={[styles.flex, {backgroundColor: colors.bg}]}>
      {/* ============================================================ */}
      {/* 页头 */}
      {/* ============================================================ */}
      <View style={[styles.header, {backgroundColor: colors.primary}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backBtn, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
            onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, marginLeft: 12}]}>
            ⚙️ 设置
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ============================================================ */}
        {/* 用户信息摘要 */}
        {/* ============================================================ */}
        <Card variant="card" style={{marginBottom: spacing.lg}}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={[styles.avatarPlaceholder, {backgroundColor: colors.primaryLight, borderRadius: borderRadius.full}]}>
              <Text style={{color: colors.primary, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}}>
                {(user?.name || user?.phone || '?')[0]}
              </Text>
            </View>
            <View style={{marginLeft: spacing.md, flex: 1}}>
              <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
                {user?.name || '未设置姓名'}
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginTop: 2}}>
                {user?.phone || ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
              <Text style={{color: colors.primary, fontSize: fontSize.sm}}>编辑 ›</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ============================================================ */}
        {/* 设置分组 */}
        {/* ============================================================ */}
        {sections.map((section, si) => (
          <View key={si} style={{marginBottom: si < sections.length - 1 ? spacing.lg : spacing.md}}>
            <Text style={[styles.sectionTitle, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
              {section.title}
            </Text>
            <Card variant="card">
              {section.items.map((item, ii) => (
                <React.Fragment key={item.label}>
                  {ii > 0 && <Divider />}
                  <TouchableOpacity
                    style={styles.settingRow}
                    activeOpacity={item.type === 'info' ? 1 : 0.5}
                    onPress={() => {
                      if (item.type === 'toggle') {
                        handleToggle(item.toggleKey!);
                      } else if (item.type === 'navigate') {
                        if (item.label === '清除缓存') {
                          handleClearCache();
                        } else {
                          handleComingSoon(item.label);
                        }
                      }
                    }}>
                    <Text style={{fontSize: fontSize.base, marginRight: spacing.md}}>{item.icon}</Text>
                    <Text style={{color: colors.textPrimary, fontSize: fontSize.base, flex: 1}}>
                      {item.label}
                    </Text>
                    {item.type === 'toggle' && (
                      <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={() => handleToggle(item.toggleKey!)}>
                        <View
                          style={[
                            styles.toggle,
                            {
                              backgroundColor: toggleValue(item.toggleKey!) ? colors.primary : colors.borderLight,
                              borderRadius: borderRadius.full,
                            },
                          ]}>
                          <View
                            style={[
                              styles.toggleKnob,
                              {
                                backgroundColor: colors.textInverse,
                                alignSelf: toggleValue(item.toggleKey!) ? 'flex-end' : 'flex-start',
                              },
                            ]}
                          />
                        </View>
                      </TouchableOpacity>
                    )}
                    {item.type === 'navigate' && (
                      <Text style={{color: colors.textTertiary, fontSize: fontSize.lg}}>›</Text>
                    )}
                    {item.type === 'info' && (
                      <Text style={{color: colors.textTertiary, fontSize: fontSize.sm}}>{item.value}</Text>
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </Card>
          </View>
        ))}

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // ---- 页头 ----
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    lineHeight: 28,
  },
  // ---- 用户信息 ----
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ---- 分区 ----
  sectionTitle: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  // ---- 设置行 ----
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  // ---- Toggle ----
  toggle: {
    width: 48,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});

export default SettingsScreen;
