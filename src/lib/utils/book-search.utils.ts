// Utility functions for generating external library search URLs
export interface ExternalLibrary {
  name: string;
  url: string;
}

// Generate search query from book title and author
export function generateBookSearchQuery(title: string, author?: string): string {
  const query = author ? `${title} ${author}` : title;
  return encodeURIComponent(query);
}

// Generate external library search URLs
export function generateExternalLibraryUrls(
  title: string,
  author?: string
): ExternalLibrary[] {
  const query = generateBookSearchQuery(title, author);
  
  // For National Library of Vietnam, use only title for better search results
  const nlvSearchText = title.trim();

  // Generate National Library of Vietnam URL with proper format
  const nlvSearchData = {
    type: 'quick',
    page: 1,
    pageSize: 10,
    request: {
      searchBy: [
        ['option', 'qs'],
        ['keyword', nlvSearchText],
      ],
      sortBy: [['year_pub', 'desc']],
      filterBy: [],
    },
  };
  const nlvDataParam = encodeURIComponent(JSON.stringify(nlvSearchData));

  // Generate Ho Chi Minh City General Science Library URL
  const hcmSearchText = title.split(',')[0].trim().toLowerCase();
  const hcmSearchParam = `FULLTEXT:%${hcmSearchText}%:`;
  const hcmEncodedParam = encodeURIComponent(hcmSearchParam);

  return [
    {
      name: 'Thư viện Quốc gia Việt Nam',
      url: `https://opac.nlv.gov.vn/tim-kiem?data=${nlvDataParam}`,
    },
    {
      name: 'Thư viện Khoa học Tổng hợp TP.HCM',
      url: `https://phucvu.thuvientphcm.gov.vn/Item/SearchAdvanced?SearchText=${hcmEncodedParam}`,
    },
    {
      name: 'Open Library',
      url: `https://openlibrary.org/search?q=${query}`,
    },
    {
      name: 'Google Books',
      url: `https://www.google.com/search?tbm=bks&q=${query}`,
    },
    {
      name: 'Internet Archive',
      url: `https://archive.org/search.php?query=${query}`,
    },
  ];
}

