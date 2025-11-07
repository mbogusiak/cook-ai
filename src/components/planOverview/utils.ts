/**
 * Utility functions for Plan Overview components
 */

/**
 * Generates a placeholder image URL based on recipe name
 */
export function getPlaceholderImage(recipeName: string): string {
  // TODO: Implement in Phase 2
  const firstLetter = recipeName[0]?.toUpperCase() || "R";
  const color = getColorFromString(recipeName);
  return `https://ui-avatars.com/api/?name=${firstLetter}&background=${color}&color=fff&size=200`;
}

/**
 * Generates a color hash from a string
 */
export function getColorFromString(str: string): string {
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    "3b82f6", // blue
    "10b981", // green
    "f59e0b", // amber
    "ef4444", // red
    "8b5cf6", // violet
    "ec4899", // pink
  ];

  return colors[Math.abs(hash) % colors.length];
}
