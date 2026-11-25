import { shopFetch } from "./shop-session";

export interface ShopAlbumLink {
  label: string;
  url: string;
  provider?: string;
}

export interface ShopAlbumSummary {
  id: string;
  title: string;
  kind: string;
  eventDate: string | null;
  note?: string | null;
  links: ShopAlbumLink[];
  coverUrl: string | null;
  photoCount: number;
  publishedAt?: string | null;
  isNew?: boolean;
}

export interface ShopAlbumPhoto {
  id: string;
  filename?: string;
  /** Ảnh lớn (URL ký có hạn) */
  url: string;
  /** Ảnh nhỏ cho lưới */
  thumbUrl: string;
  width?: number | null;
  height?: number | null;
}

export interface ShopAlbumDetail extends ShopAlbumSummary {
  photos: ShopAlbumPhoto[];
}

/** direction "out" = cửa hàng gửi cho khách, "in" = khách gửi cửa hàng */
export interface ShopMessage {
  id: string;
  direction: "in" | "out";
  body: string;
  createdAt: string;
  albumId?: string | null;
}

export interface ShopUnread {
  messages: number;
  albums: number;
}

export const fetchMyAlbums = (slug: string) => shopFetch<ShopAlbumSummary[]>(slug, "/me/albums");
export const fetchMyAlbum = (slug: string, id: string) => shopFetch<ShopAlbumDetail>(slug, `/me/albums/${encodeURIComponent(id)}`);
export const fetchMyUnread = (slug: string) => shopFetch<ShopUnread>(slug, "/me/unread");
export const fetchMyMessages = (slug: string) => shopFetch<ShopMessage[]>(slug, "/me/messages");
export const sendMyMessage = (slug: string, body: string) =>
  shopFetch<ShopMessage>(slug, "/me/messages", { method: "POST", body: JSON.stringify({ body }) });
