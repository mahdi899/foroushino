/** Shared media library types (kept outside "use server" modules for Next.js bundler). */

export interface AdminMediaItem {
  id: number;
  url: string;
  persistSrc: string;
  legacyPath?: string | null;
  label: string;
  category: string;
  mime?: string | null;
}

export interface AdminMediaPageResult {
  items: AdminMediaItem[];
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  error?: string;
}

export interface AdminMediaTrashItem extends AdminMediaItem {
  deleted_at: string;
  purge_at: string;
}
