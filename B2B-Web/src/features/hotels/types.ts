export interface FileDto {
  id: number;
  hotelId: number;
  folderId: number | null;
  kind: "image" | "video" | "logo" | "document";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface FolderDto {
  id: number;
  hotelId: number;
  parentFolderId: number | null;
  name: string;
  path: string;
  createdAt: string;
}

export interface HotelDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isPublished?: boolean;
  sortOrder: number;
  logoFile: { id: number; storedFileName: string; mimeType: string } | null;
}

export interface BrowseResponse {
  hotel: { id: number; name: string; slug: string };
  folder: FolderDto | null;
  breadcrumb: { id: number; name: string }[];
  folders: FolderDto[];
  files: FileDto[];
}
