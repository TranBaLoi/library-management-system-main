import * as fs from 'fs';
import * as path from 'path';

// =========================
// API Configuration Constants
// =========================
const GOOGLE_BOOKS_API_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';
const API_KEY = 'AIzaSyCIOEtIzG6orz3OAmi7CThCiPpboCL6-so';
const SEARCH_KEYWORDS = [
  'subject:classic',
  'subject:literature',
  'subject:fantasy',
  'subject:young',
  'subject:romance',
]; // Array of search keywords
const MAX_RESULTS = 20;
const MIN_START_INDEX = 0;
const MAX_START_INDEX = 200;
const START_INDEX_STEP = 20;
const DELAY_BETWEEN_REQUESTS_MS = 500; // Delay 500ms between requests to avoid rate limiting

// =========================
// Type Definitions
// =========================
interface GoogleBooksVolume {
  kind: string;
  id: string;
  etag: string;
  selfLink: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    publisher?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    printType?: string;
    categories?: string[];
    language?: string;
    subtitle?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
  };
}

interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksVolume[];
}

interface BookJsonData {
  ISBN: string;
  Title: string;
  Author: string;
  Year: number;
  Publisher: string;
  category: string[]; // Changed back to string[] to support multiple categories
  language: string;
  subtitle?: string;
  description?: string;
  coverImageUrl: string; // Required - books without cover image are skipped
  price: number; // Price in VND (random between 150,000 - 400,000)
}

// =========================
// Multilingual Books Configuration (Separate from main search)
// =========================
interface MultilingualSearchConfig {
  keyword: string;
  langRestrict: string;
  label: string;
}

const MULTILINGUAL_CONFIGS: MultilingualSearchConfig[] = [
  // Vietnamese books - Foreign literature translated to Vietnamese
  { keyword: 'văn học', langRestrict: 'vi', label: 'Vietnamese - Literature' },
  { keyword: 'tiểu thuyết', langRestrict: 'vi', label: 'Vietnamese - Novel' },
  { keyword: 'trinh thám', langRestrict: 'vi', label: 'Vietnamese - Mystery' },
  { keyword: 'lãng mạn', langRestrict: 'vi', label: 'Vietnamese - Romance' },

  // Spanish books
  { keyword: 'novela', langRestrict: 'es', label: 'Spanish - Novel' },
  { keyword: 'literatura', langRestrict: 'es', label: 'Spanish - Literature' },
  { keyword: 'romance', langRestrict: 'es', label: 'Spanish - Romance' },
  { keyword: 'misterio', langRestrict: 'es', label: 'Spanish - Mystery' },

  // Chinese books
  { keyword: '小说', langRestrict: 'zh-CN', label: 'Chinese - Novel' },
  { keyword: '文学', langRestrict: 'zh-CN', label: 'Chinese - Literature' },
  { keyword: '言情', langRestrict: 'zh-CN', label: 'Chinese - Romance' },
  { keyword: '悬疑', langRestrict: 'zh-CN', label: 'Chinese - Mystery' },
];

const BOOKS_PER_MULTILINGUAL_CONFIG = 15; // ~50 books per language (4 configs x 15 = 60)

// =========================
// Helper Functions
// =========================

/**
 * Helper function: Extracts ISBN from industry identifiers (prefers ISBN_13, then ISBN_10, then OTHER)
 */
function extractISBN(industryIdentifiers?: Array<{ type: string; identifier: string }>): string {
  if (!industryIdentifiers || industryIdentifiers.length === 0) {
    return '';
  }

  // Prefer ISBN_13, then ISBN_10, then OTHER
  const isbn13 = industryIdentifiers.find(id => id.type === 'ISBN_13');
  if (isbn13) return isbn13.identifier;

  const isbn10 = industryIdentifiers.find(id => id.type === 'ISBN_10');
  if (isbn10) return isbn10.identifier;

  // Fallback to first identifier if no ISBN found
  return industryIdentifiers[0].identifier;
}

/**
 * Helper function: Extracts year from published date string
 */
function extractYear(publishedDate?: string): number {
  if (!publishedDate) return 0;

  // Try to extract year from various formats: "1997", "1997-01", "1997-01-15"
  const yearMatch = publishedDate.match(/^(\d{4})/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }

  return 0;
}

/**
 * Helper function: Gets first author or empty string
 */
function getFirstAuthor(authors?: string[]): string {
  if (!authors || authors.length === 0) {
    return '';
  }
  return authors[0];
}

/**
 * Helper function: Builds category array from categories only (printType excluded)
 */
function buildCategoryArray(categories?: string[]): string[] {
  const categoryArray: string[] = [];

  // Add categories if they exist
  if (categories && categories.length > 0) {
    categoryArray.push(...categories);
  }

  return categoryArray;
}

/**
 * Helper function: Extracts image URL from imageLinks (prefers thumbnail, then smallThumbnail)
 */
function extractImageUrl(imageLinks?: {
  smallThumbnail?: string;
  thumbnail?: string;
}): string | undefined {
  if (!imageLinks) {
    return undefined;
  }

  // Prefer thumbnail, then smallThumbnail
  if (imageLinks.thumbnail) {
    return imageLinks.thumbnail;
  }

  if (imageLinks.smallThumbnail) {
    return imageLinks.smallThumbnail;
  }

  return undefined;
}

/**
 * Helper function: Generates random price in VND
 * Range: 150,000 - 400,000 VND
 */
function generateRandomPrice(): number {
  const MIN_PRICE = 150000;
  const MAX_PRICE = 400000;

  // Generate random price in steps of 10,000 VND for cleaner numbers
  const priceRange = (MAX_PRICE - MIN_PRICE) / 10000;
  const randomSteps = Math.floor(Math.random() * (priceRange + 1));

  return MIN_PRICE + randomSteps * 10000;
}

/**
 * Helper function: Transforms Google Books volume to BookJsonData format
 */
function transformVolumeToBookData(volume: GoogleBooksVolume): BookJsonData | null {
  const { volumeInfo } = volume;

  // Skip if missing essential fields
  if (!volumeInfo.title) {
    return null;
  }

  // Extract cover image URL first
  const coverImageUrl = extractImageUrl(volumeInfo.imageLinks);

  // Skip if no cover image available
  if (!coverImageUrl) {
    return null;
  }

  const isbn = extractISBN(volumeInfo.industryIdentifiers);
  const year = extractYear(volumeInfo.publishedDate);
  const author = getFirstAuthor(volumeInfo.authors);
  const category = buildCategoryArray(volumeInfo.categories); // Only use categories, exclude printType
  const price = generateRandomPrice(); // Generate random price between 150,000 - 400,000 VND

  return {
    ISBN: isbn,
    Title: volumeInfo.title,
    Author: author,
    Year: year,
    Publisher: volumeInfo.publisher || '',
    category: category,
    language: volumeInfo.language || 'en',
    subtitle: volumeInfo.subtitle || undefined,
    description: volumeInfo.description || undefined,
    coverImageUrl: coverImageUrl,
    price: price,
  };
}

/**
 * Helper function: Delay execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function: to fetch books from Google Books API with specific keyword and startIndex
 */
async function fetchBooksFromGoogleAPI(
  keyword: string,
  startIndex: number
): Promise<BookJsonData[]> {
  const searchParams = new URLSearchParams({
    q: keyword,
    startIndex: startIndex.toString(),
    maxResults: MAX_RESULTS.toString(),
    key: API_KEY,
  });

  const url = `${GOOGLE_BOOKS_API_BASE_URL}?${searchParams.toString()}`;
  console.log(`Fetching books from: ${url} (keyword: "${keyword}", startIndex: ${startIndex})`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GoogleBooksResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log(
        `No books found in API response for keyword: "${keyword}", startIndex: ${startIndex}`
      );
      return [];
    }

    console.log(
      `Fetched ${data.items.length} books from API (keyword: "${keyword}", startIndex: ${startIndex}, Total available: ${data.totalItems})`
    );

    // Transform volumes to book data
    const booksData: BookJsonData[] = [];

    for (const volume of data.items) {
      const bookData = transformVolumeToBookData(volume);
      if (bookData) {
        booksData.push(bookData);
      } else {
        const reason = !volume.volumeInfo.title
          ? 'missing title'
          : !volume.volumeInfo.imageLinks?.thumbnail &&
              !volume.volumeInfo.imageLinks?.smallThumbnail
            ? 'no cover image'
            : 'missing essential fields';
        console.log(`Skipped volume "${volume.volumeInfo.title || 'Unknown'}" - ${reason}`);
      }
    }

    return booksData;
  } catch (error) {
    console.error(
      `Error fetching books from Google Books API (keyword: "${keyword}", startIndex: ${startIndex}):`,
      error
    );
    throw error;
  }
}

/**
 * Saves books data to JSON file (appends to existing data if file exists)
 */
function saveBooksToJson(booksData: BookJsonData[], outputPath: string): void {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  // Read existing data if file exists
  let existingData: BookJsonData[] = [];
  if (fs.existsSync(outputPath)) {
    try {
      const existingContent = fs.readFileSync(outputPath, 'utf-8');
      existingData = JSON.parse(existingContent);
      console.log(`Loaded ${existingData.length} existing books from file`);
    } catch (error) {
      console.warn(`Error reading existing file, starting fresh: ${error}`);
      existingData = [];
    }
  }

  // Create a Set of existing ISBNs for duplicate checking
  const existingISBNs = new Set(
    existingData.map(book => book.ISBN).filter(isbn => isbn && isbn.trim() !== '')
  );

  // Filter out duplicates and merge
  const newBooks = booksData.filter(book => {
    // Skip if ISBN exists and is not empty
    if (book.ISBN && book.ISBN.trim() !== '' && existingISBNs.has(book.ISBN)) {
      console.log(`Skipping duplicate book (ISBN: ${book.ISBN}): ${book.Title}`);
      return false;
    }
    return true;
  });

  // Merge existing and new data
  const mergedData = [...existingData, ...newBooks];

  // Save merged data
  const jsonContent = JSON.stringify(mergedData, null, 4);
  fs.writeFileSync(outputPath, jsonContent, 'utf-8');
  console.log(
    `Saved ${mergedData.length} total books (${existingData.length} existing + ${newBooks.length} new) to ${outputPath}`
  );
}

/**
 * Fetch books with language restriction (for multilingual books)
 */
async function fetchMultilingualBooks(
  keyword: string,
  langRestrict: string,
  startIndex: number
): Promise<BookJsonData[]> {
  const searchParams = new URLSearchParams({
    q: keyword,
    startIndex: startIndex.toString(),
    maxResults: MAX_RESULTS.toString(),
    langRestrict: langRestrict,
    key: API_KEY,
  });

  const url = `${GOOGLE_BOOKS_API_BASE_URL}?${searchParams.toString()}`;
  console.log(`Fetching multilingual books: ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GoogleBooksResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log(`No books found for keyword: "${keyword}", lang: ${langRestrict}`);
      return [];
    }

    console.log(
      `Fetched ${data.items.length} books (keyword: "${keyword}", lang: ${langRestrict})`
    );

    const booksData: BookJsonData[] = [];
    for (const volume of data.items) {
      const bookData = transformVolumeToBookData(volume);
      if (bookData) {
        booksData.push(bookData);
      }
    }

    return booksData;
  } catch (error) {
    console.error(`Error fetching multilingual books:`, error);
    throw error;
  }
}

/**
 * Fetch all multilingual books (Vietnamese, Spanish, Chinese)
 */
async function fetchAllMultilingualBooks(): Promise<BookJsonData[]> {
  console.log('FETCHING MULTILINGUAL BOOKS (Vietnamese, Spanish, Chinese)');

  const allBooks: BookJsonData[] = [];

  for (let i = 0; i < MULTILINGUAL_CONFIGS.length; i++) {
    const config = MULTILINGUAL_CONFIGS[i];
    console.log(
      `\n[${i + 1}/${MULTILINGUAL_CONFIGS.length}] ${config.label} - keyword: "${config.keyword}"`
    );

    let booksCollected = 0;

    for (
      let startIndex = 0;
      startIndex <= 100 && booksCollected < BOOKS_PER_MULTILINGUAL_CONFIG;
      startIndex += 20
    ) {
      try {
        const books = await fetchMultilingualBooks(config.keyword, config.langRestrict, startIndex);

        if (books.length > 0) {
          const booksToAdd = books.slice(0, BOOKS_PER_MULTILINGUAL_CONFIG - booksCollected);
          allBooks.push(...booksToAdd);
          booksCollected += booksToAdd.length;
          console.log(
            `Collected ${booksCollected}/${BOOKS_PER_MULTILINGUAL_CONFIG} for this config`
          );
        }

        if (booksCollected >= BOOKS_PER_MULTILINGUAL_CONFIG) {
          break;
        }

        await delay(DELAY_BETWEEN_REQUESTS_MS);
      } catch (error) {
        console.error(`Error: ${error}`);
        continue;
      }
    }

    console.log(`Completed: ${booksCollected} books for ${config.label}`);

    // Delay between configs
    if (i < MULTILINGUAL_CONFIGS.length - 1) {
      await delay(DELAY_BETWEEN_REQUESTS_MS * 2);
    }
  }

  console.log(`\nMultilingual fetch complete. Total: ${allBooks.length} books`);
  return allBooks;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting to fetch books from Google Books API...');
    console.log(`Search keywords: ${SEARCH_KEYWORDS.map(k => `"${k}"`).join(', ')}`);
    console.log(
      `Start index range: ${MIN_START_INDEX} to ${MAX_START_INDEX} (step: ${START_INDEX_STEP})`
    );
    console.log(`Max results per request: ${MAX_RESULTS}`);
    console.log(`Delay between requests: ${DELAY_BETWEEN_REQUESTS_MS}ms\n`);

    // Collect all books from all requests
    const allBooksData: BookJsonData[] = [];

    // =========================
    // PHASE 1: Fetch multilingual books (Vietnamese, Spanish, Chinese) FIRST
    // =========================
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 1: Fetching multilingual books (Vietnamese, Spanish, Chinese)');
    console.log('='.repeat(60) + '\n');

    try {
      const multilingualBooks = await fetchAllMultilingualBooks();
      if (multilingualBooks.length > 0) {
        allBooksData.push(...multilingualBooks);
        console.log(
          `Added ${multilingualBooks.length} multilingual books. Total so far: ${allBooksData.length}`
        );
      }
    } catch (error) {
      console.error('Error fetching multilingual books:', error);
      console.log('Continuing with English books...');
    }

    // Add delay before starting Phase 2
    await delay(DELAY_BETWEEN_REQUESTS_MS * 2);

    // =========================
    // PHASE 2: Fetch English books
    // =========================
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 2: Fetching English books');
    console.log('='.repeat(60) + '\n');

    const requestsPerKeyword =
      Math.floor((MAX_START_INDEX - MIN_START_INDEX) / START_INDEX_STEP) + 1;
    const totalRequests = SEARCH_KEYWORDS.length * requestsPerKeyword;
    let globalRequestCounter = 0;

    // Loop through each keyword
    for (let keywordIndex = 0; keywordIndex < SEARCH_KEYWORDS.length; keywordIndex++) {
      const keyword = SEARCH_KEYWORDS[keywordIndex];
      console.log(
        `\n${'='.repeat(60)}\n[Keyword ${keywordIndex + 1}/${SEARCH_KEYWORDS.length}] Processing keyword: "${keyword}"\n${'='.repeat(60)}`
      );

      // Loop through startIndex from 0 to 200 with step 20 for each keyword
      for (
        let startIndex = MIN_START_INDEX;
        startIndex <= MAX_START_INDEX;
        startIndex += START_INDEX_STEP
      ) {
        globalRequestCounter++;
        const currentRequest = Math.floor((startIndex - MIN_START_INDEX) / START_INDEX_STEP) + 1;
        console.log(
          `\n[Request ${globalRequestCounter}/${totalRequests}] Keyword: "${keyword}" | startIndex: ${startIndex} (${currentRequest}/${requestsPerKeyword} for this keyword)`
        );

        try {
          // Fetch books from API with current keyword and startIndex
          const booksData = await fetchBooksFromGoogleAPI(keyword, startIndex);

          if (booksData.length > 0) {
            allBooksData.push(...booksData);
            console.log(
              `Added ${booksData.length} books. Total collected so far: ${allBooksData.length}`
            );
          } else {
            console.log(`No books returned for keyword: "${keyword}", startIndex: ${startIndex}`);
          }

          // Add delay between requests to avoid rate limiting (except for the last request of the last keyword)
          if (globalRequestCounter < totalRequests) {
            await delay(DELAY_BETWEEN_REQUESTS_MS);
          }
        } catch (error) {
          console.error(
            `Error fetching books for keyword: "${keyword}", startIndex: ${startIndex}:`,
            error
          );
          // Continue with next request instead of stopping
          console.log('Continuing with next request...');
        }
      }

      // Add a longer delay between keywords to avoid rate limiting
      if (keywordIndex < SEARCH_KEYWORDS.length - 1) {
        console.log(`\nCompleted keyword "${keyword}". Waiting before next keyword...`);
        await delay(DELAY_BETWEEN_REQUESTS_MS * 2); // 2x delay between keywords
      }
    }

    if (allBooksData.length === 0) {
      console.log('\nNo books to save. Exiting.');
      return;
    }

    // Save all collected books to JSON file
    const outputPath = path.join(__dirname, 'data-mock', 'google-books.json');
    saveBooksToJson(allBooksData, outputPath);

    console.log('\n=== Summary ===');
    console.log(`   Total keywords processed: ${SEARCH_KEYWORDS.length}`);
    console.log(`   Total requests made: ${totalRequests}`);
    console.log(`   Total books fetched: ${allBooksData.length}`);
    console.log('   (See details above for existing/new books count)');
    console.log('Fetch completed successfully!');
  } catch (error) {
    console.error('Error during fetch:', error);
    throw error;
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
