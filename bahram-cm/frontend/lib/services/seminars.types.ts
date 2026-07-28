export type PublicSeminarGalleryItem = {
  type: 'image' | 'video';
  aspect: '16:9' | '9:16';
  src: string;
  alt: string | null;
  poster: string | null;
};

export type PublicSeminarSliderItem = {
  src: string;
  alt: string | null;
};

export type PublicSeminar = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  cover_image_mobile: string | null;
  date: string | null;
  location: string | null;
  price: number | null;
  sale_price: number | null;
  effective_price: number | null;
  capacity: number | null;
  attendees_count: number;
  remaining_seats: number | null;
  is_full: boolean;
  is_ended: boolean;
  ended_at: string | null;
  gallery: PublicSeminarGalleryItem[];
  gallery_slider: PublicSeminarSliderItem[];
  product_slug: string | null;
  is_purchasable: boolean;
  already_purchased?: boolean;
};
