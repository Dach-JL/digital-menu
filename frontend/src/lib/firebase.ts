import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdo5vzeL1wDONFs1lIELMn4MhAjeIPfuA",
  authDomain: "digital-menu-2bf18.firebaseapp.com",
  projectId: "digital-menu-2bf18",
  storageBucket: "digital-menu-2bf18.firebasestorage.app",
  messagingSenderId: "161321259531",
  appId: "1:161321259531:web:63ead2457cf2b3d5c36d0e",
  measurementId: "G-ZM7EFWSJCC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

/**
 * Sends a notification to Firestore for admin visibility.
 */
export const notifyAdmin = async (type: 'order' | 'call', data: any) => {
  try {
    await addDoc(collection(db, "notifications"), {
      type,
      ...data,
      read: false,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Firebase notification failed", error);
  }
};

/**
 * Subscribes to new notifications in real-time.
 */
export const subscribeToNotifications = (callback: (notification: any) => void) => {
  const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        callback({ id: change.doc.id, ...change.doc.data() });
      }
    });
  });
};

export { app, analytics, db };
