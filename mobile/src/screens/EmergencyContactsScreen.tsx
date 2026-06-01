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
import * as contactService from '../services/emergencyContactService';
import type {EmergencyContact, CreateContactInput} from '../services/emergencyContactService';
import {RELATION_OPTIONS, NOTIFY_OPTIONS} from '../services/emergencyContactService';
import Avatar from '../components/Avatar/Avatar';
import Badge from '../components/Badge/Badge';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import FormInput from '../components/Input/FormInput';
import TypeSelector from '../components/TypeSelector/TypeSelector';

/**
 * EmergencyContactsScreen — 紧急联系人管理
 *
 * 功能：
 * 1. 联系人列表（卡片式，姓名+电话+关系+通知方式）
 * 2. 添加联系人（Modal 表单）
 * 3. 编辑联系人
 * 4. 删除联系人（确认弹窗）
 * 5. 设为主联系人
 *
 * 限制：最多 10 人
 *
 * 依赖：Step 3 组件库、emergencyContactService
 */

const MAX_CONTACTS = 10;

const EmergencyContactsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();

  // ---- 列表状态 ----
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ---- 表单状态 ----
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRelation, setFormRelation] = useState('家人');
  const [formNotifyMethod, setFormNotifyMethod] = useState<'sms' | 'push' | 'both'>('sms');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- 加载 ----
  const loadContacts = useCallback(async () => {
    setErrorMsg('');
    try {
      const result = await contactService.getContacts();
      setContacts(result);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  // ---- 打开新增 Modal ----
  const openAddModal = () => {
    if (contacts.length >= MAX_CONTACTS) {
      Alert.alert('已达上限', `最多添加 ${MAX_CONTACTS} 个紧急联系人`);
      return;
    }
    setEditingContact(null);
    setFormName('');
    setFormPhone('');
    setFormRelation('家人');
    setFormNotifyMethod('sms');
    setFormIsPrimary(false);
    setModalVisible(true);
  };

  // ---- 打开编辑 Modal ----
  const openEditModal = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormPhone(contact.phone);
    setFormRelation(contact.relation || '家人');
    setFormNotifyMethod(contact.notify_method);
    setFormIsPrimary(contact.is_primary);
    setModalVisible(true);
  };

  // ---- 提交 ----
  const handleSubmit = async () => {
    if (!formName.trim()) {
      Alert.alert('请填写姓名', '联系人姓名不能为空');
      return;
    }
    if (!formPhone.trim()) {
      Alert.alert('请填写电话', '联系人电话不能为空');
      return;
    }

    const phonePattern = /^1[3-9]\d{9}$/;
    if (!phonePattern.test(formPhone.trim())) {
      Alert.alert('号码错误', '请输入正确的 11 位手机号');
      return;
    }

    setIsSubmitting(true);
    try {
      const data: CreateContactInput = {
        name: formName.trim(),
        phone: formPhone.trim(),
        relation: formRelation,
        notify_method: formNotifyMethod,
        is_primary: formIsPrimary,
      };

      if (editingContact) {
        await contactService.updateContact(editingContact.id, data);
      } else {
        await contactService.createContact(data);
      }

      setModalVisible(false);
      await loadContacts();
    } catch (err: any) {
      Alert.alert('保存失败', err?.response?.data?.error || '请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- 删除 ----
  const handleDelete = (contact: EmergencyContact) => {
    Alert.alert(
      '删除联系人',
      `确定要删除"${contact.name}"吗？删除后可重新添加。`,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactService.deleteContact(contact.id);
              await loadContacts();
            } catch (err: any) {
              Alert.alert('删除失败', err?.response?.data?.error || '请稍后重试');
            }
          },
        },
      ],
    );
  };

  // ---- 设为主联系人 ----
  const handleSetPrimary = async (contact: EmergencyContact) => {
    if (contact.is_primary) return;
    try {
      await contactService.setPrimaryContact(contact.id);
      await loadContacts();
    } catch (err: any) {
      Alert.alert('设置失败', err?.response?.data?.error || '请稍后重试');
    }
  };

  // ---- 渲染单个联系人 ----
  const renderContact = (contact: EmergencyContact) => {
    const relationInfo = RELATION_OPTIONS.find(r => r.value === contact.relation);
    const notifyInfo = NOTIFY_OPTIONS.find(n => n.value === contact.notify_method);

    return (
      <Card variant="card" key={contact.id} style={{marginBottom: spacing.sm}}>
        <View style={styles.contactRow}>
          {/* 头像 */}
          <Avatar name={contact.name} size="lg" style={{marginRight: spacing.md}} />

          {/* 信息 */}
          <View style={{flex: 1}}>
            <View style={styles.contactTop}>
              <Text
                style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}
                numberOfLines={1}>
                {contact.name}
              </Text>
              {contact.is_primary && (
                <Badge text="⭐ 主联系人" variant="warning" style={{marginLeft: spacing.xs}} />
              )}
            </View>

            <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2}}>
              📱 {contact.phone}
            </Text>

            <View style={[styles.contactMeta, {marginTop: 4}]}>
              {relationInfo && (
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginRight: spacing.sm}}>
                  {relationInfo.icon} {relationInfo.label}
                </Text>
              )}
              {notifyInfo && (
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
                  {notifyInfo.icon} {notifyInfo.label}
                </Text>
              )}
            </View>
          </View>

          {/* 操作按钮 */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, {backgroundColor: colors.primaryLight}]}
              onPress={() => openEditModal(contact)}>
              <Text style={{fontSize: fontSize.sm}}>✏️</Text>
            </TouchableOpacity>
            {!contact.is_primary && (
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: colors.secondary + '20', marginTop: 6}]}
                onPress={() => handleSetPrimary(contact)}>
                <Text style={{fontSize: fontSize.xs}}>⭐</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, {backgroundColor: colors.danger + '15', marginTop: 6}]}
              onPress={() => handleDelete(contact)}>
              <Text style={{fontSize: fontSize.sm}}>🗑️</Text>
            </TouchableOpacity>
          </View>
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
              🆘 紧急联系人
            </Text>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xs, opacity: 0.85}}>
              最多 {MAX_CONTACTS} 人 · {contacts.length}/{MAX_CONTACTS}
            </Text>
          </View>
        </View>
        {/* 说明文字 */}
        <View style={[styles.headerNote, {backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: borderRadius.md}]}>
          <Text style={{color: colors.textInverse, fontSize: fontSize.xs, lineHeight: 18}}>
            💡 紧急联系人将在 SOS 紧急求助时自动收到通知，请至少设置一位主联系人。
          </Text>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 列表 */}
      {/* ============================================================ */}
      <ScrollView
        style={[styles.flex]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }>
        {contacts.map(renderContact)}

        {/* 空状态 */}
        {!loading && contacts.length === 0 && !errorMsg && (
          <View style={styles.emptyState}>
            <Text style={{fontSize: 48, marginBottom: 16}}>🆘</Text>
            <Text style={{color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any, textAlign: 'center'}}>
              暂无紧急联系人
            </Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', marginTop: 8, lineHeight: 20}}>
              添加紧急联系人后{'\n'}遇到紧急情况可一键求助
            </Text>
          </View>
        )}

        {/* 错误 */}
        {errorMsg && contacts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{fontSize: 40, marginBottom: 16}}>⚠️</Text>
            <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center'}}>{errorMsg}</Text>
            <TouchableOpacity
              style={{marginTop: 16, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: colors.primaryLight}}
              onPress={loadContacts}>
              <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>重试</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ============================================================ */}
      {/* 添加按钮（固定在底部） */}
      {/* ============================================================ */}
      <View style={{padding: spacing.lg}}>
        <Button
          title={`+ 添加联系人 (${contacts.length}/${MAX_CONTACTS})`}
          variant="primary"
          size="default"
          disabled={contacts.length >= MAX_CONTACTS}
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
              {editingContact ? '✏️ 编辑联系人' : '➕ 添加联系人'}
            </Text>
            <TouchableOpacity
              style={[styles.modalCloseBtn, {backgroundColor: colors.surface, borderRadius: borderRadius.full}]}
              onPress={() => setModalVisible(false)}>
              <Text style={{color: colors.textSecondary, fontSize: fontSize.lg}}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 姓名 */}
          <FormInput
            label="姓名 *"
            value={formName}
            onChangeText={setFormName}
            placeholder="请输入联系人姓名"
            required
            maxLength={20}
          />

          {/* 电话 */}
          <FormInput
            label="手机号 *"
            value={formPhone}
            onChangeText={setFormPhone}
            placeholder="请输入 11 位手机号"
            required
            maxLength={11}
            keyboardType="phone-pad"
          />

          {/* 关系选择 */}
          <Card variant="card" style={{marginBottom: spacing.md}}>
            <Text style={[styles.sectionTitle, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
              关系
            </Text>
            <TypeSelector
              options={RELATION_OPTIONS}
              selectedValue={formRelation}
              onSelect={setFormRelation}
            />
          </Card>

          {/* 通知方式 */}
          <Card variant="card" style={{marginBottom: spacing.md}}>
            <Text style={[styles.sectionTitle, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
              通知方式
            </Text>
            <TypeSelector
              options={NOTIFY_OPTIONS}
              selectedValue={formNotifyMethod}
              onSelect={value => setFormNotifyMethod(value as 'sms' | 'push' | 'both')}
            />
          </Card>

          {/* 设为主联系人 */}
          <Card variant="card-flat" style={{marginBottom: spacing.lg}}>
            <TouchableOpacity
              style={styles.primaryToggle}
              activeOpacity={0.6}
              onPress={() => setFormIsPrimary(prev => !prev)}>
              <View style={{flex: 1}}>
                <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any}}>
                  ⭐ 设为主联系人
                </Text>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>
                  SOS 求助时优先通知主联系人
                </Text>
              </View>
              <View
                style={[
                  styles.toggle,
                  {
                    backgroundColor: formIsPrimary ? colors.primary : colors.borderLight,
                    borderRadius: borderRadius.full,
                  },
                ]}>
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      backgroundColor: colors.textInverse,
                      alignSelf: formIsPrimary ? 'flex-end' : 'flex-start',
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </Card>

          {/* 提交按钮 */}
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
  // ---- 联系人卡片 ----
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  actions: {
    marginLeft: 8,
    alignItems: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  // ---- Toggle ----
  primaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggle: {
    width: 48,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});

export default EmergencyContactsScreen;
