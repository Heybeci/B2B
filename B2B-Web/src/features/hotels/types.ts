export interface FileDto {
  id: number;
  hotelId: number;
  folderId: number | null;
  kind: "image" | "video" | "logo" | "document";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  hasThumbnail?: boolean;
}

export interface FolderDto {
  id: number;
  hotelId: number;
  parentFolderId: number | null;
  nameTr: string;
  nameEn: string | null;
  nameDe: string | null;
  nameRu: string | null;
  path: string;
  createdAt: string;
}

// Subfolder entries returned in `BrowseResponse.folders` carry an extra
// recursive photo count (see FolderTree.tsx's tree rows) that the
// currently-open folder itself (`BrowseResponse.folder`) does not — this
// mirrors the backend's own `FolderDto` vs `BrowseFolderDto` split
// (B2B.API/Dtos/FolderDtos.cs). Always required: the browse endpoint always
// populates it for every entry in `folders`.
export interface BrowseFolderDto extends FolderDto {
  photoCount: number;
}

export interface HotelDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isPublished?: boolean;
  sortOrder: number;
  logoFile: { id: number; storedFileName: string; mimeType: string } | null;
  photoCount: number;
}

export interface BrowseResponse {
  hotel: { id: number; name: string; slug: string };
  folder: FolderDto | null;
  breadcrumb: { id: number; nameTr: string; nameEn: string | null; nameDe: string | null; nameRu: string | null }[];
  folders: BrowseFolderDto[];
  files: FileDto[];
}

export interface TrashedFolderDto {
  id: number;
  hotelId: number;
  parentFolderId: number | null;
  nameTr: string;
  nameEn: string | null;
  nameDe: string | null;
  nameRu: string | null;
  deletedAt: string;
  deletedByDisplayName: string;
}

export interface TrashedFileDto {
  id: number;
  hotelId: number;
  folderId: number | null;
  originalName: string;
  kind: "image" | "video" | "logo" | "document";
  deletedAt: string;
  deletedByDisplayName: string;
}

export interface TrashListDto {
  folders: TrashedFolderDto[];
  files: TrashedFileDto[];
}

// Response of POST /files/generate-web-optimized — see useGenerateWebOptimizedImages.
export interface GenerateWebOptimizedResultDto {
  totalImages: number;
  processed: number;
  alreadyOptimized: number;
  failed: number;
}

// `previous*`/`current*` fields are best-effort: only the pair relevant to
// entityType+changeType is populated by the backend (e.g. a Folder+Rename row
// only has previousNameXx set, a File+Move row only has previousFolderId) —
// see the API contract this DTO mirrors 1:1 (B2B.API's ChangeHistoryDto).
export interface ChangeHistoryDto {
  id: number;
  entityType: "Folder" | "File";
  entityId: number;
  changeType: "Rename" | "Move";
  changedByDisplayName: string;
  changedAt: string;
  currentNameTr: string | null;
  currentNameEn: string | null;
  currentNameDe: string | null;
  currentNameRu: string | null;
  currentOriginalName: string | null;
  previousNameTr: string | null;
  previousNameEn: string | null;
  previousNameDe: string | null;
  previousNameRu: string | null;
  previousParentFolderId: number | null;
  previousOriginalName: string | null;
  previousFolderId: number | null;
}
