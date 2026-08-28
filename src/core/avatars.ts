export type AvatarIconOption = {
  key: string;
  label: string;
};

// Matches the illustrated "Space Explorer" avatar pack in public/icon_pack.
export const AVATAR_ICON_OPTIONS: AvatarIconOption[] = [
  { key: "avatar_dad", label: "Dad" },
  { key: "avatar_mom", label: "Mum" },
  { key: "avatar_boy_teen", label: "Teen boy" },
  { key: "avatar_girl_teen", label: "Teen girl" },
  { key: "avatar_boy_young", label: "Young boy" },
  { key: "avatar_girl_young", label: "Young girl" },
  { key: "avatar_robot", label: "Robot" },
  { key: "avatar_dog", label: "Dog" },
];

const AVATAR_ICON_KEYS = new Set(AVATAR_ICON_OPTIONS.map((option) => option.key));

export function isAvatarIconKey(value?: string | null): value is string {
  return !!value && AVATAR_ICON_KEYS.has(value);
}

export function avatarIconSrc(key: string): string {
  return `/icon_pack/${key}.png`;
}
