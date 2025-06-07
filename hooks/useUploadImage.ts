import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";

export async function uploadLogoImage(file: File): Promise<string> {
  const fileRef = ref(storage, `logos/logo_${Date.now()}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
