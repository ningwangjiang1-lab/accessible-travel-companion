import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useTheme} from '../theme';
import Card from '../components/Card/Card';
import Badge from '../components/Badge/Badge';
import Button from '../components/Button/Button';
import Divider from '../components/Divider/Divider';

/**
 * PaymentScreen — 支付方式
 *
 * 页面结构：
 * 1. 已绑定的支付方式列表
 * 2. 添加新支付方式
 * 3. 支付记录（Mock）
 *
 * 依赖：Step 3 组件库
 */

interface PaymentMethod {
  id: string;
  type: 'wechat' | 'alipay' | 'bank_card';
  name: string;
  icon: string;
  /** 脱敏账号 */
  account: string;
  is_default: boolean;
}

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pay_001',
    type: 'wechat',
    name: '微信支付',
    icon: '💚',
    account: 'wx****8901',
    is_default: true,
  },
  {
    id: 'pay_002',
    type: 'alipay',
    name: '支付宝',
    icon: '💙',
    account: 'ali****@qq.com',
    is_default: false,
  },
];

const MOCK_TRANSACTIONS = [
  {id: 'txn_001', description: '陈主任 · 陪行服务（2h）', amount: -16000, date: '2026-05-30', status: 'completed'},
  {id: 'txn_002', description: '账户充值', amount: 20000, date: '2026-05-28', status: 'completed'},
  {id: 'txn_003', description: '刘护工 · 陪行服务（1.5h）', amount: -7500, date: '2026-05-25', status: 'completed'},
  {id: 'txn_004', description: '打赏 · 陈主任', amount: -2000, date: '2026-05-20', status: 'completed'},
  {id: 'txn_005', description: '马护师 · 陪行服务（3h）', amount: -19500, date: '2026-05-15', status: 'completed'},
];

const PaymentScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(MOCK_PAYMENT_METHODS);

  /** 设为默认 */
  const handleSetDefault = (id: string) => {
    setPaymentMethods(prev =>
      prev.map(p => ({...p, is_default: p.id === id})),
    );
    Alert.alert('✅ 已更新', '默认支付方式已更改');
  };

  /** 解除绑定 */
  const handleRemove = (method: PaymentMethod) => {
    if (method.is_default) {
      Alert.alert('提示', '请先将其他支付方式设为默认后再解绑');
      return;
    }
    Alert.alert('解除绑定', `确定要解除${method.name}的绑定吗？`, [
      {text: '取消', style: 'cancel'},
      {
        text: '解除',
        style: 'destructive',
        onPress: () => {
          setPaymentMethods(prev => prev.filter(p => p.id !== method.id));
        },
      },
    ]);
  };

  /** 添加支付方式（Mock） */
  const handleAdd = () => {
    Alert.alert('添加支付方式', '此功能将在后续版本中开放', [{text: '好的'}]);
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
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, marginLeft: 12}]}>
            💳 支付方式
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ============================================================ */}
        {/* 1. 已绑定的支付方式 */}
        {/* ============================================================ */}
        <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
          已绑定的支付方式
        </Text>

        {paymentMethods.map(method => (
          <Card variant="card" key={method.id} style={{marginBottom: spacing.sm}}>
            <View style={styles.methodRow}>
              <Text style={{fontSize: 32, marginRight: spacing.md}}>{method.icon}</Text>
              <View style={{flex: 1}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
                    {method.name}
                  </Text>
                  {method.is_default && (
                    <Badge text="默认" variant="primary" style={{marginLeft: spacing.xs}} />
                  )}
                </View>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginTop: 2}}>
                  {method.account}
                </Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                {!method.is_default && (
                  <TouchableOpacity
                    style={[styles.actionLink, {marginBottom: 8}]}
                    onPress={() => handleSetDefault(method.id)}>
                    <Text style={{color: colors.primary, fontSize: fontSize.xs}}>设为默认</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionLink}
                  onPress={() => handleRemove(method)}>
                  <Text style={{color: colors.danger, fontSize: fontSize.xs}}>解绑</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))}

        {/* 添加按钮 */}
        <Card variant="card-flat" style={{marginBottom: spacing.md}}>
          <TouchableOpacity
            style={styles.addMethodBtn}
            activeOpacity={0.6}
            onPress={handleAdd}>
            <Text style={{color: colors.primary, fontSize: fontSize.lg, marginRight: spacing.sm}}>+</Text>
            <Text style={{color: colors.primary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any}}>
              添加新的支付方式
            </Text>
          </TouchableOpacity>
        </Card>

        <Divider style={{marginVertical: spacing.lg}} />

        {/* ============================================================ */}
        {/* 2. 交易记录 */}
        {/* ============================================================ */}
        <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
          📋 交易记录
        </Text>

        {MOCK_TRANSACTIONS.map(txn => (
          <Card variant="card-flat" key={txn.id} style={{marginBottom: spacing.sm}}>
            <View style={styles.txnRow}>
              <View style={{flex: 1}}>
                <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any}}>
                  {txn.description}
                </Text>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>
                  {txn.date} · {txn.status === 'completed' ? '✅ 已完成' : '⏳ 处理中'}
                </Text>
              </View>
              <Text
                style={{
                  color: txn.amount > 0 ? colors.success : colors.textPrimary,
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold as any,
                }}>
                {txn.amount > 0 ? '+' : ''}¥{(Math.abs(txn.amount) / 100).toFixed(2)}
              </Text>
            </View>
          </Card>
        ))}

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // ---- 页头 ----
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
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
  // ---- 分区 ----
  sectionTitle: {
    marginBottom: 12,
    lineHeight: 24,
  },
  // ---- 支付方式 ----
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addMethodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  // ---- 交易记录 ----
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default PaymentScreen;
