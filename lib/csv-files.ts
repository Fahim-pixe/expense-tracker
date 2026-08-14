import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

function filename() {
  return `expense-tracker-ledger-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
}

export async function shareCsvFile(contents: string) {
  if (Platform.OS === "web") {
    const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
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
  await Sharing.shareAsync(file.uri, { dialogTitle: "Export expense ledger CSV", mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
}

export async function chooseCsvFile() {
  const result = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/plain", "application/vnd.ms-excel", "*/*"], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > 5_000_000) throw new Error("Choose a CSV file smaller than 5 MB.");
  if (Platform.OS === "web" && asset.file) return asset.file.text();
  return new File(asset.uri).text();
}
