import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {useTheme} from '../theme';
import * as facilityService from '../services/facilityService';
import type {FacilitySummary, FacilityDetail, FacilityType} from '../services/facilityService';
import {FACILITY_TYPE_MAP, STATUS_LABELS, STATUS_VARIANTS, RADIUS_OPTIONS} from '../services/facilityService';
import Card from '../components/Card/Card';
import Badge from '../components/Badge/Badge';
import Divider from '../components/Divider/Divider';
import Tag from '../components/Tag/Tag';

/**
 * FacilitySearchScreen — 无障碍设施查询
 *
 * 页面结构：
 * 1. 搜索栏（类型筛选 + 半径选择）
 * 2. 设施列表（卡片：名称+类型+状态+距离+地址+描述）
 * 3. 点击 → 详情 Modal（状态历史等）
 *
 * 依赖：Step 3 组件库、facilityService
 */

const FacilitySearchScreen: React.FC<{navigation: any; route?: any}> = ({navigation, route}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();
  const initialQuery = route?.params?.query || '';

  // ---- 列表 ----
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ---- 搜索 ----
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // ---- 筛选 ----
  const [types, setTypes] = useState<facilityService.FacilityTypeInfo[]>([]);
  const [selectedType, setSelectedType] = useState<FacilityType | ''>('');
  const [selectedRadius, setSelectedRadius] = useState(2000);

  // ---- 详情 ----
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<FacilityDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ---- 加载类型 ----
  useEffect(() => {
    facilityService.getFacilityTypes().then(setTypes).catch(() => {});
  }, []);

  // ---- 加载列表 ----
  const loadFacilities = useCallback(async () => {
    setErrorMsg('');
    try {
      const result = await facilityService.searchFacilities({
        q: searchQuery || undefined,
        facility_type: selectedType || undefined,
        lat: 39.908,
        lng: 116.397,
        radius_meters: selectedRadius,
      });
      setFacilities(result.facilities);
      setTotal(result.total);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedRadius, searchQuery]);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFacilities();
    setRefreshing(false);
  };

  // ---- 查看详情 ----
  const openDetail = async (facility: FacilitySummary) => {
    setLoadingDetail(true);
    setDetailVisible(true);
    try {
      const detail = await facilityService.getFacilityById(facility.id);
      setSelectedFacility({...detail, status_history: (detail as any).status_history || []});
    } catch {
      setSelectedFacility(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ---- 渲染设施卡片 ----
  const renderItem = ({item}: {item: FacilitySummary}) => {
    const typeInfo = FACILITY_TYPE_MAP[item.facility_type];
    const statusLabel = item.current_status ? STATUS_LABELS[item.current_status] : '未知';
    const statusVariant = item.current_status ? STATUS_VARIANTS[item.current_status] : 'warning';

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => openDetail(item)}>
        <Card variant="card" style={{marginBottom: spacing.sm}}>
          <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
            {/* 类型图标 */}
            <Text style={{fontSize: 32, marginRight: spacing.md, marginTop: 2}}>{typeInfo.icon}</Text>

            <View style={{flex: 1}}>
              {/* 标题行 */}
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text
                  style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any, flex: 1}}
                  numberOfLines={1}>
                  {item.name}
                </Text>
                <Badge text={statusLabel} variant={statusVariant} />
              </View>

              {/* 类型 + 距离 */}
              <View style={{flexDirection: 'row', marginTop: 4}}>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
                  {typeInfo.label}
                </Text>
                {item.distance_meters !== undefined && (
                  <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginLeft: 12}}>
                    📍 {item.distance_meters < 1000
                      ? `${item.distance_meters}m`
                      : `${(item.distance_meters / 1000).toFixed(1)}km`}
                  </Text>
                )}
                {!item.verified && (
                  <Badge text="未认证" variant="warning" style={{marginLeft: 8}} />
                )}
              </View>

              {/* 地址 */}
              {item.address && (
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 4}} numberOfLines={1}>
                  📫 {item.address}
                </Text>
              )}

              {/* 描述 */}
              {item.description && (
                <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 6, lineHeight: 20}} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {/* 设施属性 */}
              <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 6}}>
                {item.door_width_cm && (
                  <Badge text={`🚪 ${item.door_width_cm}cm`} variant="primary" style={{marginRight: 4, marginBottom: 4}} />
                )}
                {item.has_handrail && (
                  <Badge text="🤝 有扶手" variant="success" style={{marginRight: 4, marginBottom: 4}} />
                )}
                {item.floor && (
                  <Badge text={`🏢 ${item.floor}层`} variant="primary" style={{marginRight: 4, marginBottom: 4}} />
                )}
              </View>
            </View>

            <Text style={{color: colors.textTertiary, fontSize: fontSize.lg, marginLeft: 4}}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.flex, {backgroundColor: colors.bg}]}>
      {/* ============================================================ */}
      {/* 页头 */}
      {/* ============================================================ */}
      <View style={[styles.header, {backgroundColor: colors.primary}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backBtn, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
            onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <View style={{marginLeft: 12, flex: 1}}>
            <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
              🏢 无障碍设施
            </Text>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xs, opacity: 0.85}}>
              共 {total} 处设施
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.reportBtn, {backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: borderRadius.md}]}
            onPress={() => navigation.navigate('ReportFacility')}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
              📝 上报
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 筛选栏 */}
      {/* ============================================================ */}
      <View style={[styles.filterBar, {backgroundColor: colors.surface, borderBottomColor: colors.borderLight}]}>
        {/* 类型筛选 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: !selectedType ? colors.primary : colors.bg,
                borderColor: !selectedType ? colors.primary : colors.borderLight,
                borderRadius: borderRadius.full,
              },
            ]}
            onPress={() => setSelectedType('')}>
            <Text style={{color: !selectedType ? colors.textInverse : colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium as any}}>
              全部
            </Text>
          </TouchableOpacity>
          {types.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedType === t.value ? colors.primary : colors.bg,
                  borderColor: selectedType === t.value ? colors.primary : colors.borderLight,
                  borderRadius: borderRadius.full,
                },
              ]}
              onPress={() => setSelectedType(prev => prev === t.value ? '' : t.value)}>
              <Text style={{color: selectedType === t.value ? colors.textInverse : colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium as any}}>
                {t.icon} {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 半径选择 */}
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.radiusChip,
                {
                  backgroundColor: selectedRadius === opt.value ? colors.primaryLight : colors.bg,
                  borderColor: selectedRadius === opt.value ? colors.primary : colors.borderLight,
                  borderRadius: borderRadius.md,
                },
              ]}
              onPress={() => setSelectedRadius(opt.value)}>
              <Text style={{color: selectedRadius === opt.value ? colors.primary : colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any}}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ============================================================ */}
      {/* 列表 */}
      {/* ============================================================ */}
      {facilities.length > 0 && (
        <FlatList
          data={facilities}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}

      {!loading && facilities.length === 0 && !errorMsg && (
        <View style={styles.emptyState}>
          <Text style={{fontSize: 48, marginBottom: 16}}>🏢</Text>
          <Text style={{color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any, textAlign: 'center'}}>
            {selectedType ? '未找到该类设施' : '暂无设施数据'}
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', marginTop: 8}}>
            {selectedType ? '请尝试切换类型或扩大搜索范围' : '请检查搜索条件'}
          </Text>
        </View>
      )}

      {errorMsg && facilities.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{fontSize: 40, marginBottom: 16}}>⚠️</Text>
          <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center'}}>{errorMsg}</Text>
          <TouchableOpacity
            style={{marginTop: 16, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: colors.primaryLight}}
            onPress={loadFacilities}>
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
          <View style={[styles.modalHeader, {backgroundColor: colors.primary}]}>
            <TouchableOpacity
              style={[styles.backBtn, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
              onPress={() => setDetailVisible(false)}>
              <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
            </TouchableOpacity>
            <Text style={{color: colors.textInverse, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, marginLeft: 12}}>
              设施详情
            </Text>
          </View>

          {loadingDetail ? (
            <View style={styles.emptyState}>
              <Text style={{color: colors.textTertiary}}>加载中...</Text>
            </View>
          ) : selectedFacility ? (
            <ScrollView style={styles.flex} contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
              <Card variant="card">
                <Text style={{color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}}>
                  {selectedFacility.name}
                </Text>
                <View style={{flexDirection: 'row', marginTop: spacing.sm}}>
                  <Badge text={FACILITY_TYPE_MAP[selectedFacility.facility_type].icon + ' ' + FACILITY_TYPE_MAP[selectedFacility.facility_type].label} variant="primary" />
                  {selectedFacility.current_status && (
                    <Badge
                      text={STATUS_LABELS[selectedFacility.current_status]}
                      variant={STATUS_VARIANTS[selectedFacility.current_status]}
                      style={{marginLeft: spacing.xs}}
                    />
                  )}
                  {!selectedFacility.verified && (
                    <Badge text="未认证" variant="warning" style={{marginLeft: spacing.xs}} />
                  )}
                </View>

                {selectedFacility.address && (
                  <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.md}}>
                    📫 {selectedFacility.address}{selectedFacility.floor ? ` · ${selectedFacility.floor}层` : ''}
                  </Text>
                )}

                {selectedFacility.description && (
                  <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm, lineHeight: 22}}>
                    {selectedFacility.description}
                  </Text>
                )}

                <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md}}>
                  {selectedFacility.door_width_cm && (
                    <Badge text={`🚪 门宽 ${selectedFacility.door_width_cm}cm`} variant="primary" style={{marginRight: 6, marginBottom: 6}} />
                  )}
                  {selectedFacility.has_handrail && (
                    <Badge text="🤝 有扶手" variant="success" style={{marginRight: 6, marginBottom: 6}} />
                  )}
                </View>

                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.sm}}>
                  数据来源：{selectedFacility.source === 'official' ? '官方数据' : selectedFacility.source === 'amap' ? '高德地图' : '用户上报'}
                </Text>
              </Card>

              {/* 状态上报按钮 */}
              <Card variant="card" style={{marginTop: spacing.md}}>
                <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any, marginBottom: spacing.sm}}>
                  📊 上报设施状态
                </Text>
                <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                  {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map(status => (
                    <Tag
                      key={status}
                      label={`${STATUS_LABELS[status]}`}
                      selected={false}
                      onPress={async () => {
                        try {
                          await facilityService.reportFacilityStatus(selectedFacility!.id, status);
                          if (typeof window !== 'undefined') { window.alert('状态已更新'); }
                          setDetailVisible(false);
                        } catch (err: any) {
                          const msg = err?.response?.data?.error || '操作失败';
                          if (typeof window !== 'undefined') { window.alert(msg); }
                        }
                      }}
                      style={{marginRight: 6, marginBottom: 6}}
                    />
                  ))}
                </View>
              </Card>

              {selectedFacility.status_history.length > 0 && (
                <Card variant="card" style={{marginTop: spacing.md}}>
                  <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any, marginBottom: spacing.sm}}>
                    📊 状态历史
                  </Text>
                  {selectedFacility.status_history.map((h, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <Divider />}
                      <View style={{paddingVertical: 8}}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                          <Badge text={STATUS_LABELS[h.status]} variant={STATUS_VARIANTS[h.status]} />
                          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
                            {new Date(h.reported_at).toLocaleDateString('zh-CN')}
                          </Text>
                        </View>
                        {h.note && (
                          <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4}}>
                            {h.note}
                          </Text>
                        )}
                        {h.valid_until && (
                          <Text style={{color: colors.textTertiary, fontSize: fontSize['3xs'], marginTop: 2}}>
                            有效期至 {new Date(h.valid_until).toLocaleDateString('zh-CN')}
                          </Text>
                        )}
                      </View>
                    </React.Fragment>
                  ))}
                </Card>
              )}

              <View style={{height: 40}} />
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={{fontSize: 40, marginBottom: 16}}>⚠️</Text>
              <Text style={{color: colors.textSecondary, fontSize: fontSize.sm}}>加载详情失败</Text>
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
  flex: {flex: 1},
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {flexDirection: 'row', alignItems: 'center'},
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {lineHeight: 28},
  filterBar: {
    paddingTop: 12, paddingBottom: 4, borderBottomWidth: 1,
  },
  filterScroll: {paddingHorizontal: 16},
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, marginRight: 8,
  },
  radiusRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 8,
  },
  radiusChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1,
  },
  listContent: {padding: 16, paddingBottom: 24},
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingTop: 80,
  },
  modalHeader: {
    paddingTop: 48, paddingBottom: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center',
  },
  detailContent: {padding: 16},
});

export default FacilitySearchScreen;
