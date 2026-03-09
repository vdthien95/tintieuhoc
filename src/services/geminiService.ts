import { GoogleGenAI, Type } from "@google/genai";
import { 
  TheoryContent, 
  PracticeExercise, 
  AIResponse, 
  Challenge, 
  Grade, 
  ProblemAnalysis, 
  GradingResult,
  Student,
  ProgressState,
  AIProgressAnalysis,
  ClassReport
} from "../types";

let genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const model = "gemini-3-flash-preview";

export const updateApiKey = (key: string) => {
  genAI = new GoogleGenAI({ apiKey: key });
};

export const generateTheoryContent = async (topicTitle: string, grade: Grade): Promise<TheoryContent> => {
  const response = await genAI.models.generateContent({
    model,
    contents: `Bạn là trợ lý học tập Scratch cho học sinh lớp ${grade}. Hãy soạn nội dung ôn tập cho chủ đề: "${topicTitle}".
    Yêu cầu:
    1. Tóm tắt lý thuyết ngắn gọn, dễ hiểu (dạng gạch đầu dòng).
    2. Một ví dụ tình huống thực tế gần gũi.
    3. 3 câu hỏi trắc nghiệm (mỗi câu 4 phương án, chỉ 1 đáp án đúng).
    Ngôn ngữ: Tiếng Việt, phù hợp lứa tuổi 9-11.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.ARRAY, items: { type: Type.STRING } },
          example: { type: Type.STRING },
          quizzes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER, description: "Index of correct option (0-3)" },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswer", "explanation"]
            }
          }
        },
        required: ["summary", "example", "quizzes"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generatePracticeExercise = async (topicTitle: string, grade: Grade, level: string): Promise<PracticeExercise> => {
  let levelInstruction = "";
  if (level === "Dễ") {
    levelInstruction = "Yêu cầu rõ ràng, tập trung vào một kỹ năng chính (ví dụ: dùng lệnh chuyển động hoặc sự kiện đơn giản). Gợi ý nhóm lệnh nên sử dụng cụ thể.";
  } else if (level === "Vừa") {
    levelInstruction = "Kết hợp 2 kỹ năng (ví dụ: sự kiện + lặp, chuyển động + điều kiện). Cần có câu hỏi định hướng suy nghĩ.";
  } else {
    levelInstruction = "Yêu cầu xây dựng tình huống gần với dự án nhỏ. Học sinh tự phân tích nhiều bước. Chỉ gợi ý định hướng, không nêu chi tiết cách làm.";
  }

  const response = await genAI.models.generateContent({
    model,
    contents: `Tạo một bài tập thực hành Scratch mức độ "${level}" cho học sinh lớp ${grade} về chủ đề "${topicTitle}".
    Nguyên tắc mức độ: ${levelInstruction}
    Yêu cầu phản hồi JSON gồm:
    1. title: Tên bài tập.
    2. task: Yêu cầu nhiệm vụ.
    3. goal: Mục tiêu cần đạt.
    4. hints: Gợi ý nhóm lệnh (Dễ: cụ thể; Vừa: nhóm lệnh; Khó: định hướng).
    5. guidingQuestion: Câu hỏi định hướng.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          task: { type: Type.STRING },
          goal: { type: Type.STRING },
          hints: { type: Type.ARRAY, items: { type: Type.STRING } },
          guidingQuestion: { type: Type.STRING }
        },
        required: ["title", "task", "goal", "hints", "guidingQuestion"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return { ...data, level, id: Math.random().toString(36).substr(2, 9) };
};

export const evaluateStudentWork = async (task: string, studentDescription: string): Promise<AIResponse> => {
  const response = await genAI.models.generateContent({
    model,
    contents: `Nhiệm vụ: "${task}"
    Học sinh mô tả cách làm: "${studentDescription}"
    Hãy đóng vai giáo viên Tin học tiểu học, nhận xét cách làm của học sinh.
    Yêu cầu:
    1. Nhận xét bài làm (đúng/sai/thiếu).
    2. Điểm đúng (những gì học sinh đã làm tốt).
    3. Gợi ý chỉnh sửa (nếu cần).
    4. Câu hỏi giúp em suy nghĩ thêm.
    5. Lời động viên.
    Lưu ý: KHÔNG cung cấp toàn bộ chuỗi lệnh hoàn chỉnh.
    Ngôn ngữ: Nhẹ nhàng, khích lệ, dễ hiểu.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          comment: { type: Type.STRING },
          correctPoints: { type: Type.STRING },
          suggestion: { type: Type.STRING },
          thoughtQuestion: { type: Type.STRING },
          encouragement: { type: Type.STRING }
        },
        required: ["comment", "correctPoints", "suggestion", "thoughtQuestion", "encouragement"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateChallenge = async (topicTitle: string, grade: Grade): Promise<Challenge> => {
  const response = await genAI.models.generateContent({
    model,
    contents: `Tạo một thử thách sáng tạo (dự án mini) Scratch cho học sinh lớp ${grade} sau khi học xong chủ đề "${topicTitle}".
    Yêu cầu: Dự án có thể hoàn thành trong 1 tiết học (35-40 phút).
    Bao gồm: Tên thử thách, Mô tả nhiệm vụ.
    Tiêu chí đánh giá bắt buộc (tổng 10 điểm):
    1. Đúng yêu cầu đề bài (4 điểm)
    2. Sử dụng đúng nhóm lệnh cần thiết (3 điểm)
    3. Logic hoạt động chính xác (2 điểm)
    4. Có yếu tố sáng tạo (1 điểm)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          criteria: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                maxPoints: { type: Type.NUMBER }
              },
              required: ["label", "maxPoints"]
            } 
          }
        },
        required: ["title", "description", "criteria"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return { ...data, id: Math.random().toString(36).substr(2, 9) };
};

export const gradeChallenge = async (challenge: Challenge, studentDescription: string, imageData?: string): Promise<GradingResult> => {
  const parts: any[] = [
    { text: `Bạn là giáo viên Tin học tiểu học. Hãy chấm điểm bài làm thử thách Scratch của học sinh.
    Thử thách: "${challenge.title}"
    Mô tả thử thách: "${challenge.description}"
    Tiêu chí chấm điểm: ${JSON.stringify(challenge.criteria)}
    
    Bài làm của học sinh (mô tả): "${studentDescription}"
    
    Yêu cầu:
    1. Phân tích nội dung mô tả hoặc hình ảnh (nếu có).
    2. Chấm điểm theo từng tiêu chí.
    3. Giải thích vì sao đạt hoặc chưa đạt cho mỗi tiêu chí.
    4. Đưa gợi ý cải thiện cụ thể.
    5. Động viên tích cực.
    
    Phản hồi theo định dạng JSON.` }
  ];

  if (imageData) {
    parts.push({
      inlineData: {
        data: imageData.split(',')[1],
        mimeType: "image/png"
      }
    });
  }

  const response = await genAI.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scores: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                criterion: { type: Type.STRING },
                score: { type: Type.NUMBER },
                maxScore: { type: Type.NUMBER },
                reason: { type: Type.STRING }
              },
              required: ["criterion", "score", "maxScore", "reason"]
            }
          },
          totalScore: { type: Type.NUMBER },
          generalComment: { type: Type.STRING },
          suggestions: { type: Type.STRING },
          encouragement: { type: Type.STRING }
        },
        required: ["scores", "totalScore", "generalComment", "suggestions", "encouragement"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const analyzeProblem = async (text: string, imageData?: string): Promise<ProblemAnalysis> => {
  const parts: any[] = [
    { text: `Bạn là trợ lý Scratch. Hãy phân tích đề bài sau và hướng dẫn học sinh tiểu học cách làm (không giải hộ hoàn toàn).
    Đề bài văn bản: "${text}"
    Yêu cầu phản hồi theo định dạng JSON với 4 phần:
    1. requirements: Đề bài yêu cầu gì? (Xác định yêu cầu chính)
    2. steps: Các bước em nên thực hiện (Chia nhỏ nhiệm vụ)
    3. commandGroups: Những nhóm lệnh cần sử dụng (sự kiện, chuyển động, hiển thị, lặp, điều kiện, biến...)
    4. guidingQuestions: Câu hỏi gợi mở để em tự làm (Giúp học sinh tự suy nghĩ)` }
  ];

  if (imageData) {
    parts.push({
      inlineData: {
        data: imageData.split(',')[1],
        mimeType: "image/png"
      }
    });
  }

  const response = await genAI.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          requirements: { type: Type.STRING },
          steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          commandGroups: { type: Type.ARRAY, items: { type: Type.STRING } },
          guidingQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["requirements", "steps", "commandGroups", "guidingQuestions"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const analyzeIndividualProgress = async (student: Student, progress: ProgressState): Promise<AIProgressAnalysis> => {
  // Filter out problem_history for official analysis
  const { problem_history, ...officialProgress } = progress;
  
  const response = await genAI.models.generateContent({
    model,
    contents: `Bạn là trợ lý phân tích học tập Scratch chuyên nghiệp. Hãy phân tích tiến độ của học sinh dựa trên DỮ LIỆU HỌC TẬP CHÍNH THỨC (Ôn tập lý thuyết, Luyện tập thực hành, Thử thách sáng tạo).
    
    LƯU Ý QUAN TRỌNG: 
    - CHỈ phân tích dữ liệu trong các phần học theo chủ đề.
    - KHÔNG sử dụng dữ liệu từ phần "Gửi đề bài để AI hướng dẫn" (nếu có trong lịch sử).
    - Nếu không có dữ liệu học tập chính thức, hãy trả về thông báo "Chưa có dữ liệu học tập chính thức".

    Học sinh: ${student.name}, Lớp: ${student.className}, Khối: ${student.grade}
    Dữ liệu học tập chính thức: ${JSON.stringify(officialProgress)}
    
    Yêu cầu phân tích chi tiết:
    1. Tổng quan tiến độ theo chủ đề.
    2. Tỷ lệ hoàn thành và độ chính xác trung bình của từng chủ đề (phần Lý thuyết).
    3. Mức độ thực hành cao nhất đã hoàn thành (Dễ/Vừa/Khó) và số lần thử (phần Luyện tập).
    4. Điểm trung bình và nhận xét tổng hợp từ các Thử thách sáng tạo.
    5. Liệt kê 3-5 kỹ năng mạnh (kỹ năng Scratch cụ thể).
    6. Liệt kê 2-3 nội dung cần luyện thêm.
    7. Gợi ý bước luyện tập tiếp theo phù hợp với năng lực.
    8. Lời động viên tích cực.
    
    Phản hồi định dạng JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          generalComment: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
          nextSteps: { type: Type.STRING },
          encouragement: { type: Type.STRING },
          strongSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          weakSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["generalComment", "strengths", "improvements", "nextSteps", "encouragement", "strongSkills", "weakSkills"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const analyzeClassProgress = async (classCode: string, className: string, studentsData: { student: Student, progress: ProgressState }[]): Promise<ClassReport> => {
  // Filter studentsData to only include official progress
  const officialStudentsData = studentsData.map(d => {
    const { problem_history, ...officialProgress } = d.progress;
    return {
      name: d.student.name,
      progress: officialProgress
    };
  });

  const response = await genAI.models.generateContent({
    model,
    contents: `Bạn là chuyên gia sư phạm Tin học. Hãy phân tích báo cáo tiến độ cho lớp: ${className} (Mã lớp: ${classCode}) dựa trên DỮ LIỆU HỌC TẬP CHÍNH THỨC.
    
    LƯU Ý QUAN TRỌNG:
    - CHỈ thấy dữ liệu từ các hoạt động học chính thức theo chủ đề (Lý thuyết, Thực hành, Thử thách).
    - KHÔNG lấy dữ liệu từ phần "Gửi đề bài để AI hướng dẫn" để đánh giá năng lực.
    
    Dữ liệu tổng hợp từ các học sinh: ${JSON.stringify(officialStudentsData)}
    
    Yêu cầu:
    1. Nhận xét tổng quan về trình độ chung của lớp dựa trên các hoạt động có cấu trúc.
    2. Xác định các chủ đề/kỹ năng mà nhiều học sinh còn yếu.
    3. Đề xuất nội dung giáo viên nên ôn tập lại cho cả lớp.
    4. Gợi ý phân hóa học sinh: Nhóm cần củng cố (tên học sinh) và Nhóm có thể nâng cao (tên học sinh).
    
    Phản hồi định dạng JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          className: { type: Type.STRING },
          summary: { type: Type.STRING },
          weakTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          reviewSuggestions: { type: Type.STRING },
          differentiation: {
            type: Type.OBJECT,
            properties: {
              reinforcement: { type: Type.ARRAY, items: { type: Type.STRING } },
              advanced: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["reinforcement", "advanced"]
          }
        },
        required: ["className", "summary", "weakTopics", "reviewSuggestions", "differentiation"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const analyzeTeacherOverview = async (teacherName: string, schoolName: string, classesData: { className: string, classCode: string, studentCount: number, avgAccuracy: number, weakTopics: string[] }[]): Promise<string> => {
  const response = await genAI.models.generateContent({
    model,
    contents: `Bạn là cố vấn chuyên môn Tin học. Hãy đưa ra nhận xét tổng quan và so sánh giữa các lớp cho giáo viên ${teacherName} tại trường ${schoolName}.
    Dữ liệu các lớp: ${JSON.stringify(classesData)}
    
    Yêu cầu:
    1. So sánh tiến độ giữa các lớp (lớp nào đang nhanh hơn, lớp nào cần chú ý hơn).
    2. Tìm ra điểm chung về khó khăn của học sinh toàn trường (nếu có).
    3. Đưa ra lời khuyên quản lý và giảng dạy hiệu quả cho giáo viên.
    4. Ngôn ngữ: Chuyên nghiệp, khích lệ, mang tính định hướng sư phạm.
    5. Trả về văn bản Markdown ngắn gọn.`,
  });

  return response.text || "Không có phản hồi từ AI.";
};
