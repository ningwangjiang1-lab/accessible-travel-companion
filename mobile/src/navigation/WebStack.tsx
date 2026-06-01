/**
 * WebStack — Web 平台专用 Stack Navigator
 *
 * 绕过 native-stack 的 Web 渲染路径（与 Vite 预构建存在兼容性问题），
 * 直接使用 React Navigation 的 useNavigationBuilder + StackRouter，
 * 用简单的 View 容器渲染屏幕。
 *
 * API 与 createNativeStackNavigator 完全兼容。
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigationBuilder, createNavigatorFactory} from '@react-navigation/core';
import {StackRouter} from '@react-navigation/routers';

type Props = {
  id?: string;
  initialRouteName?: string;
  children: React.ReactNode;
  screenOptions?: any;
  screenLayout?: any;
  screenListeners?: any;
  [key: string]: any;
};

/**
 * WebStackNavigator — 简单 View-based 栈导航器
 *
 * 解析 children 中的 Screen 配置（通过 useNavigationBuilder），
 * 用 display: none/flex 控制屏幕可见性。
 * 不使用 react-native-screens、SafeAreaProviderCompat 或 Animated。
 */
function WebStackNavigator({
  id,
  initialRouteName,
  children,
  screenOptions,
  screenLayout,
  screenListeners,
  ...rest
}: Props) {
  const {state, descriptors, NavigationContent: NavContent} =
    useNavigationBuilder(StackRouter, {
      id,
      initialRouteName,
      children,
      screenOptions,
      screenLayout,
      screenListeners,
      ...rest,
    } as any);

  return (
    <NavContent>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const isFocused = state.index === index;

          if (!descriptor) return null;

          const {render} = descriptor;

          return (
            <View
              key={route.key}
              style={[
                styles.screen,
                {display: isFocused ? 'flex' : 'none'},
              ]}>
              {render()}
            </View>
          );
        })}
      </View>
    </NavContent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    ...StyleSheet.absoluteFillObject,
  },
});

/**
 * createWebStackNavigator — 与 createNativeStackNavigator API 兼容
 */
export function createWebStackNavigator(config?: any): any {
  return createNavigatorFactory(WebStackNavigator)(config) as any;
}

export default createWebStackNavigator;
