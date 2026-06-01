import React, {useEffect} from 'react';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import createStackNavigator from './createStack';
import {useTheme} from '../theme';
import {useAuthStore} from '../store/authStore';
import BottomTabNavigator from './BottomTabNavigator';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/register/RegisterScreen';

/**
 * 根导航参数
 */
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

/**
 * 启动加载页
 */
const SplashScreen: React.FC = () => {
  const {colors} = useTheme();
  return (
    <View style={[styles.splash, {backgroundColor: colors.bg}]}>
      <Text style={styles.splashIcon}>♿</Text>
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      <Text style={[styles.splashText, {color: colors.textTertiary}]}>加载中...</Text>
    </View>
  );
};

/**
 * RootNavigator — 根导航器
 *
 * 根据认证状态自动切换：
 * - isLoading → SplashScreen
 * - !isLoggedIn → Auth 流程（Login / Register）
 * - isLoggedIn → Main（Bottom Tabs）
 */
const RootNavigator: React.FC = () => {
  const {colors} = useTheme();
  const {isLoggedIn, isLoading, restoreSession} = useAuthStore();

  // App 启动时恢复登录态
  useEffect(() => {
    restoreSession();
  }, []);

  // 加载中
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: colors.primary,
          background: colors.bg,
          card: colors.surface,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.danger,
        },
        fonts: {
          regular: {fontFamily: 'System', fontWeight: '400'},
          medium: {fontFamily: 'System', fontWeight: '500'},
          bold: {fontFamily: 'System', fontWeight: '700'},
          heavy: {fontFamily: 'System', fontWeight: '800'},
        },
      }}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {isLoggedIn ? (
          // ---- 已登录：主界面 ----
          <Stack.Screen name="Main" component={BottomTabNavigator} />
        ) : (
          // ---- 未登录：认证流程 ----
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  splashText: {
    fontSize: 14,
  },
});

export default RootNavigator;
