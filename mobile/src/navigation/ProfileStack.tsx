import React from 'react';
import createStackNavigator from './createStack';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import TripHistoryScreen from '../screens/TripHistoryScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';
import GeoFenceScreen from '../screens/GeoFenceScreen';
import VolunteerCertScreen from '../screens/VolunteerCertScreen';
import PaymentScreen from '../screens/PaymentScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {useTheme} from '../theme';

/**
 * 个人中心 Stack Navigator
 *
 * 页面结构：
 * - ProfileMain：个人中心主页
 * - EditProfile：编辑资料
 * - TripHistory：行程历史
 * - EmergencyContacts：紧急联系人
 * - GeoFence：电子围栏
 * - VolunteerCert：志愿者认证
 * - Payment：支付方式
 * - Settings：设置
 */
export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  TripHistory: undefined;
  EmergencyContacts: undefined;
  GeoFence: undefined;
  VolunteerCert: undefined;
  Payment: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<ProfileStackParamList>();

const ProfileStack: React.FC = () => {
  const {colors} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: colors.bg},
      }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}      />
      <Stack.Screen
        name="TripHistory"
        component={TripHistoryScreen}      />
      <Stack.Screen
        name="EmergencyContacts"
        component={EmergencyContactsScreen}      />
      <Stack.Screen
        name="GeoFence"
        component={GeoFenceScreen}      />
      <Stack.Screen
        name="VolunteerCert"
        component={VolunteerCertScreen}      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}      />
    </Stack.Navigator>
  );
};

export default ProfileStack;
