export type MenuImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
  blurDataURL?: string;
};

// Width/height stay explicit so next/image reserves the final slot and avoids
// catalog CLS while placeholder families are replaced one-by-one.
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
  shrimpTails: {
    src: "/images/menu/categories/shrimp-tails.jpg",
    width: 1000,
    height: 1000,
    alt: "Раковые шейки",
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
    src: "/images/menu/categories/caviar-red.jpg",
    width: 1000,
    height: 1000,
    alt: "Икра",
  },
  caviarRed: {
    src: "/images/menu/categories/caviar-red.jpg",
    width: 1000,
    height: 1000,
    alt: "Красная икра",
  },
  caviarBlack: {
    src: "/images/menu/categories/caviar-black.jpg",
    width: 1000,
    height: 1000,
    alt: "Чёрная икра",
  },
  dessert: {
    src: "/images/menu/categories/dessert-cherry.jpg",
    width: 1000,
    height: 1000,
    alt: "Десерт",
  },
  drink: {
    src: "/images/menu/categories/drink-mineral-water.jpg",
    width: 800,
    height: 1000,
    alt: "Напиток",
  },
  gift: {
    src: "/images/menu/categories/gift-envelope.jpg",
    width: 1200,
    height: 900,
    alt: "Подарочный набор",
  },
};

const DEFAULT_IMAGE = familyImages.boiled;

const productFamilyToImageFamily: Record<string, string> = {
  "shrimp-tails": "shrimpTails",
};

// imageKey -> family fallback: specific keys resolve to family-level image
// until dedicated photography lands. Keep imageKey stable in fixtures so the
// component surface does not change when the asset set expands.
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
  "shrimp-tails": "shrimpTails",
  "crab-phalanx": "crab",
  "crab-whole": "crab",
  "mussels-blue-cheese": "mussels",
  "mussels-tomato-greens": "mussels",
  "mussels-pesto": "mussels",
  "mussels-tom-yam": "mussels",
  "vongole-arrabiata": "mussels",
  "vongole-creamy": "mussels",
  "vongole-pesto": "mussels",
  "caviar-red": "caviarRed",
  "caviar-black": "caviarBlack",
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
  const resolvedFamily = productFamilyToImageFamily[family] ?? family;
  return (familyImages[resolvedFamily] ?? DEFAULT_IMAGE).src;
}
