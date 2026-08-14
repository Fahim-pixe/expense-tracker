import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { SurfaceCard } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { financeUi } from "@/constants/finance-ui";
import { useColors } from "@/hooks/use-colors";
import { chooseBackupFile, shareBackupFile } from "@/lib/backup-files";
import { decryptFinanceBackup, encryptFinanceBackup, validateBackupPassphrase } from "@/lib/finance-backup";
import { useFinance } from "@/lib/finance-store";

type BackupAction = "open" | "export" | "restore";

export default function BackupsScreen() {
  const colors = useColors();
  const { transactions, categories, preferences, budgets, categoryBudgets, recurringTransactions, replaceFinanceState, updatePreferences } = useFinance();
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [importPassphrase, setImportPassphrase] = useState("");
  const [pendingBackup, setPendingBackup] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const exportError = validateBackupPassphrase(exportPassphrase);

  const authorizeBiometricAction = async (action: BackupAction) => {
    if (!preferences.biometricBackupProtection) return true;
    if (Platform.OS === "web") {
      Alert.alert("Biometric confirmation unavailable", "Turn off biometric backup protection on this device to continue with your backup passphrase.");
      return false;
    }
    const [hasHardware, isEnrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
    if (!hasHardware || !isEnrolled) {
      Alert.alert("Biometric confirmation unavailable", "Set up Face ID, Touch ID, or fingerprint authentication on this device, or turn off this optional protection.");
      return false;
    }
    const promptMessage = action === "export" ? "Confirm backup export" : action === "restore" ? "Confirm backup restore" : "Confirm opening backup";
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, promptDescription: "Confirm before accessing your encrypted backup.", cancelLabel: "Cancel", fallbackLabel: "Use device passcode", biometricsSecurityLevel: "strong" });
    if (result.success) return true;
    if (result.error !== "user_cancel" && result.error !== "system_cancel") Alert.alert("Authentication failed", result.warning || "Please try again or turn off biometric backup protection.");
    return false;
  };

  const toggleBiometricProtection = async (enabled: boolean) => {
    if (!enabled) {
      await updatePreferences({ biometricBackupProtection: false });
      return;
    }
    if (Platform.OS === "web") {
      Alert.alert("Available on mobile", "Face ID and fingerprint protection are available in iOS and Android builds, not the web preview.");
      return;
    }
    const [hasHardware, isEnrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
    if (!hasHardware || !isEnrolled) {
      Alert.alert("Set up biometrics first", "Enable Face ID, Touch ID, or fingerprint authentication in your device settings, then try again.");
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Enable biometric backup protection", promptDescription: "Confirm your identity before protecting backup actions.", biometricsSecurityLevel: "strong", fallbackLabel: "Use device passcode" });
    if (result.success) {
      const didUpdate = await updatePreferences({ biometricBackupProtection: true });
      if (!didUpdate) Alert.alert("Couldn’t enable protection", "Please try again.");
    }
  };

  const exportBackup = async () => {
    if (isWorking) return;
    if (exportError) { Alert.alert("Choose a stronger passphrase", exportError); return; }
    if (exportPassphrase !== confirmPassphrase) { Alert.alert("Passphrases do not match", "Enter the same passphrase twice to avoid creating an unusable backup."); return; }
    if (!(await authorizeBiometricAction("export"))) return;
    setIsWorking(true);
    try {
      const encrypted = await encryptFinanceBackup({ transactions, categories, preferences, budgets, categoryBudgets, recurringTransactions }, exportPassphrase, Crypto.getRandomBytesAsync);
      await shareBackupFile(encrypted);
      setExportPassphrase("");
      setConfirmPassphrase("");
      Alert.alert("Encrypted backup ready", "Save the file and passphrase separately. The app cannot recover a forgotten passphrase.");
    } catch (error) { Alert.alert("Couldn’t export backup", error instanceof Error ? error.message : "Please try again."); } finally { setIsWorking(false); }
  };

  const selectBackup = async () => {
    if (isWorking) return;
    if (!(await authorizeBiometricAction("open"))) return;
    setIsWorking(true);
    try { const contents = await chooseBackupFile(); if (contents) setPendingBackup(contents); } catch (error) { Alert.alert("Couldn’t open backup", error instanceof Error ? error.message : "Choose a valid encrypted backup file."); } finally { setIsWorking(false); }
  };

  const restoreBackup = async () => {
    if (!pendingBackup || isWorking) return;
    if (validateBackupPassphrase(importPassphrase)) { Alert.alert("Enter the backup passphrase", "Use the same passphrase that protected this backup."); return; }
    if (!(await authorizeBiometricAction("restore"))) return;
    setIsWorking(true);
    try {
      const restored = await decryptFinanceBackup(pendingBackup, importPassphrase);
      Alert.alert("Replace local ledger?", `This backup contains ${restored.transactions.length} transactions, ${restored.categories.length} categories, ${restored.budgets.length} monthly targets, and ${restored.recurringTransactions.length} schedules. Your current local ledger will be replaced.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Replace data", style: "destructive", onPress: () => { void replaceFinanceState(restored).then((didRestore) => { if (didRestore) { setPendingBackup(null); setImportPassphrase(""); Alert.alert("Backup restored", "Your local ledger, schedules, categories, preferences, and budgets have been replaced."); } else Alert.alert("Couldn’t restore backup", "Your current data was not changed. Please try again."); }); } },
      ]);
    } catch (error) { Alert.alert("Couldn’t verify backup", error instanceof Error ? error.message : "Your current data was not changed."); } finally { setIsWorking(false); }
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Close backups" onPress={() => router.back()} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons name="close" size={22} color={colors.foreground} /></Pressable><Text style={[styles.title, { color: colors.foreground }]}>Backups</Text><View style={styles.closeButton} /></View>
    <SurfaceCard style={styles.introCard}><View style={[styles.introIcon, { backgroundColor: `${colors.success}16` }]}><MaterialIcons name="lock-outline" size={23} color={colors.success} /></View><View style={styles.introCopy}><Text style={[styles.introTitle, { color: colors.foreground }]}>Encrypted and local</Text><Text style={[styles.introDescription, { color: colors.muted }]}>Your passphrase encrypts the backup before it leaves this device. It is never saved by Expense Tracker.</Text></View></SurfaceCard>
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>BACKUP SECURITY</Text>
    <SurfaceCard style={styles.biometricCard}><View style={[styles.biometricIcon, { backgroundColor: `${colors.primary}14` }]}><MaterialIcons name="fingerprint" size={24} color={colors.primary} /></View><View style={styles.biometricCopy}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Biometric confirmation</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Ask for Face ID or fingerprint confirmation before opening, exporting, or restoring a backup. Your backup passphrase is still required.</Text></View><Switch value={preferences.biometricBackupProtection} onValueChange={(value) => { void toggleBiometricProtection(value); }} accessibilityLabel="Enable biometric backup confirmation" trackColor={{ false: colors.border, true: `${colors.primary}80` }} thumbColor={preferences.biometricBackupProtection ? colors.primary : colors.surface} /></SurfaceCard>
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>EXPORT ENCRYPTED BACKUP</Text>
    <SurfaceCard><Text style={[styles.cardTitle, { color: colors.foreground }]}>Protect your ledger</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Create a file containing transactions, categories, recurring schedules, preferences, and all budgets.</Text><TextInput value={exportPassphrase} onChangeText={setExportPassphrase} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Passphrase (12+ characters)" placeholderTextColor={colors.muted} accessibilityLabel="Backup passphrase" style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /><TextInput value={confirmPassphrase} onChangeText={setConfirmPassphrase} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Confirm passphrase" placeholderTextColor={colors.muted} accessibilityLabel="Confirm backup passphrase" style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /><Pressable accessibilityRole="button" accessibilityLabel="Export encrypted backup" disabled={isWorking} onPress={exportBackup} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, isWorking && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="ios-share" size={19} color={colors.background} /><Text style={[styles.primaryButtonText, { color: colors.background }]}>{isWorking ? "Working…" : "Export encrypted backup"}</Text></Pressable></SurfaceCard>
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>IMPORT ENCRYPTED BACKUP</Text>
    <SurfaceCard><Text style={[styles.cardTitle, { color: colors.foreground }]}>Restore a saved ledger</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Import replaces this device’s local finance data only after decryption and a second confirmation.</Text><Pressable accessibilityRole="button" accessibilityLabel="Choose backup file" disabled={isWorking} onPress={selectBackup} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.background }, isWorking && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="file-open" size={19} color={colors.primary} /><Text style={[styles.secondaryButtonText, { color: colors.primary }]}>{pendingBackup ? "Backup file selected" : "Choose backup file"}</Text></Pressable>{pendingBackup ? <><TextInput value={importPassphrase} onChangeText={setImportPassphrase} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Backup passphrase" placeholderTextColor={colors.muted} accessibilityLabel="Import backup passphrase" style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /><Pressable accessibilityRole="button" accessibilityLabel="Verify and restore backup" disabled={isWorking} onPress={restoreBackup} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, isWorking && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="restore" size={19} color={colors.background} /><Text style={[styles.primaryButtonText, { color: colors.background }]}>{isWorking ? "Verifying…" : "Verify and restore"}</Text></Pressable></> : null}</SurfaceCard>
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  biometricCard: { flexDirection: "row", alignItems: "center", gap: 11 }, biometricCopy: { flex: 1 }, biometricIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" }, cardDescription: { fontSize: 14, lineHeight: 20, marginTop: 3 }, cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: "800" }, closeButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, borderRadius: financeUi.size.tapTarget / 2, borderWidth: financeUi.line.subtle, alignItems: "center", justifyContent: "center" }, content: { padding: financeUi.spacing.page, paddingBottom: 32 }, disabled: { opacity: 0.62 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }, input: { minHeight: 50, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, paddingHorizontal: 14, fontSize: 15, marginTop: 12 }, introCard: { flexDirection: "row", gap: 12, marginBottom: 5 }, introCopy: { flex: 1 }, introDescription: { fontSize: 13, lineHeight: 19, marginTop: 2 }, introIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, introTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" }, pressed: { opacity: financeUi.opacity.pressed, transform: [{ scale: 0.98 }] }, primaryButton: { minHeight: 50, marginTop: 14, borderRadius: financeUi.radius.button, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, primaryButtonText: { fontSize: 15, lineHeight: 21, fontWeight: "800" }, sectionLabel: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1, marginTop: 25, marginBottom: 9 }, secondaryButton: { minHeight: 50, marginTop: 14, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, secondaryButtonText: { fontSize: 15, lineHeight: 21, fontWeight: "800" }, title: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
});
