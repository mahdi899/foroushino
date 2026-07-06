export interface FaqGroup {
  id: string;
  title: string;
  items: { q: string; a: string }[];
}
