import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  RefreshControl,
} from 'react-native';
import {useTheme} from '../theme';
import * as professionalService from '../services/professionalService';
import type {ProfessionalSummary, ProfessionalDetail} from '../services/professionalService';
import {SORT_OPTIONS} from '../services/professionalService';
import Avatar from '../components/Avatar/Avatar';
import Badge from '../components/Badge/Badge';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import Divider from '../components/Divider/Divider';

/**
 * ProfessionalListScreen — 专业陪护人员列表
 *
 * 页面结构：
 * 1. 页头
 * 2. 筛选栏（专长标签 + 排序）
 * 3. 专业人员卡片列表
 * 4. 点击卡片 → 详细资料 Modal
 *
 * 依赖：Step 3 组件库
 */

/** 评分 → emoji 星星 */
function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(Math.max(0, empty));
}

const ProfessionalListScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();

  // ---- 列表状态 ----
  const [professionals, setProfessionals] = useState<ProfessionalSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ---- 筛选状态 ----
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [sortBy, setSortBy] = useState<professionalService.ProfessionalListParams['sort_by']>('rating');

  // ---- 详情状态 ----
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedPro, setSelectedPro] = useState<ProfessionalDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ---- 加载筛选标签 ----
  useEffect(() => {
    professionalService.getSpecialtyFilters().then(setSpecialties).catch(() => {});
  }, []);

  // ---- 加载列表 ----
  const loadProfessionals = useCallback(async () => {
    setErrorMsg('');
    try {
      const result = await professionalService.getProfessionals({
        specialty: selectedSpecialty || undefined,
        sort_by: sortBy,
      });
      setProfessionals(result.professionals);
      setTotal(result.total);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [selectedSpecialty, sortBy]);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfessionals();
    setRefreshing(false);
  };

  // ---- 查看详情 ----
  const openDetail = async (pro: ProfessionalSummary) => {
    setLoadingDetail(true);
    setDetailVisible(true);
    try {
      const detail = await professionalService.getProfessionalById(pro.id);
      setSelectedPro(detail);
    } catch {
      setSelectedPro(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ---- 渲染专业卡片 ----
  const renderProCard = ({item}: {item: ProfessionalSummary}) => (
    <TouchableOpacity activeOpacity={0.7} onPress={() => openDetail(item)}>
      <Card variant="card" style={{marginBottom: spacing.sm}}>
        {/* 基本信息行 */}
        <View style={styles.cardHeader}>
          <Avatar name={item.name} size="lg" style={{marginRight: spacing.md}} />
          <View style={{flex: 1}}>
            <View style={styles.nameRow}>
              <Text
                style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any, flex: 1}}
                numberOfLines={1}>
                {item.name}
              </Text>
              <Badge text={`💼 专业`} variant="warning" />
            </View>

            {/* 评分 + 经验 */}
            <View style={styles.metaRow}>
              <Text style={{color: colors.secondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
                {renderStars(item.rating)} {item.rating}
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginLeft: spacing.md}}>
                🏆 {item.completed_trips} 次陪行
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginLeft: spacing.md}}>
                🎓 {item.years_of_experience} 年经验
              </Text>
            </View>
          </View>

          {/* 价格 */}
          <View style={styles.priceBox}>
            <Text style={{color: colors.danger, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}}>
              ¥{item.hourly_rate_cents ? (item.hourly_rate_cents / 100).toFixed(0) : '??'}
            </Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize['3xs']}}>/小时</Text>
          </View>
        </View>

        {/* bio */}
        <Text
          style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm, lineHeight: 20}}
          numberOfLines={2}>
          {item.bio}
        </Text>

        {/* 专长标签 */}
        <View style={[styles.tagRow, {marginTop: spacing.sm}]}>
          {item.specialties.map((s, i) => (
            <Badge key={i} text={s} variant="success" style={{marginRight: 4, marginBottom: 4}} />
          ))}
        </View>

        {/* 证书 + 服务区域 */}
        <View style={[styles.tagRow, {marginTop: 4}]}>
          {item.certifications.slice(0, 3).map((c, i) => (
            <Badge key={i} text={`📜 ${c}`} variant="primary" style={{marginRight: 4, marginBottom: 4}} />
          ))}
          {item.service_area.map((a, i) => (
            <Badge key={`area-${i}`} text={`📍 ${a}`} variant="primary" style={{marginRight: 4, marginBottom: 4}} />
          ))}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.flex, {backgroundColor: colors.bg}]}>
      {/* ============================================================ */}
      {/* 页头 */}
      {/* ============================================================ */}
      <View style={[styles.header, {backgroundColor: colors.secondary}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backBtn, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
            onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <View style={{marginLeft: 12}}>
            <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
              💼 专业陪护
            </Text>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xs, opacity: 0.85}}>
              共 {total} 位认证专业人员
            </Text>
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 筛选栏 */}
      {/* ============================================================ */}
      {specialties.length > 0 && (
        <View style={[styles.filterBar, {backgroundColor: colors.surface, borderBottomColor: colors.borderLight}]}>
          {/* 专长筛选 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            style={{marginBottom: 8}}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: !selectedSpecialty ? colors.primary : colors.bg,
                  borderColor: !selectedSpecialty ? colors.primary : colors.borderLight,
                  borderRadius: borderRadius.full,
                },
              ]}
              onPress={() => setSelectedSpecialty('')}>
              <Text
                style={{
                  color: !selectedSpecialty ? colors.textInverse : colors.textSecondary,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.medium as any,
                }}>
                全部
              </Text>
            </TouchableOpacity>
            {specialties.map(s => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedSpecialty === s ? colors.primary : colors.bg,
                    borderColor: selectedSpecialty === s ? colors.primary : colors.borderLight,
                    borderRadius: borderRadius.full,
                  },
                ]}
                onPress={() =>
                  setSelectedSpecialty(prev => (prev === s ? '' : s))
                }>
                <Text
                  style={{
                    color: selectedSpecialty === s ? colors.textInverse : colors.textSecondary,
                    fontSize: fontSize.xs,
                    fontWeight: fontWeight.medium as any,
                  }}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 排序 */}
          <View style={styles.sortRow}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sortBtn,
                  {
                    backgroundColor: sortBy === opt.value ? colors.primaryLight : colors.bg,
                    borderColor: sortBy === opt.value ? colors.primary : colors.borderLight,
                    borderRadius: borderRadius.md,
                  },
                ]}
                onPress={() => setSortBy(opt.value)}>
                <Text
                  style={{
                    color: sortBy === opt.value ? colors.primary : colors.textSecondary,
                    fontSize: fontSize.xs,
                    fontWeight: fontWeight.semibold as any,
                  }}>
                  {opt.icon} {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ============================================================ */}
      {/* 列表 */}
      {/* ============================================================ */}
      {professionals.length > 0 && (
        <FlatList
          data={professionals}
          renderItem={renderProCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.secondary]} />
          }
        />
      )}

      {/* 空状态 */}
      {!loading && professionals.length === 0 && !errorMsg && (
        <View style={styles.emptyState}>
          <Text style={{fontSize: 48, marginBottom: 16}}>💼</Text>
          <Text style={{color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any, textAlign: 'center'}}>
            {selectedSpecialty ? '没有匹配的专业人员' : '暂无专业陪护人员'}
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', marginTop: 8, lineHeight: 20}}>
            {selectedSpecialty ? '请尝试清除筛选条件' : '请稍后再来查看'}
          </Text>
        </View>
      )}

      {/* 错误 */}
      {errorMsg && professionals.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{fontSize: 40, marginBottom: 16}}>⚠️</Text>
          <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center'}}>{errorMsg}</Text>
          <TouchableOpacity
            style={{marginTop: 16, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: colors.primaryLight}}
            onPress={loadProfessionals}>
            <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>重试</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ============================================================ */}
      {/* 详情 Modal */}
      {/* ============================================================ */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailVisible(false)}>
        <View style={[styles.flex, {backgroundColor: colors.bg}]}>
          {/* Modal 页头 */}
          <View style={[styles.modalHeader, {backgroundColor: colors.secondary}]}>
            <TouchableOpacity
              style={[styles.backBtn, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
              onPress={() => setDetailVisible(false)}>
              <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
            </TouchableOpacity>
            <Text style={{color: colors.textInverse, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, marginLeft: 12}}>
              专业人员详情
            </Text>
          </View>

          {loadingDetail ? (
            <View style={styles.emptyState}>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.base}}>加载中...</Text>
            </View>
          ) : selectedPro ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.detailContent}
              showsVerticalScrollIndicator={false}>
              {/* 基本信息卡片 */}
              <Card variant="card">
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Avatar name={selectedPro.name} size="lg" style={{marginRight: spacing.md}} />
                  <View style={{flex: 1}}>
                    <Text style={{color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}}>
                      {selectedPro.name}
                    </Text>
                    <Text style={{color: colors.secondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any, marginTop: 4}}>
                      {renderStars(selectedPro.rating)} {selectedPro.rating}
                    </Text>
                    <View style={{flexDirection: 'row', marginTop: 4}}>
                      <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
                        从业 {selectedPro.years_of_experience} 年
                      </Text>
                      <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginLeft: 12}}>
                        {selectedPro.completed_trips} 次陪行
                      </Text>
                    </View>
                  </View>
                  <View style={{alignItems: 'center'}}>
                    <Text style={{color: colors.danger, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}}>
                      ¥{selectedPro.hourly_rate_cents ? (selectedPro.hourly_rate_cents / 100).toFixed(0) : '面议'}
                    </Text>
                    <Text style={{color: colors.textTertiary, fontSize: fontSize['3xs']}}>/小时</Text>
                  </View>
                </View>

                {/* 简介 */}
                <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.md, lineHeight: 22}}>
                  {selectedPro.bio}
                </Text>

                {/* 专长 */}
                <View style={[styles.tagRow, {marginTop: spacing.md}]}>
                  {selectedPro.specialties.map((s, i) => (
                    <Badge key={i} text={s} variant="success" style={{marginRight: 4, marginBottom: 4}} />
                  ))}
                </View>

                {/* 服务区域 */}
                <View style={[styles.tagRow, {marginTop: 8}]}>
                  {selectedPro.service_area.map((a, i) => (
                    <Badge key={i} text={`📍 ${a}`} variant="primary" style={{marginRight: 4, marginBottom: 4}} />
                  ))}
                </View>

                {/* 可用时段 */}
                <View style={[styles.infoBox, {backgroundColor: colors.primaryLight, borderRadius: borderRadius.md, marginTop: spacing.md}]}>
                  <Text style={{color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any}}>
                    🕐 可服务时段
                  </Text>
                  <Text style={{color: colors.primary, fontSize: fontSize.sm, marginTop: 4}}>
                    {selectedPro.available_schedule}
                  </Text>
                </View>
              </Card>

              {/* 证书详情 */}
              <Card variant="card" style={{marginTop: spacing.md}}>
                <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}]}>
                  📜 专业证书
                </Text>
                {selectedPro.certification_details.map((cert, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <Divider />}
                    <View style={styles.certItem}>
                      <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
                        {cert.cert_name}
                      </Text>
                      <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>
                        发证机关：{cert.issuing_body}
                      </Text>
                      <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
                        签发日期：{cert.issued_at}
                        {cert.expires_at ? ` · 有效期至 ${cert.expires_at}` : ' · 长期有效'}
                      </Text>
                    </View>
                  </React.Fragment>
                ))}
              </Card>

              {/* 近期评价 */}
              {selectedPro.recent_reviews.length > 0 && (
                <Card variant="card" style={{marginTop: spacing.md}}>
                  <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}]}>
                    💬 近期评价
                  </Text>
                  {selectedPro.recent_reviews.map((review, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <Divider />}
                      <View style={styles.reviewItem}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                          <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
                            {review.reviewer_name}
                          </Text>
                          <Text style={{color: colors.secondary, fontSize: fontSize.xs}}>
                            {renderStars(review.score)}
                          </Text>
                        </View>
                        <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4, lineHeight: 20}}>
                          {review.comment}
                        </Text>
                        <Text style={{color: colors.textTertiary, fontSize: fontSize['3xs'], marginTop: 4}}>
                          {new Date(review.created_at).toLocaleDateString('zh-CN')}
                        </Text>
                      </View>
                    </React.Fragment>
                  ))}
                </Card>
              )}

              {/* 联系按钮 */}
              <View style={{marginTop: spacing.lg}}>
                <Button
                  title={`📞 联系 ${selectedPro.name}`}
                  variant="primary"
                  size="default"
                  onPress={() => {
                    // 引导用户发布行程来匹配该专业人员
                    setDetailVisible(false);
                    navigation.navigate('PublishTrip');
                  }}
                />
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.sm}}>
                  发布行程后可匹配该专业人员为您服务
                </Text>
              </View>

              <View style={{height: 40}} />
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={{fontSize: 40, marginBottom: 16}}>⚠️</Text>
              <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center'}}>加载详情失败</Text>
              <TouchableOpacity
                style={{marginTop: 16, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: colors.primaryLight}}
                onPress={() => setDetailVisible(false)}>
                <Text style={{color: colors.primary, fontSize: fontSize.sm}}>关闭</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
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
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    lineHeight: 28,
  },
  // ---- 筛选栏 ----
  filterBar: {
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sortBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: 3,
  },
  // ---- 列表 ----
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  // ---- 卡片 ----
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceBox: {
    alignItems: 'center',
    marginLeft: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // ---- 空状态 ----
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  // ---- Modal ----
  modalHeader: {
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailContent: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  // ---- 证书 ----
  certItem: {
    paddingVertical: 8,
  },
  // ---- 评价 ----
  reviewItem: {
    paddingVertical: 8,
  },
  // ---- 信息框 ----
  infoBox: {
    padding: 12,
  },
});

export default ProfessionalListScreen;
