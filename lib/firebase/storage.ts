import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

export async function uploadActivityPhoto(
  activityId: string,
  file: File
): Promise<string> {
  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `activities/${activityId}/${fileName}`);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, `avatars/${userId}`);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

export async function deleteFile(filePath: string): Promise<void> {
  const storageRef = ref(storage, filePath);
  await deleteObject(storageRef);
}
