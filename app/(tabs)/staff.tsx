import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { usePOS } from "@/context/POSContext";
import { Employee } from "@/lib/storage";
import { exportBackup, importBackup } from "@/lib/backup";

const C = Colors.dark;

const ROLES = [
  "\u1005\u102c\u1038\u1015\u103d\u1032\u1011\u102d\u102f\u1004\u103a",
  "\u1019\u102e\u1038\u1016\u102d\u102f",
  "\u1005\u102c\u1038\u1001\u103b\u1000\u103a",
  "\u1021\u1031\u102c\u1000\u103a\u1019\u103e\u1030",
  "\u101c\u1000\u103a\u1011\u1031\u102c\u1000\u103a\u101c\u102f\u1015\u103a\u1005\u102c\u1038",
  "\u1019\u1014\u103a\u1014\u1031\u1002\u103b\u102c",
];

type EmpFormData = {
  name: string;
  phone: string;
  role: string;
  salary: string;
  startDate: string;
};

const defaultForm = (): EmpFormData => ({
  name: "",
  phone: "",
  role: ROLES[0],
  salary: "",
  startDate: new Date().toISOString().slice(0, 10),
});

function EmployeeCard({
  emp,
  onEdit,
  onDelete,
  onToggle,
}: {
  emp: Employee;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.empCard, !emp.active && styles.empCardInactive]}>
      <View style={styles.empAvatar}>
        <Ionicons
          name="person"
          size={22}
          color={emp.active ? C.accent : C.textTertiary}
        />
      </View>
      <View style={styles.empInfo}>
        <Text style={styles.empName}>{emp.name}</Text>
        <Text style={styles.empRole}>{emp.role}</Text>
        <Text style={styles.empPhone}>{emp.phone || "-"}</Text>
      </View>
      <View style={styles.empRight}>
        <Text style={[styles.empSalary, { color: emp.active ? C.accent : C.textTertiary }]}>
          {emp.salary.toFixed(0)} ks
        </Text>
        <View style={styles.empActions}>
          <Pressable
            style={[styles.empActionBtn, { backgroundColor: emp.active ? C.success + "20" : C.textTertiary + "20" }]}
            onPress={onToggle}
            hitSlop={6}
          >
            <Ionicons
              name={emp.active ? "checkmark-circle" : "pause-circle"}
              size={16}
              color={emp.active ? C.success : C.textTertiary}
            />
          </Pressable>
          <Pressable style={styles.empActionBtn} onPress={onEdit} hitSlop={6}>
            <Ionicons name="pencil-outline" size={14} color={C.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.empActionBtn, { backgroundColor: C.danger + "20" }]}
            onPress={onDelete}
            hitSlop={6}
          >
            <Ionicons name="trash-outline" size={14} color={C.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function StaffScreen() {
  const insets = useSafeAreaInsets();
  const { employees, addEmployee, updateEmployee, removeEmployee } = usePOS();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmpFormData>(defaultForm());
  const [errors, setErrors] = useState<Partial<EmpFormData>>({});
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom;

  const activeEmps = employees.filter((e) => e.active);
  const totalSalary = activeEmps.reduce((s, e) => s + e.salary, 0);

  const openAdd = () => {
    setEditingEmp(null);
    setForm(defaultForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setForm({
      name: emp.name,
      phone: emp.phone,
      role: emp.role,
      salary: emp.salary.toString(),
      startDate: emp.startDate,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const newErrors: Partial<EmpFormData> = {};
    if (!form.name.trim()) newErrors.name = "\u1021\u1019\u100a\u103a \u1011\u100a\u1037\u103a\u1015\u102b";
    const salary = parseFloat(form.salary);
    if (!form.salary || isNaN(salary) || salary < 0) newErrors.salary = "\u101c\u1005\u102c \u1019\u103e\u1014\u103a\u1000\u1014\u103a \u1011\u100a\u1037\u103a\u1015\u102b";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const salary = parseFloat(parseFloat(form.salary).toFixed(0));
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (editingEmp) {
      await updateEmployee({
        ...editingEmp,
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        salary,
        startDate: form.startDate,
      });
    } else {
      await addEmployee({
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        salary,
        startDate: form.startDate,
        active: true,
      });
    }
    setModalOpen(false);
  };

  const handleDelete = (emp: Employee) => {
    Alert.alert(
      "\u1016\u103b\u1000\u103a\u101b\u1014\u103a",
      `"${emp.name}" \u1000\u102d\u102f \u1016\u103b\u1000\u103a\u101c\u102d\u102f\u1000\u103a\u1019\u101c\u102c\u1038?`,
      [
        { text: "\u1019\u101c\u102f\u1015\u103a\u1010\u1031\u102c\u1037\u1015\u102b", style: "cancel" },
        {
          text: "\u1016\u103b\u1000\u103a\u101b\u1014\u103a",
          style: "destructive",
          onPress: () => removeEmployee(emp.id),
        },
      ]
    );
  };

  const handleToggleActive = async (emp: Employee) => {
    await updateEmployee({ ...emp, active: !emp.active });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleExportBackup = async () => {
    setIsBackingUp(true);
    try {
      const ok = await exportBackup();
      if (ok) {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("\u1021\u1019\u103e\u102c\u1038", "Share \u101c\u102f\u1015\u103a\u101c\u102d\u102f\u1037 \u1019\u101b\u1015\u102b\u104b");
      }
    } catch {
      Alert.alert("\u1021\u1019\u103e\u102c\u1038", "Backup \u101c\u102f\u1015\u103a\u1001\u103b\u1004\u103a\u1038 \u1019\u101b\u1015\u102b\u104b");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      "Backup \u1015\u103c\u1014\u103a\u101c\u100a\u103a\u101b\u1014\u103a",
      "\u101c\u1000\u103a\u101b\u103e\u102d data \u1021\u102c\u1038\u101c\u102f\u1036\u1038 \u1021\u1005\u102c\u1038\u1011\u102d\u102f\u1038\u1019\u100a\u103a\u104b \u1006\u1000\u103a\u101c\u102f\u1015\u103a\u1019\u101c\u102c\u1038?",
      [
        { text: "\u1019\u101c\u102f\u1015\u103a\u1010\u1031\u102c\u1037\u1015\u102b", style: "cancel" },
        { text: "\u1015\u103c\u1014\u103a\u101c\u100a\u103a\u101b\u1014\u103a", onPress: doImport },
      ]
    );
  };

  const doImport = async () => {
    setIsRestoring(true);
    try {
      const result = await importBackup();
      if (result.success) {
        Alert.alert("\u1021\u1031\u102c\u1004\u103a\u1019\u103c\u1004\u103a\u1015\u103c\u102e!", result.message + "\n\nApp \u1000\u102d\u102f \u1015\u103c\u1014\u103a\u1016\u103d\u1004\u1037\u103a\u1015\u102b\u104b");
      } else if (result.message !== "Cancelled" && result.message !== "\u1016\u102d\u102f\u1004\u103a \u1019\u101b\u103d\u1031\u1038\u1015\u102b\u104b") {
        Alert.alert("\u1021\u1019\u103e\u102c\u1038", result.message);
      }
    } catch {
      Alert.alert("\u1021\u1019\u103e\u102c\u1038", "Backup \u1015\u103c\u1014\u103a\u101c\u100a\u103a\u1001\u103b\u1004\u103a\u1038 \u1019\u101b\u1015\u102b\u104b");
    } finally {
      setIsRestoring(false);
    }
  };

  const BackupSection = () => (
    <View style={styles.backupSection}>
      <View style={styles.backupHeader}>
        <Ionicons name="cloud-upload-outline" size={20} color={C.accent} />
        <Text style={styles.backupTitle}>Data Backup</Text>
      </View>
      <Text style={styles.backupDesc}>
        {"\u1021\u1001\u103b\u1000\u103a\u1021\u101c\u1000\u103a\u1019\u103b\u102c\u1038\u1000\u102d\u102f Google Drive, Viber \u1005\u101e\u100a\u1037\u103a \u101e\u102d\u1019\u103a\u1038\u1011\u102c\u1038\u101c\u102d\u102f\u1037\u101b\u1015\u102b\u1010\u101a\u103a\u104b"}
      </Text>
      <View style={styles.backupBtns}>
        <Pressable
          style={[styles.backupBtn, styles.exportBtn]}
          onPress={handleExportBackup}
          disabled={isBackingUp}
        >
          {isBackingUp ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={styles.exportBtnText}>Backup {"\u101e\u102d\u1019\u103a\u1038\u101b\u1014\u103a"}</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[styles.backupBtn, styles.importBtn]}
          onPress={handleImportBackup}
          disabled={isRestoring}
        >
          {isRestoring ? <ActivityIndicator color={C.accent} size="small" /> : (
            <>
              <Ionicons name="push-outline" size={18} color={C.accent} />
              <Text style={styles.importBtnText}>{"\u1015\u103c\u1014\u103a\u101c\u100a\u103a\u101b\u1014\u103a"}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{"\u1017\u1014\u103a\u1011\u1019\u103a\u1038"}</Text>
          <Text style={styles.headerSub}>{"\u1005\u102f\u1005\u102f\u1015\u1031\u102b\u1004\u103a\u1038"} {employees.length} \u1025\u102e\u1038</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openAdd}>
          <Ionicons name="person-add" size={20} color="#fff" />
        </Pressable>
      </View>

      {employees.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeEmps.length}</Text>
            <Text style={styles.statLabel}>{"\u101c\u1000\u103a\u101b\u103e\u102d"}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{employees.length - activeEmps.length}</Text>
            <Text style={styles.statLabel}>{"\u101b\u1015\u103a\u1014\u102c\u1038"}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalSalary.toFixed(0)} ks</Text>
            <Text style={styles.statLabel}>{"\u101c\u1005\u102c\u1005\u102f\u1005\u102f\u1015\u1031\u102b\u1004\u103a\u1038"}</Text>
          </View>
        </View>
      )}

      {employees.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomPad + 20 }}>
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={56} color={C.textTertiary} />
            <Text style={styles.emptyTitle}>{"\u1017\u1014\u103a\u1011\u1019\u103a\u1038 \u1019\u101b\u103e\u102d\u1010\u1032\u1037\u1015\u102b"}</Text>
            <Text style={styles.emptyText}>{"\u1017\u1014\u103a\u1011\u1019\u103a\u1038 \u1011\u100a\u1037\u103a\u101b\u1014\u103a + \u1000\u102d\u102f \u1014\u103e\u102d\u1015\u103a\u1015\u102b"}</Text>
            <Pressable style={styles.emptyAddBtn} onPress={openAdd}>
              <Ionicons name="person-add-outline" size={18} color={C.accent} />
              <Text style={styles.emptyAddText}>{"\u1017\u1014\u103a\u1011\u1019\u103a\u1038 \u1011\u100a\u1037\u103a\u101b\u1014\u103a"}</Text>
            </Pressable>
          </View>
          <BackupSection />
        </ScrollView>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          scrollEnabled={!!employees.length}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad + 20, gap: 10 }}
          renderItem={({ item }) => (
            <EmployeeCard
              emp={item}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
              onToggle={() => handleToggleActive(item)}
            />
          )}
          ListFooterComponent={<BackupSection />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={90}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalOpen(false)} />
          <View style={[styles.formSheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.formTitle}>
              {editingEmp ? "\u1017\u1014\u103a\u1011\u1019\u103a\u1038 \u1015\u103c\u1004\u103a\u101b\u1014\u103a" : "\u1017\u1014\u103a\u1011\u1019\u103a\u1038\u1021\u101e\u1005\u103a \u1011\u100a\u1037\u103a\u101b\u1014\u103a"}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>{"\u1021\u1019\u100a\u103a"}</Text>
              <TextInput
                style={[styles.textInput, errors.name && styles.inputError]}
                placeholder={"\u1025\u1015\u1019\u102c - \u1019\u1031\u1019\u103c\u1004\u1037\u103a\u1019\u102c"}
                placeholderTextColor={C.textTertiary}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

              <Text style={styles.fieldLabel}>{"\u1016\u102f\u1014\u103a\u1038\u1014\u1036\u1015\u102b\u1010\u103a"}</Text>
              <TextInput
                style={styles.textInput}
                placeholder="09xxxxxxxxx"
                placeholderTextColor={C.textTertiary}
                value={form.phone}
                onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>{"\u101b\u102c\u1011\u1030\u1038"}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipRow}
              >
                {ROLES.map((role) => (
                  <Pressable
                    key={role}
                    style={[
                      styles.chip,
                      form.role === role && { backgroundColor: C.accent },
                    ]}
                    onPress={() => setForm((f) => ({ ...f, role }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        form.role === role && { color: "#fff", fontWeight: "700" },
                      ]}
                    >
                      {role}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>{"\u101c\u1005\u102c (ks)"}</Text>
              <TextInput
                style={[styles.textInput, errors.salary && styles.inputError]}
                placeholder="0"
                placeholderTextColor={C.textTertiary}
                value={form.salary}
                onChangeText={(v) => setForm((f) => ({ ...f, salary: v }))}
                keyboardType="number-pad"
              />
              {errors.salary && <Text style={styles.errorText}>{errors.salary}</Text>}

              <Text style={styles.fieldLabel}>{"\u1005\u1010\u1004\u103a\u101b\u1000\u103a"}</Text>
              <TextInput
                style={styles.textInput}
                placeholder="2025-01-15"
                placeholderTextColor={C.textTertiary}
                value={form.startDate}
                onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))}
              />

              <View style={styles.formActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                  <Text style={styles.cancelBtnText}>{"\u1019\u101c\u102f\u1015\u103a\u1010\u1031\u102c\u1037\u1015\u102b"}</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>
                    {editingEmp ? "\u1015\u103c\u1004\u103a\u101b\u1014\u103a" : "\u1011\u100a\u1037\u103a\u101b\u1014\u103a"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: 16,
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
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
  empCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  empCardInactive: {
    opacity: 0.5,
  },
  empAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accent + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  empInfo: {
    flex: 1,
    gap: 2,
  },
  empName: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },
  empRole: {
    fontSize: 13,
    color: C.accent,
    fontWeight: "600",
  },
  empPhone: {
    fontSize: 12,
    color: C.textTertiary,
  },
  empRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  empSalary: {
    fontSize: 17,
    fontWeight: "800",
  },
  empActions: {
    flexDirection: "row",
    gap: 6,
  },
  empActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surface,
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
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.accent + "20",
    marginTop: 8,
  },
  emptyAddText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.accent,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  formSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    color: C.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  inputError: {
    borderColor: C.danger,
  },
  errorText: {
    color: C.danger,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipText: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  cancelBtnText: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
  },
  saveBtn: {
    flex: 2,
    backgroundColor: C.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  backupSection: {
    marginTop: 24,
    marginHorizontal: 0,
    padding: 20,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  backupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  backupTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
  },
  backupDesc: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  backupBtns: {
    flexDirection: "row",
    gap: 10,
  },
  backupBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  exportBtn: {
    backgroundColor: C.accent,
  },
  exportBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  importBtn: {
    backgroundColor: C.accent + "20",
    borderWidth: 1.5,
    borderColor: C.accent + "40",
  },
  importBtnText: {
    color: C.accent,
    fontSize: 14,
    fontWeight: "800",
  },
});
