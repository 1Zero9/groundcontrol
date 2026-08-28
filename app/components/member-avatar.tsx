"use client";

import type { ReactNode } from "react";
import { avatarIconSrc, isAvatarIconKey } from "../../src/core/avatars";

interface MemberAvatarContentProps {
  avatarValue?: string | null;
  fallback: ReactNode;
  alt?: string;
}

/**
 * Renders the illustrated avatar image for a family member when
 * `avatarValue` matches a known icon-pack key, otherwise falls back to
 * whatever the caller passes (an emoji string, initials, etc.). Meant to be
 * placed inside an existing circular container that already sets a fixed
 * width/height and `overflow: hidden`.
 */
export function MemberAvatarContent({ avatarValue, fallback, alt = "" }: MemberAvatarContentProps) {
  if (isAvatarIconKey(avatarValue)) {
    return <img src={avatarIconSrc(avatarValue)} alt={alt} className="member-avatar-img" />;
  }
  return <>{avatarValue || fallback}</>;
}
