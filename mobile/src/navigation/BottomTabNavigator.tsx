import React from 'react';
import {Text, StyleSheet, View} from 'react-native';
import createBottomTabNavigator from './createBottomTab';
import HomeStack from './HomeStack';
import AIStack from './AIStack';
import CompanionStack from './CompanionStack';
import MessagesStack from './MessagesStack';
import ProfileStack from './ProfileStack';
import {colors, fontSize, fontWeight, spacing, borderRadius} from '../theme';

/**
 * Bottom Tab 路由参数定义
 */
export type BottomTabParamList = {
  HomeTab: undefined;
  AITab: undefined;
  CompanionTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

/**
 * Tab 配置
 *
 * UI 设计规范：
 * - 图标 22px emoji + 文字 10px
 * - 未选中色 #9CA3AF，选中色 #2B7BD6，选中字重 700
 * - 背景白色，顶部分割线 1px solid #E5E7EB
 * - Tab Bar 高度 64px
 */
const TAB_CONFIG: {
  name: keyof BottomTabParamList;
  component: React.FC;
  icon: string;
  label: string;
}[] = [
  {
    name: 'HomeTab',
    component: HomeStack,
    icon: '🏠',
    label: '首页',
  },
  {
    name: 'AITab',
    component: AIStack,
    icon: '🤖',
    label: 'AI伴行',
  },
  {
    name: 'CompanionTab',
    component: CompanionStack,
    icon: '🤝',
    label: '真人伴行',
  },
  {
    name: 'MessagesTab',
    component: MessagesStack,
    icon: '💬',
    label: '消息',
  },
  {
    name: 'ProfileTab',
    component: ProfileStack,
    icon: '👤',
    label: '我的',
  },
];

const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * Tab Bar 图标组件
 * 使用 emoji 文字渲染图标（后续可替换为 SVG 图标）
 */
const TabIcon: React.FC<{icon: string; focused: boolean}> = ({icon, focused}) => (
  <Text
    style={[
      styles.tabIcon,
      {opacity: focused ? 1.0 : 0.65},
    ]}>
    {icon}
  </Text>
);

/**
 * Tab Bar 标签组件
 */
const TabLabel: React.FC<{label: string; focused: boolean}> = ({label, focused}) => (
  <Text
    style={[
      styles.tabLabel,
      {
        color: focused ? colors.primary : colors.textTertiary,
        fontWeight: focused ? (fontWeight.bold as any) : (fontWeight.medium as any),
      },
    ]}>
    {label}
  </Text>
);

/**
 * BottomTabNavigator — 主导航
 *
 * 5 个 Tab：
 * - 🏠 首页  (HomeStack)
 * - 🤖 AI伴行 (AIStack)
 * - 🤝 真人伴行 (CompanionStack)
 * - 💬 消息  (MessagesStack)
 * - 👤 我的  (ProfileStack)
 */
const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // 各 Stack 自行管理 Header
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
      }}>
      {TAB_CONFIG.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: ({focused}) => (
              <TabLabel label={tab.label} focused={focused} />
            ),
            tabBarIcon: ({focused}) => (
              <TabIcon icon={tab.icon} focused={focused} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: 20, // safe-bottom
    elevation: 0,
    shadowOpacity: 0,
  },
  tabIcon: {
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
  },
  tabLabel: {
    fontSize: fontSize['3xs'], // 10px
    lineHeight: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default BottomTabNavigator;
