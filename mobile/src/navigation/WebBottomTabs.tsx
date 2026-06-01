/**
 * WebBottomTabs — Web 平台专用 Bottom Tab Navigator
 *
 * 绕过 @react-navigation/bottom-tabs 的 Web 渲染路径（与 native-stack 同类问题），
 * 直接使用 React Navigation 的 useNavigationBuilder + TabRouter，
 * 用简单的 View 容器渲染 Tab 屏幕。
 *
 * API 与 createBottomTabNavigator 完全兼容。
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useNavigationBuilder, createNavigatorFactory} from '@react-navigation/core';
import {TabRouter} from '@react-navigation/routers';

type Props = {
  id?: string;
  initialRouteName?: string;
  backBehavior?: string;
  children: React.ReactNode;
  screenOptions?: any;
  screenLayout?: any;
  screenListeners?: any;
  tabBar?: (props: any) => React.ReactNode;
  [key: string]: any;
};

/**
 * 默认 Tab Bar 渲染器
 */
function DefaultTabBar({
  state,
  descriptors,
  navigation,
}: {
  state: any;
  descriptors: any;
  navigation: any;
}) {
  return (
    <View style={defaultTabBarStyles.container}>
      {state.routes.map((route: any, index: number) => {
        const {options} = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const label =
          options.tabBarLabel !== undefined
            ? typeof options.tabBarLabel === 'function'
              ? options.tabBarLabel({focused: isFocused, color: isFocused ? '#2B7BD6' : '#9CA3AF', position: 'below-icon'})
              : options.tabBarLabel
            : options.title ?? route.name;

        const icon = options.tabBarIcon
          ? options.tabBarIcon({focused: isFocused, color: isFocused ? '#2B7BD6' : '#9CA3AF', size: 22})
          : null;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={defaultTabBarStyles.tabItem}
            accessibilityRole="button"
            accessibilityState={isFocused ? {selected: true} : {}}>
            {icon}
            {typeof label === 'string' ? (
              <Text
                style={[
                  defaultTabBarStyles.tabLabel,
                  {color: isFocused ? '#2B7BD6' : '#9CA3AF'},
                ]}>
                {label}
              </Text>
            ) : (
              label
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const defaultTabBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    height: 64,
    paddingBottom: 20,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});

/**
 * WebBottomTabsNavigator — 简单 View-based Tab 导航器
 */
function WebBottomTabsNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  screenOptions,
  screenLayout,
  screenListeners,
  tabBar: renderTabBar,
  ...rest
}: Props) {
  const {state, descriptors, navigation, NavigationContent: NavContent} =
    useNavigationBuilder(TabRouter, {

      id,
      initialRouteName,
      backBehavior,
      children,
      screenOptions,
      screenLayout,
      screenListeners,
      ...rest,
    } as any);

  
  const focusedRouteKey = state.routes[state.index]?.key;
  const [loadedTabs, setLoadedTabs] = React.useState<string[]>([focusedRouteKey]);

  React.useEffect(() => {
    if (focusedRouteKey && !loadedTabs.includes(focusedRouteKey)) {
      setLoadedTabs(prev => [...prev, focusedRouteKey]);
    }
  }, [focusedRouteKey, loadedTabs]);

  const tabBar = renderTabBar ? (
    renderTabBar({state, descriptors, navigation})
  ) : (
    <DefaultTabBar state={state} descriptors={descriptors} navigation={navigation} />
  );

  // 检查 tabBarPosition
  const focusedOptions = descriptors[focusedRouteKey]?.options || {};
  const tabBarPosition = focusedOptions.tabBarPosition || 'bottom';
  const tabBarStyle = focusedOptions.tabBarStyle as StyleProp<ViewStyle>;

  const tabBarElement = (
    <View key="tabbar" style={tabBarStyle}>
      {tabBar}
    </View>
  );

  return (
    <NavContent>
      <View style={webTabsStyles.container}>
        {(tabBarPosition === 'top' || tabBarPosition === 'left') ? tabBarElement : null}
        <View style={webTabsStyles.screenContainer}>
          {state.routes.map((route: any, index: number) => {
            const descriptor = descriptors[route.key];
            if (!descriptor) return null;

            const isFocused = state.index === index;
            const {lazy = true} = descriptor.options;

            // 懒加载：未访问过的 tab 不渲染
            if (lazy && !loadedTabs.includes(route.key) && !isFocused) {
              return null;
            }

            const {render} = descriptor;

            
            return (
              <View
                key={route.key}
                style={[
                  webTabsStyles.screen,
                  {display: isFocused ? 'flex' : 'none'},
                ]}>
                {render()}
              </View>
            );
          })}
        </View>
        {(tabBarPosition === 'bottom' || tabBarPosition === 'right') ? tabBarElement : null}
      </View>
    </NavContent>
  );
}

const webTabsStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  screen: {
    ...StyleSheet.absoluteFillObject,
  },
});

/**
 * createWebBottomTabNavigator — 与 createBottomTabNavigator API 兼容
 */
export function createWebBottomTabNavigator(config?: any): any {
  return createNavigatorFactory(WebBottomTabsNavigator)(config) as any;
}

export default createWebBottomTabNavigator;
