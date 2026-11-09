# Chùa Online — chánh điện mô phỏng cho TikTok LIVE và web

Sản phẩm thương mại phát triển từ Chánh Điện Online của Kent Juno (MIT). Repo: `DANG-PH/chua-online`. Có hai phần: web tĩnh `index.html` (người dùng tự vào ngồi) và bộ LIVE `live/` (server Node + overlay 9:16 + bảng điều khiển, chạy trên máy streamer). Không có framework, không có bước build: mỗi trang là một file HTML tự chứa.

## Git

- **KHÔNG thêm dòng `Co-Authored-By: Claude …` (hay bất kỳ dòng ghi tên Claude/AI nào) vào commit message, mô tả PR hoặc tag.** Commit đứng tên chủ repo (DANG-PH).
- Không commit `live/data/` (mã bản quyền, cài đặt, danh sách người quen), `live/tts/`, `node_modules/`, file `.pem`. Khóa bí mật cấp key nằm ngoài repo (`~/.chua-online/license-private.pem`).

## Nguyên tắc làm việc

**Ưu tiên cẩn trọng hơn tốc độ.** Với việc nhỏ, hiển nhiên thì dùng phán đoán, không cần áp dụng máy móc.

**Suy nghĩ trước khi code.** Nêu rõ giả định đang đặt ra, nếu không chắc thì hỏi trước khi làm. Nếu có nhiều cách hiểu yêu cầu, trình bày các phương án thay vì tự chọn âm thầm. Nếu có cách đơn giản hơn, nói ra.

**Đơn giản là ưu tiên số một.** Chỉ viết đủ code giải quyết đúng yêu cầu. Không thêm tính năng, abstraction, hay config ngoài phạm vi được yêu cầu. Không xử lý lỗi cho tình huống không thể xảy ra.

**Thay đổi có phẫu thuật.** Chỉ đụng vào phần bắt buộc phải sửa. Không refactor hay "cải thiện" code xung quanh nếu không được yêu cầu. Giữ đúng style hiện tại của repo (JS thuần, dòng dài kiểu nén, chú thích tiếng Anh trong code, chữ hiển thị tiếng Việt). Tự dọn import/biến thừa do chính thay đổi của mình gây ra; nếu thấy dead code có sẵn không liên quan thì chỉ nêu ra, không tự xóa.

**Thực thi theo mục tiêu kiểm chứng được.** Biến yêu cầu mơ hồ thành tiêu chí rõ ràng. Với task nhiều bước, nêu kế hoạch ngắn gọn kèm cách verify từng bước trước khi làm.

## Quy tắc riêng của sản phẩm (không được phá)

- **Người xem tham gia không mất tiền, không bán công đức.** Không viết chữ hay câu đọc nào gắn quà với phước, công đức hay kết quả tâm linh ở chế độ mặc định (`wording: 'an-toan'`). Mọi tính năng giữ chân mới (như niệm chung, hồi hướng, chào người quay lại) phải dùng được mà không cần quà.
- **Không tạo tương tác giả trong LIVE thật.** Lệnh `chat`/`gift`/`fill`/`bots` bị chặn khi `tiktokState.status === 'connected'`; giữ nguyên hành vi đó.
- Chữ đưa lên màn hình hoặc vào giọng đọc phải qua `blockedReason()` (từ cấm, link, dãy số dài). Hiển thị bằng `textContent`/canvas, không chèn HTML.
- Không dùng tên hay hình ảnh chùa có thật. Không hiện số tài khoản, mã QR hay link quyên góp trên overlay.
- Lý do của từng quy tắc: `docs/research/` và `docs/business/ke-hoach-thuong-mai-hoa.md` (Luật Tín ngưỡng, tôn giáo sửa đổi có hiệu lực 01/01/2027; chính sách TikTok LIVE về dụ quà, tự động hóa, tương tác giả).

## Kiến trúc

```
index.html                 web tĩnh (Cloudflare Pages), đám đông mô phỏng, lưu tiến độ trong localStorage
assets/theme-loader.js     nạp theme, dùng chung cho index.html và overlay
assets/themes/<id>/        theme.json (ảnh, tọa độ sàn/hào quang/sư, nhạc, màu) + file ảnh/nhạc; "fallback" theo từng file
live/server.mjs            TikTok → state → WebSocket; Edge TTS; kiểm duyệt; license; lưu live/data/
live/overlay.html          canvas 1080×1920, chỉ nhận dữ liệu
live/control.html          bảng điều khiển (role=control)
live/license.mjs           kiểm tra key Ed25519 (CO1.<payload>.<sig>), Free 36 chỗ / Pro 100 chỗ
tools/license.mjs          keygen | issue | verify (chỉ người bán dùng)
docs/                      research, kế hoạch kinh doanh, phân tích kỹ thuật, prompt cho designer
```

- Tọa độ phụ thuộc tranh nền (sàn, hào quang, khói hương, 3 vị sư, bồ đoàn vẽ sẵn `seats`/`seatsExtra`/`perspective`) nằm trong `theme.json`, **không hard-code trong JS**. Sức chứa tự động: theme classic là 16 → 24 → 36 → 64 → 100, theme không có `seats` là 24 → 36 → 64 → 100.
- Thêm cài đặt mới: khai báo mặc định trong `settings`, thêm luật trong `SETTING_RULES` (kẹp kiểu/giới hạn), thêm id vào `SETTING_IDS` của `control.html`.
- Server chỉ phục vụ `/assets` và `/live`; `/live/data/` luôn trả 404. Giữ mô hình bảo mật này (127.0.0.1, kiểm tra Host và Origin).

## Chạy local

```bash
cd live && npm install && npm start     # http://localhost:3000/live/control.html
python3 -m http.server 8080             # (ở thư mục gốc) web: http://localhost:8080/index.html?theme=tinh-tam
```

Kiểm tra nhanh mà không cần TikTok: bảng điều khiển → Diễn tập (bình luận/quà mô phỏng, đổ người mẫu, bot). Ảnh chụp headless: `google-chrome --headless=new --screenshot=out.png --window-size=540,960 --virtual-time-budget=6000 http://localhost:3000/live/overlay.html`.

## Trạng thái (03/11/2026)

- Đã có: hệ thống theme, license Free/Pro, chế độ An toàn, lọc bình luận, khóa diễn tập khi LIVE, niệm chung, hồi hướng, chào người quay lại, web niệm 108 biến + chuỗi ngày + nút mời bạn. Đã kiểm thử 21 trường hợp qua WebSocket và chụp màn hình headless.
- Web đã deploy: https://dang-ph.github.io/chua-online/ (GitHub Pages từ `main` /, có `.nojekyll`). Đổi domain thì sửa `og:url`/`og:image` trong `index.html`.
- **Chưa thử với một phiên TikTok LIVE thật.**
- **Phải quyết trước khi bán:** `tiktok-live-connector@2.5.0` dùng giấy phép AGPL-3.0 (bản 2.4.0 là MIT). Xem mục 9 của `docs/business/ke-hoach-thuong-mai-hoa.md`.
- Đồ họa: theme `tinh-tam` đang dùng tạm file của `classic` (Google Flow/Gemini, chưa rõ quyền thương mại). Đang chờ designer làm theo `docs/design/`. Khi có đủ file và giấy tờ thì đổi `commercialReady: true`.
- `STREAMER_URL` trong `index.html` đang để trống, chờ có landing page.
