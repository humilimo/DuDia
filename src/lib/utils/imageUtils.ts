import * as ImageManipulator from "expo-image-manipulator";

export async function uriToResizedDataUrl(uri: string, maxSize = 320): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxSize, height: maxSize } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (result.base64) {
    return `data:image/jpeg;base64,${result.base64}`;
  }
  return uri;
}
