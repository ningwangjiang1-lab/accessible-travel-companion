import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTheme} from '../theme';
import * as messageService from '../services/messageService';
import * as sessionService from '../services/sessionService';
import type {ChatMessage} from '../services/messageService';
import type {SessionDetail} from '../services/sessionService';
import ChatBubble from '../components/ChatBubble/ChatBubble';
import Avatar from '../components/Avatar/Avatar';
import Badge from '../components/Badge/Badge';

/**
 * ChatScreen — 会话聊天详情页
 *
 * 页面结构：
 * 1. 顶部导航栏：返回 + 陪行人姓名 + 角色
 * 2. 消息气泡列表（ChatBubble 组件，FlatList 倒序）
 * 3. 底部输入栏：输入框 + 发送按钮
 * 4. 自动轮询刷新（3 秒）
 *
 * 依赖：Step 3 组件库、Step 11 陪行会话、Step 13 消息中心
 */

/** 格式化聊天时间 */
function formatChatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
}

/** 消息类型 → 系统提示样式 */
const SYSTEM_STYLES: Record<string, {bg: string; icon: string}> = {
  system: {bg: '#E8F1FB', icon: 'ℹ️'},
  emergency: {bg: '#FEF2F2', icon: '🚨'},
  trip: {bg: '#ECFDF5', icon: '📍'},
};

const ChatScreen: React.FC<{route: any; navigation: any}> = ({route: routeParams, navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();
  const {sessionId} = routeParams.params as {sessionId: string};

  // ---- 状态 ----
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const flatListRef = useRef<FlatList>(null);

  /** 加载数据 */
  const loadData = useCallback(async () => {
    try {
      const [sessionData, msgData] = await Promise.all([
        sessionService.getSessionDetail(sessionId),
        messageService.getMessages(sessionId),
      ]);
      setSession(sessionData);
      setMessages(msgData);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 标记已读
  useEffect(() => {
    messageService.markAsRead(sessionId).catch(() => {});
  }, [sessionId]);

  // 轮询刷新（每 5 秒）
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const latest = await messageService.getMessages(sessionId, 50, 0);
        setMessages(latest);
      } catch {
        // 静默轮询失败
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  /** 发送消息 */
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText('');
    setIsSending(true);
    try {
      const sent = await messageService.sendMessage(sessionId, text);
      setMessages(prev => [...prev, sent]);
    } catch (err: any) {
      // 发送失败则恢复输入
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  /** 滚动到底部 */
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);
  };

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  // ---- 加载中 ----
  if (isLoading) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ---- 错误 ----
  if (errorMsg || !session) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.bg}]}>
        <Text style={{fontSize: 40, marginBottom: 16}}>⚠️</Text>
        <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center', marginBottom: 16}}>
          {errorMsg || '无法加载'}
        </Text>
        <TouchableOpacity
          style={{paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: colors.primaryLight}}
          onPress={() => navigation.goBack()}>
          <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
            返回
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, {backgroundColor: colors.bg}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>

      {/* ============================================================ */}
      {/* 1. 顶部导航栏 */}
      {/* ============================================================ */}
      <View style={[styles.topBar, {backgroundColor: colors.surface, borderBottomColor: colors.borderLight}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{color: colors.textPrimary, fontSize: fontSize.xl}}>←</Text>
        </TouchableOpacity>

        <Avatar name={session.companion.name} size="sm" style={{marginRight: 10}} />

        <View style={{flex: 1}}>
          <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
            {session.companion.name}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Badge
              text={session.companion.role === 'volunteer' ? '🤝 志愿者' : '💼 专业'}
              variant={session.companion.role === 'volunteer' ? 'success' : 'warning'}
            />
            {session.status === 'active' && (
              <View style={[styles.onlineDot, {backgroundColor: '#10B981'}]} />
            )}
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. 消息列表 */}
      {/* ============================================================ */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({item}) => <MessageItem item={item} colors={colors} fontSize={fontSize} spacing={spacing} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        ListEmptyComponent={
          <View style={{alignItems: 'center', paddingVertical: 48}}>
            <Text style={{fontSize: 40, marginBottom: 12}}>💬</Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center'}}>
              还没有消息{'\n'}发送第一条消息开始交流
            </Text>
          </View>
        }
      />

      {/* ============================================================ */}
      {/* 3. 底部输入栏 */}
      {/* ============================================================ */}
      <View style={[styles.inputBar, {backgroundColor: colors.surface, borderTopColor: colors.borderLight}]}>
        <TextInput
          style={[styles.textInput, {
            backgroundColor: colors.bg,
            borderRadius: borderRadius.full,
            color: colors.textPrimary,
            fontSize: fontSize.sm,
          }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入消息..."
          placeholderTextColor={colors.textTertiary}
          multiline={false}
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, {
            backgroundColor: inputText.trim() ? colors.primary : colors.border,
            borderRadius: borderRadius.full,
          }]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          activeOpacity={0.7}>
          <Text style={{color: colors.textInverse, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}}>
            {isSending ? '...' : '↑'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

/** 单条消息渲染 */
const MessageItem: React.FC<{
  item: ChatMessage;
  colors: any;
  fontSize: any;
  spacing: any;
}> = ({item, colors, fontSize, spacing}) => {
  const isSystemType = ['system', 'trip', 'emergency'].includes(item.message_type);

  // 系统/行程/紧急消息 —— 居中提示条
  if (isSystemType) {
    const style = SYSTEM_STYLES[item.message_type] || SYSTEM_STYLES.system;
    return (
      <View style={{alignItems: 'center', marginVertical: 6}}>
        <View style={{backgroundColor: style.bg, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 14}}>
          <Text style={{color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center'}}>
            {style.icon} {item.content}
          </Text>
        </View>
        <Text style={{color: colors.textTertiary, fontSize: fontSize['4xs'], marginTop: 2}}>
          {formatChatTime(item.created_at)}
        </Text>
      </View>
    );
  }

  // 聊天消息 —— 气泡
  return (
    <View style={{marginBottom: spacing.sm, paddingHorizontal: spacing.md}}>
      {/* 发送者姓名（对方消息时显示） */}
      {item.message_type === 'chat' && (
        <Text style={{
          color: colors.textTertiary,
          fontSize: fontSize['3xs'],
          marginBottom: 2,
          marginLeft: 4,
        }}>
          {item.sender_name} · {formatChatTime(item.created_at)}
        </Text>
      )}
      <ChatBubble
        message={item.content}
        type="other"
        timestamp={undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // ---- 顶部栏 ----
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },

  // ---- 消息列表 ----
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
  },

  // ---- 输入栏 ----
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    paddingBottom: 24,
  },
  textInput: {
    flex: 1,
    height: 42,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 10,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatScreen;
