import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";

const BACKUP_KEYS = [
  "pos_products",
  "pos_orders",
  "pos_active_tables",
  "pos_employees",
  "pos_credit_customers",
  "pos_credit_transactions",
];

export async function exportBackup(): Promise<boolean> {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      data[key] = JSON.parse(raw);
    }
  }

  const backupPayload = {
    appName: "MMM-POS",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    data,
  };

  const json = JSON.stringify(backupPayload, null, 2);

  if (Platform.OS === "web") {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `MMM_Backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fileName = `MMM_Backup_${dateStr}.json`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: "application/json",
      dialogTitle: "Backup Save \u101c\u102f\u1015\u103a\u101b\u1014\u103a",
      UTI: "public.json",
    });
    return true;
  }

  return false;
}

export async function importBackup(): Promise<{ success: boolean; message: string }> {
  try {
    let json: string;

    if (Platform.OS === "web") {
      json = await new Promise<string>((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            reject(new Error("No file selected"));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("File read failed"));
          reader.readAsText(file);
        };
        input.oncancel = () => reject(new Error("Cancelled"));
        input.click();
      });
    } else {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, message: "\u1016\u102d\u102f\u1004\u103a \u1019\u101b\u103d\u1031\u1038\u1015\u102b\u104b" };
      }

      const fileUri = result.assets[0].uri;
      json = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    const parsed = JSON.parse(json);

    if (!parsed.appName || parsed.appName !== "MMM-POS" || !parsed.data) {
      return { success: false, message: "Backup \u1016\u102d\u102f\u1004\u103a \u1019\u103e\u102c\u1038\u1019\u1014\u1031\u1015\u102b\u104b" };
    }

    for (const key of BACKUP_KEYS) {
      if (parsed.data[key]) {
        await AsyncStorage.setItem(key, JSON.stringify(parsed.data[key]));
      }
    }

    return {
      success: true,
      message: `Backup \u1015\u103c\u1014\u103a\u101c\u100a\u103a\u1015\u103c\u102e\u1038\u1015\u103c\u102e! (${new Date(parsed.exportedAt).toLocaleDateString()})`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Cancelled" || msg === "\u1016\u102d\u102f\u1004\u103a \u1019\u101b\u103d\u1031\u1038\u1015\u102b\u104b") {
      return { success: false, message: msg };
    }
    return { success: false, message: `Backup \u1015\u103c\u1014\u103a\u101c\u100a\u103a\u1001\u103b\u1004\u103a\u1038 \u1019\u101b\u1015\u102b\u104b` };
  }
}
