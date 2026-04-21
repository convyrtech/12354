export type MenuImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
  blurDataURL?: string;
};

// Tilda CDN placeholders — real food photography pending (TODOS.md). Aspect
// ratios encoded in width/height so next/image reserves correct space and
// CLS stays < 0.1. Actual dimensions from the source assets.

const familyImages: Record<string, MenuImage> = {
  boiled: {
    src: "https://static.tildacdn.com/tild6535-6639-4530-b639-626339396365/_.jpg",
    width: 1200,
    height: 900,
    alt: "Варёные раки",
  },
  fried: {
    src: "https://static.tildacdn.com/tild3963-6665-4231-a365-393862666538/_.jpg",
    width: 1200,
    height: 900,
    alt: "Жареные раки",
  },
  live: {
    src: "https://static.tildacdn.com/tild3338-3437-4631-b139-666434373931/__.jpg",
    width: 1200,
    height: 900,
    alt: "Живые раки",
  },
  shrimp: {
    src: "https://static.tildacdn.com/tild6161-6233-4064-b331-353166653966/_.jpg",
    width: 1000,
    height: 1000,
    alt: "Магаданские креветки",
  },
  crab: {
    src: "https://static.tildacdn.com/tild3632-6665-4833-b135-373864636134/_.jpg",
    width: 960,
    height: 1200,
    alt: "Камчатский краб",
  },
  mussels: {
    src: "https://static.tildacdn.com/tild3935-6265-4461-b639-373233666439/photo.jpg",
    width: 1000,
    height: 1000,
    alt: "Мидии",
  },
  caviar: {
    src: "https://static.tildacdn.com/tild3335-3565-4261-a434-613363333865/_.jpg",
    width: 1000,
    height: 1000,
    alt: "Икра",
  },
  // Dessert photography pending (TODOS.md P2). Neutral cream SVG beats
  // the caviar photo as a placeholder — a red-caviar dish paired with
  // "Вишня в молочном шоколаде" reads as a misconfigured catalog.
  dessert: {
    src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%201000%201000%22%3E%3Crect%20width%3D%221000%22%20height%3D%221000%22%20fill%3D%22%23f2e8d5%22%2F%3E%3Ctext%20x%3D%22500%22%20y%3D%22500%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%20font-family%3D%22Cormorant%20Garamond%2C%20serif%22%20font-style%3D%22italic%22%20font-size%3D%2264%22%20fill%3D%22%23101c1e%22%20fill-opacity%3D%220.28%22%3E%D0%B4%D0%B5%D1%81%D0%B5%D1%80%D1%82%3C%2Ftext%3E%3C%2Fsvg%3E",
    width: 1000,
    height: 1000,
    alt: "Десерт",
  },
  drink: {
    src: "https://static.tildacdn.com/tild3933-3335-4264-b430-396365373132/photo.jpg",
    width: 800,
    height: 1000,
    alt: "Напиток",
  },
  gift: {
    src: "https://static.tildacdn.com/tild3937-6265-4131-b236-386265306563/_.jpg",
    width: 1200,
    height: 900,
    alt: "Подарочный набор",
  },
};

const DEFAULT_IMAGE = familyImages.boiled;

// imageKey → family fallback: specific keys resolve to family-level image
// until real food photography lands. Keep imageKey stable in fixtures so the
// component surface doesn't change when the real asset drops in.
const imageKeyToFamily: Record<string, string> = {
  "raki-boiled": "boiled",
  "raki-fried": "fried",
  "raki-live": "live",
  "shrimp-70-90-boiled": "shrimp",
  "shrimp-70-90-sauce": "shrimp",
  "shrimp-70-90-fried": "shrimp",
  "shrimp-50-70-boiled": "shrimp",
  "shrimp-50-70-ice": "shrimp",
  "shrimp-medvedka": "shrimp",
  "shrimp-mix": "shrimp",
  "shrimp-tails": "shrimp",
  "crab-phalanx": "crab",
  "crab-whole": "crab",
  "mussels-blue-cheese": "mussels",
  "mussels-tomato-greens": "mussels",
  "mussels-pesto": "mussels",
  "mussels-tom-yam": "mussels",
  "vongole-arrabiata": "mussels",
  "vongole-creamy": "mussels",
  "vongole-pesto": "mussels",
  "caviar-red": "caviar",
  "caviar-black": "caviar",
  "dessert-cherry": "dessert",
  "dessert-raspberry": "dessert",
  "drink-borjomi": "drink",
  "drink-yoga-cherry": "drink",
  "gift-card": "gift",
};

export function getMenuImage(imageKey: string | undefined, alt?: string): MenuImage {
  if (!imageKey) return alt ? { ...DEFAULT_IMAGE, alt } : DEFAULT_IMAGE;
  const family = imageKeyToFamily[imageKey] ?? imageKey;
  const base = familyImages[family] ?? DEFAULT_IMAGE;
  return alt ? { ...base, alt } : base;
}

export function getProductFamilyImage(family: string): string {
  return (familyImages[family] ?? DEFAULT_IMAGE).src;
}
