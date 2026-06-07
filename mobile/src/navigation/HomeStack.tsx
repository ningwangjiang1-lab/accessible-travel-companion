import React from 'react';
import createStackNavigator from './createStack';
import HomeScreen from '../screens/HomeScreen';
import FacilitySearchScreen from '../screens/FacilitySearchScreen';
import ReportFacilityScreen from '../screens/ReportFacilityScreen';
import SOSScreen from '../screens/SOSScreen';
import {useTheme} from '../theme';

/**
 * 首页 Stack Navigator
 *
 * 管理首页 Tab 下的所有子页面路由。
 */
export type HomeStackParamList = {
  HomeMain: undefined;
  FacilitySearch: {query?: string} | undefined;
  ReportFacility: undefined;
  SOS: undefined;
};

const Stack = createStackNavigator<HomeStackParamList>();

const HomeStack: React.FC = () => {
  const {colors} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: colors.bg},
      }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="FacilitySearch" component={FacilitySearchScreen} />
      <Stack.Screen name="ReportFacility" component={ReportFacilityScreen} />
      <Stack.Screen name="SOS" component={SOSScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;
