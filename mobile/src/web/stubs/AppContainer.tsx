/**
 * Stub: react-native/Libraries/ReactNative/AppContainer
 *
 * Web 上无原生 AppContainer，用 View 替代。
 */

import React from 'react';
import {View} from 'react-native';

interface AppContainerProps {
  children?: React.ReactNode;
  [key: string]: any;
}

const AppContainer: React.FC<AppContainerProps> = ({children, ...props}) => {
  return React.createElement(View, {style: {flex: 1}, ...props}, children);
};

export default AppContainer;
