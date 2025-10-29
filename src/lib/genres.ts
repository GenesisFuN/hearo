// Comprehensive genre list for Hearo audiobooks
// Use this as the single source of truth for genres across the app

export const GENRES = [
  // Fiction
  "Fantasy",
  "Sci-fi",
  "Mystery",
  "Thriller",
  "Horror",
  "Romance",
  "Historical Fiction",
  "Adventure",
  "Drama",
  "Comedy",

  // Non-Fiction
  "Non-fiction",
  "Biography",
  "Self-Help",
  "History",
  "Business",
  "Science",
  "Technology",
  "Philosophy",

  // Specialized
  "Young Adult",
  "Children's",
  "Poetry",
  "True Crime",
  "Spirituality",

  // Catch-all
  "Others",
] as const;

export type Genre = (typeof GENRES)[number];

// Genre categories for better organization
export const GENRE_CATEGORIES = {
  Fiction: [
    "Fantasy",
    "Sci-fi",
    "Mystery",
    "Thriller",
    "Horror",
    "Romance",
    "Historical Fiction",
    "Adventure",
    "Drama",
    "Comedy",
  ],
  "Non-Fiction": [
    "Non-fiction",
    "Biography",
    "Self-Help",
    "History",
    "Business",
    "Science",
    "Technology",
    "Philosophy",
  ],
  Specialized: [
    "Young Adult",
    "Children's",
    "Poetry",
    "True Crime",
    "Spirituality",
  ],
  Other: ["Others"],
} as const;

// Genre descriptions for UI tooltips
export const GENRE_DESCRIPTIONS: Record<string, string> = {
  Fantasy: "Magical worlds, mythical creatures, and epic adventures",
  "Sci-fi": "Future technology, space exploration, and scientific speculation",
  Mystery: "Puzzles to solve, detective stories, and whodunits",
  Thriller: "Suspenseful plots, high stakes, and page-turners",
  Horror: "Scary stories, supernatural terror, and psychological fear",
  Romance: "Love stories, relationships, and emotional journeys",
  "Historical Fiction": "Stories set in the past with historical accuracy",
  Adventure: "Action-packed journeys and exciting quests",
  Drama: "Character-driven stories with emotional depth",
  Comedy: "Humorous tales and light-hearted entertainment",
  "Non-fiction": "True stories, real-world topics, and factual content",
  Biography: "Life stories of real people",
  "Self-Help": "Personal development and improvement guides",
  History: "Historical events and analysis",
  Business: "Business strategy, entrepreneurship, and career advice",
  Science: "Scientific discoveries and explanations",
  Technology: "Tech trends, programming, and digital innovation",
  Philosophy: "Big questions about life, ethics, and existence",
  "Young Adult": "Stories for teenage readers",
  "Children's": "Books for younger audiences",
  Poetry: "Verse and lyrical works",
  "True Crime": "Real criminal cases and investigations",
  Spirituality: "Religious, spiritual, and mindfulness content",
  Others: "Books that don't fit other categories",
};

// Genre emojis for visual representation
export const GENRE_EMOJIS: Record<string, string> = {
  Fantasy: "🧙‍♂️",
  "Sci-fi": "🚀",
  Mystery: "🔍",
  Thriller: "😱",
  Horror: "👻",
  Romance: "❤️",
  "Historical Fiction": "📜",
  Adventure: "🗺️",
  Drama: "🎭",
  Comedy: "😂",
  "Non-fiction": "📚",
  Biography: "👤",
  "Self-Help": "💪",
  History: "🏛️",
  Business: "💼",
  Science: "🔬",
  Technology: "💻",
  Philosophy: "🤔",
  "Young Adult": "🎒",
  "Children's": "🧸",
  Poetry: "📝",
  "True Crime": "🔪",
  Spirituality: "🙏",
  Others: "📖",
};
