import { getStorage } from "firebase/storage";
import { firebaseApp } from "./config";

export const firebaseStorage = getStorage(firebaseApp);
