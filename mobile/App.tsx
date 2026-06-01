import React from 'react';
import {StatusBar} from 'react-native';
import {ThemeProvider, useTheme} from './src/theme';
import RootNavigator from './src/navigation/RootNavigator';

/**
 * App 根组件
 *
 * 结构：
 * - ThemeProvider → 注入 Design Token
 * - StatusBar → 系统状态栏
 * - RootNavigator → 根据认证状态切换 Login/Main
 */
const AppContent: React.FC = () => {
  const {colors} = useTheme();

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.surface}
      />
      <RootNavigator />
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
