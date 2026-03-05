import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { usePOS } from "@/context/POSContext";
import { Product, getRandomColor } from "@/lib/storage";

const C = Colors.dark;

const COLOR_PALETTE = [
  "#FF6B35", "#4ECDC4", "#45B7D1", "#96CEB4", "#F7DC6F", "#DDA0DD",
  "#98D8C8", "#FF8C94", "#BB8FCE", "#85C1E9", "#F0A500", "#22C55E",
];

type ProductFormData = {
  name: string;
  price: string;
  category: string;
  color: string;
};

const defaultForm = (categories: string[]): ProductFormData => ({
  name: "",
  price: "",
  category: categories[0] || "",
  color: getRandomColor(),
});

function ProductItem({ product, onEdit, onDelete }: { product: Product; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.productItem}>
      <View style={[styles.productItemColor, { backgroundColor: product.color }]} />
      <View style={styles.productItemInfo}>
        <Text style={styles.productItemName} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.productItemCat}>{product.category}</Text>
      </View>
      <Text style={[styles.productItemPrice, { color: product.color }]}>
        {product.price.toFixed(0)} ks
      </Text>
      <Pressable style={styles.editBtn} onPress={onEdit} hitSlop={8}>
        <Ionicons name="pencil-outline" size={14} color={C.textSecondary} />
      </Pressable>
      <Pressable style={styles.deleteBtn} onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={14} color={C.danger} />
      </Pressable>
    </View>
  );
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { products, categories, addProduct, updateProduct, removeProduct, addCategory, removeCategory, renameCategory } = usePOS();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(defaultForm(categories));
  const [errors, setErrors] = useState<Partial<ProductFormData>>({});
  const [selectedFilter, setSelectedFilter] = useState("အားလုံး");
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [customCatInput, setCustomCatInput] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom;

  const openAdd = () => {
    setEditingProduct(null);
    setForm(defaultForm(categories));
    setErrors({});
    setShowCustomCat(false);
    setCustomCatInput("");
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({ name: product.name, price: product.price.toString(), category: product.category, color: product.color });
    setErrors({});
    setShowCustomCat(false);
    setCustomCatInput("");
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const newErrors: Partial<ProductFormData> = {};
    if (!form.name.trim()) newErrors.name = "အမည် ထည့်ပါ";
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0) newErrors.price = "စျေးနှုန်း မှန်ကန် ထည့်ပါ";
    if (!form.category.trim()) newErrors.category = "အမျိုးအစား ရွေးပါ";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const price = parseFloat(parseFloat(form.price).toFixed(2));
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const finalCategory = form.category.trim();
    if (!categories.includes(finalCategory)) {
      await addCategory(finalCategory);
    }
    if (editingProduct) {
      await updateProduct({ ...editingProduct, name: form.name.trim(), price, category: finalCategory, color: form.color });
    } else {
      await addProduct({ name: form.name.trim(), price, category: finalCategory, color: form.color });
    }
    setModalOpen(false);
  };

  const handleDelete = (product: Product) => {
    Alert.alert("ဖျက်ရန်", `"${product.name}" ကို မီနူးမှ ဖျက်လိုက်မလား?`, [
      { text: "မလုပ်တော့ပါ", style: "cancel" },
      { text: "ဖျက်ရန်", style: "destructive", onPress: () => removeProduct(product.id) },
    ]);
  };

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.includes(name)) {
      Alert.alert("သတိ", "ဒီအမျိုးအစား ရှိပြီးသားပါ");
      return;
    }
    await addCategory(name);
    setNewCatName("");
  };

  const handleRenameCategory = async (oldName: string) => {
    const name = editCatName.trim();
    if (!name || name === oldName) {
      setEditingCat(null);
      return;
    }
    await renameCategory(oldName, name);
    setEditingCat(null);
    setEditCatName("");
    if (selectedFilter === oldName) setSelectedFilter(name);
  };

  const handleDeleteCategory = (name: string) => {
    const count = products.filter((p) => p.category === name).length;
    Alert.alert(
      "အမျိုးအစား ဖျက်ရန်",
      count > 0 ? `"${name}" ထဲမှာ အရာ ${count} ခု ရှိပါတယ်။ ဖျက်ရင် အခြားအမျိုးအစားသို့ ပြောင်းသွားပါမည်။` : `"${name}" ကို ဖျက်လိုက်မလား?`,
      [
        { text: "မလုပ်တော့ပါ", style: "cancel" },
        { text: "ဖျက်ရန်", style: "destructive", onPress: async () => {
          await removeCategory(name);
          if (selectedFilter === name) setSelectedFilter("အားလုံး");
        }},
      ]
    );
  };

  const filterCategories = ["အားလုံး", ...categories];
  const filteredProducts = selectedFilter === "အားလုံး" ? products : products.filter((p) => p.category === selectedFilter);

  const grouped = filteredProducts.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, Product[]>);
  const sections = Object.keys(grouped).sort();

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>မီနူး စီမံရန်</Text>
          <Text style={styles.headerSub}>အရာ {products.length} ခု · အမျိုးအစား {categories.length} ခု</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.catManageBtn} onPress={() => setCatModalOpen(true)}>
            <Ionicons name="pricetag-outline" size={18} color={C.accent} />
          </Pressable>
          <Pressable style={styles.addButton} onPress={openAdd}>
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
        {filterCategories.map((cat) => (
          <Pressable key={cat} style={[styles.filterChip, selectedFilter === cat && styles.filterChipActive]} onPress={() => setSelectedFilter(cat)}>
            <Text style={[styles.filterChipText, selectedFilter === cat && styles.filterChipTextActive]}>{cat}</Text>
            {cat !== "အားလုံး" && (
              <Text style={[styles.filterChipCount, selectedFilter === cat && { color: "#fff" }]}>
                {products.filter((p) => p.category === cat).length}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {filteredProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={48} color={C.textTertiary} />
          <Text style={styles.emptyTitle}>မီနူး မရှိတဲ့ပါ</Text>
          <Text style={styles.emptyText}>+ ကို နှိပ်ပြီး အရာအသစ် ထည့်ပါ</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad + 20 }}>
          {sections.map((cat) => (
            <View key={cat} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{cat}</Text>
                <Text style={styles.sectionCount}>{grouped[cat].length}</Text>
              </View>
              <View style={styles.sectionList}>
                {grouped[cat].map((product) => (
                  <ProductItem key={product.id} product={product} onEdit={() => openEdit(product)} onDelete={() => handleDelete(product)} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay} keyboardVerticalOffset={90}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalOpen(false)} />
          <View style={[styles.formSheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.formTitle}>{editingProduct ? "အရာ ပြင်ရန်" : "အရာအသစ် ထည့်ရန်"}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>အမည်</Text>
              <TextInput
                style={[styles.textInput, errors.name && styles.inputError]}
                placeholder="ဥပမာ - ကြက်ကြော်"
                placeholderTextColor={C.textTertiary}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

              <Text style={styles.fieldLabel}>စျေးနှုန်း (ks)</Text>
              <TextInput
                style={[styles.textInput, errors.price && styles.inputError]}
                placeholder="0"
                placeholderTextColor={C.textTertiary}
                value={form.price}
                onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
                keyboardType="decimal-pad"
              />
              {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}

              <Text style={styles.fieldLabel}>အမျိုးအစား</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.chip, form.category === cat && { backgroundColor: C.accent }]}
                    onPress={() => { setForm((f) => ({ ...f, category: cat })); setShowCustomCat(false); }}
                  >
                    <Text style={[styles.chipText, form.category === cat && { color: "#fff", fontWeight: "700" as const }]}>{cat}</Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[styles.chip, styles.chipAdd, showCustomCat && { backgroundColor: C.accent }]}
                  onPress={() => setShowCustomCat(!showCustomCat)}
                >
                  <Ionicons name="add" size={14} color={showCustomCat ? "#fff" : C.accent} />
                  <Text style={[styles.chipText, { color: showCustomCat ? "#fff" : C.accent }]}>အသစ်</Text>
                </Pressable>
              </ScrollView>
              {showCustomCat && (
                <TextInput
                  style={styles.textInput}
                  placeholder="အမျိုးအစားအသစ် ရိုက်ထည့်ပါ"
                  placeholderTextColor={C.textTertiary}
                  value={customCatInput}
                  onChangeText={(v) => { setCustomCatInput(v); setForm((f) => ({ ...f, category: v })); }}
                  autoFocus
                />
              )}

              <Text style={styles.fieldLabel}>အရောင်</Text>
              <View style={styles.colorGrid}>
                {COLOR_PALETTE.map((color) => (
                  <Pressable
                    key={color}
                    style={[styles.colorDot, { backgroundColor: color }, form.color === color && styles.colorDotSelected]}
                    onPress={() => setForm((f) => ({ ...f, color }))}
                  >
                    {form.color === color && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </Pressable>
                ))}
              </View>

              <View style={styles.formActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                  <Text style={styles.cancelBtnText}>မလုပ်တော့ပါ</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>{editingProduct ? "ပြင်ရန်" : "ထည့်ရန်"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={catModalOpen} animationType="slide" transparent onRequestClose={() => setCatModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCatModalOpen(false)} />
          <View style={[styles.formSheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.formTitle}>အမျိုးအစား စီမံရန်</Text>
            <Text style={styles.catSubtitle}>အမျိုးအစား {categories.length} ခု</Text>

            <View style={styles.addCatRow}>
              <TextInput
                style={styles.addCatInput}
                placeholder="အမျိုးအစားအသစ် ထည့်ရန်..."
                placeholderTextColor={C.textTertiary}
                value={newCatName}
                onChangeText={setNewCatName}
              />
              <Pressable style={[styles.addCatBtn, !newCatName.trim() && { opacity: 0.4 }]} onPress={handleAddCategory} disabled={!newCatName.trim()}>
                <Ionicons name="add" size={18} color="#fff" />
              </Pressable>
            </View>

            <ScrollView style={styles.catList} showsVerticalScrollIndicator={false}>
              {categories.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                const isEditing = editingCat === cat;
                return (
                  <View key={cat} style={styles.catRow}>
                    {isEditing ? (
                      <View style={styles.catEditRow}>
                        <TextInput
                          style={styles.catEditInput}
                          value={editCatName}
                          onChangeText={setEditCatName}
                          autoFocus
                          onSubmitEditing={() => handleRenameCategory(cat)}
                        />
                        <Pressable style={styles.catSaveBtn} onPress={() => handleRenameCategory(cat)}>
                          <Ionicons name="checkmark" size={16} color={C.success} />
                        </Pressable>
                        <Pressable style={styles.catCancelBtn} onPress={() => setEditingCat(null)}>
                          <Ionicons name="close" size={16} color={C.textSecondary} />
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <View style={styles.catInfo}>
                          <View style={[styles.catDot, { backgroundColor: C.accent }]} />
                          <Text style={styles.catName}>{cat}</Text>
                          <View style={styles.catCountBadge}>
                            <Text style={styles.catCountText}>{count}</Text>
                          </View>
                        </View>
                        <View style={styles.catActions}>
                          <Pressable style={styles.catEditBtn} onPress={() => { setEditingCat(cat); setEditCatName(cat); }}>
                            <Ionicons name="pencil-outline" size={14} color={C.textSecondary} />
                          </Pressable>
                          <Pressable style={styles.catDeleteBtn} onPress={() => handleDeleteCategory(cat)}>
                            <Ionicons name="trash-outline" size={14} color={C.danger} />
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: "row", gap: 8 },
  catManageBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent + "18", alignItems: "center", justifyContent: "center" },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  filterBar: { flexGrow: 0, marginBottom: 8 },
  filterBarContent: { paddingHorizontal: 16, gap: 6, flexDirection: "row", paddingVertical: 4 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: C.card },
  filterChipActive: { backgroundColor: C.accent },
  filterChipText: { color: C.textSecondary, fontSize: 13, fontWeight: "600" },
  filterChipTextActive: { color: "#fff", fontWeight: "700" as const },
  filterChipCount: { color: C.textTertiary, fontSize: 11, fontWeight: "700" },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, paddingLeft: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionCount: { fontSize: 11, fontWeight: "700", color: C.textTertiary, backgroundColor: C.card, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  sectionList: { backgroundColor: C.card, borderRadius: 14, overflow: "hidden" },
  productItem: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  productItemColor: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  productItemInfo: { flex: 1, gap: 1 },
  productItemName: { fontSize: 14, fontWeight: "700", color: C.text },
  productItemCat: { fontSize: 11, color: C.textSecondary },
  productItemPrice: { fontSize: 14, fontWeight: "800", marginRight: 4 },
  editBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  deleteBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.danger + "20", alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptyText: { fontSize: 13, color: C.textSecondary },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  formSheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: "90%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 16 },
  catSubtitle: { fontSize: 13, color: C.textSecondary, marginTop: -12, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  textInput: { backgroundColor: C.card, borderRadius: 12, padding: 12, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  inputError: { borderColor: C.danger },
  errorText: { color: C.danger, fontSize: 11, marginTop: -10, marginBottom: 10, marginLeft: 4 },
  chipScroll: { flexGrow: 0, marginBottom: 14 },
  chipRow: { flexDirection: "row", gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipAdd: { flexDirection: "row", gap: 4, alignItems: "center", borderColor: C.accent + "40", borderStyle: "dashed" as const },
  chipText: { color: C.textSecondary, fontSize: 13, fontWeight: "600" },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  colorDot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  colorDotSelected: { borderWidth: 2.5, borderColor: "#fff" },
  formActions: { flexDirection: "row", gap: 10, marginBottom: 8 },
  cancelBtn: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: "center" },
  cancelBtnText: { color: C.text, fontSize: 15, fontWeight: "700" },
  saveBtn: { flex: 2, backgroundColor: C.accent, borderRadius: 14, padding: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  addCatRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  addCatInput: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border },
  addCatBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  catList: { maxHeight: 400 },
  catRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  catInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 15, fontWeight: "600", color: C.text },
  catCountBadge: { backgroundColor: C.card, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  catCountText: { fontSize: 11, fontWeight: "700", color: C.textSecondary },
  catActions: { flexDirection: "row", gap: 6 },
  catEditBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  catDeleteBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.danger + "15", alignItems: "center", justifyContent: "center" },
  catEditRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  catEditInput: { flex: 1, backgroundColor: C.card, borderRadius: 10, padding: 10, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.accent },
  catSaveBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.success + "20", alignItems: "center", justifyContent: "center" },
  catCancelBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
});
