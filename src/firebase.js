import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "saferoute-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "saferoute-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "saferoute-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "0000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:0000000000:web:demo",
};

const defaultEmergencyEmail = import.meta.env.VITE_DEFAULT_EMERGENCY_EMAIL || "";

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_PROJECT_ID
  && import.meta.env.VITE_FIREBASE_PROJECT_ID !== "your-project-id"
  && import.meta.env.VITE_FIREBASE_API_KEY !== "your_firebase_api_key"
);

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

const safeLocalRead = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const safeLocalWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage issues in private browsing or demo mode
  }
};

export const normalizeRole = (roleValue) => {
  const value = String(roleValue || "Student / User").trim();
  const normalized = value.toLowerCase();

  if (normalized.includes("guardian") || normalized.includes("trusted") || normalized.includes("contact")) {
    return "Trusted Contact/Guardian";
  }

  if (normalized.includes("police") || normalized.includes("officer") || normalized.includes("safety")) {
    return "Police/Safety Officer";
  }

  return "Student/User";
};

export const ROLE_VALUES = {
  STUDENT: "Student/User",
  GUARDIAN: "Trusted Contact/Guardian",
  POLICE: "Police/Safety Officer",
};

const emailKey = (email) => String(email || "").trim().toLowerCase();

const mapDoc = (docSnap) => ({ id: docSnap.id, ...docSnap.data() });

const emptyUnsubscribe = () => {};

export const createDemoUserProfile = (email, extras = {}) => ({
  fullName: extras.fullName || "Demo User",
  phone: extras.phone || "+91 00000 00000",
  emergencyEmail: extras.emergencyEmail || defaultEmergencyEmail,
  city: extras.city || "Delhi",
  ageGroup: extras.ageGroup || "18-25",
  gender: extras.gender || "Prefer not to say",
  role: normalizeRole(extras.role || ROLE_VALUES.STUDENT),
  accountType: normalizeRole(extras.role || ROLE_VALUES.STUDENT).toLowerCase(),
  createdAt: new Date().toISOString(),
  email,
  lowerEmail: emailKey(email),
  name: extras.fullName || extras.name || "Demo User",
  profileUpdatedAt: new Date().toISOString(),
  isDemoProfile: true,
});

export const signUpWithEmail = async ({ email, password, profile }) => {
  if (!isFirebaseConfigured) {
    safeLocalWrite("saferoute-demo-user", { email, password, profile });
    return {
      uid: `demo-user-${Date.now()}`,
      email,
      profile: { ...createDemoUserProfile(email, profile), email },
      isDemo: true,
    };
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const userProfile = {
    ...createDemoUserProfile(email, profile),
    email,
    lowerEmail: emailKey(email),
    uid: userCredential.user.uid,
    name: profile?.fullName || profile?.name || email.split("@")[0],
    fullName: profile?.fullName || profile?.name || email.split("@")[0],
    role: normalizeRole(profile?.role || ROLE_VALUES.STUDENT),
    accountType: normalizeRole(profile?.role || ROLE_VALUES.STUDENT).toLowerCase(),
    createdAt: serverTimestamp(),
    profileUpdatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", userCredential.user.uid), userProfile, { merge: true });

  return {
    uid: userCredential.user.uid,
    email: userCredential.user.email,
    profile: userProfile,
    isDemo: false,
  };
};

export const signInWithEmail = async ({ email, password }) => {
  if (!isFirebaseConfigured) {
    const demoUser = safeLocalRead("saferoute-demo-user", null);
    if (!demoUser) {
      throw new Error("No demo account found. Please sign up first.");
    }

    if (demoUser.email !== email || demoUser.password !== password) {
      throw new Error("Incorrect email or password.");
    }

    return {
      uid: demoUser.profile?.uid || `demo-user-${Date.now()}`,
      email,
      profile: demoUser.profile || createDemoUserProfile(email),
      isDemo: true,
    };
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const docRef = doc(db, "users", userCredential.user.uid);
  const snapshot = await getDoc(docRef);
  const profile = snapshot.exists()
    ? snapshot.data()
    : await getUserProfile(userCredential.user.uid, userCredential.user.email);

  return {
    uid: userCredential.user.uid,
    email: userCredential.user.email,
    profile,
    isDemo: false,
  };
};

export const signInWithGoogle = async () => {
  if (!isFirebaseConfigured) {
    throw new Error("Google sign-in requires your Firebase project configuration.");
  }

  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  const user = result.user;
  const docRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(docRef);
  const profile = snapshot.exists()
    ? snapshot.data()
    : {
        ...createDemoUserProfile(user.email || "", {
          fullName: user.displayName || user.email?.split("@")[0],
        }),
        uid: user.uid,
        email: user.email || "",
        fullName: user.displayName || user.email?.split("@")[0] || "SafeRoute user",
        name: user.displayName || user.email?.split("@")[0] || "SafeRoute user",
        role: ROLE_VALUES.STUDENT,
        accountType: ROLE_VALUES.STUDENT.toLowerCase(),
        createdAt: serverTimestamp(),
        profileUpdatedAt: serverTimestamp(),
      };

  if (!snapshot.exists()) {
    await setDoc(docRef, profile, { merge: true });
  }

  return {
    uid: user.uid,
    email: user.email,
    profile,
    isDemo: false,
  };
};

export const resetPasswordWithEmail = async ({ email }) => {
  const trimmedEmail = String(email || "").trim();

  if (!trimmedEmail) {
    throw new Error("Please enter your email address.");
  }

  if (!isFirebaseConfigured) {
    const demoUser = safeLocalRead("saferoute-demo-user", null);
    if (!demoUser || demoUser.email?.toLowerCase() !== trimmedEmail.toLowerCase()) {
      throw new Error("No account found for this email.");
    }

    return {
      sent: true,
      isDemo: true,
      message: "Demo mode: password reset link simulated. Use your saved password to sign in.",
    };
  }

  await sendPasswordResetEmail(auth, trimmedEmail);

  return {
    sent: true,
    isDemo: false,
    message: "Password reset email sent. Please check your inbox.",
  };
};

export const saveUserProfile = async (uid, profileData) => {
  const normalized = {
    ...profileData,
    role: normalizeRole(profileData?.role || ROLE_VALUES.STUDENT),
    accountType: normalizeRole(profileData?.role || ROLE_VALUES.STUDENT).toLowerCase(),
    name: profileData?.fullName || profileData?.name || profileData?.email || "SafeRoute user",
    lowerEmail: emailKey(profileData?.email),
    profileUpdatedAt: serverTimestamp(),
  };

  if (!isFirebaseConfigured) {
    const current = safeLocalRead("saferoute-demo-user", { profile: createDemoUserProfile(profileData.email || "demo@example.com") });
    const updated = {
      ...current,
      email: current.email || profileData.email,
      profile: { ...current.profile, ...normalized },
    };
    safeLocalWrite("saferoute-demo-user", updated);
    return updated.profile;
  }

  const userDoc = doc(db, "users", uid);
  await setDoc(userDoc, normalized, { merge: true });
  return normalized;
};

export const saveVoiceProfile = async (uid, voiceProfile) => {
  if (!uid || !voiceProfile) return;
  if (!isFirebaseConfigured) {
    const current = safeLocalRead("saferoute-demo-user", {});
    safeLocalWrite("saferoute-demo-user", {
      ...current,
      profile: { ...(current.profile || {}), voiceProfile },
    });
    return;
  }

  await setDoc(doc(db, "users", uid), { voiceProfile, profileUpdatedAt: serverTimestamp() }, { merge: true });
};

export const fetchVoiceProfile = async (uid) => {
  if (!uid) return null;
  if (!isFirebaseConfigured) {
    return safeLocalRead("saferoute-demo-user", {})?.profile?.voiceProfile || null;
  }

  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? snapshot.data()?.voiceProfile || null : null;
};

export const getUserProfile = async (uid, fallbackEmail = "demo@example.com") => {
  if (!isFirebaseConfigured) {
    const current = safeLocalRead("saferoute-demo-user", null);
    return current?.profile || createDemoUserProfile(fallbackEmail);
  }

  const docRef = doc(db, "users", uid);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) return snapshot.data();

  const fallbackProfile = {
    uid,
    email: fallbackEmail,
    lowerEmail: emailKey(fallbackEmail),
    name: fallbackEmail.split("@")[0],
    fullName: fallbackEmail.split("@")[0],
    role: ROLE_VALUES.STUDENT,
    accountType: "student/user",
    createdAt: serverTimestamp(),
    profileUpdatedAt: serverTimestamp(),
  };
  await setDoc(docRef, fallbackProfile, { merge: true });
  return { ...fallbackProfile, createdAt: new Date().toISOString(), profileUpdatedAt: new Date().toISOString() };
};

export const logEmergencyEvent = async ({ uid, profile, userLocation, destination, selectedRoute, governmentEmail }) => {
  let guardianUids = [];
  if (isFirebaseConfigured && uid) {
    const connectionsSnap = await getDocs(query(collection(db, "trusted_contacts"), where("studentUid", "==", uid)));
    guardianUids = connectionsSnap.docs.map((docSnap) => docSnap.data()?.guardianUid).filter(Boolean);
  }

  const payload = {
    uid: uid || profile?.uid || "unknown-user",
    fullName: profile?.fullName || "Unknown user",
    email: profile?.email || "unknown@example.com",
    phone: profile?.phone || "",
    city: profile?.city || "",
    role: normalizeRole(profile?.role || ROLE_VALUES.STUDENT),
    destination: destination || "Not specified",
    routeName: selectedRoute?.name || "No active route",
    routeScore: selectedRoute?.score || null,
    userLocation: userLocation || null,
    governmentEmail: governmentEmail || defaultEmergencyEmail,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
    severity: "sos",
    type: "SOS",
    guardianUids,
  };

  if (!isFirebaseConfigured) {
    const storageKey = "saferoute-demo-sos-events";
    const existing = safeLocalRead(storageKey, []);
    safeLocalWrite(storageKey, [payload, ...existing].slice(0, 50));
    return { id: "demo-sos-event", ...payload };
  }

  const ref = await addDoc(collection(db, "sos_events"), {
    ...payload,
    // mark notified flags for demo so dashboards can reflect in-app notification state
    notified: { guardians: true, police: true },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...payload };
};

export const saveTrustedContact = async (uid, contact) => {
  const normalized = {
    ...contact,
    uid,
    userId: uid,
    studentUid: contact.studentUid || uid,
    email: contact.email || "",
    contactEmail: emailKey(contact.email),
    createdAt: new Date().toISOString(),
  };

  if (!isFirebaseConfigured) {
    const storageKey = "saferoute-demo-trusted-contacts";
    const existing = safeLocalRead(storageKey, []);
    const next = [
      ...existing.filter((item) => item.id !== normalized.id),
      normalized,
    ];
    safeLocalWrite(storageKey, next);
    return normalized;
  }

  const nestedId = contact.id || crypto.randomUUID();
  const nestedRef = doc(db, "users", uid, "trusted_contacts", nestedId);
  await setDoc(nestedRef, normalized, { merge: true });

  const topLevelRef = doc(db, "trusted_contacts", nestedId);
  await setDoc(topLevelRef, { ...normalized, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });

  return normalized;
};

export const fetchTrustedContacts = async (uid) => {
  if (!isFirebaseConfigured) {
    const storageKey = "saferoute-demo-trusted-contacts";
    return safeLocalRead(storageKey, []);
  }

  const [nestedSnap, topLevelSnap] = await Promise.all([
    getDocs(query(collection(db, "users", uid, "trusted_contacts"))),
    getDocs(query(collection(db, "trusted_contacts"), where("userId", "==", uid))),
  ]);

  const merged = new Map();
  [...nestedSnap.docs, ...topLevelSnap.docs].forEach((docSnap) => {
    const val = { id: docSnap.id, ...docSnap.data() };
    merged.set(val.id, val);
  });

  return Array.from(merged.values());
};

export const deleteTrustedContact = async (uid, contactId) => {
  if (!isFirebaseConfigured) {
    const storageKey = "saferoute-demo-trusted-contacts";
    const existing = safeLocalRead(storageKey, []);
    safeLocalWrite(storageKey, existing.filter((item) => item.id !== contactId));
    return;
  }

  await deleteDoc(doc(db, "users", uid, "trusted_contacts", contactId));
  try {
    await deleteDoc(doc(db, "trusted_contacts", contactId));
  } catch {
    // Ignore missing top-level doc cleanup errors
  }
};

export const saveCommunityReport = async (uid, report) => {
  const normalized = {
    ...report,
    uid,
    userId: uid,
    user_id: uid,
    createdAt: new Date().toISOString(),
    created_at: report.created_at || new Date().toISOString(),
    moderation: report.moderation || { status: "approved", score: 0, reason: "Standard review" },
    status: report.status || "new",
  };

  if (!isFirebaseConfigured) {
    const storageKey = "saferoute-demo-community-reports";
    const existing = safeLocalRead(storageKey, []);
    const next = [normalized, ...existing.filter((item) => item.id !== normalized.id)];
    safeLocalWrite(storageKey, next);
    return normalized;
  }

  const reportId = report.id || crypto.randomUUID();
  const nestedRef = doc(db, "users", uid, "community_reports", reportId);
  await setDoc(nestedRef, normalized, { merge: true });

  const topLevelRef = doc(db, "community_reports", reportId);
  await setDoc(topLevelRef, { ...normalized, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });

  return normalized;
};

export const fetchCommunityReports = async (uid) => {
  if (!isFirebaseConfigured) {
    const storageKey = "saferoute-demo-community-reports";
    return safeLocalRead(storageKey, []);
  }

  const [nestedSnap, topLevelSnap] = await Promise.all([
    getDocs(query(collection(db, "users", uid, "community_reports"))),
    getDocs(query(collection(db, "community_reports"), where("userId", "==", uid))),
  ]);

  const merged = new Map();
  [...nestedSnap.docs, ...topLevelSnap.docs].forEach((docSnap) => {
    const val = { id: docSnap.id, ...docSnap.data() };
    merged.set(val.id, val);
  });

  return Array.from(merged.values());
};

export const upvoteCommunityReport = async (uid, reportId, currentUpvotes = 0) => {
  if (!isFirebaseConfigured) {
    const storageKey = "saferoute-demo-community-reports";
    const existing = safeLocalRead(storageKey, []);
    safeLocalWrite(
      storageKey,
      existing.map((report) =>
        report.id === reportId ? { ...report, upvotes: (report.upvotes || 0) + 1 } : report
      )
    );
    return;
  }

  const nestedRef = doc(db, "users", uid, "community_reports", reportId);
  const nestedSnapshot = await getDoc(nestedRef);
  const topLevelRef = doc(db, "community_reports", reportId);
  const topLevelSnapshot = await getDoc(topLevelRef);

  const baseData = nestedSnapshot.exists() ? nestedSnapshot.data() : topLevelSnapshot.data() || {};
  const nextValue = (baseData.upvotes || currentUpvotes || 0) + 1;

  await updateDoc(nestedRef, { upvotes: nextValue }).catch(() => {});
  await updateDoc(topLevelRef, { upvotes: nextValue }).catch(() => {});
};

export const logoutUser = async () => {
  if (!isFirebaseConfigured) {
    localStorage.removeItem("saferoute-demo-user");
    return;
  }

  await signOut(auth);
};

export const listenToAuth = (callback, onError = console.error) => {
  if (!isFirebaseConfigured) {
    const demoUser = safeLocalRead("saferoute-demo-user", null);
    callback(demoUser ? { uid: demoUser.profile?.uid || "demo-user-1", email: demoUser.email, profile: demoUser.profile } : null);
    return () => {};
  }

  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }

    try {
      const profile = await getUserProfile(user.uid, user.email || "demo@example.com");
      callback({ uid: user.uid, email: user.email, profile });
    } catch (error) {
      onError(error);
      callback({
        uid: user.uid,
        email: user.email,
        profile: createDemoUserProfile(user.email || "", {
          fullName: user.displayName || user.email?.split("@")[0],
        }),
      });
    }
  });
};

export const subscribeSosEvents = (viewer, callback, onError = console.error) => {
  if (!isFirebaseConfigured) {
    callback(safeLocalRead("saferoute-demo-sos-events", []));
    return emptyUnsubscribe;
  }

  const role = normalizeRole(viewer?.role);
  const constraints = role === ROLE_VALUES.POLICE
    ? [orderBy("createdAt", "desc"), limit(100)]
    : role === ROLE_VALUES.GUARDIAN
    ? [where("guardianUids", "array-contains", viewer.uid), orderBy("createdAt", "desc"), limit(100)]
    : [where("uid", "==", viewer?.uid), orderBy("createdAt", "desc"), limit(100)];
  const sosQuery = query(collection(db, "sos_events"), ...constraints);
  return onSnapshot(sosQuery, (snapshot) => callback(snapshot.docs.map(mapDoc)), onError);
};

export const subscribeCommunityReports = (callback, onError = console.error) => {
  if (!isFirebaseConfigured) {
    callback(safeLocalRead("saferoute-demo-community-reports", []));
    return emptyUnsubscribe;
  }

  const reportsQuery = query(collection(db, "community_reports"), orderBy("createdAt", "desc"), limit(100));
  return onSnapshot(reportsQuery, (snapshot) => callback(snapshot.docs.map(mapDoc)), onError);
};

export const subscribeGuardianConnections = ({ uid, email }, callback, onError = console.error) => {
  if (!isFirebaseConfigured || !uid) {
    callback([]);
    return emptyUnsubscribe;
  }

  const merged = new Map();
  const emit = () => callback(Array.from(merged.values()));

  const byUidQuery = query(collection(db, "trusted_contacts"), where("guardianUid", "==", uid));
  const byEmailQuery = query(collection(db, "trusted_contacts"), where("contactEmail", "==", emailKey(email)));

  const unsubByUid = onSnapshot(
    byUidQuery,
    (snapshot) => {
      snapshot.docs.forEach((docSnap) => merged.set(docSnap.id, mapDoc(docSnap)));
      emit();
    },
    onError
  );

  const unsubByEmail = onSnapshot(
    byEmailQuery,
    (snapshot) => {
      snapshot.docs.forEach((docSnap) => merged.set(docSnap.id, mapDoc(docSnap)));
      emit();
    },
    onError
  );

  return () => {
    unsubByUid();
    unsubByEmail();
  };
};

export const subscribeActiveJourneysForStudents = (studentUids, callback, onError = console.error) => {
  if (!isFirebaseConfigured) {
    callback([]);
    return emptyUnsubscribe;
  }

  const ids = [...new Set((studentUids || []).filter(Boolean))];
  if (!ids.length) {
    callback([]);
    return emptyUnsubscribe;
  }

  const chunks = [];
  for (let index = 0; index < ids.length; index += 10) {
    chunks.push(ids.slice(index, index + 10));
  }

  const merged = new Map();
  const unsubscribers = chunks.map((chunk) =>
    onSnapshot(
      query(collection(db, "active_journeys"), where("studentUid", "in", chunk)),
      (snapshot) => {
        snapshot.docs.forEach((docSnap) => merged.set(docSnap.id, mapDoc(docSnap)));
        callback(Array.from(merged.values()));
      },
      onError
    )
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

export const connectGuardianToStudent = async ({ guardianUid, guardianEmail, studentEmail, relation = "Guardian" }) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }

  const normalizedStudentEmail = emailKey(studentEmail);
  const userQuery = query(collection(db, "users"), where("lowerEmail", "==", normalizedStudentEmail), limit(1));
  const snapshot = await getDocs(userQuery);

  if (snapshot.empty) {
    throw new Error("No SafeRoute student account was found for that email.");
  }

  const studentDoc = snapshot.docs[0];
  const student = studentDoc.data();
  if (normalizeRole(student.role) !== ROLE_VALUES.STUDENT) {
    throw new Error("That account is not a Student/User account.");
  }

  const connectionId = `${studentDoc.id}_${guardianUid}`;
  const payload = {
    id: connectionId,
    uid: studentDoc.id,
    userId: studentDoc.id,
    studentUid: studentDoc.id,
    studentEmail: student.email,
    studentName: student.fullName || student.name || student.email,
    name: student.fullName || student.name || student.email,
    relation,
    status: "Active",
    guardianUid,
    guardianEmail: emailKey(guardianEmail),
    contactEmail: emailKey(guardianEmail),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "trusted_contacts", connectionId), payload, { merge: true });
  await setDoc(doc(db, "users", studentDoc.id, "trusted_contacts", connectionId), payload, { merge: true });
  return { ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
};

export const upsertActiveJourney = async (uid, profile, journeyData) => {
  if (!isFirebaseConfigured || !uid) return null;

  const connectionsSnap = await getDocs(query(collection(db, "trusted_contacts"), where("studentUid", "==", uid)));
  const guardianUids = connectionsSnap.docs
    .map((docSnap) => docSnap.data()?.guardianUid)
    .filter(Boolean);

  const payload = {
    studentUid: uid,
    studentName: profile?.fullName || profile?.name || profile?.email || "Student",
    studentEmail: profile?.email || "",
    guardianUids,
    status: journeyData?.status || "location-shared",
    destination: journeyData?.destination || "",
    routeName: journeyData?.routeName || "",
    routeScore: journeyData?.routeScore ?? null,
    userLocation: journeyData?.userLocation || null,
    locationShared: Boolean(journeyData?.userLocation),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "active_journeys", uid), payload, { merge: true });
  return payload;
};

export const updateEmergencyEventStatus = async (eventId, status) => {
  if (!isFirebaseConfigured) {
    const storageKey = "saferoute-demo-sos-events";
    const events = safeLocalRead(storageKey, []);
    safeLocalWrite(storageKey, events.map((event) => event.id === eventId ? { ...event, status, updatedAt: new Date().toISOString() } : event));
    return;
  }
  await updateDoc(doc(db, "sos_events", eventId), {
    status,
    updatedAt: serverTimestamp(),
  });
};

export const updateEmergencyEventLocation = async (eventId, userLocation) => {
  if (!eventId || !userLocation) return;
  if (!isFirebaseConfigured) {
    const storageKey = "saferoute-demo-sos-events";
    const events = safeLocalRead(storageKey, []);
    safeLocalWrite(storageKey, events.map((event) => event.id === eventId ? { ...event, userLocation, updatedAt: new Date().toISOString() } : event));
    return;
  }
  await updateDoc(doc(db, "sos_events", eventId), {
    userLocation,
    updatedAt: serverTimestamp(),
  });
};

export const updateCommunityReportStatus = async (reportId, status) => {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, "community_reports", reportId), {
    status,
    "moderation.status": status,
    updatedAt: serverTimestamp(),
  });
};
