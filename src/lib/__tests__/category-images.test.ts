import { describe, expect, it } from "vitest";
import { getMenuImage, getProductFamilyImage } from "@/lib/category-images";

describe("getMenuImage", () => {
  it("resolves known imageKey to matching family image", () => {
    const image = getMenuImage("mussels-pesto");
    expect(image.src).toContain("tildacdn.com");
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  });

  it("falls back to default when imageKey is unknown", () => {
    const image = getMenuImage("nonexistent-key-xyz");
    expect(image.src).toContain("tildacdn.com");
    expect(image.width).toBeGreaterThan(0);
  });

  it("falls back to default when imageKey is undefined", () => {
    const image = getMenuImage(undefined);
    expect(image.src).toContain("tildacdn.com");
  });

  it("overrides alt when provided", () => {
    const image = getMenuImage("raki-boiled", "Custom alt");
    expect(image.alt).toBe("Custom alt");
  });

  it("resolves separate caviar image keys to dedicated local assets", () => {
    expect(getMenuImage("caviar-red").src).toBe("/images/menu/categories/caviar-red.jpg");
    expect(getMenuImage("caviar-black").src).toBe("/images/menu/categories/caviar-black.jpg");
  });
});

describe("getProductFamilyImage", () => {
  it("returns src for known family", () => {
    const src = getProductFamilyImage("shrimp");
    expect(src).toContain("tildacdn.com");
  });

  it("falls back to default for unknown family", () => {
    const src = getProductFamilyImage("something-unknown");
    expect(src).toContain("tildacdn.com");
  });

  it("maps shrimp-tails product family to its dedicated local image", () => {
    const src = getProductFamilyImage("shrimp-tails");
    expect(src).toBe("/images/menu/categories/shrimp-tails.jpg");
  });
});
