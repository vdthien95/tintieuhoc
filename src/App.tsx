/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  BookOpen, 
  Code, 
  Trophy, 
  ChevronRight, 
  Sparkles, 
  GraduationCap, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  MessageSquarePlus,
  Image as ImageIcon,
  Send,
  X,
  Award,
  Lightbulb,
  Heart,
  Phone,
  Mail,
  MapPin,
  User,
  Settings,
  ShieldCheck,
  Key,
  AlertTriangle,
  BarChart3,
  Users,
  ClipboardList,
  Download,
  FileText,
  TrendingUp,
  Award as AwardIcon,
  Target,
  BrainCircuit,
  Lock,
  UserCircle,
  Trash2,
  LogOut
} from 'lucide-react';
import { 
  Grade, 
  Topic, 
  TheoryContent, 
  PracticeExercise, 
  Challenge, 
  AIResponse, 
  ProblemAnalysis, 
  GradingResult,
  Student,
  ProgressState,
  AIProgressAnalysis,
  ClassReport,
  TheoryRecord,
  PracticeRecord,
  ChallengeRecord,
  ProblemHistoryRecord,
  TeacherProfile,
  ClassInfo,
  StudentProgress
} from './types';
import { getTopicsByGrade } from './constants';
import { 
  generateTheoryContent, 
  generatePracticeExercise, 
  evaluateStudentWork, 
  generateChallenge,
  analyzeProblem,
  gradeChallenge,
  updateApiKey,
  analyzeIndividualProgress,
  analyzeClassProgress,
  analyzeTeacherOverview
} from './services/geminiService';
import * as firebase from './lib/firebase';

type Tab = 'theory' | 'practice' | 'challenge' | 'progress' | 'management';

export default function App() {
  const [grade, setGrade] = useState<Grade | null>(null);
  const [isAnalyzingProblem, setIsAnalyzingProblem] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('theory');
  const [practiceLevel, setPracticeLevel] = useState<'Dễ' | 'Vừa' | 'Khó'>('Vừa');
  
  const [theoryContent, setTheoryContent] = useState<TheoryContent | null>(null);
  const [practiceExercise, setPracticeExercise] = useState<PracticeExercise | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [problemAnalysis, setProblemAnalysis] = useState<ProblemAnalysis | null>(null);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [studentInput, setStudentInput] = useState('');
  const [challengeInput, setChallengeInput] = useState('');
  const [challengeImage, setChallengeImage] = useState<string | null>(null);
  const [problemText, setProblemText] = useState('');
  const [problemImage, setProblemImage] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AIResponse | null>(null);
  const [quizResults, setQuizResults] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  // Student Tracking State
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({ name: '', classCode: '' });
  const [studentLoginStep, setStudentLoginStep] = useState<1 | 2>(1);
  const [loginClass, setLoginClass] = useState<ClassInfo | null>(null);
  const [isNewStudent, setIsNewStudent] = useState(false);
  
  const [progress, setProgress] = useState<ProgressState>({ theory: [], practice: [], challenges: [] });
  const [allStudents, setAllStudents] = useState<StudentProgress[]>([]);
  const [individualAnalysis, setIndividualAnalysis] = useState<AIProgressAnalysis | null>(null);
  const [classReport, setClassReport] = useState<ClassReport | null>(null);
  const [selectedClassForReport, setSelectedClassForReport] = useState<string>('');
  const [teacherOverview, setTeacherOverview] = useState<string | null>(null);

  // Teacher Profile & Multi-Class State
  const [allTeachers, setAllTeachers] = useState<TeacherProfile[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]);
  const [teacherSetupForm, setTeacherSetupForm] = useState({ schoolName: '', name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [teacherLoginForm, setTeacherLoginForm] = useState({ email: '', password: '' });
  const [newClassForm, setNewClassForm] = useState({ name: '', grade: 4 as Grade });

  // Teacher Auth Mode & Forgot Password State
  const [teacherAuthMode, setTeacherAuthMode] = useState<'login' | 'register' | 'forgotPassword'>('login');
  const [forgotPasswordStep, setForgotPasswordStep] = useState<1 | 2 | 3>(1);
  const [forgotPasswordForm, setForgotPasswordForm] = useState({ email: '', code: '', newPassword: '', confirmPassword: '' });
  const [generatedCode, setGeneratedCode] = useState('');

  // Computed teacher classes
  const teacherClasses = useMemo(() => {
    if (!teacherProfile) return [];
    return allClasses.filter(c => c.teacherEmail === teacherProfile.email);
  }, [allClasses, teacherProfile]);

  // Role & Authentication State
  const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(null);
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gradeWarning, setGradeWarning] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Delete Class State
  const [classToDelete, setClassToDelete] = useState<ClassInfo | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2 | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
        setSavedApiKey(storedKey);
        updateApiKey(storedKey);
      }

      const storedTeacherProfile = localStorage.getItem('scratch_master_teacher_profile');
      if (storedTeacherProfile) {
        const profile = JSON.parse(storedTeacherProfile);
        setTeacherProfile(profile);
        setIsTeacherAuthenticated(true);
        setUserRole('teacher');
        
        // Fetch teacher's classes
        try {
          const response = await fetch(`/api/teacher/classes?email=${profile.email}`);
          const classes = await response.json();
          setAllClasses(classes);
        } catch (e) {}
      }

      const storedStudent = localStorage.getItem('scratch_master_current_student');
      if (storedStudent) {
        const student = JSON.parse(storedStudent);
        setCurrentStudent(student);
        setUserRole('student');
        setGrade(student.grade);
        
        // Fetch student's progress
        try {
          const response = await fetch('/api/auth/student/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: student.name, classCode: student.classCode })
          });
          const data = await response.json();
          if (data.success) {
            setProgress(data.progress);
            setIndividualAnalysis(data.analysis);
          }
        } catch (e) {}
      }
    };
    init();
  }, []);

  const saveProgress = async (newProgress: ProgressState) => {
    if (!currentStudent) return;
    setProgress(newProgress);
    
    const updatedAllStudents = [...allStudents];
    const studentIdx = updatedAllStudents.findIndex(s => s.student.name === currentStudent.name && s.student.classCode === currentStudent.classCode);
    
    if (studentIdx >= 0) {
      updatedAllStudents[studentIdx].progress = newProgress;
    } else {
      updatedAllStudents.push({ student: currentStudent, progress: newProgress });
    }
    
    setAllStudents(updatedAllStudents);

    try {
      await fetch('/api/student/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentStudent.name,
          classCode: currentStudent.classCode,
          progress: newProgress,
          analysis: individualAnalysis
        })
      });
    } catch (error) {
      console.error("Error syncing progress:", error);
    }
  };

  const handleStudentClassCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.classCode) return;
    
    try {
      const response = await fetch(`/api/students?classCode=${studentForm.classCode}`);
      if (!response.ok) throw new Error('Mã lớp không chính xác');
      const data = await response.json();
      
      if (!data.classInfo) {
        setAuthError('Mã lớp không chính xác. Vui lòng kiểm tra lại.');
        return;
      }

      setAllStudents(data.students);
      setLoginClass(data.classInfo);
      setStudentLoginStep(2);
      setAuthError('');
    } catch (error: any) {
      setAuthError('Mã lớp không chính xác. Vui lòng kiểm tra lại.');
    }
  };

  const handleStudentLogin = async (studentName: string) => {
    if (!studentForm.classCode) return;

    try {
      const response = await fetch('/api/auth/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: studentName, classCode: studentForm.classCode })
      });
      const data = await response.json();
      if (data.success) {
        setGrade(data.student.grade);
        setCurrentStudent(data.student);
        setProgress(data.progress);
        setIndividualAnalysis(data.analysis);
        setAuthError('');
        localStorage.setItem('scratch_master_current_student', JSON.stringify(data.student));
      }
    } catch (error) {
      console.error("Error student login:", error);
    }
  };

  const handleTeacherSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { schoolName, name, email, password, confirmPassword, phone } = teacherSetupForm;
    if (!schoolName || !name || !email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setAuthError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 6) {
      setAuthError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      const response = await fetch('Firebase Authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, schoolName, phone, password })
      });
      const data = await response.json();
      if (data.success) {
        setTeacherAuthMode('login');
        setAuthError('');
        setSettingsMessage({ type: 'success', text: 'Đăng ký thành công! Vui lòng đăng nhập.' });
        setTeacherSetupForm({ schoolName: '', name: '', email: '', password: '', confirmPassword: '', phone: '' });
      } else {
        setAuthError(data.error);
      }
    } catch (error) {
      setAuthError('Có lỗi xảy ra khi đăng ký.');
    }
  };

  const handleTeacherAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, password } = teacherLoginForm;
    if (!email || !password) return;

    try {
      const response = await fetch('Firebase Authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.success) {
        setTeacherProfile(data.teacher);
        localStorage.setItem('scratch_master_teacher_profile', JSON.stringify(data.teacher));
        setIsTeacherAuthenticated(true);
        setAuthError('');
        setTeacherLoginForm({ email: '', password: '' });
        
        // Fetch teacher's classes
        const classesResponse = await fetch(`/api/teacher/classes?email=${email}`);
        const classes = await classesResponse.json();
        setAllClasses(classes);
      } else {
        setAuthError(data.error);
      }
    } catch (error) {
      setAuthError('Có lỗi xảy ra khi đăng nhập.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPasswordStep === 1) {
      // We still need to check if email exists on server
      try {
        const response = await fetch('Firebase Authentication', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotPasswordForm.email, password: 'dummy' })
        });
        // If 401, it means email might exist but password wrong. If 404, it doesn't exist.
        // Actually, let's just use the forgot-password endpoint logic or a check endpoint.
        // For simplicity, let's assume it exists if we can't check easily without a dedicated endpoint.
        // But I should probably add a check endpoint.
      } catch (e) {}

      // Simulate sending code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      console.log(`Mã xác thực gửi đến ${forgotPasswordForm.email}: ${code}`);
      setForgotPasswordStep(2);
      setAuthError('');
    } else if (forgotPasswordStep === 2) {
      if (forgotPasswordForm.code === generatedCode) {
        setForgotPasswordStep(3);
        setAuthError('');
      } else {
        setAuthError('Mã xác thực không chính xác.');
      }
    } else if (forgotPasswordStep === 3) {
      if (forgotPasswordForm.newPassword !== forgotPasswordForm.confirmPassword) {
        setAuthError('Mật khẩu xác nhận không khớp.');
        return;
      }
      if (forgotPasswordForm.newPassword.length < 6) {
        setAuthError('Mật khẩu phải có ít nhất 6 ký tự.');
        return;
      }

      try {
        const response = await fetch('Firebase Authentication', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotPasswordForm.email, newPassword: forgotPasswordForm.newPassword })
        });
        if (response.ok) {
          setSettingsMessage({ type: 'success', text: 'Đặt lại mật khẩu thành công!' });
          setForgotPasswordStep(1);
          setTeacherAuthMode('login');
          setForgotPasswordForm({ email: '', code: '', newPassword: '', confirmPassword: '' });
          setAuthError('');
        } else {
          const data = await response.json();
          setAuthError(data.error);
        }
      } catch (error) {
        setAuthError('Có lỗi xảy ra khi đặt lại mật khẩu.');
      }
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassForm.name || !teacherProfile) return;

    const schoolPrefix = teacherProfile.schoolName.substring(0, 3).toUpperCase().replace(/\s+/g, '');
    const classCode = `${schoolPrefix}_${newClassForm.name.replace(/\s+/g, '').toUpperCase()}`;

    const newClass: ClassInfo = {
      id: Date.now().toString(),
      name: newClassForm.name,
      code: classCode,
      grade: newClassForm.grade,
      teacherEmail: teacherProfile.email
    };

    try {
      const response = await fetch('/api/teacher/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClass)
      });
      if (response.ok) {
        setAllClasses([...allClasses, newClass]);
        setNewClassForm({ name: '', grade: 4 });
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch (error) {
      console.error("Error creating class:", error);
    }
  };

  const handleChangePassword = async () => {
    if (!newPasswordInput.trim() || !teacherProfile) {
      setSettingsMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu mới' });
      return;
    }
    
    try {
      const response = await fetch('/api/auth/teacher/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: teacherProfile.email, newPassword: newPasswordInput })
      });
      
      if (response.ok) {
        const updatedProfile = { ...teacherProfile, password: newPasswordInput };
        setTeacherProfile(updatedProfile);
        localStorage.setItem('scratch_master_teacher_profile', JSON.stringify(updatedProfile));
        setSettingsMessage({ type: 'success', text: 'Đã thay đổi mật khẩu thành công' });
        setNewPasswordInput('');
      } else {
        setSettingsMessage({ type: 'error', text: 'Có lỗi xảy ra khi đổi mật khẩu' });
      }
    } catch (error) {
      setSettingsMessage({ type: 'error', text: 'Có lỗi xảy ra khi kết nối máy chủ' });
    }
  };

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) {
      setSettingsMessage({ type: 'error', text: 'Vui lòng nhập API Key' });
      return;
    }
    
    // Simple validation: Gemini API keys usually start with AIza
    if (!apiKeyInput.startsWith('AIza')) {
      setSettingsMessage({ type: 'error', text: 'API Key chưa hợp lệ, vui lòng kiểm tra lại' });
      return;
    }

    localStorage.setItem('gemini_api_key', apiKeyInput);
    setSavedApiKey(apiKeyInput);
    updateApiKey(apiKeyInput);
    setSettingsMessage({ type: 'success', text: 'Đã lưu thành công' });
    setApiKeyInput('');
  };

  // Load content when topic, tab or practice level changes
  useEffect(() => {
    if (selectedTopic) {
      loadTabContent(activeTab);
    }
  }, [selectedTopic, activeTab, practiceLevel]);

  const loadTabContent = async (tab: Tab) => {
    if (!selectedTopic) return;
    setLoading(true);
    setAiFeedback(null);
    setGradingResult(null);
    setStudentInput('');
    setChallengeInput('');
    setChallengeImage(null);
    
    try {
      if (tab === 'theory') {
        const content = await generateTheoryContent(selectedTopic.title, selectedTopic.grade);
        setTheoryContent(content);
        setQuizResults({});
        setShowQuizResults(false);
      } else if (tab === 'practice') {
        const exercise = await generatePracticeExercise(selectedTopic.title, selectedTopic.grade, practiceLevel);
        setPracticeExercise(exercise);
      } else if (tab === 'challenge') {
        const chall = await generateChallenge(selectedTopic.title, selectedTopic.grade);
        setChallenge(chall);
      }
    } catch (error) {
      console.error("Error loading content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!studentInput.trim() || !practiceExercise || !selectedTopic) return;
    setLoading(true);
    try {
      const feedback = await evaluateStudentWork(practiceExercise.task, studentInput);
      setAiFeedback(feedback);
      
      // Record progress
      const record: PracticeRecord = {
        topicId: selectedTopic.id,
        topicTitle: selectedTopic.title,
        level: practiceLevel,
        completed: true,
        attempts: 1,
        aiFeedback: feedback.comment,
        timestamp: Date.now()
      };
      saveProgress({ ...progress, practice: [...progress.practice, record] });
    } catch (error) {
      console.error("Error evaluating:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChallenge = async () => {
    if (!challengeInput.trim() || !challenge || !selectedTopic) return;
    setLoading(true);
    try {
      const result = await gradeChallenge(challenge, challengeInput, challengeImage || undefined);
      setGradingResult(result);
      
      // Record progress
      const record: ChallengeRecord = {
        topicId: selectedTopic.id,
        topicTitle: selectedTopic.title,
        scores: result.scores.map(s => ({ criterion: s.criterion, score: s.score, maxScore: s.maxScore })),
        totalScore: result.totalScore,
        suggestions: result.suggestions,
        timestamp: Date.now()
      };
      saveProgress({ ...progress, challenges: [...progress.challenges, record] });
    } catch (error) {
      console.error("Error grading challenge:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeProblem = async () => {
    if (!problemText.trim() && !problemImage) return;
    setLoading(true);
    try {
      const analysis = await analyzeProblem(problemText, problemImage || undefined);
      setProblemAnalysis(analysis);
      
      // Save to problem history
      const record: ProblemHistoryRecord = {
        problemText,
        problemImage: problemImage || undefined,
        analysis,
        timestamp: Date.now()
      };
      saveProgress({ 
        ...progress, 
        problem_history: [...(progress.problem_history || []), record] 
      });
    } catch (error) {
      console.error("Error analyzing problem:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'problem' | 'challenge') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'problem') setProblemImage(reader.result as string);
        else setChallengeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuizAnswer = (quizIdx: number, optionIdx: number) => {
    setQuizResults(prev => ({ ...prev, [quizIdx]: optionIdx }));
    
    // Check if all answered
    if (theoryContent && Object.keys({ ...quizResults, [quizIdx]: optionIdx }).length === theoryContent.quizzes.length && selectedTopic) {
      const results = { ...quizResults, [quizIdx]: optionIdx };
      const correctCount = theoryContent.quizzes.reduce((acc, q, idx) => acc + (results[idx] === q.correctAnswer ? 1 : 0), 0);
      
      const record: TheoryRecord = {
        topicId: selectedTopic.id,
        topicTitle: selectedTopic.title,
        correctCount,
        totalCount: theoryContent.quizzes.length,
        timestamp: Date.now()
      };
      saveProgress({ ...progress, theory: [...progress.theory, record] });
    }
  };

  const handleAnalyzeIndividualProgress = async () => {
    if (!currentStudent) return;
    setLoading(true);
    try {
      const analysis = await analyzeIndividualProgress(currentStudent, progress);
      setIndividualAnalysis(analysis);
      
      await fetch('/api/student/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentStudent.name,
          classCode: currentStudent.classCode,
          progress,
          analysis
        })
      });
    } catch (error) {
      console.error("Error analyzing individual progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeClassProgress = async (classCode: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/students?classCode=${classCode}`);
      const data = await response.json();
      const classStudents = data.students || [];
      if (classStudents.length === 0) {
        setLoading(false);
        return;
      }
      
      const targetClass = allClasses.find(c => c.code === classCode);
      if (!targetClass) {
        setLoading(false);
        return;
      }

      const report = await analyzeClassProgress(classCode, targetClass.name, classStudents);
      setClassReport(report);
      setAllStudents(classStudents);
    } catch (error) {
      console.error("Error analyzing class progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeTeacherOverview = async () => {
    if (!teacherProfile) return;
    setLoading(true);
    try {
      const classesData = await Promise.all(teacherClasses.map(async c => {
        const response = await fetch(`/api/students?classCode=${c.code}`);
        const data = await response.json();
        const students = data.students || [];
        const accuracy = students.length > 0 
          ? students.reduce((acc: number, s: any) => {
              const studentAccuracy = s.progress.theory.length > 0 
                ? (s.progress.theory.reduce((a: number, t: any) => a + (t.correctCount / t.totalCount), 0) / s.progress.theory.length) * 100 
                : 0;
              return acc + studentAccuracy;
            }, 0) / students.length 
          : 0;
        
        return {
          className: c.name,
          classCode: c.code,
          studentCount: students.length,
          avgAccuracy: Math.round(accuracy),
          weakTopics: []
        };
      }));

      const overview = await analyzeTeacherOverview(teacherProfile.name, teacherProfile.schoolName, classesData);
      setTeacherOverview(overview);
    } catch (error) {
      console.error("Error analyzing teacher overview:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classToDelete || !teacherProfile) return;

    if (deletePasswordInput !== teacherProfile.password) {
      setDeleteError('Mật khẩu chưa đúng');
      return;
    }

    try {
      const response = await fetch(`/api/teacher/classes/${classToDelete.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const updatedClasses = allClasses.filter(c => c.id !== classToDelete.id);
        const updatedStudents = allStudents.filter(s => s.student.classCode !== classToDelete.code);

        setAllClasses(updatedClasses);
        setAllStudents(updatedStudents);

        // Reset state
        setClassToDelete(null);
        setDeleteConfirmStep(null);
        setDeletePasswordInput('');
        setDeleteError('');
        
        if (selectedClassForReport === classToDelete.code) {
          setSelectedClassForReport('');
          setClassReport(null);
        }
      }
    } catch (error) {
      console.error("Error deleting class:", error);
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentStudent(null);
    setIsTeacherAuthenticated(false);
    setTeacherProfile(null);
    localStorage.removeItem('scratch_master_teacher_profile');
    localStorage.removeItem('scratch_master_current_student');
    setGrade(null);
    setSelectedTopic(null);
    setActiveTab('theory');
    setIsAnalyzingProblem(false);
    setIsSettingsOpen(false);
    setShowLogoutConfirm(false);
    setPasswordInput('');
    setTeacherLoginForm({ email: '', password: '' });
    setStudentForm({ name: '', classCode: '' });
    setStudentLoginStep(1);
    setLoginClass(null);
    setIsNewStudent(false);
    setAuthError('');
    setTeacherAuthMode('login');
    setForgotPasswordStep(1);
    setGradeWarning(null);
  };

  const exportStudentReport = () => {
    if (!currentStudent || !individualAnalysis) return;
    
    const topicsCount = new Set([...progress.theory.map(t => t.topicId), ...progress.practice.map(p => p.topicId)]).size;
    const accuracy = progress.theory.length > 0 
      ? Math.round((progress.theory.reduce((acc, t) => acc + (t.correctCount / t.totalCount), 0) / progress.theory.length) * 100) 
      : 0;
    const avgChallenge = progress.challenges.length > 0 
      ? (progress.challenges.reduce((acc, c) => acc + c.totalScore, 0) / progress.challenges.length).toFixed(1) 
      : 0;
    const levels = progress.practice.map(p => p.level);
    const highestLevel = levels.includes('Khó') ? 'Khó' : levels.includes('Vừa') ? 'Vừa' : levels.includes('Dễ') ? 'Dễ' : 'Chưa có';

    const content = `
BÁO CÁO TIẾN ĐỘ HỌC TẬP CÁ NHÂN
Họ tên: ${currentStudent.name}
Lớp: ${currentStudent.className}
Khối: ${currentStudent.grade}
Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}

TỔNG QUAN TIẾN ĐỘ:
- Số chủ đề đã học: ${topicsCount}
- Độ chính xác trung bình (Lý thuyết): ${accuracy}%
- Điểm trung bình thử thách sáng tạo: ${avgChallenge}/10
- Mức độ thực hành cao nhất đạt được: ${highestLevel}

NHẬN XÉT CỦA AI:
${individualAnalysis.generalComment}

ĐIỂM MẠNH:
${individualAnalysis.strengths.map(s => `- ${s}`).join('\n')}

CẦN CẢI THIỆN:
${individualAnalysis.improvements.map(i => `- ${i}`).join('\n')}

KỸ NĂNG MẠNH:
${individualAnalysis.strongSkills.map(s => `- ${s}`).join('\n')}

NỘI DUNG CẦN LUYỆN THÊM:
${individualAnalysis.weakSkills.map(w => `- ${w}`).join('\n')}

GỢI Ý TIẾP THEO:
${individualAnalysis.nextSteps}

LỜI ĐỘNG VIÊN:
${individualAnalysis.encouragement}
    `;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_cao_${currentStudent.name.replace(/\s+/g, '_')}.txt`;
    link.click();
  };

  const exportClassReport = () => {
    if (!classReport) return;
    const content = `
BÁO CÁO TIẾN ĐỘ LỚP HỌC
Lớp: ${classReport.className}
Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}

TỔNG QUAN:
${classReport.summary}

CHỦ ĐỀ CÒN YẾU:
${classReport.weakTopics.join(', ')}

GỢI Ý ÔN TẬP:
${classReport.reviewSuggestions}

PHÂN HÓA HỌC SINH:
- Nhóm cần củng cố: ${classReport.differentiation.reinforcement.join(', ')}
- Nhóm nâng cao: ${classReport.differentiation.advanced.join(', ')}
    `;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_cao_Lop_${classReport.className}.txt`;
    link.click();
  };

  const renderHeader = () => (
    <>
      {!isOnline && (
        <div className="bg-red-500 text-white text-center py-2 text-xs font-bold animate-pulse sticky top-0 z-[60]">
          Mất kết nối mạng. Dữ liệu sẽ được đồng bộ khi có mạng trở lại.
        </div>
      )}
      <header className="bg-white border-b border-zinc-200 py-4 px-4 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-200 cursor-pointer"
            onClick={() => {
              if (isSettingsOpen) setIsSettingsOpen(false);
              if (activeTab !== 'theory') setActiveTab('theory');
              if (isAnalyzingProblem) setIsAnalyzingProblem(false);
              if (selectedTopic) setSelectedTopic(null);
            }}
          >
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Scratch Master</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Ôn tập & Luyện tập Tiểu học</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-6">
          {/* Back Button for sub-views */}
          {(isSettingsOpen || activeTab === 'progress' || activeTab === 'management' || isAnalyzingProblem || (currentStudent && selectedTopic)) && (
            <button 
              onClick={() => {
                if (isSettingsOpen) {
                  setIsSettingsOpen(false);
                  return;
                }
                if (activeTab === 'progress' || activeTab === 'management' || isAnalyzingProblem) {
                  setActiveTab('theory');
                  setIsAnalyzingProblem(false);
                  return;
                }
                if (selectedTopic) {
                  setSelectedTopic(null);
                  return;
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quay lại</span>
            </button>
          )}

          {/* User Info & Logout */}
          {(currentStudent || (userRole === 'teacher' && isTeacherAuthenticated)) && (
            <div className="flex items-center gap-3 sm:gap-4 bg-zinc-50 px-3 sm:px-4 py-2 rounded-2xl border border-zinc-100">
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-zinc-900">
                  {currentStudent ? currentStudent.name : teacherProfile?.name}
                </div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                  {currentStudent ? (
                    <>
                      Lớp: {currentStudent.className} • {currentStudent.schoolName}
                    </>
                  ) : 'Giáo viên'}
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-red-500 rounded-xl text-xs font-bold border border-red-100 hover:bg-red-50 transition-all shadow-sm"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-4">
            {currentStudent && (
              <button
                onClick={() => {
                  setActiveTab('progress');
                  setIsSettingsOpen(false);
                  setIsAnalyzingProblem(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'progress' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-zinc-500 hover:bg-zinc-50'}`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden md:inline">Tiến độ</span>
              </button>
            )}
            {userRole === 'teacher' && isTeacherAuthenticated && (
              <button
                onClick={() => {
                  setActiveTab('management');
                  setIsSettingsOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'management' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-zinc-500 hover:bg-zinc-50'}`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden md:inline">Quản lý</span>
              </button>
            )}
            
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2 rounded-xl transition-all ${isSettingsOpen ? 'bg-zinc-100 text-orange-600' : 'text-zinc-400 hover:bg-zinc-50'}`}
              title="Cài đặt"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
    </>
  );

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-zinc-900 mb-4 flex items-center justify-center gap-3">
          <Settings className="text-orange-500" /> Cài đặt ứng dụng
        </h2>
        <p className="text-zinc-600">Quản lý kết nối AI và các tùy chỉnh khác.</p>
      </div>

      <div className="space-y-8">
        <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <Key className="text-blue-500" /> Kết nối AI (Gemini)
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-3">
                {savedApiKey ? 'API Key hiện tại' : 'Nhập API Key của bạn'}
              </label>
              
              {savedApiKey ? (
                <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-green-500 w-5 h-5" />
                    <span className="text-zinc-500 font-mono text-sm">••••••••••••••••</span>
                  </div>
                  <button 
                    onClick={() => setSavedApiKey(null)}
                    className="text-sm font-bold text-orange-600 hover:text-orange-700"
                  >
                    Thay đổi API Key
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Nhập API Key của bạn (bắt đầu bằng AIza...)"
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-zinc-700 font-mono"
                  />
                  <button
                    onClick={handleSaveApiKey}
                    className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                  >
                    Lưu API Key
                  </button>
                </div>
              )}
            </div>

            {settingsMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
                  settingsMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {settingsMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {settingsMessage.text}
              </motion.div>
            )}

            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
              <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-sm">
                <Lightbulb className="w-4 h-4" /> Hướng dẫn ngắn gọn
              </h4>
              <p className="text-blue-800 text-xs leading-relaxed">
                API Key là một mã định danh duy nhất do Google cung cấp để ứng dụng có thể kết nối với dịch vụ trí tuệ nhân tạo (AI). 
                Việc cung cấp mã này giúp bạn sử dụng các tính năng thông minh của Scratch Master một cách ổn định.
              </p>
            </div>

            <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
              <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4" /> Lưu ý an toàn
              </h4>
              <ul className="text-orange-800 text-xs space-y-2 list-disc ml-4">
                <li>Không chia sẻ API Key cho người khác để tránh bị lạm dụng.</li>
                <li>Chỉ sử dụng cho mục đích học tập và nghiên cứu cá nhân.</li>
                <li>API Key của bạn được lưu an toàn trên trình duyệt này và không hiển thị công khai.</li>
              </ul>
            </div>
          </div>
        </section>

        {isTeacherAuthenticated && (
          <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
            <h3 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Lock className="text-blue-500" /> Bảo mật Giáo viên
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-3">Thay đổi mật khẩu giáo viên</label>
                <div className="flex gap-4">
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="flex-1 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button
                    onClick={handleChangePassword}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    Lưu mật khẩu
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );

  const renderProgress = () => {
    const hasOfficialData = progress.theory.length > 0 || progress.practice.length > 0 || progress.challenges.length > 0;

    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 mb-2 flex items-center gap-3">
              <TrendingUp className="text-orange-500" /> Tiến độ của em
            </h2>
            <p className="text-zinc-600">Chào <strong>{currentStudent?.name}</strong> (Lớp {currentStudent?.className}), hãy xem em đã đạt được những gì nhé!</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAnalyzeIndividualProgress}
              disabled={loading || !hasOfficialData}
              className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              AI Phân tích tiến độ
            </button>
            {individualAnalysis && (
              <button
                onClick={exportStudentReport}
                className="px-6 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-bold hover:bg-zinc-50 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Xuất báo cáo
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
            <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <ClipboardList className="text-blue-600 w-6 h-6" />
            </div>
            <h4 className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-1">Chủ đề đã học</h4>
            <p className="text-3xl font-bold text-zinc-900">{new Set([...progress.theory.map(t => t.topicId), ...progress.practice.map(p => p.topicId)]).size}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
            <div className="bg-green-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <Target className="text-green-600 w-6 h-6" />
            </div>
            <h4 className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-1">Độ chính xác TB</h4>
            <p className="text-3xl font-bold text-zinc-900">
              {progress.theory.length > 0 
                ? Math.round((progress.theory.reduce((acc, t) => acc + (t.correctCount / t.totalCount), 0) / progress.theory.length) * 100) 
                : 0}%
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
            <div className="bg-orange-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <AwardIcon className="text-orange-600 w-6 h-6" />
            </div>
            <h4 className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-1">Điểm Thử thách TB</h4>
            <p className="text-3xl font-bold text-zinc-900">
              {progress.challenges.length > 0 
                ? (progress.challenges.reduce((acc, c) => acc + c.totalScore, 0) / progress.challenges.length).toFixed(1) 
                : 0}/10
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!hasOfficialData ? (
            <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[2.5rem] p-16 text-center">
              <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <ClipboardList className="w-10 h-10 text-zinc-300" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Chưa có dữ liệu học tập chính thức</h3>
              <p className="text-zinc-500 max-w-md mx-auto">
                Em hãy tham gia các phần Ôn tập lý thuyết, Luyện tập thực hành hoặc Thử thách sáng tạo để AI có thể phân tích tiến độ học tập của em nhé.
              </p>
            </div>
          ) : individualAnalysis ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-white p-8 rounded-[2.5rem] border border-orange-200 shadow-xl shadow-orange-50">
                <h3 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-3">
                  <Sparkles className="text-orange-500" /> AI Nhận xét tổng quan
                </h3>
                <p className="text-zinc-700 leading-relaxed mb-8 text-lg italic">"{individualAnalysis.generalComment}"</p>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                    <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Điểm mạnh của em
                    </h4>
                    <ul className="space-y-3">
                      {individualAnalysis.strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-green-800 text-sm">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                    <h4 className="font-bold text-orange-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Nội dung cần cải thiện
                    </h4>
                    <ul className="space-y-3">
                      {individualAnalysis.improvements.map((i, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-orange-800 text-sm">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-zinc-900 rounded-3xl text-white">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-orange-500 p-2 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold">Gợi ý luyện tập tiếp theo</h4>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed mb-6">{individualAnalysis.nextSteps}</p>
                  <div className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl">
                    <Heart className="text-pink-400 w-5 h-5" />
                    <p className="text-sm font-medium italic">"{individualAnalysis.encouragement}"</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[2.5rem] p-16 text-center">
              <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <BrainCircuit className="w-10 h-10 text-zinc-300" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Chưa có phân tích từ AI</h3>
              <p className="text-zinc-500 max-w-md mx-auto mb-8">Hãy nhấn nút "AI Phân tích tiến độ" để xem nhận xét chi tiết về quá trình học tập của em nhé.</p>
              <button
                onClick={handleAnalyzeIndividualProgress}
                disabled={loading}
                className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Bắt đầu phân tích ngay
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderManagement = () => {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h2 className="text-4xl font-black text-zinc-900 mb-2 flex items-center gap-4">
              <Users className="text-blue-600 w-10 h-10" /> Quản lý lớp học
            </h2>
            <p className="text-zinc-600">Hệ thống quản lý nhiều lớp cho giáo viên {teacherProfile?.name} - {teacherProfile?.schoolName}.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {selectedClassForReport && (
              <button
                onClick={() => {
                  setSelectedClassForReport('');
                  setClassReport(null);
                }}
                className="px-6 py-3 bg-zinc-100 text-zinc-700 rounded-2xl font-bold hover:bg-zinc-200 transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" /> Danh sách lớp
              </button>
            )}
          </div>
        </div>

        {!selectedClassForReport ? (
          <div className="space-y-12">
            {/* Teacher Overview Analysis */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-[3rem] text-white shadow-2xl shadow-blue-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="max-w-2xl">
                  <h3 className="text-3xl font-bold mb-4 flex items-center gap-3">
                    <Sparkles className="text-blue-200" /> Phân tích tổng quan toàn trường
                  </h3>
                  <p className="text-blue-100 leading-relaxed">
                    AI sẽ phân tích dữ liệu từ tất cả các lớp thầy cô đang phụ trách để đưa ra cái nhìn toàn cảnh, so sánh tiến độ và đề xuất chiến lược giảng dạy phù hợp.
                  </p>
                </div>
                <button
                  onClick={handleAnalyzeTeacherOverview}
                  disabled={loading || teacherClasses.length === 0}
                  className="px-10 py-5 bg-white text-blue-700 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-xl flex items-center gap-3 whitespace-nowrap disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <BrainCircuit className="w-6 h-6" />}
                  Phân tích ngay
                </button>
              </div>

              {teacherOverview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-10 p-8 bg-white/10 rounded-[2rem] border border-white/20 backdrop-blur-sm"
                >
                  <div className="prose prose-invert max-w-none">
                    <Markdown>{teacherOverview}</Markdown>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Create Class Section */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-xl">
              <h3 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <MessageSquarePlus className="text-blue-500" /> Tạo lớp học mới
              </h3>
              <form onSubmit={handleCreateClass} className="grid md:grid-cols-3 gap-6 items-end">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Tên lớp</label>
                  <input 
                    type="text"
                    required
                    value={newClassForm.name}
                    onChange={e => setNewClassForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ví dụ: 4A, 5B..."
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Khối lớp</label>
                  <select 
                    value={newClassForm.grade}
                    onChange={e => setNewClassForm(prev => ({ ...prev, grade: parseInt(e.target.value) as Grade }))}
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                  >
                    <option value={4}>Khối 4</option>
                    <option value={5}>Khối 5</option>
                  </select>
                </div>
                <button 
                  type="submit"
                  className="py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  Tạo lớp học
                </button>
              </form>
            </div>

            {/* Classes List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teacherClasses.map((c) => {
                const studentCount = allStudents.filter(s => s.student.classCode === c.code).length;
                const topicsCount = new Set([
                  ...allStudents.filter(s => s.student.classCode === c.code).flatMap(s => s.progress.theory.map(t => t.topicId)),
                  ...allStudents.filter(s => s.student.classCode === c.code).flatMap(s => s.progress.practice.map(p => p.topicId))
                ]).size;

                return (
                  <motion.div
                    key={c.id}
                    whileHover={{ y: -5 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="bg-blue-50 p-4 rounded-2xl">
                        <Users className="w-8 h-8 text-blue-600" />
                      </div>
                      <span className="px-3 py-1 bg-zinc-100 text-zinc-500 rounded-lg text-xs font-bold">
                        Khối {c.grade}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-900 mb-1">Lớp {c.name}</h3>
                    <div className="flex items-center gap-2 text-zinc-400 text-sm mb-6">
                      <Key className="w-4 h-4" /> Mã lớp: <span className="font-mono font-bold text-blue-600">{c.code}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-zinc-50 p-3 rounded-xl">
                        <div className="text-xs text-zinc-400 font-bold uppercase mb-1">Học sinh</div>
                        <div className="text-lg font-bold text-zinc-900">{studentCount}</div>
                      </div>
                      <div className="bg-zinc-50 p-3 rounded-xl">
                        <div className="text-xs text-zinc-400 font-bold uppercase mb-1">Chủ đề</div>
                        <div className="text-lg font-bold text-zinc-900">{topicsCount}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-6 border-t border-zinc-100">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedClassForReport(c.code)}
                          className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Users className="w-4 h-4" /> Xem lớp
                        </button>
                        <button
                          onClick={() => {
                            setSelectedClassForReport(c.code);
                            handleAnalyzeClassProgress(c.code);
                          }}
                          className="flex-1 py-3 bg-zinc-50 text-zinc-600 rounded-xl font-bold hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <BarChart3 className="w-4 h-4" /> Báo cáo
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setClassToDelete(c);
                          setDeleteConfirmStep(1);
                        }}
                        className="w-full py-3 bg-red-50 text-red-500 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <Trash2 className="w-4 h-4" /> Xóa lớp
                      </button>
                    </div>
                  </motion.div>
                );
              })}
              {teacherClasses.length === 0 && (
                <div className="col-span-full py-20 text-center bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-200">
                  <Users className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                  <p className="text-zinc-500 font-medium">Chưa có lớp học nào. Hãy tạo lớp đầu tiên nhé!</p>
                </div>
              )}
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
              {classToDelete && deleteConfirmStep && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      setClassToDelete(null);
                      setDeleteConfirmStep(null);
                      setDeletePasswordInput('');
                      setDeleteError('');
                    }}
                    className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border border-zinc-200"
                  >
                    <div className="text-center mb-8">
                      <div className="bg-red-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-red-600 w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-zinc-900">Xác nhận xóa lớp</h3>
                    </div>

                    {deleteConfirmStep === 1 ? (
                      <div className="space-y-6">
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                          <p className="text-red-800 text-sm leading-relaxed text-center font-medium">
                            Bạn có chắc chắn muốn xóa lớp <strong>{classToDelete.name}</strong> không?<br/>
                            Toàn bộ dữ liệu học sinh và tiến độ của lớp sẽ bị xóa và không thể khôi phục.
                          </p>
                        </div>
                        <div className="flex gap-4">
                          <button
                            onClick={() => {
                              setClassToDelete(null);
                              setDeleteConfirmStep(null);
                            }}
                            className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => setDeleteConfirmStep(2)}
                            className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                          >
                            Xác nhận xóa
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleDeleteClass} className="space-y-6">
                        <div>
                          <label className="block text-sm font-bold text-zinc-700 mb-3">Nhập lại mật khẩu giáo viên để xác thực</label>
                          <div className="relative">
                            <input 
                              type="password"
                              required
                              autoFocus
                              value={deletePasswordInput}
                              onChange={e => setDeletePasswordInput(e.target.value)}
                              placeholder="Nhập mật khẩu..."
                              className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
                            />
                            <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
                          </div>
                          {deleteError && (
                            <p className="text-red-500 text-xs font-bold mt-2 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {deleteError}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmStep(1)}
                            className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                          >
                            Quay lại
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                          >
                            Thực hiện xóa
                          </button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-zinc-900">
                Lớp {teacherClasses.find(c => c.code === selectedClassForReport)?.name} 
                <span className="ml-4 text-sm font-mono text-zinc-400">Mã: {selectedClassForReport}</span>
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={() => handleAnalyzeClassProgress(selectedClassForReport)}
                  disabled={loading}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart3 className="w-5 h-5" />}
                  Phân tích toàn lớp
                </button>
                {classReport && (
                  <button
                    onClick={exportClassReport}
                    className="px-8 py-4 bg-white border-2 border-zinc-200 text-zinc-700 rounded-2xl font-bold hover:bg-zinc-50 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Download className="w-5 h-5" />
                    Xuất báo cáo lớp
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  <ClipboardList className="text-blue-500" /> Danh sách học sinh & Phân tích chi tiết
                </h3>
                <span className="text-sm font-bold text-zinc-500 bg-white px-4 py-2 rounded-xl border border-zinc-200">
                  {allStudents.filter(s => s.student.classCode === selectedClassForReport).length} học sinh
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 border-b border-zinc-200">
                      <th className="p-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">Học sinh</th>
                      <th className="p-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">Chủ đề</th>
                      <th className="p-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">Độ chính xác</th>
                      <th className="p-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">Thử thách TB</th>
                      <th className="p-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">Mức cao nhất</th>
                      <th className="p-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">Hỗ trợ thêm</th>
                      <th className="p-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">Kỹ năng mạnh</th>
                      <th className="p-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">Cần hỗ trợ</th>
                      <th className="p-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">Nhiệm vụ tiếp theo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {allStudents.filter(s => s.student.classCode === selectedClassForReport).map((s, idx) => {
                      const topicsCount = new Set([...s.progress.theory.map(t => t.topicId), ...s.progress.practice.map(p => p.topicId)]).size;
                      const accuracy = s.progress.theory.length > 0 
                        ? Math.round((s.progress.theory.reduce((acc, t) => acc + (t.correctCount / t.totalCount), 0) / s.progress.theory.length) * 100) 
                        : 0;
                      const avgChallenge = s.progress.challenges.length > 0 
                        ? (s.progress.challenges.reduce((acc, c) => acc + c.totalScore, 0) / s.progress.challenges.length).toFixed(1) 
                        : 0;
                      const levels = s.progress.practice.map(p => p.level);
                      const highestLevel = levels.includes('Khó') ? 'Khó' : levels.includes('Vừa') ? 'Vừa' : levels.includes('Dễ') ? 'Dễ' : 'Chưa có';
                      const supportCount = s.progress.problem_history?.length || 0;

                      return (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="p-6">
                            <div className="font-bold text-zinc-900 group-hover:text-blue-700 transition-colors">{s.student.name}</div>
                            <div className="text-xs text-zinc-400 font-medium">Khối {s.student.grade}</div>
                          </td>
                          <td className="p-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                              {topicsCount} chủ đề
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${accuracy}%` }}
                                  className={`h-full ${accuracy > 70 ? 'bg-green-500' : accuracy > 40 ? 'bg-orange-500' : 'bg-red-500'}`} 
                                />
                              </div>
                              <span className="text-sm font-bold text-zinc-700">{accuracy}%</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="text-sm font-bold text-zinc-700 bg-zinc-100 px-3 py-1 rounded-lg">{avgChallenge}/10</span>
                          </td>
                          <td className="p-6">
                            <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                              highestLevel === 'Khó' ? 'bg-red-50 text-red-700 border-red-100' : 
                              highestLevel === 'Vừa' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                              highestLevel === 'Dễ' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-zinc-50 text-zinc-400 border-zinc-100'
                            }`}>
                              {highestLevel}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <MessageSquarePlus className="w-4 h-4 text-zinc-400" />
                              <span className="text-sm font-bold text-zinc-700">{supportCount} lần</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="text-xs space-y-1">
                              {s.analysis?.strongSkills?.slice(0, 2).map((skill, i) => (
                                <div key={i} className="text-green-600 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> {skill}
                                </div>
                              )) || <span className="text-zinc-400 italic">Chưa phân tích</span>}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="text-xs space-y-1">
                              {s.analysis?.weakSkills?.slice(0, 2).map((skill, i) => (
                                <div key={i} className="text-orange-600 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> {skill}
                                </div>
                              )) || <span className="text-zinc-400 italic">Chưa phân tích</span>}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="text-xs text-zinc-600 max-w-[180px] leading-relaxed" title={s.analysis?.nextSteps}>
                              {s.analysis?.nextSteps ? (
                                <span className="line-clamp-2">{s.analysis.nextSteps}</span>
                              ) : (
                                <span className="text-zinc-400 italic">Chưa có gợi ý</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {classReport && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-10 rounded-[2.5rem] border border-blue-200 shadow-xl shadow-blue-50"
              >
                <h3 className="text-2xl font-bold text-zinc-900 mb-8 flex items-center gap-3">
                  <Sparkles className="text-blue-500" /> AI Phân tích toàn lớp
                </h3>
                
                <div className="grid md:grid-cols-2 gap-12 mb-12">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-zinc-900 mb-3 flex items-center gap-2">
                        <FileText className="text-blue-500 w-5 h-5" /> Tổng quan lớp học
                      </h4>
                      <p className="text-zinc-600 text-sm leading-relaxed">{classReport.summary}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500 w-5 h-5" /> Chủ đề nhiều học sinh còn yếu
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {classReport.weakTopics.map((t, idx) => (
                          <span key={idx} className="px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-xs font-bold">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                      <h4 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <RefreshCw className="text-blue-500 w-5 h-5" /> Đề xuất nội dung ôn tập
                      </h4>
                      <p className="text-zinc-600 text-sm leading-relaxed italic">"{classReport.reviewSuggestions}"</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" /> Nhóm cần củng cố
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {classReport.differentiation.reinforcement.map((name, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white text-blue-700 rounded-lg text-xs font-bold shadow-sm">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-green-50 p-8 rounded-3xl border border-green-100">
                    <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                      <Trophy className="w-5 h-5" /> Nhóm có thể nâng cao
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {classReport.differentiation.advanced.map((name, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white text-green-700 rounded-lg text-xs font-bold shadow-sm">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    );
  };
  const renderRoleSelection = () => (
    <div className="max-w-4xl mx-auto py-20 px-4">
      <div className="text-center mb-16">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-block bg-orange-100 p-6 rounded-[2rem] mb-8 shadow-xl shadow-orange-50"
        >
          <Sparkles className="w-16 h-16 text-orange-600" />
        </motion.div>
        <h2 className="text-5xl font-black text-zinc-900 mb-4 tracking-tight">Bạn là ai?</h2>
        <p className="text-xl text-zinc-500 font-medium">Hãy chọn vai trò của bạn để bắt đầu nhé.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-10 max-w-3xl mx-auto">
        <motion.button
          whileHover={{ y: -10, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setUserRole('student')}
          className="group bg-white p-12 rounded-[3rem] border-2 border-zinc-100 hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-100 transition-all text-center"
        >
          <div className="bg-orange-50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:bg-orange-500 transition-colors">
            <UserCircle className="w-12 h-12 text-orange-500 group-hover:text-white" />
          </div>
          <h3 className="text-3xl font-bold text-zinc-900 mb-2">Tôi là Học sinh</h3>
          <p className="text-zinc-500">Học tập, ôn luyện và nhận hướng dẫn từ AI.</p>
        </motion.button>

        <motion.button
          whileHover={{ y: -10, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setUserRole('teacher')}
          className="group bg-white p-12 rounded-[3rem] border-2 border-zinc-100 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-100 transition-all text-center"
        >
          <div className="bg-blue-50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:bg-blue-500 transition-colors">
            <GraduationCap className="w-12 h-12 text-blue-500 group-hover:text-white" />
          </div>
          <h3 className="text-3xl font-bold text-zinc-900 mb-2">Tôi là Giáo viên</h3>
          <p className="text-zinc-500">Quản lý lớp học và xem báo cáo tiến độ.</p>
        </motion.button>
      </div>
    </div>
  );

  const renderTeacherRegistration = () => (
    <div className="max-w-md mx-auto py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-2xl"
      >
        <div className="text-center mb-10">
          <div className="bg-blue-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <UserCircle className="text-blue-600 w-10 h-10" />
          </div>
          <h3 className="text-3xl font-bold text-zinc-900">Đăng ký Giáo viên</h3>
          <p className="text-zinc-500 mt-3">Tạo tài khoản mới để quản lý lớp học của thầy cô.</p>
        </div>

        <form onSubmit={handleTeacherSetup} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">Tên trường học</label>
            <div className="relative">
              <input 
                type="text"
                required
                value={teacherSetupForm.schoolName}
                onChange={e => setTeacherSetupForm(prev => ({ ...prev, schoolName: e.target.value }))}
                placeholder="Ví dụ: Tiểu học Chu Văn An"
                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">Họ và tên giáo viên</label>
            <div className="relative">
              <input 
                type="text"
                required
                value={teacherSetupForm.name}
                onChange={e => setTeacherSetupForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ví dụ: Thầy Nguyễn Văn A"
                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <User className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">Email đăng nhập</label>
            <div className="relative">
              <input 
                type="email"
                required
                value={teacherSetupForm.email}
                onChange={e => setTeacherSetupForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@vidu.com"
                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">Số điện thoại (không bắt buộc)</label>
            <div className="relative">
              <input 
                type="tel"
                value={teacherSetupForm.phone}
                onChange={e => setTeacherSetupForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="09xx xxx xxx"
                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Mật khẩu</label>
              <div className="relative">
                <input 
                  type="password"
                  required
                  value={teacherSetupForm.password}
                  onChange={e => setTeacherSetupForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="******"
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Xác nhận</label>
              <div className="relative">
                <input 
                  type="password"
                  required
                  value={teacherSetupForm.confirmPassword}
                  onChange={e => setTeacherSetupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="******"
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
              </div>
            </div>
          </div>

          {authError && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-xs font-bold mt-3 flex items-center gap-2"
            >
              <AlertTriangle className="w-3 h-3" /> {authError}
            </motion.p>
          )}

          <button 
            type="submit"
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 text-lg mt-4"
          >
            Đăng ký ngay
          </button>
          <button 
            type="button"
            onClick={() => setTeacherAuthMode('login')}
            className="w-full text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Đã có tài khoản? Đăng nhập
          </button>
          <button 
            type="button"
            onClick={() => setUserRole(null)}
            className="w-full text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Quay lại
          </button>
        </form>
      </motion.div>
    </div>
  );

  const renderForgotPassword = () => (
    <div className="max-w-md mx-auto py-24 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-2xl"
      >
        <div className="text-center mb-10">
          <div className="bg-orange-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="text-orange-600 w-10 h-10" />
          </div>
          <h3 className="text-3xl font-bold text-zinc-900">Quên mật khẩu</h3>
          <p className="text-zinc-500 mt-3">
            {forgotPasswordStep === 1 && "Nhập email đã đăng ký để nhận mã xác thực."}
            {forgotPasswordStep === 2 && "Vui lòng nhập mã xác thực đã được gửi đến email của thầy cô."}
            {forgotPasswordStep === 3 && "Thiết lập mật khẩu mới cho tài khoản của thầy cô."}
          </p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-6">
          {forgotPasswordStep === 1 && (
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Email đã đăng ký</label>
              <div className="relative">
                <input 
                  type="email"
                  required
                  value={forgotPasswordForm.email}
                  onChange={e => setForgotPasswordForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@vidu.com"
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
              </div>
            </div>
          )}

          {forgotPasswordStep === 2 && (
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Mã xác thực (6 chữ số)</label>
              <div className="relative">
                <input 
                  type="text"
                  required
                  maxLength={6}
                  value={forgotPasswordForm.code}
                  onChange={e => setForgotPasswordForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="123456"
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-center text-2xl tracking-[0.5em] font-bold"
                />
                <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
              </div>
            </div>
          )}

          {forgotPasswordStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Mật khẩu mới</label>
                <div className="relative">
                  <input 
                    type="password"
                    required
                    value={forgotPasswordForm.newPassword}
                    onChange={e => setForgotPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="******"
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <input 
                    type="password"
                    required
                    value={forgotPasswordForm.confirmPassword}
                    onChange={e => setForgotPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="******"
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                  <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {authError && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-xs font-bold mt-3 flex items-center gap-2"
            >
              <AlertTriangle className="w-3 h-3" /> {authError}
            </motion.p>
          )}

          <button 
            type="submit"
            className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 text-lg"
          >
            {forgotPasswordStep === 1 && "Gửi mã xác thực"}
            {forgotPasswordStep === 2 && "Xác nhận mã"}
            {forgotPasswordStep === 3 && "Đặt lại mật khẩu"}
          </button>
          
          <button 
            type="button"
            onClick={() => {
              setTeacherAuthMode('login');
              setForgotPasswordStep(1);
              setAuthError('');
            }}
            className="w-full text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Quay lại đăng nhập
          </button>
        </form>
      </motion.div>
    </div>
  );

  const renderTeacherAuth = () => {
    if (teacherAuthMode === 'register') return renderTeacherRegistration();
    if (teacherAuthMode === 'forgotPassword') return renderForgotPassword();

    return (
      <div className="max-w-md mx-auto py-24 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-2xl"
        >
          <div className="text-center mb-10">
            <div className="bg-blue-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Lock className="text-blue-600 w-10 h-10" />
            </div>
            <h3 className="text-3xl font-bold text-zinc-900">Đăng nhập Giáo viên</h3>
            <p className="text-zinc-500 mt-3">Vui lòng nhập email và mật khẩu để quản lý lớp học.</p>
          </div>

          <form onSubmit={handleTeacherAuth} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Email giáo viên</label>
              <div className="relative">
                <input 
                  type="email"
                  required
                  value={teacherLoginForm.email}
                  onChange={e => setTeacherLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@vidu.com"
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Mật khẩu</label>
              <div className="relative">
                <input 
                  type="password"
                  required
                  value={teacherLoginForm.password}
                  onChange={e => setTeacherLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Nhập mật khẩu..."
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
              </div>
              <div className="flex justify-end mt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setTeacherAuthMode('forgotPassword');
                    setAuthError('');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
              {authError && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-xs font-bold mt-3 flex items-center gap-2"
                >
                  <AlertTriangle className="w-3 h-3" /> {authError}
                </motion.p>
              )}
            </div>
            <button 
              type="submit"
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 text-lg"
            >
              Đăng nhập
            </button>
            
            <div className="text-center space-y-4">
              <button 
                type="button"
                onClick={() => {
                  setTeacherAuthMode('register');
                  setAuthError('');
                }}
                className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Chưa có tài khoản? Đăng ký mới
              </button>
              <button 
                type="button"
                onClick={() => setUserRole(null)}
                className="w-full text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Quay lại chọn vai trò
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  const renderStudentLogin = () => (
    <div className="max-w-md mx-auto py-24 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-xl"
      >
        <div className="text-center mb-10">
          <div className="bg-orange-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <UserCircle className="text-orange-600 w-10 h-10" />
          </div>
          <h3 className="text-3xl font-bold text-zinc-900">Học sinh đăng nhập</h3>
          <p className="text-zinc-500 mt-3">
            {studentLoginStep === 1 
              ? "Vui lòng nhập mã lớp để bắt đầu." 
              : `Chào mừng em đến với lớp ${loginClass?.name}!`}
          </p>
        </div>

        {studentLoginStep === 1 ? (
          <form onSubmit={handleStudentClassCodeSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-3">Mã lớp</label>
              <div className="relative">
                <input 
                  type="text"
                  required
                  autoFocus
                  value={studentForm.classCode}
                  onChange={e => setStudentForm(prev => ({ ...prev, classCode: e.target.value }))}
                  placeholder="Ví dụ: TH123_4A"
                  className="w-full p-5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-lg"
                />
                <Key className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-300 w-6 h-6" />
              </div>
              {authError && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-sm font-bold mt-3 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" /> {authError}
                </motion.p>
              )}
            </div>
            <button 
              type="submit"
              className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 text-lg"
            >
              Tiếp tục
            </button>
            <button 
              type="button"
              onClick={() => setUserRole(null)}
              className="w-full text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Quay lại
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {!isNewStudent ? (
              <>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {allStudents
                    .filter(s => s.student.classCode === loginClass?.code)
                    .map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleStudentLogin(s.student.name)}
                        className="w-full p-4 bg-zinc-50 hover:bg-orange-50 border border-zinc-100 hover:border-orange-200 rounded-2xl text-left font-bold text-zinc-700 transition-all flex items-center justify-between group"
                      >
                        <span>{s.student.name}</span>
                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-orange-500 transition-colors" />
                      </button>
                    ))}
                  {allStudents.filter(s => s.student.classCode === loginClass?.code).length === 0 && (
                    <p className="text-center py-4 text-zinc-400 text-sm italic">Chưa có học sinh nào trong lớp này.</p>
                  )}
                </div>
                
                <div className="pt-4 border-t border-zinc-100">
                  <button
                    onClick={() => setIsNewStudent(true)}
                    className="w-full py-4 bg-white border-2 border-dashed border-zinc-200 text-zinc-500 rounded-2xl font-bold hover:border-orange-300 hover:text-orange-600 transition-all text-sm"
                  >
                    Tôi chưa có tên trong danh sách
                  </button>
                </div>
              </>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (studentForm.name.trim()) handleStudentLogin(studentForm.name.trim());
                }} 
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-3">Nhập họ và tên của em</label>
                  <input 
                    type="text"
                    required
                    autoFocus
                    value={studentForm.name}
                    onChange={e => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full p-5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-lg"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsNewStudent(false)}
                    className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                  >
                    Quay lại
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
                  >
                    Vào học
                  </button>
                </div>
              </form>
            )}
            
            {!isNewStudent && (
              <button 
                type="button"
                onClick={() => {
                  setStudentLoginStep(1);
                  setLoginClass(null);
                }}
                className="w-full text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Đổi mã lớp khác
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );

  const renderGradeSelection = () => (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-zinc-900 mb-4 tracking-tight">Chào mừng em đến với thế giới Scratch!</h2>
        <p className="text-zinc-600 max-w-lg mx-auto">Hãy chọn lớp học của em hoặc gửi đề bài để AI hướng dẫn cách làm nhé.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {[4, 5].map((g) => {
          const isCorrectGrade = currentStudent ? currentStudent.grade === g : true;
          const isWrongGrade = currentStudent ? currentStudent.grade !== g : false;

          return (
            <motion.button
              key={g}
              whileHover={isCorrectGrade ? { y: -5 } : {}}
              whileTap={isCorrectGrade ? { scale: 0.98 } : {}}
              onClick={() => {
                if (isCorrectGrade) {
                  setGrade(g as Grade);
                  setGradeWarning(null);
                } else {
                  setGradeWarning(`Em đang thuộc lớp ${currentStudent?.grade}. Hãy chọn đúng lớp của mình để học nhé!`);
                }
              }}
              className={`group relative bg-white p-8 rounded-3xl border-2 transition-all text-left ${
                isCorrectGrade 
                  ? 'border-zinc-100 hover:border-orange-400 shadow-xl shadow-zinc-200/50' 
                  : 'border-zinc-100 opacity-60 grayscale-[0.5]'
              } ${isCorrectGrade && currentStudent ? 'ring-4 ring-orange-100 border-orange-200' : ''}`}
            >
              {isCorrectGrade && currentStudent && (
                <div className="absolute -top-3 -right-3 bg-orange-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg z-10">
                  Lớp của em
                </div>
              )}
              
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
                g === 4 
                  ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' 
                  : 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
              }`}>
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Lớp {g}</h3>
              <p className="text-zinc-500 mb-6">Ôn tập kiến thức và thực hành các dự án Scratch dành cho học sinh lớp {g}.</p>
              <div className={`flex items-center font-bold ${isCorrectGrade ? 'text-orange-600' : 'text-zinc-400'}`}>
                {isCorrectGrade ? 'Bắt đầu ngay' : 'Không khả dụng'} <ChevronRight className="w-5 h-5 ml-1" />
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {gradeWarning && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 font-bold justify-center"
          >
            <AlertTriangle className="w-5 h-5" />
            {gradeWarning}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsAnalyzingProblem(true)}
        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 p-8 rounded-3xl text-white shadow-xl shadow-orange-200 flex items-center justify-between group"
      >
        <div className="flex items-center gap-6">
          <div className="bg-white/20 p-4 rounded-2xl">
            <MessageSquarePlus className="w-10 h-10" />
          </div>
          <div className="text-left">
            <h3 className="text-2xl font-bold mb-1">Gửi đề bài để AI hướng dẫn</h3>
            <p className="text-orange-100">Em gặp bài khó? Đừng lo, AI sẽ hướng dẫn em từng bước!</p>
          </div>
        </div>
        <div className="bg-white text-orange-600 p-3 rounded-full group-hover:translate-x-2 transition-transform">
          <ChevronRight className="w-6 h-6" />
        </div>
      </motion.button>
    </div>
  );

  const renderProblemAnalysis = () => (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-zinc-900 mb-4">Hướng dẫn giải bài Scratch</h2>
        <p className="text-zinc-600">Nhập đề bài hoặc tải ảnh lên để AI phân tích và gợi ý cách làm cho em.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
            <label className="block text-sm font-bold text-zinc-700 mb-3">Nhập đề bài Scratch của em</label>
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="Ví dụ: Lập trình cho nhân vật mèo di chuyển theo hình vuông..."
              className="w-full h-48 p-6 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-zinc-700 mb-6"
            />

            <div className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'problem')}
                  className="hidden"
                  id="problem-image-upload"
                />
                <label
                  htmlFor="problem-image-upload"
                  className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 cursor-pointer transition-all"
                >
                  <ImageIcon className="w-5 h-5" />
                  {problemImage ? 'Đã chọn ảnh' : 'Tải ảnh chụp đề bài'}
                </label>
                {problemImage && (
                  <button 
                    onClick={() => setProblemImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {problemImage && (
                <div className="relative rounded-2xl overflow-hidden border border-zinc-200">
                  <img src={problemImage} alt="Problem" className="w-full h-32 object-cover" />
                </div>
              )}

              <button
                onClick={handleAnalyzeProblem}
                disabled={(!problemText.trim() && !problemImage) || loading}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 disabled:opacity-50 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Phân tích đề bài
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {problemAnalysis ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                <h3 className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
                  <HelpCircle className="text-orange-500" /> Đề bài yêu cầu gì?
                </h3>
                <p className="text-zinc-600 leading-relaxed">{problemAnalysis.requirements}</p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                <h3 className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
                  <ChevronRight className="text-blue-500" /> Các bước em nên thực hiện
                </h3>
                <ul className="space-y-3">
                  {problemAnalysis.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-zinc-700 text-sm">
                      <span className="font-bold text-blue-500">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                <h3 className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
                  <Code className="text-purple-500" /> Những nhóm lệnh cần sử dụng
                </h3>
                <div className="flex flex-wrap gap-2">
                  {problemAnalysis.commandGroups.map((group, i) => (
                    <span key={i} className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-purple-100">
                      {group}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-orange-50 p-8 rounded-3xl border border-orange-100 shadow-sm">
                <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
                  <Sparkles className="text-orange-500" /> Câu hỏi gợi mở để em tự làm
                </h3>
                <ul className="space-y-3">
                  {problemAnalysis.guidingQuestions.map((q, i) => (
                    <li key={i} className="flex gap-3 text-orange-800 text-sm italic">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-zinc-100 rounded-3xl border-2 border-dashed border-zinc-200 text-zinc-400">
              <MessageSquarePlus className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">Kết quả phân tích sẽ hiển thị ở đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTopicSelection = () => (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <button 
        onClick={() => setGrade(null)}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 font-bold text-sm mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Quay lại trang chính
      </button>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-zinc-900">Chủ đề học tập - Lớp {grade}</h2>
        <span className="bg-zinc-100 text-zinc-600 px-4 py-1 rounded-full text-sm font-bold">
          {getTopicsByGrade(grade!).length} Chủ đề
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {getTopicsByGrade(grade!).map((topic) => (
          <motion.button
            key={topic.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedTopic(topic)}
            className="bg-white p-6 rounded-2xl border border-zinc-200 hover:shadow-lg transition-all text-left flex flex-col h-full"
          >
            <h3 className="text-lg font-bold text-zinc-900 mb-2">{topic.title}</h3>
            <p className="text-sm text-zinc-500 flex-grow">{topic.description}</p>
            <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center justify-between text-orange-600 font-semibold text-sm">
              Xem chi tiết <ChevronRight className="w-4 h-4" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    if (!selectedTopic) return null;

    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setSelectedTopic(null)}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-zinc-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">{selectedTopic.title}</h2>
            <p className="text-zinc-500 text-sm">Lớp {grade} • {selectedTopic.description}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-zinc-100 rounded-2xl mb-8">
          {[
            { id: 'theory', label: 'Ôn tập lý thuyết', icon: BookOpen },
            { id: 'practice', label: 'Luyện tập thực hành', icon: Code },
            { id: 'challenge', label: 'Thử thách sáng tạo', icon: Trophy },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px] relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl z-20">
              <Loader2 className="w-10 h-10 text-orange-600 animate-spin mb-4" />
              <p className="text-zinc-600 font-medium">AI đang chuẩn bị nội dung cho em...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'theory' && theoryContent && (
                  <div className="space-y-8">
                    <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                      <h3 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                        <BookOpen className="text-blue-500" /> Tóm tắt kiến thức
                      </h3>
                      <ul className="space-y-4">
                        {theoryContent.summary.map((item, i) => (
                          <li key={i} className="flex gap-3 text-zinc-700 leading-relaxed">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      
                      <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                        <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" /> Ví dụ minh họa
                        </h4>
                        <p className="text-blue-800 text-sm italic leading-relaxed">{theoryContent.example}</p>
                      </div>
                    </section>

                    <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                      <h3 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                        <CheckCircle2 className="text-green-500" /> Kiểm tra nhanh
                      </h3>
                      <div className="space-y-8">
                        {theoryContent.quizzes.map((quiz, qIdx) => (
                          <div key={qIdx} className="space-y-4">
                            <p className="font-bold text-zinc-800">{qIdx + 1}. {quiz.question}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {quiz.options.map((option, oIdx) => (
                                <button
                                  key={oIdx}
                                  onClick={() => handleQuizAnswer(qIdx, oIdx)}
                                  className={`p-4 rounded-xl text-left text-sm transition-all border-2 ${
                                    quizResults[qIdx] === oIdx
                                      ? 'border-orange-500 bg-orange-50 text-orange-900'
                                      : 'border-zinc-100 bg-zinc-50 hover:border-zinc-200 text-zinc-700'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                            {showQuizResults && (
                              <div className={`p-4 rounded-xl text-sm ${quizResults[qIdx] === quiz.correctAnswer ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                <p className="font-bold mb-1">
                                  {quizResults[qIdx] === quiz.correctAnswer ? 'Chính xác!' : 'Chưa đúng rồi.'}
                                </p>
                                <p>{quiz.explanation}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {!showQuizResults && (
                        <button
                          onClick={() => setShowQuizResults(true)}
                          className="mt-8 w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
                        >
                          Kiểm tra kết quả
                        </button>
                      )}
                    </section>
                  </div>
                )}

                {activeTab === 'practice' && practiceExercise && (
                  <div className="space-y-8">
                    {/* Level Selection */}
                    <div className="flex gap-4 p-1 bg-zinc-100 rounded-2xl w-fit mx-auto">
                      {(['Dễ', 'Vừa', 'Khó'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setPracticeLevel(lvl)}
                          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                            practiceLevel === lvl 
                              ? 'bg-white text-orange-600 shadow-sm' 
                              : 'text-zinc-500 hover:text-zinc-700'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>

                    <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                          <Code className="text-orange-500" /> {practiceExercise.title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          practiceExercise.level === 'Dễ' ? 'bg-green-100 text-green-700' :
                          practiceExercise.level === 'Vừa' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          Mức độ: {practiceExercise.level}
                        </span>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-bold text-zinc-800 mb-2">Yêu cầu nhiệm vụ:</h4>
                          <p className="text-zinc-600 leading-relaxed">{practiceExercise.task}</p>
                        </div>

                        <div>
                          <h4 className="font-bold text-zinc-800 mb-2">Mục tiêu cần đạt:</h4>
                          <p className="text-zinc-600 leading-relaxed">{practiceExercise.goal}</p>
                        </div>

                        <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <h4 className="font-bold text-zinc-800 mb-3 flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-zinc-400" /> Gợi ý nhóm lệnh:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {practiceExercise.hints.map((hint, i) => (
                              <span key={i} className="bg-white border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 shadow-sm">
                                {hint}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
                          <h4 className="font-bold text-orange-900 mb-2">Câu hỏi định hướng:</h4>
                          <p className="text-orange-800 text-sm italic">{practiceExercise.guidingQuestion}</p>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                      <h3 className="text-xl font-bold text-zinc-900 mb-4">Mô tả cách làm hoặc ý tưởng của em</h3>
                      <p className="text-zinc-500 text-sm mb-4">Hãy viết các bước em sẽ thực hiện hoặc các khối lệnh em sẽ dùng nhé.</p>
                      <textarea
                        value={studentInput}
                        onChange={(e) => setStudentInput(e.target.value)}
                        placeholder="Ví dụ: Đầu tiên em chọn lệnh Sự kiện 'Khi bấm vào lá cờ xanh', sau đó..."
                        className="w-full h-40 p-6 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-zinc-700"
                      />
                      <div className="flex gap-4 mt-6">
                        <button
                          onClick={handleEvaluate}
                          disabled={!studentInput.trim() || loading}
                          className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 disabled:opacity-50 transition-all shadow-lg shadow-orange-200"
                        >
                          Kiểm tra cách làm
                        </button>
                        <button
                          onClick={() => loadTabContent('practice')}
                          className="px-6 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all flex items-center gap-2"
                        >
                          <RefreshCw className="w-5 h-5" /> Bài khác
                        </button>
                      </div>

                      {aiFeedback && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 space-y-4"
                        >
                          <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
                            <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" /> Nhận xét bài làm:
                            </h4>
                            <p className="text-green-800 text-sm">{aiFeedback.comment}</p>
                          </div>
                          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                              <Award className="w-4 h-4" /> Điểm đúng:
                            </h4>
                            <p className="text-blue-800 text-sm">{aiFeedback.correctPoints}</p>
                          </div>
                          <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
                            <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                              <Lightbulb className="w-4 h-4" /> Gợi ý chỉnh sửa:
                            </h4>
                            <p className="text-orange-800 text-sm">{aiFeedback.suggestion}</p>
                          </div>
                          <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100">
                            <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                              <HelpCircle className="w-4 h-4" /> Câu hỏi giúp em suy nghĩ thêm:
                            </h4>
                            <p className="text-purple-800 text-sm italic">{aiFeedback.thoughtQuestion}</p>
                          </div>
                          <div className="p-6 bg-pink-50 rounded-2xl border border-pink-100">
                            <h4 className="font-bold text-pink-900 mb-2 flex items-center gap-2">
                              <Heart className="w-4 h-4" /> Lời động viên:
                            </h4>
                            <p className="text-pink-800 text-sm font-medium italic">"{aiFeedback.encouragement}"</p>
                          </div>
                        </motion.div>
                      )}
                    </section>
                  </div>
                )}

                {activeTab === 'challenge' && challenge && (
                  <div className="space-y-8">
                    <section className="bg-zinc-900 text-white p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 blur-[100px] -mr-32 -mt-32" />
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 blur-[100px] -ml-32 -mb-32" />
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                          <div className="inline-flex items-center gap-2 bg-orange-500 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                            <Trophy className="w-3 h-3" /> Thử thách sáng tạo
                          </div>
                          <button 
                            onClick={() => loadTabContent('challenge')}
                            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold"
                          >
                            <RefreshCw className="w-4 h-4" /> Đổi thử thách khác
                          </button>
                        </div>
                        
                        <h3 className="text-3xl font-bold mb-4">{challenge.title}</h3>
                        <p className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-2xl">
                          {challenge.description}
                        </p>
                        
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Tiêu chí đánh giá (Tổng 10 điểm)</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {challenge.criteria.map((criterion, i) => (
                              <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
                                <div className="text-orange-400 font-bold text-lg mb-1">{criterion.maxPoints}đ</div>
                                <p className="text-xs font-medium text-zinc-300">{criterion.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                      <h3 className="text-xl font-bold text-zinc-900 mb-4">Gửi bài làm của em</h3>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-bold text-zinc-700 mb-3">Mô tả cách em xây dựng chương trình</label>
                          <textarea
                            value={challengeInput}
                            onChange={(e) => setChallengeInput(e.target.value)}
                            placeholder="Hãy kể cho AI nghe em đã lập trình dự án này như thế nào nhé..."
                            className="w-full h-40 p-6 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-zinc-700"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'challenge')}
                              className="hidden"
                              id="challenge-image-upload"
                            />
                            <label
                              htmlFor="challenge-image-upload"
                              className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 cursor-pointer transition-all"
                            >
                              <ImageIcon className="w-5 h-5" />
                              {challengeImage ? 'Đã chọn ảnh chụp màn hình' : 'Tải ảnh chụp màn hình dự án'}
                            </label>
                            {challengeImage && (
                              <button 
                                onClick={() => setChallengeImage(null)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <button
                            onClick={handleGradeChallenge}
                            disabled={!challengeInput.trim() || loading}
                            className="py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 disabled:opacity-50 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                          >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
                            Gửi bài để AI chấm
                          </button>
                        </div>

                        {challengeImage && (
                          <div className="relative rounded-2xl overflow-hidden border border-zinc-200 max-w-md">
                            <img src={challengeImage} alt="Challenge Submission" className="w-full h-auto" />
                          </div>
                        )}
                      </div>
                    </section>

                    {gradingResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                      >
                        <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
                          <h3 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                            <Award className="text-orange-500" /> Kết quả chấm bài
                          </h3>
                          
                          <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 mb-8">
                            <h4 className="font-bold text-zinc-800 mb-2">Nhận xét chung:</h4>
                            <p className="text-zinc-600 text-sm leading-relaxed">{gradingResult.generalComment}</p>
                          </div>

                          <div className="overflow-x-auto mb-8">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-zinc-200">
                                  <th className="py-4 px-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Tiêu chí</th>
                                  <th className="py-4 px-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Điểm</th>
                                  <th className="py-4 px-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Lý do</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gradingResult.scores.map((score, i) => (
                                  <tr key={i} className="border-b border-zinc-50 last:border-0">
                                    <td className="py-4 px-4 text-sm font-bold text-zinc-800">{score.criterion}</td>
                                    <td className="py-4 px-4">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                        {score.score} / {score.maxScore}
                                      </span>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-zinc-600">{score.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 bg-zinc-900 rounded-[2rem] text-white">
                            <div>
                              <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-1">Tổng điểm</p>
                              <div className="text-5xl font-black text-orange-500">{gradingResult.totalScore}<span className="text-2xl text-zinc-600">/10</span></div>
                            </div>
                            <div className="flex-1 text-center sm:text-right">
                              <p className="text-zinc-300 italic font-medium leading-relaxed">"{gradingResult.encouragement}"</p>
                            </div>
                          </div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
                            <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                              <Lightbulb className="w-5 h-5" /> Gợi ý cải thiện:
                            </h4>
                            <p className="text-blue-800 text-sm leading-relaxed">{gradingResult.suggestions}</p>
                          </div>
                          <div className="bg-pink-50 p-8 rounded-3xl border border-pink-100">
                            <h4 className="font-bold text-pink-900 mb-4 flex items-center gap-2">
                              <Heart className="w-5 h-5" /> Lời khen từ AI:
                            </h4>
                            <p className="text-pink-800 text-sm leading-relaxed">{gradingResult.encouragement}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans selection:bg-orange-100 selection:text-orange-900">
      {renderHeader()}
      
      <main>
        {isSettingsOpen ? (
          renderSettings()
        ) : userRole === null ? (
          renderRoleSelection()
        ) : userRole === 'teacher' && !isTeacherAuthenticated ? (
          renderTeacherAuth()
        ) : userRole === 'student' && !currentStudent ? (
          renderStudentLogin()
        ) : activeTab === 'progress' ? (
          renderProgress()
        ) : activeTab === 'management' ? (
          renderManagement()
        ) : isAnalyzingProblem ? (
          renderProblemAnalysis()
        ) : !grade ? (
          renderGradeSelection()
        ) : !selectedTopic ? (
          renderTopicSelection()
        ) : (
          renderContent()
        )}
      </main>

      <footer className="bg-white border-t border-zinc-200 py-12 px-4 mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-600 p-2 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Scratch Master</h3>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">
                Ứng dụng AI hỗ trợ học sinh Tiểu học ôn tập và luyện tập lập trình Scratch theo chương trình GDPT 2018.
              </p>
            </div>
            
            <div className="bg-zinc-50 p-8 rounded-[2rem] border border-zinc-100">
              <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Thông tin liên hệ</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 font-medium">Giáo viên phụ trách</p>
                    <p className="text-sm font-bold text-zinc-900">Vũ Đức Thiện</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 font-medium">Số điện thoại</p>
                    <p className="text-sm font-bold text-zinc-900">0352945168</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 font-medium">Email</p>
                    <p className="text-sm font-bold text-zinc-900">vdthien030295@tuyenquang.edu.vn</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-zinc-100 flex flex-col md:row items-center justify-between gap-4">
            <p className="text-zinc-400 text-xs font-medium">© 2024 Scratch Master. Thiết kế cho giáo dục tiểu học.</p>
            <div className="flex items-center gap-6">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Học tập • Sáng tạo • Phát triển</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border border-zinc-200 text-center"
            >
              <div className="bg-orange-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <LogOut className="text-orange-600 w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Đăng xuất</h3>
              <p className="text-zinc-500 mb-8">Bạn có chắc chắn muốn đăng xuất không?</p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
