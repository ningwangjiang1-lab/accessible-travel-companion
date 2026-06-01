import React from 'react';
import createStackNavigator from './createStack';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import {useTheme} from '../theme';

/**
 * 消息 Stack Navigator
 */
export type MessagesStackParamList = {
  MessagesMain: undefined;
  ChatDetail: {sessionId: string};
};

const Stack = createStackNavigator<MessagesStackParamList>();

const MessagesStack: React.FC = () => {
  const {colors} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: colors.bg},
      }}>
      <Stack.Screen name="MessagesMain" component={MessagesScreen} />
      <Stack.Screen
        name="ChatDetail"
        component={ChatScreen}      />
    </Stack.Navigator>
  );
};

export default MessagesStack;
