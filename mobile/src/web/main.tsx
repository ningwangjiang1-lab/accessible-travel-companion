/**
 * Web 入口 — 无障碍出行陪伴平台
 *
 * 使用 WebStack Navigator 提供 Web 兼容的导航体验。
 */

import React from 'react';
import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '../theme';
import RootNavigator from '../navigation/RootNavigator';

function App() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');

const root = createRoot(container);
root.render(<App />);
