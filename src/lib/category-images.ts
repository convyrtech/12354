const familyImages: Record<string, string> = {
  boiled: "https://static.tildacdn.com/tild6535-6639-4530-b639-626339396365/_.jpg",
  fried: "https://static.tildacdn.com/tild3963-6665-4231-a365-393862666538/_.jpg",
  live: "https://static.tildacdn.com/tild3338-3437-4631-b139-666434373931/__.jpg",
  shrimp: "https://static.tildacdn.com/tild6161-6233-4064-b331-353166653966/_.jpg",
  crab: "https://static.tildacdn.com/tild3632-6665-4833-b135-373864636134/_.jpg",
  mussels: "https://static.tildacdn.com/tild3935-6265-4461-b639-373233666439/photo.jpg",
  caviar: "https://static.tildacdn.com/tild3335-3565-4261-a434-613363333865/_.jpg",
  dessert: "https://static.tildacdn.com/tild3335-3565-4261-a434-613363333865/_.jpg",
  drink: "https://static.tildacdn.com/tild3933-3335-4264-b430-396365373132/photo.jpg",
  gift: "https://static.tildacdn.com/tild3937-6265-4131-b236-386265306563/_.jpg",
};

export function getProductFamilyImage(family: string): string {
  return familyImages[family] ?? familyImages.boiled;
}
