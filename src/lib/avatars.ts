// Avatar presets for profile pictures
// Using emoji/unicode characters for zero-cost, accessible avatars

export const AVATAR_PRESETS = [
  // Animals
  { id: "cat", emoji: "🐱", name: "Cat", category: "animals" },
  { id: "dog", emoji: "🐶", name: "Dog", category: "animals" },
  { id: "fox", emoji: "🦊", name: "Fox", category: "animals" },
  { id: "bear", emoji: "🐻", name: "Bear", category: "animals" },
  { id: "panda", emoji: "🐼", name: "Panda", category: "animals" },
  { id: "koala", emoji: "🐨", name: "Koala", category: "animals" },
  { id: "tiger", emoji: "🐯", name: "Tiger", category: "animals" },
  { id: "lion", emoji: "🦁", name: "Lion", category: "animals" },
  { id: "wolf", emoji: "🐺", name: "Wolf", category: "animals" },
  { id: "monkey", emoji: "🐵", name: "Monkey", category: "animals" },
  { id: "rabbit", emoji: "🐰", name: "Rabbit", category: "animals" },
  { id: "hamster", emoji: "🐹", name: "Hamster", category: "animals" },

  // Birds
  { id: "owl", emoji: "🦉", name: "Owl", category: "birds" },
  { id: "eagle", emoji: "🦅", name: "Eagle", category: "birds" },
  { id: "duck", emoji: "🦆", name: "Duck", category: "birds" },
  { id: "penguin", emoji: "🐧", name: "Penguin", category: "birds" },
  { id: "chicken", emoji: "🐔", name: "Chicken", category: "birds" },
  { id: "parrot", emoji: "🦜", name: "Parrot", category: "birds" },

  // Fantasy/Mythical
  { id: "unicorn", emoji: "🦄", name: "Unicorn", category: "fantasy" },
  { id: "dragon", emoji: "🐉", name: "Dragon", category: "fantasy" },
  { id: "phoenix", emoji: "🔥", name: "Phoenix", category: "fantasy" },
  { id: "wizard", emoji: "🧙", name: "Wizard", category: "fantasy" },
  { id: "fairy", emoji: "🧚", name: "Fairy", category: "fantasy" },
  { id: "vampire", emoji: "🧛", name: "Vampire", category: "fantasy" },
  { id: "alien", emoji: "👽", name: "Alien", category: "fantasy" },
  { id: "robot", emoji: "🤖", name: "Robot", category: "fantasy" },

  // Objects/Symbols
  { id: "book", emoji: "📚", name: "Book Lover", category: "symbols" },
  { id: "headphones", emoji: "🎧", name: "Listener", category: "symbols" },
  { id: "star", emoji: "⭐", name: "Star", category: "symbols" },
  { id: "fire", emoji: "🔥", name: "Fire", category: "symbols" },
  { id: "lightning", emoji: "⚡", name: "Lightning", category: "symbols" },
  { id: "crown", emoji: "👑", name: "Crown", category: "symbols" },
  { id: "gem", emoji: "💎", name: "Diamond", category: "symbols" },
  { id: "trophy", emoji: "🏆", name: "Trophy", category: "symbols" },

  // Food/Fun
  { id: "coffee", emoji: "☕", name: "Coffee", category: "fun" },
  { id: "pizza", emoji: "🍕", name: "Pizza", category: "fun" },
  { id: "donut", emoji: "🍩", name: "Donut", category: "fun" },
  { id: "cake", emoji: "🎂", name: "Cake", category: "fun" },
  { id: "cookie", emoji: "🍪", name: "Cookie", category: "fun" },

  // Nature
  { id: "tree", emoji: "🌲", name: "Tree", category: "nature" },
  { id: "flower", emoji: "🌸", name: "Flower", category: "nature" },
  { id: "sunflower", emoji: "🌻", name: "Sunflower", category: "nature" },
  { id: "cactus", emoji: "🌵", name: "Cactus", category: "nature" },
  { id: "mushroom", emoji: "🍄", name: "Mushroom", category: "nature" },
  { id: "earth", emoji: "🌍", name: "Earth", category: "nature" },
  { id: "moon", emoji: "🌙", name: "Moon", category: "nature" },
  { id: "sun", emoji: "☀️", name: "Sun", category: "nature" },
];

export const AVATAR_CATEGORIES = [
  { id: "all", name: "All", icon: "🎭" },
  { id: "animals", name: "Animals", icon: "🐾" },
  { id: "birds", name: "Birds", icon: "🦅" },
  { id: "fantasy", name: "Fantasy", icon: "✨" },
  { id: "symbols", name: "Symbols", icon: "🎯" },
  { id: "fun", name: "Fun", icon: "🎉" },
  { id: "nature", name: "Nature", icon: "🌿" },
];

export function getAvatarEmoji(avatarId: string): string {
  const avatar = AVATAR_PRESETS.find((a) => a.id === avatarId);
  return avatar?.emoji || "👤";
}

export function getAvatarName(avatarId: string): string {
  const avatar = AVATAR_PRESETS.find((a) => a.id === avatarId);
  return avatar?.name || "Default";
}
