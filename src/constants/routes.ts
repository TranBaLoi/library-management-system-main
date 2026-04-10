// Route constants for the application
export const ROUTES = {
  // Auth routes
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    CHANGE_PASSWORD: '/change-password',
  },

  // Interest selection route (for first login)
  SELECT_INTERESTS: '/select-interests',

  // Dashboard routes
  DASHBOARD: {
    // Common routes
    HOME: '/dashboard',

    // Profile routes
    PROFILE: '/dashboard/profile',

    // Books routes
    BOOKS: '/dashboard/books',
    BOOKS_ADD: '/dashboard/books/add',
    BOOKS_EDIT: '/dashboard/books/edit',

    // Book Copies routes
    BOOKS_COPIES: '/dashboard/books/copies',
    BOOKS_COPIES_ADD: '/dashboard/books/copies/add',
    BOOKS_COPIES_EDIT: '/dashboard/books/copies/edit',

    // Book Editions routes
    BOOKS_EDITIONS: '/dashboard/books/editions',
    BOOKS_EDITIONS_ADD: '/dashboard/books/editions/add',
    BOOKS_EDITIONS_EDIT: '/dashboard/books/editions/edit',

    // Borrowing routes
    BORROW_REQUESTS: '/dashboard/borrow-requests',
    BORROW_RECORDS: '/dashboard/borrow-records',
    BORROW_RECORDS_ADD: '/dashboard/borrow-records/add',
    BORROW_RECORDS_RETURN: '/dashboard/borrow-records/return',

    // Authors routes
    AUTHORS: '/dashboard/authors',
    AUTHORS_ADD: '/dashboard/authors/add',
    AUTHORS_EDIT: '/dashboard/authors/edit',

    // Categories routes
    CATEGORIES: '/dashboard/categories',
    CATEGORIES_ADD: '/dashboard/categories/add',
    CATEGORIES_EDIT: '/dashboard/categories/edit',

    // Users routes
    USERS: '/dashboard/users',
    USERS_ADD: '/dashboard/users/add',
    USERS_EDIT: '/dashboard/users/edit',

    // Policies routes
    POLICIES: '/dashboard/policies',
    POLICIES_ADD: '/dashboard/policies/add',
    POLICIES_EDIT: '/dashboard/policies/edit',

    // Violations routes
    VIOLATIONS: '/dashboard/violations',
  },

  // Common routes
  HOME: '/',
  SEARCH: '/search',
  BOOK_DETAIL: '/books/:id',
  FAVORITE: '/favorite',
  MY_EBOOKS: '/my-ebooks',
  MY_BORROW_REQUESTS: '/my-borrow-requests',
  MY_BORROW_RECORDS: '/my-borrow-records',
  MY_VIOLATIONS: '/my-violations',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  LOGOUT: '/logout',
} as const;

// Type for route values
export type RouteValue =
  | (typeof ROUTES)[keyof typeof ROUTES]
  | (typeof ROUTES.DASHBOARD)[keyof typeof ROUTES.DASHBOARD];
