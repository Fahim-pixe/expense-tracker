import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

function filename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `expense-tracker-backup-${timestamp}.etb`;
}

export async function shareBackupFile(contents: string) {
  if (Platform.OS === "web") {
    const blob = new Blob([contents], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename();
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, filename());
  file.create({ intermediates: true, overwrite: true });
  file.write(contents);
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(file.uri, { dialogTitle: "Save encrypted backup", mimeType: "application/json", UTI: "public.json" });
}

export async function chooseBackupFile() {
  const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain", "*/*"], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > 5_000_000) throw new Error("Choose a backup file smaller than 5 MB.");
  if (Platform.OS === "web" && asset.file) return asset.file.text();
  return new File(asset.uri).text();
}

