import { Topic, Grade } from './types';

export const TOPICS: Topic[] = [
  // Lớp 4
  { id: '4-1', grade: 4, title: 'Làm quen với Scratch', description: 'Giới thiệu giao diện và cách hoạt động của Scratch.' },
  { id: '4-2', grade: 4, title: 'Nhân vật và sân khấu', description: 'Cách thêm, xóa và thay đổi nhân vật, phông nền.' },
  { id: '4-3', grade: 4, title: 'Lệnh chuyển động', description: 'Di chuyển, xoay và đi tới các vị trí trên sân khấu.' },
  { id: '4-4', grade: 4, title: 'Lệnh hiển thị', description: 'Thay đổi trang phục, nói, nghĩ và hiệu ứng hình ảnh.' },
  { id: '4-5', grade: 4, title: 'Âm thanh', description: 'Thêm và phát các đoạn âm thanh vui nhộn.' },
  { id: '4-6', grade: 4, title: 'Sự kiện', description: 'Bắt đầu chương trình bằng các sự kiện như nhấn phím, click chuột.' },
  
  // Lớp 5
  { id: '5-0', grade: 5, title: 'Vòng lặp cơ bản', description: 'Sử dụng lệnh lặp lại để thực hiện các hành động nhiều lần.' },
  { id: '5-1', grade: 5, title: 'Biến số và phép toán', description: 'Cách tạo biến và sử dụng các phép tính cộng, trừ, nhân, chia.' },
  { id: '5-2', grade: 5, title: 'Cảm biến', description: 'Nhận biết va chạm, khoảng cách và nhập dữ liệu từ bàn phím.' },
  { id: '5-3', grade: 5, title: 'Cấu trúc điều kiện', description: 'Sử dụng lệnh Nếu... thì... để nhân vật đưa ra quyết định.' },
  { id: '5-4', grade: 5, title: 'Vẽ hình với Bút vẽ', description: 'Sử dụng nhóm lệnh Bút vẽ để tạo ra các hình học cơ bản.' },
  { id: '5-5', grade: 5, title: 'Phát tin và Nhận tin', description: 'Cách các nhân vật giao tiếp với nhau qua tin nhắn.' },
  { id: '5-6', grade: 5, title: 'Dự án tổng hợp', description: 'Kết hợp các kiến thức đã học để tạo trò chơi hoặc hoạt hình.' },
];

export const getTopicsByGrade = (grade: Grade) => TOPICS.filter(t => t.grade === grade);
