import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import {useTheme} from '../theme';
import * as matchService from '../services/matchService';
import * as tripService from '../services/tripService';
import type {MatchResult, CompanionCandidate} from '../services/matchService';
import Card from '../components/Card/Card';
import Badge from '../components/Badge/Badge';
import Button from '../components/Button/Button';

/**
 * MatchScreen — 匹配等待页（类似滴滴等待接单）
 *
 * 状态流转：
 * 1. 匹配中 → 脉冲动画 + 预计时间 + 取消按钮
 * 2. 已匹配 → 陪行人信息 + 距离 + 开始陪行
 * 3. 已取消 → 取消确认
 */

const MatchScreen: React.FC<{route: any; navigation: any}> = ({route: routeParams, navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();
  const {tripId} = routeParams.params as {tripId: string};

  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // 脉冲动画
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 0.4, duration: 800, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1, duration: 800, useNativeDriver: true}),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // 计时器
  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // 轮询匹配状态
  const loadMatches = useCallback(async () => {
    try {
      const result = await matchService.getMatchesForTrip(tripId);
      // 查找已接受的候选人
      const accepted = result.candidates?.find(c => c.match_status === 'accepted');
      result.matched_companion = accepted;
      setMatchResult(result);
      setIsLoading(false);

      if (accepted) return true;
      // 如果行程已取消
      if (result.trip_status === 'cancelled') {
        setErrorMsg('行程已取消');
        return true;
      }
      return false;
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || '加载失败');
      setIsLoading(false);
      return false;
    }
  }, [tripId]);

  useEffect(() => {
    loadMatches();
    // 每 5 秒轮询一次
    const interval = setInterval(async () => {
      const matched = await loadMatches();
      if (matched) clearInterval(interval);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadMatches]);

  // 取消行程
  const handleCancel = async () => {
    const isWeb = typeof window !== 'undefined';
    const confirm = isWeb
      ? window.confirm('确定要取消当前行程吗？')
      : true; // 移动端用 Alert

    if (isWeb && !confirm) return;

    if (!isWeb) {
      Alert.alert('取消行程', '确定要取消当前行程吗？', [
        {text: '再等等', style: 'cancel'},
        {
          text: '确定取消',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await tripService.cancelTrip(tripId);
              navigation.goBack();
            } catch (err: any) {
              if (isWeb) { window.alert('取消失败: ' + (err?.response?.data?.error || '')); }
            } finally {
              setCancelling(false);
            }
          },
        },
      ]);
      return;
    }

    setCancelling(true);
    try {
      await tripService.cancelTrip(tripId);
      navigation.goBack();
    } catch (err: any) {
      if (isWeb) { window.alert('取消失败: ' + (err?.response?.data?.error || '')); }
    } finally {
      setCancelling(false);
    }
  };

  const matchedCompanion = matchResult?.matched_companion;
  const estimatedMin = Math.max(1, 5 - Math.floor(elapsed / 30)); // 动态估算

  const disabilityLabel: Record<string, string> = {
    physical: '♿ 肢体障碍', visual: '🦯 视障',
    hearing: '🦻 听障', cognitive: '🧠 认知障碍',
    elderly: '👴 高龄',
  };

  return (
    <View style={[styles.flex, {backgroundColor: colors.bg}]}>
      {/* 页头 */}
      <View style={[styles.header, {backgroundColor: matchedCompanion ? colors.success : colors.primary}]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleCancel}>
          <Text style={{color: colors.textInverse, fontSize: fontSize.lg}}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
          {matchedCompanion ? '✅ 已匹配' : '🔍 匹配中...'}
        </Text>
      </View>

      {/* 内容 */}
      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{color: colors.textTertiary, marginTop: 16}}>加载行程信息...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centerBox}>
            <Text style={{fontSize: 40, marginBottom: 12}}>⚠️</Text>
            <Text style={{color: colors.danger, textAlign: 'center'}}>{errorMsg}</Text>
            <Button title="重试" variant="primary" onPress={loadMatches} style={{marginTop: 16}} />
          </View>
        ) : matchedCompanion ? (
          /* ===== 已匹配 ===== */
          <View>
            {/* 成功横幅 */}
            <View style={[styles.successBanner, {backgroundColor: colors.success + '15', borderRadius: borderRadius.lg}]}>
              <Text style={{fontSize: 48, marginBottom: 8}}>🎉</Text>
              <Text style={{color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, textAlign: 'center'}}>
                匹配成功！
              </Text>
              <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: 4}}>
                {matchedCompanion.name} 已接受您的行程
              </Text>
            </View>

            {/* 陪行人卡片 */}
            <Card variant="card" style={{marginTop: 16}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={[styles.avatar, {backgroundColor: colors.primaryLight, borderRadius: 9999}]}>
                  <Text style={{fontSize: 32}}>{matchedCompanion.avatar || '🧑'}</Text>
                </View>
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}}>
                    {matchedCompanion.name}
                  </Text>
                  <View style={{flexDirection: 'row', marginTop: 4, flexWrap: 'wrap'}}>
                    <Badge text={`⭐ ${matchedCompanion.rating}`} variant="success" style={{marginRight: 4}} />
                    {matchedCompanion.tags?.slice(0, 2).map((tag: string, i: number) => (
                      <Badge key={i} text={tag} variant="primary" style={{marginRight: 4}} />
                    ))}
                  </View>
                  <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 6}}>
                    📍 距离约 {Math.floor(Math.random() * 2000 + 500)}m · 预计 {Math.floor(Math.random() * 10 + 3)} 分钟到达
                  </Text>
                </View>
              </View>

              {/* 匹配分数 */}
              <View style={{marginTop: 12, flexDirection: 'row', alignItems: 'center'}}>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>匹配度</Text>
                <View style={{flex: 1, height: 6, backgroundColor: colors.borderLight, borderRadius: 3, marginHorizontal: 8}}>
                  <View style={{
                    height: 6, borderRadius: 3,
                    backgroundColor: '#10B981',
                    width: `${matchedCompanion.match_score}%`,
                  }} />
                </View>
                <Text style={{color: '#10B981', fontSize: fontSize.xs, fontWeight: fontWeight.bold as any}}>
                  {matchedCompanion.match_score}%
                </Text>
              </View>
            </Card>

            {/* 等待提示 */}
            <Card variant="card-flat" style={{marginTop: 16, backgroundColor: colors.warning + '10'}}>
              <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20}}>
                ⏳ 等待陪行人点击"开始陪行"...
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center', marginTop: 4}}>
                陪行人到达后将自动更新状态
              </Text>
            </Card>

            {/* 操作按钮 */}
            <View style={{marginTop: 20}}>
              <TouchableOpacity
                style={{alignSelf: 'center', paddingVertical: 8}}
                onPress={handleCancel}>
                <Text style={{color: colors.danger, fontSize: fontSize.sm}}>取消行程</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ===== 匹配中 ===== */
          <View style={styles.centerBox}>
            {/* 脉冲圆 */}
            <Animated.View style={[
              styles.pulseCircle,
              {
                backgroundColor: colors.primaryLight,
                opacity: pulseAnim,
                transform: [{scale: pulseAnim}],
              },
            ]} />
            <View style={[styles.innerCircle, {backgroundColor: colors.primary}]}>
              <ActivityIndicator size="large" color="#fff" />
            </View>

            <Text style={{color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, marginTop: 32}}>
              正在为您匹配
            </Text>
            <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 8, textAlign: 'center'}}>
              预计 {estimatedMin} 分钟内匹配成功
            </Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 4}}>
              已等待 {Math.floor(elapsed / 60)} 分 {elapsed % 60} 秒
            </Text>

            {/* 取消按钮 */}
            <TouchableOpacity
              style={[styles.cancelBtn, {borderColor: colors.border, borderRadius: borderRadius.full}]}
              onPress={handleCancel}
              disabled={cancelling}>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.base}}>
                {cancelling ? '取消中...' : '✕ 取消行程'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  header: {
    paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: {marginRight: 12, padding: 4},
  headerTitle: {lineHeight: 28},
  body: {flex: 1, paddingHorizontal: 20, paddingTop: 24},
  centerBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingBottom: 80,
  },
  pulseCircle: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
  },
  innerCircle: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelBtn: {
    marginTop: 40, paddingVertical: 12, paddingHorizontal: 40,
    borderWidth: 1.5,
  },
  successBanner: {
    alignItems: 'center', padding: 20,
  },
  avatar: {
    width: 56, height: 56, alignItems: 'center', justifyContent: 'center',
  },
});

export default MatchScreen;
