export const USER_ROLES = {
  ADMIN: 'Admin',
  LIBRARIAN: 'Librarian',
  READER: 'Reader',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
