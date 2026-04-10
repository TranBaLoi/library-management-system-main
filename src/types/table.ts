export type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  textAlign?: 'left' | 'center' | 'right';
};
