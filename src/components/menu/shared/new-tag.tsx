import type { MenuItemBadge } from "@/lib/fixtures";

const LABEL: Record<MenuItemBadge, string> = {
  new: "новинка",
  hit: "хит сезона",
};

type Props = {
  badge?: MenuItemBadge;
  children?: string;
};

export function NewTag({ badge = "new", children }: Props) {
  return <em className="menu-new-tag">*{children ?? LABEL[badge]}*</em>;
}
