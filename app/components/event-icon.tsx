"use client";

import { categoryIconSrc } from "../../src/core/category-icons";

interface EventIconProps {
  icon?: string;
  category?: string;
  size?: number;
  className?: string;
}

export function EventIcon({ icon, category, size = 22, className = "" }: EventIconProps) {
  if (icon) {
    return (
      <span className={className} aria-hidden="true">
        {icon}
      </span>
    );
  }

  const src = categoryIconSrc(category);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={className}
        style={{ objectFit: "contain" }}
      />
    );
  }

  return (
    <span className={className} aria-hidden="true">
      🗓️
    </span>
  );
}
