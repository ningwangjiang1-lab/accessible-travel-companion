import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useTheme} from '../theme';
import {useAuthStore} from '../store/authStore';
import * as tripService from '../services/tripService';
import type {PeerCandidate, ActivePeerMatch} from '../services/tripService';
import Card from '../components/Card/Card';
import Badge from '../components/Badge/Badge';
import Divider from '../components/Divider/Divider';
import Button from '../components/Button/Button';

/**
 * PeerMatchingScreen — 同行者匹配
 *
 * 为残障用户匹配路线相近、类型互补的同行伙伴。
 */

/** 残障类型 → emoji */
const DISABILITY_EMOJI: Record<string, string> = {
  physical: '🦽',
  visual: '🦯',
  hearing: '🦻',
  cognitive: '🧠',
};

/** 残障类型 → 中文 */
const DISABILITY_LABELS: Record<string, string> = {
  physical: '肢体障碍',
  visual: '视力障碍',
  hearing: '听力障碍',
  cognitive: '认知障碍',
};

const PeerMatchingScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();
  const {user} = useAuthStore();

  const [candidates, setCandidates] = useState<PeerCandidate[]>([]);
  const [activeMatch, setActiveMatch] = useState<ActivePeerMatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 先查活跃匹配
      const active = await tripService.getActivePeerMatch();
      if (active) {
        setActiveMatch(active);
      } else {
        // 获取候选列表
        const list = await tripService.getPeerCandidates();
        setCandidates(list);
      }
    } catch (err: any) {
      if (err?.response?.status === 400) {
        // 没有开启同行匹配的行程，不显示错误
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  /** 发起同行邀请 */
  const handleInvite = async (candidate: PeerCandidate) => {
    if (typeof window !== 'undefined') {
      if (!window.confirm(`确定要邀请 ${candidate.user_name} 成为同行伙伴？\n\n` +
        `路线重合：${candidate.route_overlap_pct}%\n` +
        `${candidate.complementarity_desc || ''}`)) {
        return;
      }
    }
    setSubmittingId(candidate.trip_id);
    try {
      await tripService.createPeerMatch(candidate.trip_id);
      if (typeof window !== 'undefined') {
        window.alert('已发送同行邀请，等待对方回应');
      }
      Alert.alert('已发送', '已向对方发送同行邀请，等待回应');
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '发送失败';
      if (typeof window !== 'undefined') { window.alert(msg); }
      Alert.alert('发送失败', msg);
    } finally {
      setSubmittingId(null);
    }
  };

  /** 接受同行邀请 */
  const handleAccept = async () => {
    if (!activeMatch) return;
    try {
      await tripService.acceptPeerMatch(activeMatch.id);
      Alert.alert('✅ 匹配成功', '你们已成为同行伙伴！', [
        {text: '好的', onPress: () => loadData()},
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || '操作失败';
      if (typeof window !== 'undefined') { window.alert(msg); }
      Alert.alert('操作失败', msg);
    }
  };

  return (
    <View style={[styles.flex, {backgroundColor: colors.bg}]}>
      {/* 页头 */}
      <View style={[styles.header, {backgroundColor: colors.primary}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('CompanionMain')}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
            🤝 同行者匹配
          </Text>
          <View style={{width: 36}} />
        </View>
        <Text style={[styles.headerSub, {color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.85}]}>
          找到路线相近、优势互补的同行伙伴
        </Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {isLoading && (
          <View style={styles.emptyState}>
            <Text style={{fontSize: 40, marginBottom: 12}}>🔍</Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.sm}}>
              正在查找同行伙伴...
            </Text>
          </View>
        )}

        {/* 已有活跃同行关系 */}
        {!isLoading && activeMatch && (
          <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: spacing.lg}}>
            <Text style={[styles.sectionTitle, {color: colors.success, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
              ✅ 已有同行伙伴
            </Text>
            <Text style={{color: colors.textPrimary, fontSize: fontSize.base, marginTop: 8}}>
              👤 {activeMatch.peer_name}
            </Text>
            <Badge
              text={`${DISABILITY_EMOJI[activeMatch.peer_disability_type] || ''} ${DISABILITY_LABELS[activeMatch.peer_disability_type] || activeMatch.peer_disability_type}`}
              variant="primary"
              style={{marginTop: 8}}
            />
            {activeMatch.complementarity_desc && (
              <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginTop: 8, lineHeight: 20}}>
                💡 {activeMatch.complementarity_desc}
              </Text>
            )}
            {activeMatch.route_overlap_pct != null && (
              <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4}}>
                📍 路线重合度：{activeMatch.route_overlap_pct}%
              </Text>
            )}
            <View style={{flexDirection: 'row', marginTop: 12, gap: 8}}>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, flex: 1}}>
                从 {activeMatch.peer_start_address || '—'}
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>→</Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, flex: 1, textAlign: 'right'}}>
                到 {activeMatch.peer_end_address || '—'}
              </Text>
            </View>
          </Card>
        )}

        {/* 候选列表 */}
        {!isLoading && !activeMatch && candidates.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{fontSize: 40, marginBottom: 12}}>📭</Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.sm}}>
              暂无可匹配的同行者
            </Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 8}}>
              发布行程并开启"寻找同行者"后，将自动为您匹配
            </Text>
            <Button
              title="📝 发布行程"
              variant="primary"
              size="default"
              onPress={() => navigation.navigate('PublishPeerTrip')}
              style={{marginTop: 16}}
            />
          </View>
        )}

        {!isLoading && !activeMatch && candidates.map((c, i) => (
          <Card key={c.trip_id} variant="card" style={{marginHorizontal: spacing.lg, marginTop: i === 0 ? spacing.lg : spacing.sm}}>
            {/* 用户信息 */}
            <View style={styles.candidateHeader}>
              <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
                👤 {c.user_name}
              </Text>
              <Badge
                text={`${DISABILITY_EMOJI[c.disability_type] || ''} ${DISABILITY_LABELS[c.disability_type] || c.disability_type}`}
                variant="primary"
              />
            </View>

            {/* 匹配度 */}
            <View style={styles.scoreRow}>
              <View style={styles.scoreItem}>
                <Text style={{color: colors.primary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}}>
                  {c.route_overlap_pct}%
                </Text>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>路线重合</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={{color: colors.secondary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}}>
                  {c.complementarity_score}
                </Text>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>互补评分</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={{color: colors.success, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}}>
                  {c.total_score}
                </Text>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>综合匹配</Text>
              </View>
            </View>

            {/* 互补说明 */}
            {c.complementarity_desc && (
              <View style={[styles.complementBox, {backgroundColor: colors.successLight || '#E8F5E9', borderRadius: borderRadius.md}]}>
                <Text style={{color: colors.success, fontSize: fontSize.sm, lineHeight: 20}}>
                  💡 {c.complementarity_desc}
                </Text>
              </View>
            )}

            {/* 路线 */}
            <Divider style={{marginVertical: spacing.sm}} />
            <View style={styles.routeRow}>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, flex: 1}}>
                🟢 {c.start_address || '—'}
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginHorizontal: 8}}>→</Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, flex: 1, textAlign: 'right'}}>
                🔴 {c.end_address || '—'}
              </Text>
            </View>

            {/* 操作按钮 */}
            <TouchableOpacity
              style={[styles.inviteBtn, {
                backgroundColor: submittingId === c.trip_id ? colors.border : colors.primary,
                borderRadius: borderRadius.md,
              }]}
              onPress={() => handleInvite(c)}
              disabled={submittingId === c.trip_id}
              activeOpacity={0.7}>
              <Text style={{color: colors.textInverse, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
                {submittingId === c.trip_id ? '邀请中...' : '🤝 邀请同行'}
              </Text>
            </TouchableOpacity>
          </Card>
        ))}

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  scrollContent: {paddingBottom: 24},
  // 页头
  header: {
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {lineHeight: 28},
  headerSub: {textAlign: 'center', lineHeight: 20},
  sectionTitle: {marginBottom: 4},
  // 候选卡片
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
  },
  scoreItem: {
    alignItems: 'center',
  },
  complementBox: {
    padding: 12,
    marginBottom: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inviteBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
});

export default PeerMatchingScreen;
