import React from "react";
import {
  Hash,
  Flower,
  Paintbrush,
  Gem,
  Rocket,
  LucideIcon,
} from "lucide-react";

const tabIcons: { [key: string]: LucideIcon } = {
  "fav-portfolios": Flower,
  "design-inspo": Paintbrush,
  "mint-worthy": Gem,
  "product-hunt": Rocket,
};

type KnownCategory = keyof typeof tabIcons;
type TabIconProps = {
  category: KnownCategory | string;
};

export default function TabIcon({ category }: TabIconProps) {
  const Icon = tabIcons[category as KnownCategory] || Hash;
  return (
    <div className="flex items-center space-x-1">
      <Hash size={18} />
      <Icon size={18} />
    </div>
  );
}
