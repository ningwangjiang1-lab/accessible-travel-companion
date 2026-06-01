import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import {useTheme} from '../theme';
import {useAuthStore} from '../store/authStore';
import * as tripService from '../services/tripService';
import type {TripResult} from '../services/tripService';
import Avatar from '../components/Avatar/Avatar';
import Badge from '../components/Badge/Badge';
import Card from '../components/Card/Card';
import Divider from '../components/Divider/Divider';

/**
 * ProfileScreen — 个人中心
 *
 * 页面结构：
 * 1. 蓝色页头：头像 + 姓名 + 手机号 + 残障类型
 * 2. 统计行（行程数/陪行次数/评分）
 * 3. 功能菜单列表
 * 4. 退出登录
 *
 * 依赖：Step 5 authStore、Step 9 tripService
 */

/** 残障类型 → emoji + 中文 */
const DISABILITY_MAP: Record<string, {emoji: string; label: string}> = {
  physical: {emoji: '🦽', label: '肢体障碍'},
  visual: {emoji: '🦯', label: '视力障碍'},
  hearing: {emoji: '🦻', label: '听力障碍'},
  cognitive: {emoji: '🧠', label: '认知障碍'},
};

/** 导航偏好 → 中文 */
const NAV_MAP: Record<string, string> = {
  avoid_overpass: '避开天桥',
  prefer_ramp: '偏好坡道',
  flat_only: '仅平坦路面',
  barrier_free: '完全无障碍',
};

interface MenuItem {
  icon: string;
  label: string;
  screen?: string;
  color?: string;
}

const ProfileScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();
  const {user, profile, logout} = useAuthStore();

  const [tripCount, setTripCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadTripCount = useCallback(async () => {
    try {
      const trips = await tripService.getUserTrips(100, 0);
      setTripCount(trips.length);
    } catch {
      // 静默
    }
  }, []);

  React.useEffect(() => {
    loadTripCount();
  }, [loadTripCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTripCount();
    setRefreshing(false);
  }, [loadTripCount]);

  const disabilityInfo = profile ? DISABILITY_MAP[profile.disability_type] : null;

  const menuSections: {title?: string; items: MenuItem[]}[] = [
    {
      items: [
        {icon: '✏️', label: '编辑资料', screen: 'EditProfile'},
        {icon: '🆘', label: '紧急联系人', screen: 'EmergencyContacts'},
        {icon: '📍', label: '电子围栏', screen: 'GeoFence'},
      ],
    },
    {
      items: [
        {icon: '📋', label: '行程历史', screen: 'TripHistory'},
        {icon: '📜', label: '志愿者认证', screen: 'VolunteerCert'},
        {icon: '💳', label: '支付方式', screen: 'Payment'},
      ],
    },
    {
      items: [
        {icon: '⚙️', label: '设置', screen: 'Settings'},
        {icon: '❓', label: '帮助与反馈', screen: undefined},
      ],
    },
  ];

  /** 处理退出 */
  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出当前账号吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '退出',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.flex, {backgroundColor: colors.bg}]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }>

      {/* ============================================================ */}
      {/* 1. 页头 */}
      {/* ============================================================ */}
      <View style={[styles.header, {backgroundColor: colors.primary}]}>
        <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
          👤 我的
        </Text>

        {/* 用户信息卡片 */}
        <View style={[styles.userCard, {backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: borderRadius.lg}]}>
          <Avatar
            name={user?.name || user?.phone || '用户'}
            size="lg"
            style={{marginRight: spacing.md}}
          />
          <View style={{flex: 1}}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}}>
              {user?.name || '未设置姓名'}
            </Text>
            <Text style={{color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.85, marginTop: 2}}>
              📱 {user?.phone || '未绑定'}
            </Text>
            {disabilityInfo && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                <Badge
                  text={`${disabilityInfo.emoji} ${disabilityInfo.label}`}
                  variant="primary"
                />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.editBtn, {backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: borderRadius.full}]}
            onPress={() => navigation.navigate('EditProfile')}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.sm}}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. 统计行 */}
      {/* ============================================================ */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: -spacing.md}}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={{color: colors.primary, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}}>
              {tripCount}
            </Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>总行程</Text>
          </View>
          <View style={[styles.statDivider, {backgroundColor: colors.border}]} />
          <View style={styles.statItem}>
            <Text style={{color: colors.success, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}}>
              {tripCount > 0 ? Math.min(tripCount, 2) : 0}
            </Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>陪行次数</Text>
          </View>
          <View style={[styles.statDivider, {backgroundColor: colors.border}]} />
          <View style={styles.statItem}>
            <Text style={{color: colors.secondary, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}}>
              4.8
            </Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>评分</Text>
          </View>
        </View>
      </Card>

      {/* ============================================================ */}
      {/* 3. 导航偏好快捷信息 */}
      {/* ============================================================ */}
      {profile && (
        <Card variant="card-flat" style={{marginHorizontal: spacing.lg, marginTop: spacing.sm}}>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center'}}>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginRight: spacing.sm}}>
              出行偏好：
            </Text>
            <Badge text={NAV_MAP[profile.nav_preference] || profile.nav_preference} variant="success" />
            {profile.assistive_device && (
              <Badge text={`🦯 ${profile.assistive_device}`} variant="primary" style={{marginLeft: spacing.xs}} />
            )}
            <Badge
              text={`字号：${profile.font_preference === 'large' ? '大' : profile.font_preference === 'extra_large' ? '特大' : '标准'}`}
              variant="warning"
              style={{marginLeft: spacing.xs}}
            />
          </View>
        </Card>
      )}

      {/* ============================================================ */}
      {/* 4. 功能菜单 */}
      {/* ============================================================ */}
      {menuSections.map((section, si) => (
        <View key={si} style={{marginTop: si === 0 ? spacing.lg : spacing.md}}>
          <Card variant="card" style={{marginHorizontal: spacing.lg}}>
            {section.items.map((item, ii) => (
              <React.Fragment key={item.label}>
                {ii > 0 && <Divider />}
                <TouchableOpacity
                  style={styles.menuItem}
                  activeOpacity={0.5}
                  onPress={() => {
                    if (item.screen) {
                      navigation.navigate(item.screen);
                    } else {
                      Alert.alert('提示', `${item.label}功能将在后续版本中开放`);
                    }
                  }}>
                  <View style={styles.menuLeft}>
                    <Text style={{fontSize: fontSize.lg, marginRight: spacing.md}}>{item.icon}</Text>
                    <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any}}>
                      {item.label}
                    </Text>
                  </View>
                  <Text style={{color: colors.textTertiary, fontSize: fontSize.lg}}>›</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </Card>
        </View>
      ))}

      {/* ============================================================ */}
      {/* 5. 退出登录 */}
      {/* ============================================================ */}
      <View style={{marginHorizontal: spacing.lg, marginTop: spacing.lg}}>
        <TouchableOpacity
          style={[styles.logoutBtn, {borderColor: colors.danger, borderRadius: borderRadius.md}]}
          onPress={handleLogout}
          activeOpacity={0.6}>
          <Text style={{color: colors.danger, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
            退出登录
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // ---- 页头 ----
  header: {
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    marginBottom: 20,
    lineHeight: 28,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- 统计 ----
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
  },

  // ---- 菜单 ----
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ---- 退出 ----
  logoutBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1.5,
  },
});

export default ProfileScreen;
