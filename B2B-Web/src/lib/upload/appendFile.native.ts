// React Native's FormData accepts a {uri,name,type} descriptor and streams the
// file directly from disk — no need to read it into memory first.
export async function appendFileToFormData(
  form: FormData,
  field: string,
  asset: { uri: string; name: string; mimeType?: string },
) {
  form.append(field, {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType ?? "application/octet-stream",
  } as unknown as Blob);
}
