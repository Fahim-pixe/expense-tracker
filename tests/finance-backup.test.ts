import { describe, expect, it } from "vitest";

import { decryptFinanceBackup, encryptFinanceBackup, validateBackupPassphrase } from "../lib/finance-backup";
import { createInitialFinanceState } from "../lib/finance";

const deterministicRandom = async (length: number) => Uint8Array.from({ length }, (_, index) => (index * 17 + 11) % 256);
const passphrase = "correct-horse-battery-staple";

describe("encrypted finance backups", () => {
  it("encrypts and restores a normalized local ledger without exposing plaintext", async () => {
    const state = createInitialFinanceState();
    state.transactions = [{ id: "expense-1", type: "expense", amountCents: 4250, categoryId: "food", note: "Groceries", date: "2026-08-05", createdAt: "2026-08-05T08:00:00.000Z" }];
    state.budgets = [{ monthKey: "2026-08", amountCents: 100000, updatedAt: "2026-08-01T00:00:00.000Z" }];

    const backup = await encryptFinanceBackup(state, passphrase, deterministicRandom);
    expect(backup).not.toContain("Groceries");
    expect(backup).toContain('"format":"expense-tracker.backup"');
    await expect(decryptFinanceBackup(backup, passphrase)).resolves.toEqual(state);
  });

  it("rejects incorrect passphrases and modified backup ciphertext", async () => {
    const backup = await encryptFinanceBackup(createInitialFinanceState(), passphrase, deterministicRandom);
    await expect(decryptFinanceBackup(backup, "an-incorrect-passphrase")).rejects.toThrow("incorrect");
    const tampered = backup.replace(/"ciphertext":"([0-9a-f])/, '"ciphertext":"f');
    await expect(decryptFinanceBackup(tampered, passphrase)).rejects.toThrow("incorrect");
  });

  it("requires a sufficiently long backup passphrase", () => {
    expect(validateBackupPassphrase("too-short")).toContain("at least");
    expect(validateBackupPassphrase(passphrase)).toBeNull();
  });
});

