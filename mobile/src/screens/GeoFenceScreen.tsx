import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import {useTheme} from '../theme';
import * as fenceService from '../services/geoFenceService';
import type {GeoFence, CreateFenceInput} from '../services/geoFenceService';
import {RADIUS_PRESETS, LOCATION_PRESETS} from '../services/geoFenceService';
import Card from '../components/Card/Card';
import Badge from '../components/Badge/Badge';
import Button from '../components/Button/Button';
import FormInput from '../components/Input/FormInput';
import TypeSelector from '../components/TypeSelector/TypeSelector';
import Divider from '../components/Divider/Divider';

/**
 * GeoFenceScreen — 电子围栏管理
 *
 * 功能：
 * 1. 围栏列表（卡片：名称+位置+半径+开关）
 * 2. 添加围栏（Modal 表单：名称/位置/半径）
 * 3. 编辑围栏
 * 4. 删除围栏
 * 5. 启用/禁用切换
 *
 * 限制：最多 5 个围栏
 *
 * 依赖：Step 3 组件库、geoFenceService
 */

const MAX_FENCES = 5;

const GeoFenceScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();

  // ---- 列表状态 ----
  const [fences, setFences] = useState<GeoFence[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ---- 表单状态 ----
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFence, setEditingFence] = useState<GeoFence | null>(null);
  const [formName, setFormName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(0); // index in LOCATION_PRESETS
  const [formRadius, setFormRadius] = useState(500);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- 加载 ----
  const loadFences = useCallback(async () => {
    setErrorMsg('');
    try {
      const result = await fenceService.getFences();
      setFences(result);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFences();
  }, [loadFences]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFences();
    setRefreshing(false);
  };

  // ---- 打开新增 Modal ----
  const openAddModal = () => {
    if (fences.length >= MAX_FENCES) {
      Alert.alert('已达上限', `最多创建 ${MAX_FENCES} 个电子围栏`);
      return;
    }
    setEditingFence(null);
    setFormName('');
    setSelectedLocation(0);
    setFormRadius(500);
    setModalVisible(true);
  };

  // ---- 打开编辑 Modal ----
  const openEditModal = (fence: GeoFence) => {
    setEditingFence(fence);
    setFormName(fence.name);
    // 尝试匹配已有位置
    const locIdx = LOCATION_PRESETS.findIndex(
      l => l.coordinates[0] === fence.center.coordinates[0] && l.coordinates[1] === fence.center.coordinates[1],
    );
    setSelectedLocation(locIdx >= 0 ? locIdx : 0);
    setFormRadius(fence.radius_meters);
    setModalVisible(true);
  };

  // ---- 提交 ----
  const handleSubmit = async () => {
    if (!formName.trim()) {
      Alert.alert('请填写名称', '围栏名称不能为空');
      return;
    }

    setIsSubmitting(true);
    try {
      const location = LOCATION_PRESETS[selectedLocation];
      const data: CreateFenceInput = {
        name: formName.trim(),
        center: {type: 'Point', coordinates: location.coordinates},
        radius_meters: formRadius,
      };

      if (editingFence) {
        await fenceService.updateFence(editingFence.id, data);
      } else {
        await fenceService.createFence(data);
      }

      setModalVisible(false);
      await loadFences();
    } catch (err: any) {
      Alert.alert('保存失败', err?.response?.data?.error || '请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- 删除 ----
  const handleDelete = (fence: GeoFence) => {
    Alert.alert('删除围栏', `确定要删除"${fence.name}"吗？`, [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await fenceService.deleteFence(fence.id);
            await loadFences();
          } catch (err: any) {
            Alert.alert('删除失败', err?.response?.data?.error || '请稍后重试');
          }
        },
      },
    ]);
  };

  // ---- 切换启用 ----
  const handleToggle = async (fence: GeoFence) => {
    try {
      await fenceService.toggleFence(fence.id);
      await loadFences();
    } catch (err: any) {
      Alert.alert('操作失败', err?.response?.data?.error || '请稍后重试');
    }
  };

  // ---- 获取位置名称 ----
  const getLocationName = (fence: GeoFence): string => {
    const match = LOCATION_PRESETS.find(
      l => l.coordinates[0] === fence.center.coordinates[0] && l.coordinates[1] === fence.center.coordinates[1],
    );
    return match ? match.name : `📍 ${fence.center.coordinates[1].toFixed(4)}, ${fence.center.coordinates[0].toFixed(4)}`;
  };

  // ---- 获取半径信息 ----
  const getRadiusInfo = (meters: number) => {
    const preset = RADIUS_PRESETS.find(r => r.value === meters);
    return preset || {icon: '⭕', label: `${meters}m`, description: '自定义'};
  };

  // ---- 渲染围栏卡片 ----
  const renderFenceCard = (fence: GeoFence) => {
    const radiusInfo = getRadiusInfo(fence.radius_meters);

    return (
      <Card variant="card" key={fence.id} style={{marginBottom: spacing.sm}}>
        {/* 标题行 */}
        <View style={styles.fenceHeader}>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text
                style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any, flex: 1}}
                numberOfLines={1}>
                {fence.name}
              </Text>
              <Badge
                text={fence.is_active ? '🟢 已启用' : '⏸ 已暂停'}
                variant={fence.is_active ? 'success' : 'warning'}
              />
            </View>
          </View>
        </View>

        {/* 位置 */}
        <View style={[styles.infoRow, {marginTop: spacing.sm}]}>
          <Text style={{fontSize: fontSize.sm, marginRight: spacing.xs}}>{radiusInfo.icon}</Text>
          <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, flex: 1}} numberOfLines={1}>
            {getLocationName(fence)}
          </Text>
        </View>

        {/* 半径 + 坐标 */}
        <View style={styles.infoRow}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
            🎯 半径 {radiusInfo.label} · {radiusInfo.description}
          </Text>
        </View>
        <Text style={{color: colors.textTertiary, fontSize: fontSize['3xs'], marginTop: 2}}>
          中心坐标：{fence.center.coordinates[1].toFixed(4)}, {fence.center.coordinates[0].toFixed(4)}
        </Text>

        {/* 操作按钮 */}
        <View style={[styles.actionRow, {marginTop: spacing.sm, borderTopColor: colors.borderLight}]}>
          <TouchableOpacity
            style={[styles.actionBtn, {backgroundColor: fence.is_active ? colors.warning + '20' : colors.success + '20'}]}
            onPress={() => handleToggle(fence)}>
            <Text style={{color: fence.is_active ? colors.warning : colors.success, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any}}>
              {fence.is_active ? '⏸ 暂停' : '▶ 启用'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, {backgroundColor: colors.primaryLight}]}
            onPress={() => openEditModal(fence)}>
            <Text style={{color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any}}>
              ✏️ 编辑
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, {backgroundColor: colors.danger + '15'}]}
            onPress={() => handleDelete(fence)}>
            <Text style={{color: colors.danger, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as any}}>
              🗑️ 删除
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
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
          <View style={{flex: 1, marginLeft: 12}}>
            <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
              📍 电子围栏
            </Text>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xs, opacity: 0.85}}>
              最多 {MAX_FENCES} 个 · {fences.length}/{MAX_FENCES}
            </Text>
          </View>
        </View>
        {/* 说明 */}
        <View style={[styles.headerNote, {backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: borderRadius.md}]}>
          <Text style={{color: colors.textInverse, fontSize: fontSize.xs, lineHeight: 18}}>
            💡 设置安全活动范围后，当您（或陪行人）超出围栏时将触发安全提醒，紧急联系人会收到通知。
          </Text>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 列表 */}
      {/* ============================================================ */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }>
        {fences.map(renderFenceCard)}

        {/* 空状态 */}
        {!loading && fences.length === 0 && !errorMsg && (
          <View style={styles.emptyState}>
            <Text style={{fontSize: 48, marginBottom: 16}}>📍</Text>
            <Text style={{color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any, textAlign: 'center'}}>
              暂无电子围栏
            </Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', marginTop: 8, lineHeight: 20}}>
              设置安全活动范围{'\n'}超出围栏时自动通知紧急联系人
            </Text>
          </View>
        )}

        {/* 错误 */}
        {errorMsg && fences.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{fontSize: 40, marginBottom: 16}}>⚠️</Text>
            <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center'}}>{errorMsg}</Text>
            <TouchableOpacity
              style={{marginTop: 16, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: colors.primaryLight}}
              onPress={loadFences}>
              <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>重试</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ============================================================ */}
      {/* 添加按钮（固定底部） */}
      {/* ============================================================ */}
      <View style={{padding: spacing.lg}}>
        <Button
          title={`+ 添加围栏 (${fences.length}/${MAX_FENCES})`}
          variant="primary"
          size="default"
          disabled={fences.length >= MAX_FENCES}
          onPress={openAddModal}
        />
      </View>

      {/* ============================================================ */}
      {/* 编辑/新增 Modal */}
      {/* ============================================================ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}>
        <ScrollView
          style={[styles.flex, {backgroundColor: colors.bg}]}
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}>
          {/* Modal 页头 */}
          <View style={styles.modalHeader}>
            <Text style={{color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}}>
              {editingFence ? '✏️ 编辑围栏' : '➕ 添加围栏'}
            </Text>
            <TouchableOpacity
              style={[styles.modalCloseBtn, {backgroundColor: colors.surface, borderRadius: borderRadius.full}]}
              onPress={() => setModalVisible(false)}>
              <Text style={{color: colors.textSecondary, fontSize: fontSize.lg}}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 名称 */}
          <FormInput
            label="围栏名称 *"
            value={formName}
            onChangeText={setFormName}
            placeholder="如：家周边、医院范围、社区活动区"
            required
            maxLength={20}
          />

          {/* 位置选择 */}
          <Card variant="card" style={{marginBottom: spacing.md}}>
            <Text style={[styles.sectionTitle, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
              中心位置
            </Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
              {LOCATION_PRESETS.map((loc, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.locationChip,
                    {
                      backgroundColor: selectedLocation === i ? colors.primaryLight : colors.bg,
                      borderColor: selectedLocation === i ? colors.primary : colors.borderLight,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                  onPress={() => setSelectedLocation(i)}>
                  <Text
                    style={{
                      color: selectedLocation === i ? colors.primary : colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontWeight: (selectedLocation === i ? '600' : '400') as any,
                    }}
                    numberOfLines={1}>
                    {loc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* 坐标提示 */}
            <Text style={{color: colors.textTertiary, fontSize: fontSize['3xs'], marginTop: spacing.sm}}>
              坐标：{LOCATION_PRESETS[selectedLocation].coordinates[1].toFixed(4)},{' '}
              {LOCATION_PRESETS[selectedLocation].coordinates[0].toFixed(4)}
            </Text>
          </Card>

          {/* 半径选择 */}
          <Card variant="card" style={{marginBottom: spacing.lg}}>
            <Text style={[styles.sectionTitle, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
              安全半径
            </Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
              {RADIUS_PRESETS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.radiusChip,
                    {
                      backgroundColor: formRadius === opt.value ? colors.primaryLight : colors.bg,
                      borderColor: formRadius === opt.value ? colors.primary : colors.borderLight,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                  onPress={() => setFormRadius(opt.value)}>
                  <Text style={{fontSize: fontSize.xl, textAlign: 'center'}}>{opt.icon}</Text>
                  <Text
                    style={{
                      color: formRadius === opt.value ? colors.primary : colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontWeight: (formRadius === opt.value ? '600' : '400') as any,
                      marginTop: 4,
                    }}>
                    {opt.label}
                  </Text>
                  <Text style={{color: colors.textTertiary, fontSize: fontSize['3xs'], marginTop: 2}}>
                    {opt.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* 提交 */}
          <Button
            title={isSubmitting ? '保存中...' : '💾 保存'}
            variant="primary"
            size="default"
            disabled={isSubmitting}
            onPress={handleSubmit}
          />

          <View style={{height: 40}} />
        </ScrollView>
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
    paddingBottom: 20,
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
  headerNote: {
    marginTop: 14,
    padding: 12,
  },
  // ---- 列表 ----
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  // ---- 围栏卡片 ----
  fenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  // ---- 空状态 ----
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  // ---- Modal ----
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    marginBottom: 12,
  },
  // ---- 位置选择 ----
  locationChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 8,
  },
  // ---- 半径选择 ----
  radiusChip: {
    width: '30%',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    marginRight: '2%',
    marginBottom: 8,
    alignItems: 'center',
  },
});

export default GeoFenceScreen;
