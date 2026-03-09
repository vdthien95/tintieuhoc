/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  TeacherProfile, 
  ClassInfo, 
  Student, 
  ProgressState, 
  AIProgressAnalysis, 
  StudentProgress 
} from "../types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Teacher Auth
export const registerTeacher = async (profile: TeacherProfile) => {
  const { email, password, ...rest } = profile;
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Store profile in Firestore
  await setDoc(doc(db, "teachers", email), {
    ...rest,
    email,
    password, // Storing for convenience, though Auth handles it
    createdAt: serverTimestamp()
  });
  
  return user;
};

export const loginTeacher = async (email: string, password: string) => {
  await signInWithEmailAndPassword(auth, email, password);
  const docRef = doc(db, "teachers", email);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  throw new Error("Không tìm thấy thông tin giáo viên");
};

export const forgotPasswordTeacher = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const updateTeacherPassword = async (email: string, newPassword: string) => {
  // Update in Firestore
  const docRef = doc(db, "teachers", email);
  await updateDoc(docRef, { password: newPassword });
  
  // Update in Auth if currently logged in
  if (auth.currentUser && auth.currentUser.email === email) {
    const { updatePassword } = await import("firebase/auth");
    await updatePassword(auth.currentUser, newPassword);
  }
};

// Class Management
export const getTeacherClasses = async (email: string): Promise<ClassInfo[]> => {
  const q = query(collection(db, "classes"), where("teacherEmail", "==", email));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as ClassInfo);
};

export const createClass = async (classInfo: ClassInfo) => {
  const { id, name, code, grade, teacherEmail } = classInfo;
  await setDoc(doc(db, "classes", id), {
    id,
    name,
    code,
    grade,
    teacherEmail,
    createdAt: serverTimestamp()
  });
};

export const deleteClass = async (id: string) => {
  await deleteDoc(doc(db, "classes", id));
};

// Student Management
export const getStudentsByClass = async (classCode: string): Promise<{ students: StudentProgress[], classInfo: any }> => {
  const q = query(collection(db, "students"), where("classCode", "==", classCode));
  const querySnapshot = await getDocs(q);
  
  const classRef = query(collection(db, "classes"), where("code", "==", classCode));
  const classSnap = await getDocs(classRef);
  const classInfo = classSnap.empty ? null : classSnap.docs[0].data();

  return {
    students: querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        student: {
          name: data.name,
          classCode: data.classCode,
          grade: data.grade || (classInfo ? (classInfo as any).grade : 4),
          className: data.className || (classInfo ? (classInfo as any).name : ""),
          schoolName: data.schoolName || "",
          teacherName: data.teacherName || ""
        } as Student,
        progress: data.progress || { theory: [], practice: [], challenges: [], problem_history: [] },
        analysis: data.analysis || undefined
      };
    }),
    classInfo
  };
};

export const studentLogin = async (name: string, classCode: string): Promise<StudentProgress | null> => {
  const q = query(collection(db, "students"), where("name", "==", name), where("classCode", "==", classCode));
  const querySnapshot = await getDocs(q);
  
  let studentData;
  if (querySnapshot.empty) {
    const id = `${classCode}_${name}_${Date.now()}`;
    studentData = {
      name,
      classCode,
      progress: { theory: [], practice: [], challenges: [], problem_history: [] },
      analysis: null,
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, "students", id), studentData);
  } else {
    studentData = querySnapshot.docs[0].data();
  }

  // Get class and teacher info
  const classQ = query(collection(db, "classes"), where("code", "==", classCode));
  const classSnap = await getDocs(classQ);
  if (classSnap.empty) throw new Error("Lớp học không tồn tại");
  const classInfo = classSnap.docs[0].data();

  const teacherDoc = await getDoc(doc(db, "teachers", classInfo.teacherEmail));
  if (!teacherDoc.exists()) throw new Error("Không tìm thấy thông tin giáo viên");
  const teacher = teacherDoc.data();

  return {
    student: {
      name: studentData.name,
      className: classInfo.name,
      grade: classInfo.grade,
      schoolName: teacher.schoolName,
      teacherName: teacher.name,
      classCode: studentData.classCode
    } as Student,
    progress: studentData.progress,
    analysis: studentData.analysis || undefined
  };
};

export const syncStudentProgress = async (name: string, classCode: string, progress: any, analysis: any) => {
  const q = query(collection(db, "students"), where("name", "==", name), where("classCode", "==", classCode));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const studentDoc = querySnapshot.docs[0];
    await updateDoc(doc(db, "students", studentDoc.id), {
      progress,
      analysis,
      updatedAt: serverTimestamp()
    });
  }
};
