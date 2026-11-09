# Chùa Online

**Một góc tĩnh lặng mỗi ngày.** Chánh điện mô phỏng 2.5D cho TikTok LIVE và cho web. Người xem bình luận là bước vào chánh điện, ngồi xuống bồ đoàn, cùng niệm Phật. Người xem tham gia không mất tiền, không bán công đức.

| Thư mục | Là gì |
|---|---|
| `index.html`, `assets/` | Bản web cho mọi người tự vào ngồi: thắp hương, niệm 108 biến, giữ chuỗi ngày, nghe nhạc thiền. Đưa lên Cloudflare Pages |
| `live/` | Bộ công cụ phát LIVE chạy trên máy streamer: server Node, overlay 9:16, bảng điều khiển |
| `assets/themes/` | Giao diện (ảnh nền, nhân vật, hiệu ứng, nhạc, tọa độ). Xem `docs/design/` |
| `tools/license.mjs` | Cấp mã bản quyền Pro (chỉ người bán dùng) |
| `docs/` | Research trào lưu, kế hoạch thương mại hóa, phân tích kỹ thuật, prompt cho designer |

## Chạy bộ LIVE

Cần Node.js 20 trở lên.

```bash
cd live
npm install
npm start
```

1. Mở `http://localhost:3000/live/control.html` (bảng điều khiển).
2. Bấm **Mở màn hình overlay 9:16**, rồi bấm **Bật âm thanh** một lần trong cửa sổ đó.
3. Trong TikTok LIVE Studio: *Add source → Window capture* → chọn cửa sổ overlay. Nếu dùng OBS: *Browser source* trỏ tới `http://localhost:3000/live/overlay.html`, kích thước 1080×1920.
4. Bật LIVE trên TikTok, nhập `@username` vào bảng điều khiển, bấm **Kết nối**.

Chưa live vẫn thử được bằng mục **Diễn tập** (bình luận/quà mô phỏng, đổ người mẫu, bot). Khi đã kết nối LIVE thật, mục này bị khóa và bot tự được dọn, để không tạo tương tác giả.

### Người xem làm được gì

- **Bình luận bất kỳ**: được vào ngồi (tự mở rộng 24 → 36 → 64 → 100 chỗ). Đầy chỗ thì người im lặng lâu nhất mà chưa tặng quà sẽ nhường chỗ.
- **Bình luận đúng một từ** `nam`, `nữ`, `sư`, `ni`, `tiểu`, `bà`, `cao tăng`: đổi hình nhân vật.
- **Niệm chung**: bình luận "Nam mô…" hoặc thả tim sẽ làm đầy thanh 108 biến của cả phòng. Đủ 108 thì chuông lớn vang, sen rơi, sang vòng mới.
- **Gõ lời nguyện** (có chữ cầu/nguyện/mong/xin/chúc…): được đọc lên, tối đa 1 câu / 20 giây, không cần quà.
- **Hồi hướng**: mỗi 10 phút đọc tên tối đa 12 người đang có mặt.
- **Quay lại ngày hôm sau**: được chào "ngày thứ N cùng tụng kinh", tên có huy hiệu ✦N.
- **Tặng quà**: banner cảm ơn, hiệu ứng theo giá trị quà, tên lên bảng "Tri Ân".

### An toàn nội dung (mặc định bật)

- **Cách xướng "An toàn"**: quà được cảm ơn, không hứa công đức. Chỉ đọc lời nguyện của chính người tặng. Chế độ "Truyền thống" vẫn chọn được, nhưng có rủi ro chính sách.
- **Dòng miễn trừ** ở chân overlay: "Quà tặng là ủng hộ người phát sóng, không phải cúng dường cho chùa".
- **Lọc bình luận**: từ tục (danh sách sửa được), đường link, dãy số dài (số điện thoại, số tài khoản) không hiện và không được đọc.
- Không dùng tên một ngôi chùa có thật khi chưa có văn bản đồng ý.
- TikTok không trả tiền cho phiên LIVE chạy chủ yếu tự động. Người phát cần có mặt và tương tác.

Lý do của từng mục: [`docs/business/ke-hoach-thuong-mai-hoa.md`](docs/business/ke-hoach-thuong-mai-hoa.md).

### Gói Free và Pro

| | Free | Pro |
|---|---|---|
| Chỗ ngồi | 36 | 100 |
| Nhãn "bản miễn phí" trên overlay | Có | Không |
| Theme Pro (mùa lễ) | — | Có |
| Mọi tính năng an toàn và cộng đồng | Có | Có |

Kích hoạt: dán mã `CO1.…` vào **6 · Bản quyền** trong bảng điều khiển. Mã có thể gắn với một kênh TikTok và có hạn dùng.

Người bán cấp mã:

```bash
node tools/license.mjs keygen                      # một lần duy nhất; khóa bí mật ở ~/.chua-online/ — SAO LƯU
node tools/license.mjs issue --to "Tên khách" --tiktok @kenh --days 365
```

## Bảo mật

- **Không dùng tài khoản TikTok.** Chỉ đọc sự kiện công khai của phòng live theo username. Không cần mật khẩu, cookie hay session.
- **Chỉ mở trên máy mình** (`127.0.0.1`). Header `Host` phải là localhost (chống DNS rebinding). WebSocket kiểm tra `Origin`. Overlay chỉ nhận dữ liệu, không gửi lệnh được.
- **File tĩnh có danh sách trắng**: chỉ `/assets` và `/live`. Chặn file ẩn, `node_modules`, mã server, `package.json`, đường dẫn `../` và thư mục `live/data/` (chứa mã bản quyền, cài đặt, danh sách người quen).
- **Không tin dữ liệu vào**: tên, bình luận, tên quà bị cắt độ dài. Cài đặt chỉ nhận đúng khóa, đúng kiểu. Văn bản gửi đi đọc được escape XML. Mọi chữ hiển thị qua `textContent` hoặc canvas.

### Lưu ý

- `tiktok-live-connector` là thư viện cộng đồng, không phải API chính thức. Nó có thể ngừng chạy khi TikTok đổi hệ thống.
- Giọng đọc dùng dịch vụ Read Aloud của Microsoft Edge qua mạng (giọng Nam Minh, Hoài My). Đây không phải dịch vụ có hợp đồng thương mại; xem mục rủi ro trong kế hoạch.
- `live/data/regulars.json` lưu username TikTok công khai và số ngày tham gia, chỉ trên máy streamer.
- Đồ họa theme `classic` đi kèm mã nguồn gốc, quyền thương mại chưa rõ. Theme `tinh-tam` hiện vẫn tạm dùng file của `classic` cho tới khi designer giao file mới (`docs/design/`).

## Đưa web lên

Đang chạy tại **https://dang-ph.github.io/chua-online/** (GitHub Pages, nhánh `main`, thư mục gốc; mỗi lần push lên `main` là tự cập nhật sau khoảng 1 phút).

`index.html` + `assets/` là site tĩnh: đưa lên Cloudflare Pages, Netlify hay bất kỳ hosting tĩnh nào (`_headers` đặt cache cho `/assets`). Chọn theme qua `?theme=`. Link "phát trên TikTok LIVE" bật lên khi điền `STREAMER_URL` trong `index.html`.

## Tài liệu

- [Research trào lưu "đi chùa online" (11/2026)](docs/research/trao-luu-di-chua-online-2026-11.md)
- [Kế hoạch thương mại hóa](docs/business/ke-hoach-thuong-mai-hoa.md)
- [Phân tích kỹ thuật và những gì đã thay đổi](docs/technical/phan-tich-ky-thuat.md)
- [Hướng dẫn và prompt cho designer](docs/design/README.md)

## Miễn trừ trách nhiệm

Đây là không gian mô phỏng để thư giãn, không đại diện cho chùa, tu viện hay tổ chức tôn giáo nào, và không thay thế việc tu tập tại chùa. Người vận hành mỗi kênh tự chịu trách nhiệm về nội dung phát sóng, khoản thu từ người xem, việc tuân thủ điều khoản của TikTok và pháp luật Việt Nam (bao gồm Luật Tín ngưỡng, tôn giáo có hiệu lực từ 01/01/2027). Phần mềm được cung cấp "nguyên trạng" (AS IS), không kèm bảo đảm.

## Giấy phép và ghi công

Mã nguồn: MIT, xem `LICENSE`. Dự án phát triển từ [Chánh Điện Online](https://github.com/kentjuno/chanh-dien-online) của **Kent Juno** (MIT). Chi tiết ghi công và phạm vi giấy phép của đồ họa: xem [`NOTICE.md`](NOTICE.md).
