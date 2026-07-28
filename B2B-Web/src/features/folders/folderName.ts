import type { Locale } from "../../i18n/translations";

export interface FolderNames {
  nameTr: string;
  nameEn: string | null;
  nameDe: string | null;
  nameRu: string | null;
}

export function resolveFolderName(folder: FolderNames, locale: Locale): string {
  const byLocale: Record<Locale, string | null> = {
    tr: folder.nameTr,
    en: folder.nameEn,
    de: folder.nameDe,
    ru: folder.nameRu,
  };
  return byLocale[locale]?.trim() ? byLocale[locale]! : folder.nameTr;
}

export function folderNamesFromSingle(name: string): FolderNames {
  return { nameTr: name, nameEn: null, nameDe: null, nameRu: null };
}

export function emptyFolderNames(): FolderNames {
  return { nameTr: "", nameEn: null, nameDe: null, nameRu: null };
}
