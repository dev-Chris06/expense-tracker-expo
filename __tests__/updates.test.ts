import { apkDownloadUrl, isNewerVersion } from "@/utils/updates";

describe("isNewerVersion", () => {
  it("compare major, minor et patch numériquement", () => {
    expect(isNewerVersion("1.1.0", "1.0.0")).toBe(true);
    expect(isNewerVersion("1.0.10", "1.0.9")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(true);
  });

  it("ne propose ni la même version ni une plus ancienne", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.0.0", "1.1.0")).toBe(false);
  });

  it("ignore le préfixe v et le numéro de build", () => {
    expect(isNewerVersion("v1.2.0", "1.1.0+5")).toBe(true);
    expect(isNewerVersion("1.1.0+9", "1.1.0+2")).toBe(false);
  });

  it("ne considère jamais une valeur illisible comme plus récente", () => {
    expect(isNewerVersion("latest", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.2", "1.0.0")).toBe(false);
    expect(isNewerVersion("2.0.0", "")).toBe(false);
  });
});

describe("apkDownloadUrl", () => {
  it("pointe vers l'APK de la release correspondante", () => {
    expect(apkDownloadUrl("1.2.0")).toBe(
      "https://github.com/dev-Chris06/expense-tracker-expo/releases/download/v1.2.0/depenses-expo-1.2.0.apk",
    );
  });
});
