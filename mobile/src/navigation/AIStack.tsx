import React from 'react';
import createStackNavigator from './createStack';
import AIScreen from '../screens/AIScreen';
import NavigationScreen from '../screens/NavigationScreen';
import {useTheme} from '../theme';

/**
 * AI 伴行 Stack Navigator
 *
 * 页面结构：
 * - AIMain：AI 导航规划页（Step 7）
 * - Navigation：实时导航页（Step 8）
 */
export type AIStackParamList = {
  AIMain: undefined;
  /** Step 8 — 实时导航页，传入路线 ID */
  Navigation: {routeId: string};
};

const Stack = createStackNavigator<AIStackParamList>();

const AIStack: React.FC = () => {
  const {colors} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: colors.bg},
      }}>
      <Stack.Screen name="AIMain" component={AIScreen} />
      <Stack.Screen
        name="Navigation"
        component={NavigationScreen}      />
    </Stack.Navigator>
  );
};

export default AIStack;
