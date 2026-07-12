// On web, FormData needs a real Blob — picker URIs are typically blob: or data: URIs
// that we have to re-fetch to get bytes we can attach.
export async function appendFileToFormData(
  form: FormData,
  field: string,
  asset: { uri: string; name: string; mimeType?: string },
) {
  const res = await fetch(asset.uri);
  const blob = await res.blob();
  form.append(field, blob, asset.name);
}
