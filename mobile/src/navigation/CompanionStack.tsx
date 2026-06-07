import React from 'react';
import createStackNavigator from './createStack';
import CompanionScreen from '../screens/CompanionScreen';
import PublishTripScreen from '../screens/PublishTripScreen';
import MatchScreen from '../screens/MatchScreen';
import CompanionActiveScreen from '../screens/CompanionActiveScreen';
import RatingScreen from '../screens/RatingScreen';
import ProfessionalListScreen from '../screens/ProfessionalListScreen';
import PeerMatchingScreen from '../screens/PeerMatchingScreen';
import PublishPeerTripScreen from '../screens/PublishPeerTripScreen';
import {useTheme} from '../theme';

/**
 * 真人伴行 Stack Navigator
 *
 * 页面结构：
 * - CompanionMain：真人伴行主页（行程列表+发起入口）
 * - PublishTrip：行程发布页（Step 9）
 * - Match：智能匹配页（Step 10）
 * - CompanionActive：陪行中页面（Step 11，预留）
 * - Rating：评价页（Step 12，预留）
 * - ProfessionalList：专业陪护列表（Step 16，预留）
 * - PeerMatching：同行者匹配
 * - PublishPeerTrip：发布同行行程
 */
export type CompanionStackParamList = {
  CompanionMain: undefined;
  PublishTrip: undefined;
  Match: {tripId: string};
  CompanionActive: {sessionId?: string};
  Rating: {sessionId: string};
  ProfessionalList: undefined;
  PeerMatching: undefined;
  PublishPeerTrip: undefined;
};

const Stack = createStackNavigator<CompanionStackParamList>();

const CompanionStack: React.FC = () => {
  const {colors} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: colors.bg},
      }}>
      <Stack.Screen name="CompanionMain" component={CompanionScreen} />
      <Stack.Screen
        name="PublishTrip"
        component={PublishTripScreen}      />
      <Stack.Screen
        name="Match"
        component={MatchScreen}      />
      <Stack.Screen
        name="CompanionActive"
        component={CompanionActiveScreen}      />
      <Stack.Screen
        name="Rating"
        component={RatingScreen}      />
      <Stack.Screen
        name="ProfessionalList"
        component={ProfessionalListScreen}      />
      <Stack.Screen
        name="PeerMatching"
        component={PeerMatchingScreen}      />
      <Stack.Screen
        name="PublishPeerTrip"
        component={PublishPeerTripScreen}      />
    </Stack.Navigator>
  );
};

export default CompanionStack;
