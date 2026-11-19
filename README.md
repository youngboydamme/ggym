# GGym

App ghi buổi tập gym cá nhân cho iPhone, dạng web app cài lên màn hình chính. Chạy offline, không có tính năng mạng xã hội, có thể đồng bộ dữ liệu lên Supabase.

## Tính năng

- Ghi buổi tập: kg / reps từng set, cột "lần trước", set khởi động, đồng hồ nghỉ có âm báo; vuốt set sang trái để xoá
- Bài thời gian / quãng đường: Plank, Dead Hang… ghi thời gian; Treadmill, chạy, đạp xe… ghi km + thời gian (đổi cách ghi trong Sửa bài tập)
- Routine theo ngày trong tuần, giữ tên bài để kéo thả đổi thứ tự
- Lịch sử, kỷ lục cá nhân (PR), biểu đồ tiến bộ từng bài, kỷ lục theo số reps
- Cân nặng và % mỡ theo thời gian
- Hình minh hoạ và lưu ý kỹ thuật tiếng Việt cho 48 bài có sẵn, link video YouTube
- Nhiều hồ sơ người tập trên cùng một máy
- Sao lưu / khôi phục JSON, nhập lịch sử từ Hevy (CSV)
- Đồng bộ Supabase (tuỳ chọn): offline-first, gộp thay đổi giữa nhiều máy

## Cài lên iPhone

1. Mở link GitHub Pages của repo bằng **Safari**.
2. Bấm **Chia sẻ → Thêm vào MH chính**.
3. Từ đó luôn mở app bằng biểu tượng trên màn hình chính.

## Bật đồng bộ Supabase

1. Tạo một project Supabase (nên chọn region Singapore).
2. Vào **SQL Editor**, dán toàn bộ file [`supabase/ggym.sql`](supabase/ggym.sql) rồi bấm **Run**. Script chạy lại nhiều lần vẫn an toàn và không xoá dữ liệu.
3. Vào **Authentication → URL Configuration**, đặt **Site URL** là link GitHub Pages của app, để link xác nhận trong email mở đúng app.
   Nếu chỉ dùng cá nhân hoặc với bạn bè tin cậy, có thể tắt **Confirm email** trong **Authentication → Sign In / Providers → Email** để đăng ký xong là dùng được ngay.
4. Vào **Project Settings → API Keys**, lấy **Project URL** và **Publishable key** (hoặc anon key). Có hai cách dùng:
   - Nhập vào app: **Cài đặt → Đồng bộ đám mây**.
   - Hoặc điền vào hằng số `CLOUD0` trong `index.html`, để ai cài app cũng có sẵn cấu hình.
5. Trong app: **Cài đặt → Tạo tài khoản / Đăng nhập**. Mỗi hồ sơ người tập dùng một tài khoản riêng.

Publishable key (anon key) được thiết kế để đặt công khai trong app. Dữ liệu được bảo vệ bằng Row Level Security: mỗi tài khoản chỉ đọc và ghi được dòng của chính mình, và không có quyền xoá.

### Cách đồng bộ hoạt động

- Mỗi tài khoản có 1 dòng trong bảng `ggym_docs`: toàn bộ dữ liệu ở dạng `jsonb`, kèm số phiên bản `rev`.
- App luôn lưu trên máy trước. Khi có mạng, app lấy bản trên server và **gộp** hai bản theo id từng buổi tập / số đo / routine / bài tập (bản sửa sau thắng, mục đã xoá được ghi nhớ), rồi ghi lên server có kiểm tra `rev` để hai máy không ghi đè nhau.
- App tự đồng bộ khi mở, khi quay lại app, khi có mạng trở lại và vài giây sau mỗi thay đổi. Có thêm nút **Đồng bộ ngay** trong Cài đặt.

### Phân tích dữ liệu (SQL / Power BI)

Script tạo sẵn 3 view phẳng, thời gian đã đổi sang giờ Việt Nam:

| View | Nội dung |
|---|---|
| `ggym_workouts` | Mỗi buổi tập: tên, giờ bắt đầu / kết thúc, thời lượng, số PR |
| `ggym_sets` | Mỗi set: bài tập, nhóm cơ, kg, reps, volume, 1RM ước tính (Epley), set khởi động, thời gian (giây), quãng đường (km) |
| `ggym_body` | Cân nặng, % mỡ theo ngày |

Power BI: dùng connector PostgreSQL với chuỗi kết nối lấy từ **Connect → Session pooler**.

## Cấu trúc

```
index.html            toàn bộ app (HTML + CSS + JS, không cần build)
sw.js                 service worker: chạy offline, tự cập nhật
manifest.webmanifest  thông tin cài đặt PWA
icons/                biểu tượng app
img/                  ảnh minh hoạ động tác (2 khung / bài)
supabase/ggym.sql     bảng, RLS, view phân tích
```

Dữ liệu trên máy nằm trong `localStorage`. Các khoá `sota.*` được giữ từ tên cũ của app để không mất dữ liệu.

## Nguồn ảnh

Ảnh minh hoạ lấy từ [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain / Unlicense).
