import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Platform,
  Share,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { usePOS } from "@/context/POSContext";
import { Order, exportOrdersAsJSON } from "@/lib/storage";

const C = Colors.dark;

type FilterMode = "all" | "day" | "month" | "year";

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("my-MM", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function isSameMonth(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

function isSameYear(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear();
}

type OrderCardProps = {
  order: Order;
  onPress: () => void;
  onDelete: () => void;
};

function OrderCard({ order, onPress, onDelete }: OrderCardProps) {
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const isDineIn = order.orderType === "dine-in";
  return (
    <Pressable style={styles.orderCard} onPress={onPress}>
      <View style={styles.orderCardLeft}>
        <View style={styles.orderTypeTagRow}>
          <View style={[styles.orderTypeTag, isDineIn ? styles.dineInTag : styles.takeawayTag]}>
            <Ionicons
              name={isDineIn ? "restaurant-outline" : "bag-handle-outline"}
              size={11}
              color={isDineIn ? "#4ECDC4" : "#F7DC6F"}
            />
            <Text style={[styles.orderTypeTagText, { color: isDineIn ? "#4ECDC4" : "#F7DC6F" }]}>
              {isDineIn ? `\u1005\u102c\u1038\u1015\u103d\u1032 ${order.tableNumber || "?"}` : "\u1015\u102b\u1006\u101a\u103a"}
            </Text>
          </View>
        </View>
        <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        <Text style={styles.orderTime}>{formatTime(order.createdAt)}</Text>
        <Text style={styles.orderItems}>
          {itemCount} \u1001\u102f
          {order.note ? ` \u2022 ${order.note}` : ""}
        </Text>
      </View>
      <View style={styles.orderCardRight}>
        <Text style={styles.orderTotal}>{order.total.toFixed(0)} ks</Text>
        <Pressable style={styles.deleteBtn} onPress={onDelete} hitSlop={12}>
          <Ionicons name="trash-outline" size={16} color={C.danger} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { orders, removeOrder, clearOrders } = usePOS();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterDate, setFilterDate] = useState(new Date());

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom;

  const filteredOrders = useMemo(() => {
    if (filterMode === "all") return orders;
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      if (filterMode === "day") return isSameDay(d, filterDate);
      if (filterMode === "month") return isSameMonth(d, filterDate);
      if (filterMode === "year") return isSameYear(d, filterDate);
      return true;
    });
  }, [orders, filterMode, filterDate]);

  const totalRevenue = filteredOrders.reduce((s, o) => s + o.total, 0);

  const filterLabel = useMemo(() => {
    if (filterMode === "all") return "\u1021\u102c\u1038\u101c\u102f\u1036\u1038";
    const d = filterDate;
    const months = ["\u1007\u1014\u103a\u1014\u101d\u102b\u101b\u102e","\u1016\u1031\u1016\u1031\u102c\u103a\u101d\u102b\u101b\u102e","\u1019\u1010\u103a","\u1027\u1015\u103c\u102e","\u1019\u1031","\u1007\u103d\u1014\u103a","\u1007\u1030\u101c\u102d\u102f\u1004\u103a","\u1029\u1002\u102f\u1010\u103a","\u1005\u1000\u103a\u1010\u1004\u103a\u1018\u102c","\u1021\u1031\u102c\u1000\u103a\u1010\u102d\u102f\u1018\u102c","\u1014\u102d\u102f\u101d\u1004\u103a\u1018\u102c","\u1012\u102e\u1007\u1004\u103a\u1018\u102c"];
    if (filterMode === "day") return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    if (filterMode === "month") return `${months[d.getMonth()]} ${d.getFullYear()}`;
    if (filterMode === "year") return `${d.getFullYear()} \u1001\u102f\u1014\u103e\u1005\u103a`;
    return "";
  }, [filterMode, filterDate]);

  const shiftFilter = (direction: number) => {
    const d = new Date(filterDate);
    if (filterMode === "day") d.setDate(d.getDate() + direction);
    else if (filterMode === "month") d.setMonth(d.getMonth() + direction);
    else if (filterMode === "year") d.setFullYear(d.getFullYear() + direction);
    setFilterDate(d);
  };

  const handleExport = async () => {
    if (filteredOrders.length === 0) {
      Alert.alert("\u1021\u1001\u103b\u1000\u103a\u1021\u101c\u1000\u103a \u1019\u101b\u103e\u102d\u1015\u102b", "\u1011\u102f\u1010\u103a\u101b\u1014\u103a \u1019\u103e\u1010\u103a\u1010\u1019\u103a\u1038 \u1019\u101b\u103e\u102d\u1010\u1032\u1037\u1015\u102b\u104b");
      return;
    }
    setIsExporting(true);
    try {
      const json = exportOrdersAsJSON(filteredOrders);
      await Share.share({
        message: json,
        title: `\u1005\u102c\u1038\u1015\u103d\u1032 \u1021\u101b\u1031\u102c\u1004\u103a\u1038 \u1005\u102c\u101b\u1004\u103a\u1038 - ${filterLabel}`,
      });
    } catch {
      Alert.alert("\u1021\u1019\u103e\u102c\u1038", "\u1021\u1001\u103b\u1000\u103a\u1021\u101c\u1000\u103a \u1019\u1014\u103e\u1004\u103a\u1015\u102b\u104b");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      "\u1019\u103e\u1010\u103a\u1010\u1019\u103a\u1038 \u1021\u102c\u1038\u101c\u102f\u1036\u1038 \u1016\u103b\u1000\u103a\u101b\u1014\u103a",
      "\u1019\u103e\u1010\u103a\u1010\u1019\u103a\u1038\u1019\u103e\u1010\u103a\u1010\u1004\u103a\u1038 \u1021\u102c\u1038\u101c\u102f\u1036\u1038 \u1016\u103b\u1000\u103a\u1019\u100a\u103a\u104b \u1015\u103c\u1014\u103a\u101c\u100a\u103a\u101b\u101a\u1030\u101c\u102d\u102f\u1037 \u1019\u101b\u1015\u102b\u104b",
      [
        { text: "\u1019\u101c\u102f\u1015\u103a\u1010\u1031\u102c\u1037\u1015\u102b", style: "cancel" },
        {
          text: "\u1021\u102c\u1038\u101c\u102f\u1036\u1038 \u1016\u103b\u1000\u103a\u101b\u1014\u103a",
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearOrders();
          },
        },
      ]
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert("\u1019\u103e\u1010\u103a\u1010\u1019\u103a\u1038 \u1016\u103b\u1000\u103a\u101b\u1014\u103a", "\u1012\u102e\u1019\u103e\u1010\u103a\u1010\u1019\u103a\u1038\u1000\u102d\u102f \u1016\u103b\u1000\u103a\u101c\u102d\u102f\u1000\u103a\u1019\u101c\u102c\u1038?", [
      { text: "\u1019\u101c\u102f\u1015\u103a\u1010\u1031\u102c\u1037\u1015\u102b", style: "cancel" },
      {
        text: "\u1016\u103b\u1000\u103a\u101b\u1014\u103a",
        style: "destructive",
        onPress: () => removeOrder(id),
      },
    ]);
  };

  const FILTER_OPTIONS: { key: FilterMode; label: string }[] = [
    { key: "all", label: "\u1021\u102c\u1038\u101c\u102f\u1036\u1038" },
    { key: "day", label: "\u101b\u1000\u103a" },
    { key: "month", label: "\u101c" },
    { key: "year", label: "\u1014\u103e\u1005\u103a" },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{"\u1005\u102c\u101b\u1004\u103a\u1038"}</Text>
          <Text style={styles.headerSub}>{filterLabel} - {filteredOrders.length} \u1001\u102f</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.actionBtn} onPress={handleExport} disabled={isExporting}>
            {isExporting ? (
              <ActivityIndicator size="small" color={C.text} />
            ) : (
              <Ionicons name="share-outline" size={20} color={C.text} />
            )}
          </Pressable>
          {orders.length > 0 && (
            <Pressable style={[styles.actionBtn, { backgroundColor: C.danger + "20" }]} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={20} color={C.danger} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {FILTER_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.filterChip, filterMode === opt.key && { backgroundColor: C.accent }]}
            onPress={() => {
              setFilterMode(opt.key);
              setFilterDate(new Date());
            }}
          >
            <Text style={[styles.filterChipText, filterMode === opt.key && { color: "#fff", fontWeight: "700" }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {filterMode !== "all" && (
        <View style={styles.dateNav}>
          <Pressable style={styles.dateNavBtn} onPress={() => shiftFilter(-1)}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </Pressable>
          <Text style={styles.dateNavLabel}>{filterLabel}</Text>
          <Pressable style={styles.dateNavBtn} onPress={() => shiftFilter(1)}>
            <Ionicons name="chevron-forward" size={20} color={C.text} />
          </Pressable>
        </View>
      )}

      {filteredOrders.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalRevenue.toFixed(0)} ks</Text>
            <Text style={styles.statLabel}>{"\u1005\u102f\u1005\u102f\u1015\u1031\u102b\u1004\u103a\u1038 \u101d\u1004\u103a\u1004\u103d\u1031"}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{filteredOrders.length}</Text>
            <Text style={styles.statLabel}>{"\u1019\u103e\u1010\u103a\u1010\u1019\u103a\u1038"}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length).toFixed(0) : "0"} ks
            </Text>
            <Text style={styles.statLabel}>{"\u1015\u103b\u1019\u103a\u1038"}</Text>
          </View>
        </View>
      )}

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={56} color={C.textTertiary} />
          <Text style={styles.emptyTitle}>{"\u1019\u103e\u1010\u103a\u1010\u1019\u103a\u1038 \u1019\u101b\u103e\u102d\u1010\u1032\u1037\u1015\u102b"}</Text>
          <Text style={styles.emptyText}>
            {filterMode === "all"
              ? "\u1015\u103c\u102e\u1038\u1005\u102e\u1038\u1010\u1032\u1037 \u1019\u103e\u1010\u103a\u1010\u1019\u103a\u1038\u1019\u103b\u102c\u1038 \u1012\u102e\u1019\u103e\u102c \u1015\u1031\u102b\u103a\u101c\u102c\u1019\u100a\u103a"
              : `${filterLabel} \u1021\u1010\u103d\u1000\u103a \u1019\u103e\u1010\u103a\u1010\u1019\u103a\u1038 \u1019\u101b\u103e\u102d\u1015\u102b`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          scrollEnabled={!!filteredOrders.length}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad + 20, gap: 10 }}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => setSelectedOrder(item)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedOrder(null)} />
          {selectedOrder && (
            <View style={[styles.detailSheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.detailTitle}>{"\u1019\u103e\u1010\u103a\u1010\u1019\u103a\u1038 \u1021\u1031\u101e\u1038\u1005\u102d\u1010\u103a"}</Text>
              <View style={styles.detailMetaRow}>
                <View style={[
                  styles.orderTypeTag,
                  selectedOrder.orderType === "dine-in" ? styles.dineInTag : styles.takeawayTag,
                ]}>
                  <Ionicons
                    name={selectedOrder.orderType === "dine-in" ? "restaurant-outline" : "bag-handle-outline"}
                    size={12}
                    color={selectedOrder.orderType === "dine-in" ? "#4ECDC4" : "#F7DC6F"}
                  />
                  <Text style={[styles.orderTypeTagText, {
                    color: selectedOrder.orderType === "dine-in" ? "#4ECDC4" : "#F7DC6F",
                  }]}>
                    {selectedOrder.orderType === "dine-in"
                      ? `\u1005\u102c\u1038\u1015\u103d\u1032 ${selectedOrder.tableNumber || "?"}`
                      : "\u1015\u102b\u1006\u101a\u103a"}
                  </Text>
                </View>
                <Text style={styles.detailDate}>
                  {formatDate(selectedOrder.createdAt)} {formatTime(selectedOrder.createdAt)}
                </Text>
              </View>
              {selectedOrder.note && (
                <View style={styles.noteTag}>
                  <Ionicons name="chatbubble-outline" size={13} color={C.textSecondary} />
                  <Text style={styles.noteTagText}>{selectedOrder.note}</Text>
                </View>
              )}
              <ScrollView style={styles.detailList} showsVerticalScrollIndicator={false}>
                {selectedOrder.items.map((item, idx) => (
                  <View key={idx} style={styles.detailItem}>
                    <View style={[styles.detailDot, { backgroundColor: item.product.color }]} />
                    <Text style={styles.detailItemName}>
                      {item.product.name} x {item.quantity}
                    </Text>
                    <Text style={styles.detailItemPrice}>
                      {(item.product.price * item.quantity).toFixed(0)} ks
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.detailTotalRow}>
                <Text style={styles.detailTotalLabel}>{"\u1005\u102f\u1005\u102f\u1015\u1031\u102b\u1004\u103a\u1038"}</Text>
                <Text style={styles.detailTotalAmount}>{selectedOrder.total.toFixed(0)} ks</Text>
              </View>
              <Pressable style={styles.closeSheetBtn} onPress={() => setSelectedOrder(null)}>
                <Text style={styles.closeSheetText}>{"\u1015\u102d\u1010\u103a\u101b\u1014\u103a"}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBar: {
    flexGrow: 0,
    marginBottom: 4,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
  },
  filterChipText: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  dateNavLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    minWidth: 160,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
  },
  statLabel: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: "500",
  },
  orderCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  orderCardLeft: {
    flex: 1,
    gap: 3,
  },
  orderDate: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
  },
  orderTime: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: "500",
  },
  orderItems: {
    fontSize: 13,
    color: C.textTertiary,
    marginTop: 2,
  },
  orderCardRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: "800",
    color: C.accent,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.danger + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
  },
  emptyText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  detailSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  orderTypeTagRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  orderTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dineInTag: {
    backgroundColor: "#4ECDC420",
  },
  takeawayTag: {
    backgroundColor: "#F7DC6F20",
  },
  orderTypeTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  detailMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    marginBottom: 8,
  },
  detailDate: {
    fontSize: 14,
    color: C.textSecondary,
  },
  noteTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.card,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  noteTagText: {
    fontSize: 13,
    color: C.textSecondary,
  },
  detailList: {
    maxHeight: 280,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailItemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
  },
  detailItemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
  },
  detailTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  detailTotalLabel: {
    fontSize: 18,
    color: C.textSecondary,
    fontWeight: "600",
  },
  detailTotalAmount: {
    fontSize: 28,
    fontWeight: "900",
    color: C.text,
  },
  closeSheetBtn: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  closeSheetText: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
  },
});
