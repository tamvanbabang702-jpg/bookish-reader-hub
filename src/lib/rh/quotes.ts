// Built-in offline reading quotes — no network needed.
export interface BuiltinQuote {
  text: string;
  author: string;
}

export const READING_QUOTES: BuiltinQuote[] = [
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R. R. Martin" },
  { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
  { text: "A book is a dream that you hold in your hand.", author: "Neil Gaiman" },
  { text: "The man who does not read has no advantage over the man who cannot read.", author: "Mark Twain" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "Once you learn to read, you will be forever free.", author: "Frederick Douglass" },
  { text: "I have always imagined that Paradise will be a kind of library.", author: "Jorge Luis Borges" },
  { text: "So many books, so little time.", author: "Frank Zappa" },
  { text: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" },
  { text: "Think before you speak. Read before you think.", author: "Fran Lebowitz" },
  { text: "The reading of all good books is like a conversation with the finest minds of past centuries.", author: "René Descartes" },
  { text: "You don't have to burn books to destroy a culture. Just get people to stop reading them.", author: "Ray Bradbury" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "A room without books is like a body without a soul.", author: "Marcus Tullius Cicero" },
  { text: "There is no such thing as a child who hates to read; there are only children who have not found the right book.", author: "Frank Serafini" },
  { text: "Some books leave us free, and some books make us free.", author: "Ralph Waldo Emerson" },
  { text: "The best moments in reading are when you come across something you thought only you felt.", author: "Alan Bennett" },
  { text: "That is a good book which is opened with expectation and closed with profit.", author: "Amos Bronson Alcott" },
  { text: "Books are the quietest and most constant of friends.", author: "Charles W. Eliot" },
  { text: "Read the best books first, or you may not have a chance to read them at all.", author: "Henry David Thoreau" },
  { text: "The book you don't read won't help.", author: "Jim Rohn" },
  { text: "Every book is a new door to a new world.", author: "Anonymous" },
  { text: "Small daily progress is still progress.", author: "Anonymous" },
  { text: "Knowledge is a treasure, but practice is the key to it.", author: "Lao Tzu" },
  { text: "Study the past if you would define the future.", author: "Confucius" },
  { text: "The purpose of reading is not to finish books, but to finish thinking.", author: "Anonymous" },
];

// Deterministic quote of the day (stable per local date, rotates daily).
export function quoteOfDay(dateKey: string): BuiltinQuote {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const idx = hash % READING_QUOTES.length;
  return READING_QUOTES[idx] ?? READING_QUOTES[0]!;

}
