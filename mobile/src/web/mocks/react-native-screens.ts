/**
 * react-native-screens Web Mock
 *
 * 基于 react-native-screens 自带的 .web.js 实现，
 * 补充缺失的 Tabs 等组件。
 */
import React from 'react';
import {View} from 'react-native';

// ---- 核心组件（基于真实 Screen.web.js） ----

export const InnerScreen = View;

// Screen — Web 上用 View + hidden 属性控制可见性
export class NativeScreen extends React.Component<any> {
  render() {
    const {active, activityState, style, enabled = true, ...rest} = this.props;
    if (enabled) {
      let state = activityState;
      if (active !== undefined && activityState === undefined) {
        state = active !== 0 ? 2 : 0;
      }
      return React.createElement(View, {
        hidden: state === 0,
        style: [style, {display: state !== 0 ? 'flex' : 'none'}],
        ...rest,
      });
    }
    return React.createElement(View, rest as any);
  }
}

export const Screen = NativeScreen;
export const ScreenContext = React.createContext(Screen);
export default Screen;

// ScreenStack — Web 上就是 View
export const ScreenStack = View;

// Header 配置组件 — Web 上无原生 header，渲染 null
export const ScreenStackHeaderConfig = () => null;
export const ScreenStackHeaderSubview = () => null;
export const ScreenStackHeaderBackButtonImage = () => null;
export const ScreenStackHeaderRightView = () => null;
export const ScreenStackHeaderLeftView = () => null;

// SearchBar
export const SearchBar = () => null;

// Tabs — Web 不支持原生 tabs，用空 View 替代
export const TabsScreen = () => null;
export const TabsHost = () => null;

// 工具函数
export const enableScreens = () => {};
export const screensEnabled = () => false;
export const NativeScreenContainer = View;
export const NativeScreenNavigationContainer = View;
export const ScreenContainer = View;
