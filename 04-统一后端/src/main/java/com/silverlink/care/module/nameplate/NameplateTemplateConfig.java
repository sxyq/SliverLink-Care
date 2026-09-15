package com.silverlink.care.module.nameplate;

/**
 * Server-side visual settings for the nameplate PDF and preview image.
 * The values can be overridden by an external JSON file without changing the miniapp bundle.
 */
public final class NameplateTemplateConfig {

    private static final float FRONT_CARD_WIDTH = 410f;
    private static final float FRONT_CARD_RIGHT_MARGIN = 20f;

    public String title = "智联卡片";
    public String subtitle = "智护空巢";
    public String fontResource = "/fonts/ArialUnicode.ttf";
    public String ink = "#054A5F";
    public String mutedInk = "#52727C";
    public String mint = "#DEF1EE";
    public String mintDeep = "#ACD5CF";
    public String line = "#81B9B2";
    public String gold = "#ECAE44";
    public String border = "#D3E1E2";
    public String careMark = "#378B82";

    public float frontNameLineXRatio = 0.33f;
    public float frontLineWidth = 86f;
    public float frontNameBaselineRatio = 0.43f;
    public float frontAgeBaselineRatio = 0.30f;
    public float frontAgeUnitGap = 8f;
    public float frontCareMarkXRatio = 0.86f;
    public float frontCareMarkYRatio = 0.075f;
    public float frontBrandGap = 12f;

    public float backBrandXRatio = 0.68f;
    public float backTitleBaselineRatio = 0.68f;
    public float backDividerBaselineRatio = 0.57f;
    public float backTitleSize = 22f;
    public float backSubtitleSize = 13f;
    public float backBrandGap = 8f;
    public float backDividerLength = 42f;

    public void validate() {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("title must not be blank");
        }
        if (subtitle == null || subtitle.isBlank()) {
            throw new IllegalArgumentException("subtitle must not be blank");
        }
        requireColor(ink, "ink");
        requireColor(mutedInk, "mutedInk");
        requireColor(mint, "mint");
        requireColor(mintDeep, "mintDeep");
        requireColor(line, "line");
        requireColor(gold, "gold");
        requireColor(border, "border");
        requireColor(careMark, "careMark");
        if (fontResource == null || fontResource.isBlank()) {
            throw new IllegalArgumentException("fontResource must not be blank");
        }
        requireRange(frontNameLineXRatio, 0.15f, 0.60f, "frontNameLineXRatio");
        requireRange(frontLineWidth, 20f, 220f, "frontLineWidth");
        requireRange(frontNameBaselineRatio, 0.10f, 0.80f, "frontNameBaselineRatio");
        requireRange(frontAgeBaselineRatio, 0.10f, 0.80f, "frontAgeBaselineRatio");
        requireRange(frontAgeUnitGap, 0f, 40f, "frontAgeUnitGap");
        requireRange(frontCareMarkXRatio, 0.65f, 0.92f, "frontCareMarkXRatio");
        requireRange(frontCareMarkYRatio, 0.03f, 0.16f, "frontCareMarkYRatio");
        requireRange(frontBrandGap, 0f, 40f, "frontBrandGap");
        requireRange(backBrandXRatio, 0.55f, 0.82f, "backBrandXRatio");
        requireRange(backTitleBaselineRatio, 0.55f, 0.80f, "backTitleBaselineRatio");
        requireRange(backDividerBaselineRatio, 0.45f, 0.68f, "backDividerBaselineRatio");
        requireRange(backTitleSize, 16f, 32f, "backTitleSize");
        requireRange(backSubtitleSize, 8f, 20f, "backSubtitleSize");
        requireRange(backBrandGap, 0f, 32f, "backBrandGap");
        requireRange(backDividerLength, 20f, 80f, "backDividerLength");
        if (frontNameLineXRatio * FRONT_CARD_WIDTH + frontLineWidth + frontAgeUnitGap
                > FRONT_CARD_WIDTH - FRONT_CARD_RIGHT_MARGIN) {
            throw new IllegalArgumentException("front name and age fields exceed the card width");
        }
    }

    private static void requireColor(String value, String field) {
        if (value == null || !value.matches("#[0-9a-fA-F]{6}")) {
            throw new IllegalArgumentException(field + " must be a six-digit hex color");
        }
    }

    private static void requireRange(float value, float min, float max, String field) {
        if (Float.isNaN(value) || Float.isInfinite(value) || value < min || value > max) {
            throw new IllegalArgumentException(field + " is out of range");
        }
    }
}
