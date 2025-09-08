// hooks/useUploadImage.ts
import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";
import { storage } from "../firebase"; // Assuming this path is correct

export async function uploadLogoImage(file: File, uid:string): Promise<string> {
  const fileRef = ref(storage, `${uid}/logos/logo_${Date.now()}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export async function uploadLinkImage(file: File, uid:string): Promise<string> {
  const fileRef = ref(storage, `Links/${uid}/Links_${Date.now()}`);  // 경로 수정
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  if (!imageUrl || imageUrl.startsWith('/')) { // Don't try to delete local or default images
    return;
  }
  try {
    const imageRef = ref(storage, imageUrl); // Firebase Storage can interpret full download URLs into references
    await deleteObject(imageRef);
    console.log('Image deleted from storage:', imageUrl);
  } catch (error) {
    console.error('Error deleting image from storage:', imageUrl, error);
    // You might want to handle specific errors, e.g., if the file doesn't exist (e.g., 'storage/object-not-found')
  }
}


