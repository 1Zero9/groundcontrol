// Maps event categories onto the illustrated "Space Explorer" icon pack in
// public/icon_pack, used as a fallback when an event has no custom emoji.
const CATEGORY_ICON_KEYS: Record<string, string> = {
  sports: "cat_sports_ball",
  family: "cat_home",
  school: "cat_reading_book",
  college: "cat_reading_book",
  appointment: "cat_health_heart",
  birthday: "cat_birthday_cake",
  travel: "cat_travel_plane",
  celebration: "cat_celebration_party",
};

export function categoryIconSrc(category?: string | null): string | null {
  if (!category) return null;
  const key = CATEGORY_ICON_KEYS[category];
  return key ? `/icon_pack/${key}.png` : null;
}
