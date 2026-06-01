import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useTheme} from '../theme';
import * as messageService from '../services/messageService';
import type {Conversation} from '../services/messageService';
import Avatar from '../components/Avatar/Avatar';
import Badge from '../components/Badge/Badge';
import Card from '../components/Card/Card';

/**
 * MessagesScreen — 消息中心
 *
 * 页面结构：
 * 1. 页头：💬 消息
 * 2. 会话列表（陪行人头像 + 姓名 + 最后消息预览 + 时间 + 未读计数）
 * 3. 空状态引导
 *
 * 依赖：Step 3 组件库、Step 11 陪行会话
 */

/** 消息类型图标 */
const TYPE_ICONS: Record<string, string> = {
  chat: '💬',
  trip: '📍',
  system: 'ℹ️',
  emergency: '🚨',
};

/** 格式化时间 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
  }
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;
  return d.toLocaleDateString('zh-CN', {month: 'short', day: 'numeric'});
}

const MessagesScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  /** 加载会话列表 */
  const loadConversations = useCallback(async () => {
    setErrorMsg('');
    try {
      const result = await messageService.getConversations();
      setConversations(result);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || '加载失败');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  React.useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /** 渲染单个会话项 */
  const renderConversation = ({item}: {item: Conversation}) => {
    const typeIcon = item.last_message_type ? (TYPE_ICONS[item.last_message_type] || '💬') : '💬';

    return (
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => navigation.navigate('ChatDetail', {sessionId: item.session_id})}>
        <Card variant="card" style={{marginHorizontal: 16, marginBottom: 8}}>
          <View style={styles.convRow}>
            {/* 头像 */}
            <Avatar name={item.peer.name} size="default" style={{marginRight: 12}} />

            {/* 中间内容 */}
            <View style={{flex: 1}}>
              <View style={styles.convTop}>
                <Text
                  style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any, flex: 1}}
                  numberOfLines={1}>
                  {item.peer.name}
                </Text>
                {item.last_message_at && (
                  <Text style={{color: colors.textTertiary, fontSize: fontSize['3xs'], marginLeft: 8}}>
                    {formatTime(item.last_message_at)}
                  </Text>
                )}
              </View>
              <View style={styles.convBottom}>
                {item.last_message ? (
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: fontSize.sm,
                      flex: 1,
                    }}
                    numberOfLines={1}>
                    {typeIcon} {item.last_message}
                  </Text>
                ) : (
                  <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, fontStyle: 'italic', flex: 1}}>
                    暂无消息，打个招呼吧
                  </Text>
                )}
              </View>
            </View>

            {/* 未读计数 + 角色 Badge */}
            <View style={{alignItems: 'flex-end', marginLeft: 8}}>
              <Badge
                text={item.peer.role === 'volunteer' ? '🤝' : '💼'}
                variant={item.peer.role === 'volunteer' ? 'success' : 'warning'}
              />
              {item.unread_count > 0 && (
                <View style={[styles.unreadBadge, {backgroundColor: colors.danger}]}>
                  <Text style={{color: colors.textInverse, fontSize: fontSize['3xs'], fontWeight: fontWeight.bold as any}}>
                    {item.unread_count > 99 ? '99+' : item.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.flex, {backgroundColor: colors.bg}]}>
      {/* ============================================================ */}
      {/* 1. 页头 */}
      {/* ============================================================ */}
      <View style={[styles.header, {backgroundColor: colors.surface, borderBottomColor: colors.borderLight}]}>
        <Text style={[styles.headerTitle, {color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
          💬 消息
        </Text>
        <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>
          {conversations.length > 0
            ? `${conversations.length} 个会话`
            : '与陪行人保持联系'}
        </Text>
      </View>

      {/* ============================================================ */}
      {/* 2. 会话列表 */}
      {/* ============================================================ */}
      {conversations.length > 0 && (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={item => item.session_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}

      {/* ============================================================ */}
      {/* 3. 空状态 */}
      {/* ============================================================ */}
      {!refreshing && conversations.length === 0 && !errorMsg && (
        <View style={styles.emptyState}>
          <Text style={{fontSize: 48, marginBottom: 16}}>💬</Text>
          <Text style={{color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any, textAlign: 'center', marginBottom: 8}}>
            暂无消息
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20}}>
            发布行程并匹配陪行人后{'\n'}即可在这里与陪行人聊天
          </Text>
        </View>
      )}

      {/* ============================================================ */}
      {/* 4. 错误状态 */}
      {/* ============================================================ */}
      {errorMsg && conversations.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{fontSize: 40, marginBottom: 16}}>⚠️</Text>
          <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center'}}>
            {errorMsg}
          </Text>
          <TouchableOpacity
            style={{marginTop: 16, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: colors.primaryLight}}
            onPress={loadConversations}>
            <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
              重试
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // ---- 页头 ----
  header: {
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    lineHeight: 28,
  },

  // ---- 列表 ----
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },

  // ---- 会话行 ----
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  convTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ---- 未读徽章 ----
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginTop: 6,
  },

  // ---- 空状态 ----
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
});

export default MessagesScreen;
