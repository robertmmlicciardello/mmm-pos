import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { usePOS } from "@/context/POSContext";
import { Product, CreditCustomer } from "@/lib/storage";

const C = Colors.dark;
const TOTAL_TABLES = 20;

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handlePress = () => {
    scale.value = withSpring(0.92, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 15 });
    });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  return (
    <Animated.View style={[styles.productCard, animStyle]}>
      <Pressable
        style={[styles.productCardInner, { borderColor: product.color + "30" }]}
        onPress={handlePress}
        android_ripple={{ color: product.color + "30" }}
      >
        <View style={styles.cardTop}>
          <View style={[styles.productColorDot, { backgroundColor: product.color }]} />
          <View style={[styles.addIcon, { backgroundColor: product.color }]}>
            <Ionicons name="add" size={12} color="#fff" />
          </View>
        </View>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={[styles.productPrice, { color: product.color }]}>{product.price.toFixed(0)} ks</Text>
      </Pressable>
    </Animated.View>
  );
}

type ItemRowProps = {
  name: string; price: number; quantity: number; color: string;
  onInc: () => void; onDec: () => void; onRemove: () => void;
};

function ItemRow({ name, price, quantity, color, onInc, onDec, onRemove }: ItemRowProps) {
  return (
    <View style={styles.itemRow}>
      <View style={[styles.itemRowDot, { backgroundColor: color }]} />
      <View style={styles.itemRowInfo}>
        <Text style={styles.itemRowName} numberOfLines={1}>{name}</Text>
        <Text style={styles.itemRowPrice}>{(price * quantity).toFixed(0)} ks</Text>
      </View>
      <View style={styles.itemRowControls}>
        <Pressable style={styles.qtyBtn} onPress={onDec}>
          <Ionicons name="remove" size={12} color={C.text} />
        </Pressable>
        <Text style={styles.qtyText}>{quantity}</Text>
        <Pressable style={styles.qtyBtn} onPress={onInc}>
          <Ionicons name="add" size={12} color={C.text} />
        </Pressable>
        <Pressable style={styles.removeBtnSmall} onPress={onRemove}>
          <Ionicons name="trash-outline" size={12} color={C.danger} />
        </Pressable>
      </View>
    </View>
  );
}

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const {
    products, activeTables, cart, isLoading, categories,
    creditCustomers, creditTransactions,
    addToCart, removeFromCart, updateCartQty, clearCart,
    sendCartToTable, removeFromTable, updateTableItemQty,
    settleBill, settleBillAsCredit, clearTable,
    checkoutTakeaway, checkoutTakeawayAsCredit,
    addCreditCustomer, addCreditPayment, getCustomerBalance,
    removeCreditCustomer,
    cartTotal, cartItemCount,
  } = usePOS();

  const [selectedCategory, setSelectedCategory] = useState<string>("အားလုံး");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tablesViewOpen, setTablesViewOpen] = useState(false);
  const [viewingTableNum, setViewingTableNum] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [isSettling, setIsSettling] = useState(false);

  const [creditPickerOpen, setCreditPickerOpen] = useState(false);
  const [creditPickerSource, setCreditPickerSource] = useState<"cart" | "table">("cart");
  const [creditLedgerOpen, setCreditLedgerOpen] = useState(false);
  const [viewingCreditCustomer, setViewingCreditCustomer] = useState<CreditCustomer | null>(null);
  const [newCreditName, setNewCreditName] = useState("");
  const [newCreditPhone, setNewCreditPhone] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const viewingTable = viewingTableNum !== null
    ? activeTables.find((t) => t.tableNumber === viewingTableNum) || null
    : null;

  const allCategories = ["အားလုံး", ...categories];
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === "အားလုံး" || p.category === selectedCategory;
    const matchSearch = searchQuery.trim() === "" || p.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchCat && matchSearch;
  });

  const totalCreditOwed = creditCustomers.reduce((sum, c) => sum + getCustomerBalance(c.id), 0);

  const handleSendToTable = async (tableNum: number) => {
    try {
      await sendCartToTable(tableNum);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTablePickerOpen(false);
      setCartOpen(false);
      setCheckoutMessage(`စားပွဲ ${tableNum} သို့ ပို့ပြီး`);
      setCheckoutDone(true);
      setTimeout(() => setCheckoutDone(false), 1800);
    } catch {
      Alert.alert("အမှား", "စားပွဲသို့ ပို့လိုက်ခြင်း မရပါ။");
    }
  };

  const handleTakeawayCheckout = async () => {
    if (cart.length === 0) return;
    setIsSettling(true);
    try {
      await checkoutTakeaway(noteText.trim() || undefined);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNoteText("");
      setCartOpen(false);
      setCheckoutMessage("ပါဆယ် အောင်မြင်ပြီး!");
      setCheckoutDone(true);
      setTimeout(() => setCheckoutDone(false), 1800);
    } catch {
      Alert.alert("အမှား", "ဆောင်ရွက်၍ မရပါ။");
    } finally {
      setIsSettling(false);
    }
  };

  const handleSettleBill = async () => {
    if (!viewingTable) return;
    setIsSettling(true);
    const tNum = viewingTable.tableNumber;
    try {
      await settleBill(tNum);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setViewingTableNum(null);
      setTablesViewOpen(false);
      setCheckoutMessage(`စားပွဲ ${tNum} ငွေရှင်းပြီး!`);
      setCheckoutDone(true);
      setTimeout(() => setCheckoutDone(false), 1800);
    } catch {
      Alert.alert("အမှား", "ငွေရှင်းခြင်း မရပါ။");
    } finally {
      setIsSettling(false);
    }
  };

  const handleCreditCheckout = (source: "cart" | "table") => {
    setCreditPickerSource(source);
    setShowAddCustomer(false);
    setNewCreditName("");
    setNewCreditPhone("");
    setCreditPickerOpen(true);
  };

  const handleSelectCreditCustomer = async (customer: CreditCustomer) => {
    setCreditPickerOpen(false);
    setIsSettling(true);
    try {
      if (creditPickerSource === "cart") {
        await checkoutTakeawayAsCredit(customer.id, noteText.trim() || undefined);
        setNoteText("");
        setCartOpen(false);
        setCheckoutMessage(`${customer.name} အကြွေး သွင်းပြီ!`);
      } else if (viewingTable) {
        const tNum = viewingTable.tableNumber;
        await settleBillAsCredit(tNum, customer.id);
        setViewingTableNum(null);
        setTablesViewOpen(false);
        setCheckoutMessage(`စားပွဲ ${viewingTable.tableNumber} - ${customer.name} အကြွေး`);
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCheckoutDone(true);
      setTimeout(() => setCheckoutDone(false), 1800);
    } catch {
      Alert.alert("အမှား", "အကြွေး သွင်းခြင်း မရပါ။");
    } finally {
      setIsSettling(false);
    }
  };

  const handleAddNewCreditCustomer = async () => {
    if (!newCreditName.trim()) {
      Alert.alert("အမှား", "အမည် ထည့်ပါ။");
      return;
    }
    const cust = await addCreditCustomer({ name: newCreditName.trim(), phone: newCreditPhone.trim() });
    setShowAddCustomer(false);
    setNewCreditName("");
    setNewCreditPhone("");
    await handleSelectCreditCustomer(cust);
  };

  const handleCreditPayment = async () => {
    if (!viewingCreditCustomer) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("အမှား", "ပမာဏ မှန်ကန် ထည့်ပါ။");
      return;
    }
    await addCreditPayment(viewingCreditCustomer.id, amount);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPaymentAmount("");
    setCheckoutMessage(`${viewingCreditCustomer.name} - ${amount.toFixed(0)} ks ပေးပြီး!`);
    setCheckoutDone(true);
    setTimeout(() => setCheckoutDone(false), 1800);
  };

  const handleDeleteCreditCustomer = (cust: CreditCustomer) => {
    const balance = getCustomerBalance(cust.id);
    if (balance > 0) {
      Alert.alert("အမှား", `${cust.name} မှာ အကြွေး ${balance.toFixed(0)} ks ကျန်နေပါတယ်။ အရင် ရှင်းပြီးမှ ဖျက်ပါ။`);
      return;
    }
    Alert.alert("ဖျက်ရန်", `"${cust.name}" ကို ဖျက်လိုက်မလား?`, [
      { text: "မလုပ်တော့ပါ", style: "cancel" },
      { text: "ဖျက်ရန်", style: "destructive", onPress: () => { removeCreditCustomer(cust.id); setViewingCreditCustomer(null); } },
    ]);
  };

  const handleClearTable = () => {
    if (!viewingTable) return;
    Alert.alert(
      "စားပွဲ ရှင်းလင်းရန်",
      `စားပွဲ ${viewingTable.tableNumber} မှာ အားလုံး ဖျက်လိုက်မလား?`,
      [
        { text: "မလုပ်တော့ပါ", style: "cancel" },
        { text: "ရှင်းလင်းရန်", style: "destructive", onPress: async () => { await clearTable(viewingTable.tableNumber); setViewingTableNum(null); } },
      ]
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 80 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>မေမြန်မာဆိုင်</Text>
          <Text style={styles.headerSub}>
            {cartItemCount > 0 ? `ကားထဲမှာ ${cartItemCount} ခု` : "မီနူးမှ အမျိုးလိုက် ထည့်ပါ"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.creditBtn, totalCreditOwed > 0 && styles.creditBtnActive]}
            onPress={() => { setCreditLedgerOpen(true); setViewingCreditCustomer(null); }}
          >
            <Ionicons name="wallet" size={16} color={totalCreditOwed > 0 ? "#fff" : C.textSecondary} />
            {totalCreditOwed > 0 && (
              <View style={styles.creditBadge}>
                <Text style={styles.creditBadgeText}>{creditCustomers.filter(c => getCustomerBalance(c.id) > 0).length}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.tablesBtn, activeTables.length > 0 && styles.tablesBtnActive]}
            onPress={() => setTablesViewOpen(true)}
          >
            <Ionicons name="restaurant" size={16} color={activeTables.length > 0 ? "#fff" : C.textSecondary} />
            {activeTables.length > 0 && (
              <View style={styles.tablesBadge}>
                <Text style={styles.tablesBadgeText}>{activeTables.length}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={C.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="မီနူး ရှာရန်..."
            placeholderTextColor={C.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={C.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar} contentContainerStyle={styles.categoryBarContent}>
        {allCategories.map((cat) => (
          <Pressable key={cat} style={[styles.catChip, selectedCategory === cat && { backgroundColor: C.accent }]} onPress={() => setSelectedCategory(cat)}>
            <Text style={[styles.catChipText, selectedCategory === cat && { color: "#fff", fontWeight: "700" as const }]}>{cat}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {filteredProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fast-food-outline" size={44} color={C.textTertiary} />
          <Text style={styles.emptyTitle}>မီနူး မရှိတဲ့ပါ</Text>
          <Text style={styles.emptyText}>မီနူး tab မှာ အရာ ထည့်ပါ</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          scrollEnabled={!!filteredProducts.length}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + (cartItemCount > 0 ? 130 : 90) }]}
          renderItem={({ item }) => <ProductCard product={item} onPress={() => addToCart(item)} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {cartItemCount > 0 && (
        <Pressable style={[styles.cartBar, { bottom: insets.bottom + (Platform.OS === "web" ? 84 : 56) }]} onPress={() => setCartOpen(true)}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartItemCount}</Text></View>
            <Text style={styles.cartBarLabel}>ကားထဲ ကြည့်ရန်</Text>
          </View>
          <Text style={styles.cartBarTotal}>{cartTotal.toFixed(0)} ks</Text>
        </Pressable>
      )}

      {checkoutDone && (
        <View style={[styles.toast, { bottom: insets.bottom + (Platform.OS === "web" ? 140 : 110) }]}>
          <View style={styles.toastInner}>
            <Ionicons name="checkmark-circle" size={20} color={C.success} />
            <Text style={styles.toastText}>{checkoutMessage}</Text>
          </View>
        </View>
      )}

      {/* Cart Modal */}
      <Modal visible={cartOpen} animationType="slide" transparent onRequestClose={() => setCartOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCartOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
            <View style={styles.sheetHandle} />
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="bag-outline" size={40} color={C.textTertiary} />
                <Text style={styles.emptyCartText}>ကားထဲ ထဲမှာ ဘာမှ မရှိပါ</Text>
              </View>
            ) : (
              <>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>ကားထဲ</Text>
                    <Text style={styles.sheetSub}>{cartItemCount} ခု</Text>
                  </View>
                  <Pressable style={styles.clearBtn} onPress={() => { clearCart(); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}>
                    <Ionicons name="trash-outline" size={14} color={C.danger} />
                  </Pressable>
                </View>
                <ScrollView style={styles.sheetItems} showsVerticalScrollIndicator={false}>
                  {cart.map((item) => (
                    <ItemRow key={item.product.id} name={item.product.name} price={item.product.price} quantity={item.quantity} color={item.product.color}
                      onInc={() => updateCartQty(item.product.id, item.quantity + 1)}
                      onDec={() => updateCartQty(item.product.id, item.quantity - 1)}
                      onRemove={() => removeFromCart(item.product.id)}
                    />
                  ))}
                </ScrollView>
                <TextInput style={styles.noteInput} placeholder="မှတ်ချက် (ရှိလျှင် ရေးပါ)" placeholderTextColor={C.textTertiary} value={noteText} onChangeText={setNoteText} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>စုစုပေါင်း</Text>
                  <Text style={styles.totalAmount}>{cartTotal.toFixed(0)} ks</Text>
                </View>
                <View style={styles.checkoutActions}>
                  <Pressable style={styles.sendToTableBtn} onPress={() => setTablePickerOpen(true)}>
                    <Ionicons name="restaurant-outline" size={16} color={C.accent} />
                    <Text style={styles.sendToTableText}>စားပွဲ</Text>
                  </Pressable>
                  <Pressable style={styles.creditCheckoutBtn} onPress={() => handleCreditCheckout("cart")}>
                    <Ionicons name="wallet-outline" size={16} color="#F7DC6F" />
                    <Text style={styles.creditCheckoutText}>အကြွေး</Text>
                  </Pressable>
                  <Pressable style={[styles.takeawayBtn, isSettling && { opacity: 0.7 }]} onPress={handleTakeawayCheckout} disabled={isSettling}>
                    {isSettling ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <Ionicons name="bag-handle-outline" size={16} color="#fff" />
                        <Text style={styles.takeawayBtnText}>ပါဆယ်</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Table Picker Modal */}
      <Modal visible={tablePickerOpen} animationType="slide" transparent onRequestClose={() => setTablePickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTablePickerOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>စားပွဲ ရွေးပါ</Text>
            <Text style={[styles.sheetSub, { marginBottom: 14 }]}>{cartItemCount} ခုကို စားပွဲသို့ ပို့ရန်</Text>
            <ScrollView style={styles.tablePickerScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.tablePickerGrid}>
                {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map((num) => {
                  const table = activeTables.find((t) => t.tableNumber === num);
                  const isOccupied = !!table;
                  return (
                    <Pressable key={num} style={[styles.tablePickerCard, isOccupied && styles.tablePickerOccupied]} onPress={() => handleSendToTable(num)}>
                      <Text style={[styles.tablePickerNum, isOccupied && { color: C.accent }]}>{num}</Text>
                      {isOccupied && <Text style={styles.tablePickerInfo}>{table.items.reduce((s, i) => s + i.quantity, 0)} ခု</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Active Tables Modal */}
      <Modal visible={tablesViewOpen} animationType="slide" transparent onRequestClose={() => { setTablesViewOpen(false); setViewingTableNum(null); }}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setTablesViewOpen(false); setViewingTableNum(null); }} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
            <View style={styles.sheetHandle} />
            {viewingTable ? (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHeaderLeft}>
                    <Pressable style={styles.backBtn} onPress={() => setViewingTableNum(null)}>
                      <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <View>
                      <Text style={styles.sheetTitle}>စားပွဲ {viewingTable.tableNumber}</Text>
                      <Text style={styles.sheetSub}>{viewingTable.items.reduce((s, i) => s + i.quantity, 0)} ခု</Text>
                    </View>
                  </View>
                  <Pressable style={styles.clearBtn} onPress={handleClearTable}>
                    <Ionicons name="trash-outline" size={14} color={C.danger} />
                  </Pressable>
                </View>
                <ScrollView style={styles.sheetItems} showsVerticalScrollIndicator={false}>
                  {viewingTable.items.map((item) => (
                    <ItemRow key={item.product.id} name={item.product.name} price={item.product.price} quantity={item.quantity} color={item.product.color}
                      onInc={() => updateTableItemQty(viewingTable.tableNumber, item.product.id, item.quantity + 1)}
                      onDec={() => updateTableItemQty(viewingTable.tableNumber, item.product.id, item.quantity - 1)}
                      onRemove={() => removeFromTable(viewingTable.tableNumber, item.product.id)}
                    />
                  ))}
                </ScrollView>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>စုစုပေါင်း</Text>
                  <Text style={styles.totalAmount}>{viewingTable.items.reduce((s, i) => s + i.product.price * i.quantity, 0).toFixed(0)} ks</Text>
                </View>
                <View style={styles.settleRow}>
                  <Pressable style={styles.creditSettleBtn} onPress={() => handleCreditCheckout("table")}>
                    <Ionicons name="wallet-outline" size={16} color="#F7DC6F" />
                    <Text style={styles.creditSettleText}>အကြွေး</Text>
                  </Pressable>
                  <Pressable style={[styles.settleBtn, isSettling && { opacity: 0.7 }]} onPress={handleSettleBill} disabled={isSettling}>
                    {isSettling ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <Ionicons name="card-outline" size={18} color="#fff" />
                        <Text style={styles.settleBtnText}>ငွေရှင်းရန်</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>စားပွဲများ</Text>
                <Text style={[styles.sheetSub, { marginBottom: 14 }]}>
                  {activeTables.length === 0 ? "စားပွဲ တစ်ခုမှ မရှိပါ" : `စားပွဲ ${activeTables.length} ခု ရှိနေပါတယ်`}
                </Text>
                {activeTables.length === 0 ? (
                  <View style={styles.emptyCart}>
                    <Ionicons name="restaurant-outline" size={40} color={C.textTertiary} />
                    <Text style={styles.emptyCartText}>စားပွဲ အားလုံး လွတ်လပ်ပါတယ်</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.sheetItems} showsVerticalScrollIndicator={false}>
                    {activeTables.sort((a, b) => a.tableNumber - b.tableNumber).map((table) => {
                      const total = table.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
                      const count = table.items.reduce((s, i) => s + i.quantity, 0);
                      return (
                        <Pressable key={table.tableNumber} style={styles.activeTableRow} onPress={() => setViewingTableNum(table.tableNumber)}>
                          <View style={styles.activeTableLeft}>
                            <View style={styles.activeTableIcon}><Ionicons name="restaurant" size={16} color={C.accent} /></View>
                            <View>
                              <Text style={styles.activeTableName}>စားပွဲ {table.tableNumber}</Text>
                              <Text style={styles.activeTableInfo}>{count} ခု</Text>
                            </View>
                          </View>
                          <View style={styles.activeTableRight}>
                            <Text style={styles.activeTableTotal}>{total.toFixed(0)} ks</Text>
                            <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Credit Customer Picker */}
      <Modal visible={creditPickerOpen} animationType="slide" transparent onRequestClose={() => setCreditPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCreditPickerOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>အကြွေးသူ ရွေးပါ</Text>
            <Text style={[styles.sheetSub, { marginBottom: 14 }]}>အကြွေးသွင်းမည့်သူကို ရွေးပါ</Text>

            {showAddCustomer ? (
              <View style={styles.addCreditForm}>
                <TextInput style={styles.textInputSmall} placeholder="အမည်" placeholderTextColor={C.textTertiary} value={newCreditName} onChangeText={setNewCreditName} />
                <TextInput style={styles.textInputSmall} placeholder="ဖုန်း (ရှိလျှင်)" placeholderTextColor={C.textTertiary} value={newCreditPhone} onChangeText={setNewCreditPhone} keyboardType="phone-pad" />
                <View style={styles.addCreditActions}>
                  <Pressable style={styles.cancelSmallBtn} onPress={() => setShowAddCustomer(false)}>
                    <Text style={styles.cancelSmallText}>မလုပ်တော့</Text>
                  </Pressable>
                  <Pressable style={styles.saveSmallBtn} onPress={handleAddNewCreditCustomer}>
                    <Text style={styles.saveSmallText}>သွင်းရန်</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <ScrollView style={styles.sheetItems} showsVerticalScrollIndicator={false}>
                  {creditCustomers.map((cust) => {
                    const balance = getCustomerBalance(cust.id);
                    return (
                      <Pressable key={cust.id} style={styles.creditCustomerRow} onPress={() => handleSelectCreditCustomer(cust)}>
                        <View style={styles.creditCustIcon}><Ionicons name="person" size={16} color={C.accent} /></View>
                        <View style={styles.creditCustInfo}>
                          <Text style={styles.creditCustName}>{cust.name}</Text>
                          {cust.phone ? <Text style={styles.creditCustPhone}>{cust.phone}</Text> : null}
                        </View>
                        {balance > 0 && <Text style={styles.creditCustBalance}>{balance.toFixed(0)} ks</Text>}
                        <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Pressable style={styles.addCreditCustomerBtn} onPress={() => setShowAddCustomer(true)}>
                  <Ionicons name="person-add-outline" size={16} color={C.accent} />
                  <Text style={styles.addCreditCustomerText}>အကြွေးသူအသစ် ထည့်ရန်</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Credit Ledger */}
      <Modal visible={creditLedgerOpen} animationType="slide" transparent onRequestClose={() => { setCreditLedgerOpen(false); setViewingCreditCustomer(null); }}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setCreditLedgerOpen(false); setViewingCreditCustomer(null); }} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
            <View style={styles.sheetHandle} />
            {viewingCreditCustomer ? (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHeaderLeft}>
                    <Pressable style={styles.backBtn} onPress={() => setViewingCreditCustomer(null)}>
                      <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <View>
                      <Text style={styles.sheetTitle}>{viewingCreditCustomer.name}</Text>
                      <Text style={styles.sheetSub}>{viewingCreditCustomer.phone || "ဖုန်းမရှိ"}</Text>
                    </View>
                  </View>
                  <Pressable style={styles.clearBtn} onPress={() => handleDeleteCreditCustomer(viewingCreditCustomer)}>
                    <Ionicons name="trash-outline" size={14} color={C.danger} />
                  </Pressable>
                </View>
                <View style={styles.creditBalanceCard}>
                  <Text style={styles.creditBalanceLabel}>ကျန်ငွေ</Text>
                  <Text style={[styles.creditBalanceAmount, { color: getCustomerBalance(viewingCreditCustomer.id) > 0 ? C.danger : C.success }]}>
                    {getCustomerBalance(viewingCreditCustomer.id).toFixed(0)} ks
                  </Text>
                </View>
                <ScrollView style={styles.sheetItems} showsVerticalScrollIndicator={false}>
                  {creditTransactions.filter(t => t.customerId === viewingCreditCustomer.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((txn) => (
                    <View key={txn.id} style={styles.txnRow}>
                      <View style={[styles.txnIcon, { backgroundColor: txn.type === "credit" ? C.danger + "20" : C.success + "20" }]}>
                        <Ionicons name={txn.type === "credit" ? "arrow-up" : "arrow-down"} size={12} color={txn.type === "credit" ? C.danger : C.success} />
                      </View>
                      <View style={styles.txnInfo}>
                        <Text style={styles.txnLabel}>{txn.type === "credit" ? "အကြွေး" : "ပေးငွေ"}</Text>
                        <Text style={styles.txnDate}>{new Date(txn.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={[styles.txnAmount, { color: txn.type === "credit" ? C.danger : C.success }]}>
                        {txn.type === "credit" ? "+" : "-"}{txn.amount.toFixed(0)} ks
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                {getCustomerBalance(viewingCreditCustomer.id) > 0 && (
                  <View style={styles.paymentRow}>
                    <TextInput style={styles.paymentInput} placeholder="ပမာဏ (ks)" placeholderTextColor={C.textTertiary} value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="number-pad" />
                    <Pressable style={styles.paymentBtn} onPress={handleCreditPayment}>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.paymentBtnText}>ပေးရန်</Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>အကြွေးစာရင်း</Text>
                <Text style={[styles.sheetSub, { marginBottom: 8 }]}>
                  စုစုပေါင်း အကြွေး {totalCreditOwed.toFixed(0)} ks
                </Text>
                {creditCustomers.length === 0 ? (
                  <View style={styles.emptyCart}>
                    <Ionicons name="wallet-outline" size={40} color={C.textTertiary} />
                    <Text style={styles.emptyCartText}>အကြွေးသူ မရှိတဲ့ပါ</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.sheetItems} showsVerticalScrollIndicator={false}>
                    {creditCustomers.map((cust) => {
                      const balance = getCustomerBalance(cust.id);
                      return (
                        <Pressable key={cust.id} style={styles.creditCustomerRow} onPress={() => { setViewingCreditCustomer(cust); setPaymentAmount(""); }}>
                          <View style={styles.creditCustIcon}><Ionicons name="person" size={16} color={balance > 0 ? C.danger : C.success} /></View>
                          <View style={styles.creditCustInfo}>
                            <Text style={styles.creditCustName}>{cust.name}</Text>
                            {cust.phone ? <Text style={styles.creditCustPhone}>{cust.phone}</Text> : null}
                          </View>
                          <Text style={[styles.creditCustBalance, { color: balance > 0 ? C.danger : C.success }]}>
                            {balance.toFixed(0)} ks
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
  headerRight: { flexDirection: "row", gap: 8 },
  tablesBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, alignItems: "center", justifyContent: "center", position: "relative" },
  tablesBtnActive: { backgroundColor: C.accent },
  tablesBadge: { position: "absolute", top: -3, right: -3, backgroundColor: C.danger, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.background },
  tablesBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  creditBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, alignItems: "center", justifyContent: "center", position: "relative" },
  creditBtnActive: { backgroundColor: "#F7DC6F" },
  creditBadge: { position: "absolute", top: -3, right: -3, backgroundColor: C.danger, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.background },
  creditBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  searchRow: { paddingHorizontal: 14, paddingBottom: 6 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: C.text, fontSize: 14, padding: 0 },
  categoryBar: { flexGrow: 0, marginBottom: 6 },
  categoryBarContent: { paddingHorizontal: 14, gap: 6, flexDirection: "row", paddingVertical: 2 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: C.card },
  catChipText: { color: C.textSecondary, fontSize: 12, fontWeight: "600" },
  grid: { paddingHorizontal: 8, gap: 2 },
  productCard: { flex: 1, margin: 3, maxWidth: "33.33%" },
  productCardInner: { backgroundColor: C.card, borderRadius: 12, padding: 10, minHeight: 88, borderWidth: 1, position: "relative", overflow: "hidden" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  productColorDot: { width: 8, height: 8, borderRadius: 4 },
  productName: { fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 4, lineHeight: 16 },
  productPrice: { fontSize: 13, fontWeight: "800" },
  addIcon: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptyText: { fontSize: 13, color: C.textSecondary },
  cartBar: { position: "absolute", left: 14, right: 14, backgroundColor: C.accent, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  cartBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  cartBadge: { backgroundColor: "rgba(255,255,255,0.25)", width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  cartBarLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cartBarTotal: { color: "#fff", fontSize: 16, fontWeight: "900" },
  toast: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  toastInner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.success + "40" },
  toastText: { color: C.text, fontSize: 14, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 12, maxHeight: "85%" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 14 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sheetHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  sheetSub: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
  sheetItems: { maxHeight: 280 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  clearBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.danger + "20", alignItems: "center", justifyContent: "center" },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  itemRowDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  itemRowInfo: { flex: 1, gap: 1 },
  itemRowName: { fontSize: 14, fontWeight: "600", color: C.text },
  itemRowPrice: { fontSize: 12, color: C.textSecondary, fontWeight: "600" },
  itemRowControls: { flexDirection: "row", alignItems: "center", gap: 4 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  qtyText: { color: C.text, fontSize: 14, fontWeight: "700", minWidth: 20, textAlign: "center" },
  removeBtnSmall: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.danger + "20", alignItems: "center", justifyContent: "center", marginLeft: 2 },
  noteInput: { backgroundColor: C.card, borderRadius: 10, padding: 12, color: C.text, fontSize: 13, marginTop: 10, borderWidth: 1, borderColor: C.border },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  totalLabel: { fontSize: 16, color: C.textSecondary, fontWeight: "600" },
  totalAmount: { fontSize: 24, fontWeight: "900", color: C.text, letterSpacing: -0.5 },
  checkoutActions: { flexDirection: "row", gap: 6, marginBottom: 8 },
  sendToTableBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: C.accent + "20", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: C.accent + "40" },
  sendToTableText: { color: C.accent, fontSize: 13, fontWeight: "800" },
  creditCheckoutBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#F7DC6F20", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: "#F7DC6F40" },
  creditCheckoutText: { color: "#F7DC6F", fontSize: 13, fontWeight: "800" },
  takeawayBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: C.accent, borderRadius: 14, padding: 14 },
  takeawayBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  settleRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  creditSettleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#F7DC6F20", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: "#F7DC6F40" },
  creditSettleText: { color: "#F7DC6F", fontSize: 14, fontWeight: "800" },
  settleBtn: { flex: 2, backgroundColor: C.accent, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  settleBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  emptyCart: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  emptyCartText: { color: C.textSecondary, fontSize: 14 },
  tablePickerScroll: { maxHeight: 360 },
  tablePickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 14 },
  tablePickerCard: { width: "22%", flexGrow: 1, minWidth: 65, maxWidth: "24%", backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center", minHeight: 60, borderWidth: 1.5, borderColor: C.border },
  tablePickerOccupied: { borderColor: C.accent + "50", backgroundColor: C.accent + "08" },
  tablePickerNum: { fontSize: 18, fontWeight: "800", color: C.text },
  tablePickerInfo: { fontSize: 10, color: C.textSecondary, marginTop: 1 },
  activeTableRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  activeTableLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  activeTableIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.accent + "15", alignItems: "center", justifyContent: "center" },
  activeTableName: { fontSize: 15, fontWeight: "700", color: C.text },
  activeTableInfo: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
  activeTableRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeTableTotal: { fontSize: 15, fontWeight: "800", color: C.accent },
  creditCustomerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  creditCustIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent + "15", alignItems: "center", justifyContent: "center" },
  creditCustInfo: { flex: 1, gap: 1 },
  creditCustName: { fontSize: 15, fontWeight: "700", color: C.text },
  creditCustPhone: { fontSize: 11, color: C.textTertiary },
  creditCustBalance: { fontSize: 14, fontWeight: "800", color: C.danger, marginRight: 4 },
  addCreditCustomerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border, marginTop: 6 },
  addCreditCustomerText: { color: C.accent, fontSize: 14, fontWeight: "700" },
  addCreditForm: { gap: 10, marginBottom: 10 },
  textInputSmall: { backgroundColor: C.card, borderRadius: 10, padding: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border },
  addCreditActions: { flexDirection: "row", gap: 8 },
  cancelSmallBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: "center" },
  cancelSmallText: { color: C.text, fontSize: 14, fontWeight: "700" },
  saveSmallBtn: { flex: 2, backgroundColor: C.accent, borderRadius: 12, padding: 12, alignItems: "center" },
  saveSmallText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  creditBalanceCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 12, borderWidth: 1, borderColor: C.border },
  creditBalanceLabel: { fontSize: 12, color: C.textSecondary, fontWeight: "600", marginBottom: 4 },
  creditBalanceAmount: { fontSize: 28, fontWeight: "900" },
  txnRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  txnIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  txnInfo: { flex: 1, gap: 1 },
  txnLabel: { fontSize: 14, fontWeight: "600", color: C.text },
  txnDate: { fontSize: 11, color: C.textTertiary },
  txnAmount: { fontSize: 14, fontWeight: "800" },
  paymentRow: { flexDirection: "row", gap: 8, marginTop: 10, marginBottom: 6 },
  paymentInput: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border },
  paymentBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.success, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  paymentBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
