import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useTheme} from '../theme';
import * as matchService from '../services/matchService';
import type {MatchResult, CompanionCandidate} from '../services/matchService';
import Card from '../components/Card/Card';
import Avatar from '../components/Avatar/Avatar';
import Badge from '../components/Badge/Badge';
import Button from '../components/Button/Button';
import ProgressBar from '../components/ProgressBar/ProgressBar';
import Divider from '../components/Divider/Divider';

/**
 * MatchScreen — 智能匹配与配对页
 *
 * 页面结构：
 * 1. 页头：行程摘要（起终点 + 陪行类型）
 * 2. 匹配状态摘要（匹配中 / 已匹配 / 已接受）
 * 3. 候选人列表卡片（头像+姓名+分数+标签+接受/拒绝）
 * 4. 空状态 / 加载状态
 *
 * 依赖：Step 3 组件库、Step 9 行程发布
 */

/** 匹配分数颜色 */
function scoreColor(score: number): string {
  if (score >= 85) return '#10B981';
  if (score >= 70) return '#2B7BD6';
  return '#F59E0B';
}

/** 路由重叠率颜色 */
function overlapColor(overlap: number): string {
  if (overlap >= 80) return '#10B981';
  if (overlap >= 60) return '#F59E0B';
  return '#EF4444';
}

const MatchScreen: React.FC<{route: any; navigation: any}> = ({route: routeParams, navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();
  const {tripId} = routeParams.params as {tripId: string};

  // ---- 状态 ----
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null); // 正在操作的 matchId

  /** 加载匹配列表 */
  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await matchService.getMatchesForTrip(tripId);
      setMatchResult(result);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err?.message || '加载匹配失败');
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  /** 接受匹配 */
  const handleAccept = async (candidate: CompanionCandidate) => {
    setActionLoading(candidate.match_id);
    try {
      const result = await matchService.acceptMatch(candidate.match_id);
      Alert.alert(
        '✅ 匹配成功',
        `${candidate.name} 将成为您的陪行人，陪行会话已创建。`,
        [
          {
            text: '查看陪行',
            onPress: () => {
              navigation.navigate('CompanionActive', {sessionId: result.session_id});
            },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert('操作失败', err?.response?.data?.error || '请稍后重试');
    } finally {
      setActionLoading(null);
    }
  };

  /** 拒绝匹配 */
  const handleReject = async (candidate: CompanionCandidate) => {
    setActionLoading(candidate.match_id);
    try {
      await matchService.rejectMatch(candidate.match_id);
      loadMatches(); // 刷新列表
    } catch (err: any) {
      Alert.alert('操作失败', err?.response?.data?.error || '请稍后重试');
    } finally {
      setActionLoading(null);
    }
  };

  // ---- 加载中 ----
  if (isLoading) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginTop: spacing.md}}>
          正在智能匹配陪行人...
        </Text>
        <View style={styles.skeletonCards}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.skeleton, {backgroundColor: colors.surface, borderRadius: borderRadius.lg}]}>
              <View style={styles.skeletonRow}>
                <View style={[styles.skeletonCircle, {backgroundColor: colors.bg}]} />
                <View style={{flex: 1}}>
                  <View style={[styles.skeletonLine, {backgroundColor: colors.bg, width: '40%'}]} />
                  <View style={[styles.skeletonLine, {backgroundColor: colors.bg, width: '60%', marginTop: 8}]} />
                </View>
                <View style={[styles.skeletonLine, {backgroundColor: colors.bg, width: 40, height: 28}]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ---- 错误 ----
  if (errorMsg && !matchResult) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.bg}]}>
        <Text style={{fontSize: 40, marginBottom: spacing.md}}>⚠️</Text>
        <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.lg}}>
          {errorMsg}
        </Text>
        <Button title="重试" variant="outline" onPress={loadMatches} />
      </View>
    );
  }

  if (!matchResult) return null;

  const pendingCandidates = matchResult.candidates.filter(c => c.match_status === 'pending');
  const acceptedCandidate = matchResult.candidates.find(c => c.match_status === 'accepted');
  const rejectedCandidates = matchResult.candidates.filter(c => c.match_status === 'rejected');

  return (
    <ScrollView
      style={[styles.flex, {backgroundColor: colors.bg}]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>

      {/* ============================================================ */}
      {/* 1. 页头 */}
      {/* ============================================================ */}
      <View style={[styles.header, {backgroundColor: colors.secondary}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
            🔍 智能匹配
          </Text>
          <View style={{width: 36}} />
        </View>
        <Text style={[styles.headerSub, {color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.9}]}>
          AI 为您匹配最合适的陪行人
        </Text>
      </View>

      {/* ============================================================ */}
      {/* 2. 匹配状态摘要 */}
      {/* ============================================================ */}
      <View style={styles.statusBar}>
        <View style={[styles.statusBadge, {backgroundColor: acceptedCandidate ? colors.successLight : colors.warningLight}]}>
          <Text style={{fontSize: fontSize.sm, marginRight: spacing.xs}}>
            {acceptedCandidate ? '✅' : '⏳'}
          </Text>
          <Text style={{
            color: acceptedCandidate ? colors.success : colors.secondaryDark,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium as any,
          }}>
            {acceptedCandidate
              ? `已匹配：${acceptedCandidate.name}`
              : `匹配中 · ${pendingCandidates.length} 位候选人`}
          </Text>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 3. 已接受的候选人 */}
      {/* ============================================================ */}
      {acceptedCandidate && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
            已确认陪行人
          </Text>
          <CandidateCard
            candidate={acceptedCandidate}
            isAccepted
            colors={colors}
            fontSize={fontSize}
            fontWeight={fontWeight}
            spacing={spacing}
            borderRadius={borderRadius}
            shadows={shadows}
          />
        </View>
      )}

      {/* ============================================================ */}
      {/* 4. 候选人列表 */}
      {/* ============================================================ */}
      {pendingCandidates.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
            {pendingCandidates.length} 位候选人
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginBottom: spacing.md}}>
            按匹配分数排序，点击接受即可建立陪行关系
          </Text>

          {pendingCandidates.map(candidate => (
            <CandidateCard
              key={candidate.match_id}
              candidate={candidate}
              actionLoading={actionLoading === candidate.match_id}
              onAccept={() => handleAccept(candidate)}
              onReject={() => handleReject(candidate)}
              colors={colors}
              fontSize={fontSize}
              fontWeight={fontWeight}
              spacing={spacing}
              borderRadius={borderRadius}
              shadows={shadows}
            />
          ))}
        </View>
      )}

      {/* ============================================================ */}
      {/* 5. 已拒绝的候选人 */}
      {/* ============================================================ */}
      {rejectedCandidates.length > 0 && (
        <View style={styles.section}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.sm}}>
            已拒绝 {rejectedCandidates.length} 位候选人
          </Text>
          {rejectedCandidates.map(candidate => (
            <CandidateCard
              key={candidate.match_id}
              candidate={candidate}
              isRejected
              colors={colors}
              fontSize={fontSize}
              fontWeight={fontWeight}
              spacing={spacing}
              borderRadius={borderRadius}
              shadows={shadows}
            />
          ))}
        </View>
      )}

      {/* ============================================================ */}
      {/* 6. 空状态 */}
      {/* ============================================================ */}
      {pendingCandidates.length === 0 && !acceptedCandidate && (
        <View style={styles.emptyState}>
          <Text style={{fontSize: 48, marginBottom: spacing.md}}>🔍</Text>
          <Text style={{color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any, textAlign: 'center'}}>
            暂无可用候选人
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20}}>
            请稍后再试，系统正在为您{'\n'}寻找最合适的陪行人
          </Text>
          <Button
            title="刷新匹配"
            variant="outline"
            size="default"
            style={{marginTop: spacing.lg}}
            onPress={loadMatches}
          />
        </View>
      )}

      <View style={{height: 40}} />
    </ScrollView>
  );
};

// ================================================================
// CandidateCard 子组件
// ================================================================

interface CandidateCardProps {
  candidate: CompanionCandidate;
  isAccepted?: boolean;
  isRejected?: boolean;
  actionLoading?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  colors: any;
  fontSize: any;
  fontWeight: any;
  spacing: any;
  borderRadius: any;
  shadows: any;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  isAccepted = false,
  isRejected = false,
  actionLoading = false,
  onAccept,
  onReject,
  colors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  shadows,
}) => {
  const matchScore = candidate.match_score;
  const matchColor = scoreColor(matchScore);

  return (
    <Card
      variant="card"
      style={{
        marginBottom: spacing.md,
        opacity: isRejected ? 0.5 : 1,
        ...(isAccepted ? {borderWidth: 2, borderColor: colors.success} : {}),
      }}>

      {/* 顶部：头像 + 基本信息 + 分数 */}
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md}}>
        <Avatar
          name={candidate.name}
          size="lg"
          style={{marginRight: spacing.md}}
        />
        <View style={{flex: 1}}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}>
            <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}}>
              {candidate.name}
            </Text>
            <Badge
              text={candidate.role === 'volunteer' ? '🤝 志愿者' : '💼 专业'}
              variant={candidate.role === 'volunteer' ? 'success' : 'warning'}
              style={{marginLeft: spacing.sm}}
            />
          </View>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
            ⭐ {candidate.rating} · {candidate.completed_trips} 次陪行 · {candidate.distance_meters}m
          </Text>
          {candidate.hourly_rate_cents && (
            <Text style={{color: colors.secondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any, marginTop: 2}}>
              ¥{(candidate.hourly_rate_cents / 100).toFixed(0)}/小时
            </Text>
          )}
        </View>

        {/* 匹配分数 */}
        <View style={{alignItems: 'center'}}>
          <Text style={{color: matchColor, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold as any}}>
            {matchScore}
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize['4xs']}}>匹配分</Text>
        </View>
      </View>

      {/* 路由重叠率 */}
      {candidate.route_overlap !== null && (
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm}}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, width: 56}}>
            路线重合
          </Text>
          <ProgressBar
            progress={candidate.route_overlap / 100}
            variant="default"
            height={6}
            style={{flex: 1, marginHorizontal: spacing.sm}}
          />
          <Text style={{color: overlapColor(candidate.route_overlap), fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any}}>
            {candidate.route_overlap}%
          </Text>
        </View>
      )}

      {/* 认证 + 标签 */}
      <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm}}>
        {candidate.certifications.map((cert, i) => (
          <Badge key={i} text={`📜 ${cert}`} variant="primary" style={{marginRight: 4, marginBottom: 4}} />
        ))}
        {candidate.tags.map((tag, i) => (
          <Badge key={`t-${i}`} text={tag} variant="success" style={{marginRight: 4, marginBottom: 4}} />
        ))}
      </View>

      {/* 操作按钮 */}
      {!isAccepted && !isRejected && (
        <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm}}>
          <Button
            title={actionLoading ? '处理中...' : '✅ 接受'}
            variant="primary"
            size="default"
            style={{flex: 1}}
            disabled={actionLoading}
            onPress={onAccept}
          />
          <Button
            title="✕ 拒绝"
            variant="outline"
            size="default"
            style={{flex: 1}}
            disabled={actionLoading}
            onPress={onReject}
          />
        </View>
      )}

      {/* 已接受/已拒绝标识 */}
      {isAccepted && (
        <View style={[styles.statusTag, {backgroundColor: colors.successLight, borderRadius: borderRadius.full}]}>
          <Text style={{color: colors.success, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any}}>
            ✅ 已接受 · 陪行中
          </Text>
        </View>
      )}
      {isRejected && (
        <View style={[styles.statusTag, {backgroundColor: colors.dangerLight, borderRadius: borderRadius.full}]}>
          <Text style={{color: colors.danger, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any}}>
            ✕ 已拒绝
          </Text>
        </View>
      )}
    </Card>
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
  scrollContent: {
    paddingBottom: 24,
  },

  // ---- 页头 ----
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
  headerTitle: {
    lineHeight: 28,
  },
  headerSub: {
    textAlign: 'center',
    lineHeight: 20,
  },

  // ---- 状态 ----
  statusBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },

  // ---- 分区 ----
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 4,
    lineHeight: 24,
  },

  // ---- 状态标签 ----
  statusTag: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: 8,
  },

  // ---- 骨架屏 ----
  skeletonCards: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 24,
  },
  skeleton: {
    padding: 16,
    marginBottom: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },

  // ---- 空状态 ----
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
});

export default MatchScreen;
