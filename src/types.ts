export type Grade = 4 | 5;

export interface Topic {
  id: string;
  title: string;
  grade: Grade;
  description: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface TheoryContent {
  summary: string[];
  example: string;
  quizzes: QuizQuestion[];
}

export interface PracticeExercise {
  id: string;
  title: string;
  level: 'Dễ' | 'Vừa' | 'Khó';
  task: string;
  goal: string;
  hints: string[];
  guidingQuestion: string;
}

export interface ChallengeCriterion {
  label: string;
  maxPoints: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  criteria: ChallengeCriterion[];
}

export interface GradingResult {
  scores: {
    criterion: string;
    score: number;
    maxScore: number;
    reason: string;
  }[];
  totalScore: number;
  generalComment: string;
  suggestions: string;
  encouragement: string;
}

export interface AIResponse {
  comment: string;
  correctPoints: string;
  suggestion: string;
  thoughtQuestion: string;
  encouragement: string;
}

export interface ProblemAnalysis {
  requirements: string;
  steps: string[];
  commandGroups: string[];
  guidingQuestions: string[];
}

export interface Student {
  name: string;
  grade: Grade;
  className: string;
  schoolName: string;
  teacherName: string;
  classCode: string;
}

export interface TeacherProfile {
  schoolName: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface ClassInfo {
  id: string;
  name: string;
  code: string;
  grade: Grade;
  teacherEmail: string;
}

export interface StudentProgress {
  student: Student;
  progress: ProgressState;
  analysis?: AIProgressAnalysis;
}

export interface TheoryRecord {
  topicId: string;
  topicTitle: string;
  correctCount: number;
  totalCount: number;
  timestamp: number;
}

export interface PracticeRecord {
  topicId: string;
  topicTitle: string;
  level: 'Dễ' | 'Vừa' | 'Khó';
  completed: boolean;
  attempts: number;
  aiFeedback: string;
  timestamp: number;
}

export interface ChallengeRecord {
  topicId: string;
  topicTitle: string;
  scores: { criterion: string; score: number; maxScore: number }[];
  totalScore: number;
  suggestions: string;
  timestamp: number;
}

export interface ProblemHistoryRecord {
  problemText: string;
  problemImage?: string;
  analysis: ProblemAnalysis;
  timestamp: number;
}

export interface ProgressState {
  theory: TheoryRecord[];
  practice: PracticeRecord[];
  challenges: ChallengeRecord[];
  problem_history?: ProblemHistoryRecord[];
}

export interface AIProgressAnalysis {
  generalComment: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string;
  encouragement: string;
  strongSkills: string[];
  weakSkills: string[];
}

export interface ClassReport {
  className: string;
  summary: string;
  weakTopics: string[];
  reviewSuggestions: string;
  differentiation: {
    reinforcement: string[];
    advanced: string[];
  };
}
