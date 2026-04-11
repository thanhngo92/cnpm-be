
## Giới thiệu

Backend được xây dựng theo mô hình **RESTful API**, sử dụng các công nghệ chính:

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **ODM:** Mongoose
- **Authentication:** JWT
- **API Style:** RESTful API

## Cấu trúc thư mục

```bash
be/
├── app/                  # Chứa toàn bộ mã nguồn chính của backend
│   ├── config/           # Cấu hình hệ thống, hiện tại gồm cấu hình kết nối database
│   ├── controllers/      # Logic xử lý request và trả response
│   ├── middlewares/      # Middleware xác thực và phân quyền
│   ├── routes/           # Khai báo các API endpoint
│   └── schema/           # Schema/Model làm việc với MongoDB qua Mongoose
├── .env                  # Biến môi trường của backend
├── .gitignore            # Cấu hình bỏ qua file khi sử dụng Git
├── package.json          # Danh sách dependencies và scripts chạy dự án
├── package-lock.json     # Khóa phiên bản package khi dùng npm
├── pnpm-lock.yaml        # Khóa phiên bản package khi dùng pnpm
├── server.js             # Entry point khởi động backend
└── README.md             # Tài liệu mô tả backend
Yêu cầu môi trường

Trước khi chạy dự án, cần cài đặt sẵn:

Node.js
npm hoặc pnpm
MongoDB (local hoặc MongoDB Atlas)
Cài đặt dự án

Clone project về máy:

git clone <repository-url>
cd be

Cài đặt dependencies bằng npm:

npm install

Hoặc bằng pnpm:

pnpm install
Cấu hình biến môi trường

Tạo file .env ở thư mục gốc và cấu hình các biến môi trường cần thiết:

PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
Chạy dự án

Chạy bằng npm:

npm start

Hoặc nếu project có script chạy môi trường development:

npm run dev

Nếu dùng pnpm:

pnpm start

Hoặc:

pnpm dev
Chức năng chính
Xây dựng RESTful API
Kết nối MongoDB với Mongoose
Xác thực người dùng bằng JWT
Middleware phân quyền và xác thực
Tổ chức code theo cấu trúc rõ ràng, dễ mở rộng
