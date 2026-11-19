# GGym

App ghi buổi tập gym cá nhân cho iPhone, dạng web app cài lên màn hình chính. Chạy offline, không có tính năng mạng xã hội, có thể đồng bộ dữ liệu lên Supabase.

## Tính năng

App có 4 tab: **Tập**, **Lịch sử**, **Bài tập**, **Cơ thể**, cùng bảng **Cài đặt** (biểu tượng bánh răng).

**Tập**
- Tuần này: các ngày đã tập, số buổi, tổng volume và thời gian
- Routine theo ngày trong tuần, chỉnh từng set, giữ tên bài để kéo thả đổi thứ tự; dòng tổng số bài, số set, khối lượng; lưu một buổi đã tập thành routine
- Ghi buổi tập: kg / reps từng set, cột "lần trước", set khởi động, khối lượng cộng dồn khi đang tập; vuốt set sang trái để xoá
- Bài thời gian / quãng đường: Plank, Dead Hang… ghi thời gian; Treadmill, chạy, đạp xe… ghi km + thời gian (đổi cách ghi trong Sửa bài tập)
- Đồng hồ nghỉ có âm báo, ±15 giây, thời gian nghỉ mặc định và riêng từng bài

**Lịch sử**
- Xem theo tháng với lịch (ngày có tập tô đỏ), tổng số buổi, số buổi 30 ngày, số tuần tập liên tiếp
- Sửa, xoá, lặp lại buổi tập; số kỷ lục (PR) mỗi buổi
- Thống kê 30 ngày / 3 tháng / 1 năm: so với kỳ trước, biểu đồ Volume / Thời gian / Set / Buổi, phân bổ set theo nhóm cơ, bài tập chính kèm 1RM ước tính, kỷ lục, thói quen theo ngày trong tuần

**Bài tập**
- Thư viện 310 bài, tên theo kiểu "tên bài (dụng cụ)", lọc theo 10 nhóm cơ, tìm kiếm
- Lưu ý kỹ thuật tiếng Việt, link video YouTube; ảnh minh hoạ có sẵn cho 48 bài, thêm ảnh / video từ wger.de
- Biểu đồ tiến bộ từng bài (1RM, tạ max, volume, reps, thời gian, quãng đường), kỷ lục theo số reps
- Tạo bài tập mới; màn **Map bài tập** gộp bài tự tạo / đã xoá vào bài có sẵn, có gợi ý bài gần giống

**Cơ thể**
- Cân nặng và % mỡ theo thời gian
- Chỉ số InBody: cơ xương, mỡ, mỡ nội tạng, nước, BMR, điểm InBody…, nạc / mỡ từng vùng
- Số đo các vòng (cm): eo, hông/mông, ngực, vai, đùi và bắp tay tách trái / phải
- Nhập hàng loạt từ Excel / CSV, có file mẫu

**Dữ liệu**
- Sao lưu / khôi phục JSON
- Đồng bộ Supabase (tuỳ chọn): offline-first, gộp thay đổi giữa nhiều máy; 1 email = 1 hồ sơ

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
5. Trong app: **Cài đặt → Tạo tài khoản / Đăng nhập**. Mỗi email là một hồ sơ: đăng nhập email khác thì máy tải dữ liệu của email đó (dữ liệu email cũ vẫn trên server).

Publishable key (anon key) được thiết kế để đặt công khai trong app. Dữ liệu được bảo vệ bằng Row Level Security: mỗi tài khoản chỉ đọc và ghi được dòng của chính mình, và không có quyền xoá.

### Cách đồng bộ hoạt động

- Mỗi buổi tập / lần đo / routine / bài tập là **1 dòng** trong bảng `ggym_items` (`kind`, `id`, `data` jsonb, `u` = thời điểm sửa). Mục đã xoá là dòng `kind = 'del'`; cài đặt, thời gian nghỉ và buổi đang tập nằm ở dòng `kind = 'meta'`.
- App luôn lưu trên máy trước. Khi có mạng, app chỉ **tải các dòng mới hơn** lần đồng bộ trước (theo `updated_at` của server), gộp theo id (bản sửa sau thắng, mục đã xoá được ghi nhớ), rồi chỉ **gửi các mục đã sửa** kể từ lần gửi trước. Dung lượng mỗi lần đồng bộ tỉ lệ với số thay đổi, không tăng theo tổng số buổi tập.
- Trigger trên server bỏ qua bản gửi lên cũ hơn bản đang có (so `u`), nên hai máy gửi cùng lúc không đè nhau.
- Cách cũ (cả dữ liệu là 1 dòng `jsonb` trong `ggym_docs`) vẫn được giữ:
  - Chạy SQL mới sẽ chuyển dữ liệu `ggym_docs` sang `ggym_items` ngay.
  - Supabase chưa chạy SQL mới thì app tự dùng cách cũ, nên cập nhật app trước hay chạy SQL trước đều được.
  - Máy chưa cập nhật app vẫn ghi vào `ggym_docs`; app mới kiểm tra `rev` của dòng đó mỗi lần đồng bộ và gộp vào nếu nó đổi.
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

Không cần build: các file được phục vụ nguyên trạng trên GitHub Pages.

```
index.html            khung trang, nạp CSS và các file JS theo thứ tự
css/app.css           toàn bộ giao diện
js/util.js            định dạng số, ngày giờ, 1RM, icon
js/library.js         thư viện 310 bài tập, cách ghi set, routine mẫu
js/store.js           lưu trữ trên máy (IndexedDB + localStorage), PR
js/ui.js              trạng thái giao diện, render
js/guide.js           hình minh hoạ, lưu ý kỹ thuật, video
js/views.js           các màn hình
js/sheet.js           sheet, toast, chọn bài, kết thúc buổi
js/io.js              sao lưu / khôi phục, nhập Excel / CSV, Cài đặt
js/sync.js            đồng bộ Supabase (mỗi mục 1 dòng, tự dùng cách cũ khi chưa có bảng)
js/main.js            hành động, sự kiện, cử chỉ, đồng hồ, khởi động
sw.js                 service worker: chạy offline, tự cập nhật
manifest.webmanifest  thông tin cài đặt PWA
icons/                biểu tượng app
img/                  ảnh minh hoạ động tác (2 khung / bài)
supabase/ggym.sql     bảng, RLS, trigger, chuyển dữ liệu cũ, view phân tích
```

Các file JS là script thường (không phải module), dùng chung phạm vi toàn cục và chạy theo thứ tự trong `index.html`: file sau dùng được hàm / biến của file trước. Khi thêm file mới, thêm vào cả `index.html` và danh sách `SHELL` trong `sw.js`. **Mỗi lần sửa bất kỳ file nào, tăng số `CACHE` trong `sw.js`**, nếu không máy đã cài sẽ tiếp tục dùng bản cũ trong cache.

### Lưu trữ trên máy

- Bản chính nằm trong **IndexedDB** (database `ggym`), chứa được nhiều hơn giới hạn khoảng 5 MB của `localStorage`.
- `localStorage` vẫn được ghi song song làm bản dự phòng khi còn chỗ. Mỗi lần lưu có dấu thời gian; lúc mở app, bản nào lưu sau cùng được dùng. Dữ liệu cũ chỉ có trong `localStorage` được chuyển sang IndexedDB tự động ở lần mở đầu tiên.
- Mở từ màn hình chính, app xin trình duyệt bật lưu lâu dài (`navigator.storage.persist`). Trạng thái hiện ở cuối **Cài đặt → Sao lưu**.
- Chưa bật đồng bộ Supabase thì cứ 14 ngày app nhắc xuất bản sao lưu trên tab Tập.
- Dữ liệu của tab Safari và của app trên màn hình chính vẫn tách riêng (giới hạn của iOS); muốn dùng chung thì bật đồng bộ.
- Các khoá `sota.*` được giữ từ tên cũ của app để không mất dữ liệu.

## Nguồn ảnh

Ảnh minh hoạ lấy từ [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain / Unlicense). Một số ảnh / video khác tải từ [wger.de](https://wger.de) (Creative Commons).
