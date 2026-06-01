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
import * as ratingService from '../services/ratingService';
import {RATING_TAGS} from '../services/ratingService';
import type {RatingResult} from '../services/ratingService';
import * as sessionService from '../services/sessionService';
import type {SessionDetail} from '../services/sessionService';
import Avatar from '../components/Avatar/Avatar';
import Badge from '../components/Badge/Badge';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import Tag from '../components/Tag/Tag';
import FormInput from '../components/Input/FormInput';
import Divider from '../components/Divider/Divider';

/**
 * RatingScreen — 评价页
 *
 * 在陪行会话完成后，对陪行人进行评价：
 * 1. 页头：陪行人信息摘要
 * 2. 星级评分（1-5 星，点击选择）
 * 3. 评价标签（多选）
 * 4. 文字评论（可选）
 * 5. 打赏（可选，专业陪护显示）
 * 6. 提交按钮
 *
 * 依赖：Step 3 组件库、Step 11 陪行会话
 */

/** 打赏快捷金额 */
const TIP_OPTIONS = [
  {label: '¥5', cents: 500},
  {label: '¥10', cents: 1000},
  {label: '¥20', cents: 2000},
  {label: '¥50', cents: 5000},
  {label: '¥100', cents: 10000},
];

/** 星级描述 */
const STAR_DESCRIPTIONS: Record<number, {emoji: string; text: string}> = {
  1: {emoji: '😞', text: '体验不佳'},
  2: {emoji: '😐', text: '一般般'},
  3: {emoji: '🙂', text: '还不错'},
  4: {emoji: '😊', text: '很满意'},
  5: {emoji: '🤩', text: '超乎预期'},
};

const RatingScreen: React.FC<{route: any; navigation: any}> = ({route: routeParams, navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();
  const {sessionId} = routeParams.params as {sessionId: string};

  // ---- 状态 ----
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [existingRating, setExistingRating] = useState<RatingResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 表单状态
  const [score, setScore] = useState(0);        // 0 = 未选择
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [tipCents, setTipCents] = useState(0);

  /** 加载会话和评价状态 */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 并行加载会话详情和评价状态
      const [sessionData, ratingData] = await Promise.all([
        sessionService.getSessionDetail(sessionId),
        ratingService.checkRating(sessionId),
      ]);

      setSession(sessionData);

      if (ratingData.rated && ratingData.rating) {
        setExistingRating(ratingData.rating);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err?.message || '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** 切换标签 */
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag],
    );
  };

  /** 提交评价 */
  const handleSubmit = async () => {
    if (score === 0) {
      Alert.alert('请评分', '请选择 1-5 星评分');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await ratingService.submitRating(sessionId, {
        score,
        tags: selectedTags,
        comment: comment.trim() || undefined,
        tip_cents: tipCents > 0 ? tipCents : undefined,
      });

      setExistingRating(result);
      Alert.alert(
        '✅ 评价成功',
        `感谢您对 ${result.companion_name} 的评价！${tipCents > 0 ? `\n打赏 ¥${(tipCents / 100).toFixed(0)} 已记录。` : ''}`,
        [
          {
            text: '好的',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (err: any) {
      Alert.alert('提交失败', err?.response?.data?.error || '请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- 加载中 ----
  if (isLoading) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginTop: spacing.md}}>
          加载中...
        </Text>
      </View>
    );
  }

  // ---- 错误 ----
  if (errorMsg || !session) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.bg}]}>
        <Text style={{fontSize: 40, marginBottom: spacing.md}}>⚠️</Text>
        <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.lg}}>
          {errorMsg || '无法加载数据'}
        </Text>
        <Button title="返回" variant="outline" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  // ---- 已评价 ----
  if (existingRating) {
    return (
      <ScrollView
        style={[styles.flex, {backgroundColor: colors.bg}]}
        contentContainerStyle={styles.scrollContent}>
        {/* 页头 */}
        <View style={[styles.header, {backgroundColor: colors.success}]}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
              ⭐ 评价
            </Text>
            <View style={{width: 36}} />
          </View>
        </View>

        <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: -spacing.lg, alignItems: 'center'}}>
          <Text style={{fontSize: 48, marginBottom: spacing.md}}>✅</Text>
          <Text style={{color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, marginBottom: spacing.sm}}>
            评价已提交
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20}}>
            您已对 {existingRating.companion_name} 进行了{'\n'}
            {existingRating.score} 星评价
            {existingRating.tip_cents > 0 ? `，并打赏 ¥${(existingRating.tip_cents / 100).toFixed(0)}` : ''}
          </Text>
          <View style={styles.submittedStars}>
            {[1, 2, 3, 4, 5].map(i => (
              <Text key={i} style={{fontSize: 28, opacity: i <= existingRating.score ? 1 : 0.2}}>
                ⭐
              </Text>
            ))}
          </View>
          <Button title="返回" variant="outline" onPress={() => navigation.goBack()} style={{marginTop: spacing.md}} />
        </Card>
      </ScrollView>
    );
  }

  const isProfessional = session.companion.role === 'professional';
  const starDesc = STAR_DESCRIPTIONS[score];

  return (
    <ScrollView
      style={[styles.flex, {backgroundColor: colors.bg}]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>

      {/* ============================================================ */}
      {/* 1. 页头 */}
      {/* ============================================================ */}
      <View style={[styles.header, {backgroundColor: colors.primary}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
            ⭐ 评价陪行人
          </Text>
          <View style={{width: 36}} />
        </View>
        {/* 陪行人摘要 */}
        <View style={styles.headerCompanion}>
          <Avatar name={session.companion.name} size="lg" style={{marginRight: spacing.md}} />
          <View>
            <Text style={{color: colors.textInverse, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}}>
              {session.companion.name}
            </Text>
            <Text style={{color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.9}}>
              {session.companion.role === 'volunteer' ? '🤝 志愿者' : '💼 专业陪护'} · 陪行 {session.elapsed_minutes} 分钟
            </Text>
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. 星级评分 */}
      {/* ============================================================ */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: -spacing.lg, alignItems: 'center'}}>
        <Text style={[styles.sectionLabel, {color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}]}>
          为本次陪行体验打分
        </Text>

        {/* 星星行 */}
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.6}
              onPress={() => setScore(i)}
              style={[
                styles.starBtn,
                score >= i && styles.starBtnActive,
              ]}>
              <Text style={{fontSize: 36}}>
                {score >= i ? '⭐' : '☆'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 星级描述 */}
        {score > 0 && (
          <View style={[styles.starDesc, {backgroundColor: colors.primaryLight, borderRadius: borderRadius.full}]}>
            <Text style={{fontSize: fontSize.lg, marginRight: spacing.sm}}>{starDesc?.emoji}</Text>
            <Text style={{color: colors.primary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}}>
              {score} 星 · {starDesc?.text}
            </Text>
          </View>
        )}
      </Card>

      {/* ============================================================ */}
      {/* 3. 评价标签（多选） */}
      {/* ============================================================ */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: spacing.md}}>
        <Text style={[styles.sectionLabel, {color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}]}>
          选择评价标签（可多选）
        </Text>
        <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginBottom: spacing.md}}>
          已选 {selectedTags.length} 项
        </Text>
        <View style={styles.tagsGrid}>
          {RATING_TAGS.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Tag
                key={tag}
                label={isSelected ? `✓ ${tag}` : tag}
                selected={isSelected}
                onPress={() => toggleTag(tag)}
                style={{marginRight: 8, marginBottom: 8}}
              />
            );
          })}
        </View>
      </Card>

      {/* ============================================================ */}
      {/* 4. 文字评论 */}
      {/* ============================================================ */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: spacing.md}}>
        <View style={{paddingHorizontal: 0}}>
          <FormInput
            label="文字评论（选填）"
            value={comment}
            onChangeText={setComment}
            placeholder="分享您的陪行体验，帮助其他用户了解这位陪行人..."
            multiline
            maxLength={500}
          />
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'right'}}>
            {comment.length}/500
          </Text>
        </View>
      </Card>

      {/* ============================================================ */}
      {/* 5. 打赏（可选） */}
      {/* ============================================================ */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: spacing.md}}>
        <Text style={[styles.sectionLabel, {color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}]}>
          {isProfessional ? '💝 额外打赏（选填）' : '💝 感谢打赏（选填）'}
        </Text>
        <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginBottom: spacing.md}}>
          {isProfessional
            ? '感谢专业人士的优质服务，打赏将全额转交'
            : '感谢志愿者的无私奉献，打赏表达您的心意'}
        </Text>

        {/* 快捷金额按钮 */}
        <View style={styles.tipGrid}>
          {TIP_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.cents}
              style={[
                styles.tipBtn,
                {
                  backgroundColor: tipCents === opt.cents ? colors.primaryLight : colors.bg,
                  borderColor: tipCents === opt.cents ? colors.primary : colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
              onPress={() => setTipCents(tipCents === opt.cents ? 0 : opt.cents)}>
              <Text style={{
                color: tipCents === opt.cents ? colors.primary : colors.textSecondary,
                fontSize: fontSize.base,
                fontWeight: (tipCents === opt.cents ? fontWeight.bold : fontWeight.medium) as any,
              }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 不打赏 */}
        {tipCents > 0 && (
          <TouchableOpacity
            style={{alignSelf: 'center', marginTop: spacing.sm}}
            onPress={() => setTipCents(0)}>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
              取消打赏
            </Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* ============================================================ */}
      {/* 6. 提交按钮 */}
      {/* ============================================================ */}
      <View style={{marginHorizontal: spacing.lg, marginTop: spacing.lg}}>
        <Button
          title={isSubmitting ? '提交中...' : score > 0 ? `提交 ${score} 星评价` : '提交评价'}
          variant="primary"
          size="default"
          disabled={isSubmitting || score === 0}
          onPress={handleSubmit}
        />
        <Text style={{color: colors.textTertiary, fontSize: fontSize['3xs'], textAlign: 'center', marginTop: spacing.sm}}>
          评价提交后无法修改
        </Text>
      </View>

      <View style={{height: 40}} />
    </ScrollView>
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
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  headerCompanion: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ---- 评分 ----
  sectionLabel: {
    marginBottom: 12,
    textAlign: 'center',
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starBtn: {
    paddingHorizontal: 6,
  },
  starBtnActive: {
    // iOS shadow
    shadowColor: '#F59E0B',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  starDesc: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  submittedStars: {
    flexDirection: 'row',
    marginTop: 16,
  },

  // ---- 标签 ----
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // ---- 打赏 ----
  tipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tipBtn: {
    width: '28%',
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: '2%',
    marginBottom: 8,
    borderWidth: 1.5,
  },
});

export default RatingScreen;
