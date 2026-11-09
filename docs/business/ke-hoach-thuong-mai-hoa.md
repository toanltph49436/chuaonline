# Kế hoạch thương mại hóa Chùa Online

Ngày lập: 03/11/2026. Căn cứ trên [báo cáo trào lưu](../research/trao-luu-di-chua-online-2026-11.md). Giá và số liệu dự kiến bên dưới là **giả định để thử nghiệm**, cần kiểm chứng bằng bán thật.

## 1. Định vị

> **Chùa Online: một góc tĩnh lặng mỗi ngày.** Không gian chánh điện mô phỏng để thư giãn và niệm Phật cùng nhau. Người xem tham gia không mất tiền. Không bán công đức.

Lý do chọn định vị này: báo chí và Giáo hội chỉ trích đúng ba thứ là đổi quà lấy công đức, giả danh chùa và thu tiền không minh bạch. Luật Tín ngưỡng, tôn giáo sửa đổi có hiệu lực ngày 01/01/2027. Đối thủ (hơn 10 bản fork) đều giữ cơ chế "tặng quà được xướng tên hồi hướng" của bản gốc. Đi ngược hướng đó vừa là đạo đức, vừa là lợi thế bán hàng: **streamer mua sự yên tâm**.

Những điều sản phẩm **không bao giờ làm**:

- Không hứa phước, công đức hay kết quả tâm linh để đổi lấy tiền hoặc quà.
- Không mang tên, hình ảnh hay kiến trúc của chùa có thật khi chưa có văn bản đồng ý.
- Không dùng bot hay người mẫu trong LIVE thật (code đã chặn).
- Không hiện số tài khoản, mã QR hay link quyên góp trên overlay (code đã ẩn khỏi bình luận).

## 2. Khách hàng và sản phẩm

| Phân khúc | Họ cần gì | Sản phẩm | Ưu tiên |
|---|---|---|---|
| **A. Streamer TikTok** (cá nhân, kênh thư giãn/tâm linh/chữa lành) | Một phiên LIVE đông người, đẹp, không bị TikTok phạt, cài nhanh | Bộ LIVE (`live/`) bản Free và Pro + theme + hỗ trợ cài | **Chính, làm ngay** |
| **B. Người dùng phổ thông** (giống người dùng Sansa) | Vài phút yên tĩnh mỗi ngày, có nhịp đều đặn | Web `index.html`: miễn phí, chuỗi ngày, niệm 108 biến | Phễu thu hút, quảng bá thương hiệu |
| **C. Chùa / đạo tràng / CLB Phật tử có đăng ký hợp pháp** | Kênh trực tuyến chính thống cho Phật tử ở xa | Bản white-label: tên và logo của chùa, quyên góp đi thẳng vào tài khoản của chùa, minh bạch | Giai đoạn 2, cần quan hệ |

## 3. Bảng giá thử nghiệm (phân khúc A)

| Gói | Giá đề xuất | Gồm |
|---|---|---|
| **Free** | 0đ | Đủ tính năng, tối đa 36 chỗ, nhãn nhỏ "Chùa Online · bản miễn phí" trên overlay, theme miễn phí |
| **Pro tháng** | 149.000đ/tháng | 100 chỗ, bỏ nhãn, mọi theme Pro, mã gắn với 1 kênh TikTok |
| **Pro năm** | 990.000đ/năm | Như Pro tháng, tặng theme mùa lễ ra trong năm |
| **Pro trọn đời** (giới hạn 100 suất đầu) | 1.490.000đ | 1 kênh, cập nhật 12 tháng. Dùng để thu tiền sớm khi trào lưu đang nóng |
| **Theme lẻ** | 99.000–149.000đ | Tết, Phật Đản, Vu Lan, Thành đạo… |
| **Cài đặt từ xa** | 300.000đ/lần | UltraViewer/AnyDesk 30 phút: cài, kết nối, chỉnh âm thanh |
| **White-label (C)** | Báo giá, từ 8–15 triệu + phí năm | Theme riêng theo kiến trúc chùa (có văn bản đồng ý), tên và logo riêng |

Cách cấp key (đã có sẵn trong code):

```bash
node tools/license.mjs issue --to "Nguyễn Văn A · 09xx" --tiktok @kenhcuaA --days 30     # Pro tháng
node tools/license.mjs issue --to "Nguyễn Văn A · 09xx" --tiktok @kenhcuaA --days 365    # Pro năm
node tools/license.mjs issue --to "Nguyễn Văn A · 09xx" --tiktok @kenhcuaA               # trọn đời
```

Gửi chuỗi `CO1.…` cho khách. Khách dán vào mục **6 · Bản quyền** trong bảng điều khiển. Khóa bí mật nằm ở `~/.chua-online/license-private.pem`: **phải sao lưu, không được để lộ**. Ghi sổ (Google Sheet) mỗi key: mã #, khách, kênh, ngày, hạn, số tiền.

Thu tiền: chuyển khoản ngân hàng hoặc VietQR, ghi nội dung theo mã đơn. Xuất hóa đơn hoặc kê khai thuế thu nhập theo quy định của cá nhân/hộ kinh doanh (hỏi kế toán).

**Lưu ý kỹ thuật về chống bẻ khóa:** kiểm tra key chạy trên máy khách, nên người biết code có thể gỡ được. Muốn bảo vệ tốt hơn:

1. Đặt repo GitHub ở chế độ **private**, chỉ phát hành gói cài đặt đã đóng gói.
2. Giữ theme trả phí trong một repo riêng và chỉ gửi cho khách Pro. Đồ họa đặt làm riêng thuộc quyền của chủ dự án và không theo MIT (xem `NOTICE.md`).

Giá trị thật nằm ở đồ họa, theme theo mùa và hỗ trợ, không nằm ở dòng code kiểm tra key.

## 4. Tính năng đã làm và lý do (giữ chân + an toàn)

| Tính năng | Vì sao hút người dùng | Vì sao an toàn |
|---|---|---|
| **Niệm chung 108 biến** (bình luận "Nam mô…" và thả tim cùng làm đầy thanh tiến độ; đủ 108 thì chuông lớn, sen rơi, sang vòng mới) | Mục tiêu tập thể, ai cũng góp được. Giống "like goal" của TikTok nhưng mang ý nghĩa | Không cần quà |
| **Hồi hướng định kỳ** (mỗi 10 phút đọc tên tối đa 12 người đang có mặt) | Người xem ở lại và bình luận để được đọc tên | Miễn phí cho tất cả, không xếp theo tiền |
| **Chào người quay lại** ("ngày thứ N cùng tụng kinh", huy hiệu ✦N trên tên) | Tạo thói quen giống chuỗi ngày Duolingo, khiến người xem quay lại hôm sau | Lưu trên máy streamer, chỉ là username công khai |
| **Đọc lời nguyện trong bình luận** (tối đa 1 câu / 20 giây) | Ai cũng được nghe lời nguyện của mình được đọc lên | Tách hẳn "lời nguyện" khỏi "quà" |
| **Chế độ xướng An toàn** (mặc định): quà thì "Xin cảm ơn… đã gửi tặng", bảng đổi tên thành "Tri Ân" và ẩn số xu | | Tránh "gift baiting" và trục lợi tín ngưỡng |
| **Dòng miễn trừ** ở chân overlay | | Minh bạch: quà là ủng hộ người phát, không phải cúng dường |
| **Lọc bình luận**: từ tục, link, số điện thoại/tài khoản | | Chặn lừa đảo kiểu "chuyển khoản công đức" ngay trên phiên của mình |
| **Khóa diễn tập khi LIVE thật** (bot, người mẫu, quà giả bị khóa và tự dọn) | | Tránh "tương tác giả", thứ khiến TikTok khóa quyền nhận quà |
| **Web: niệm 108 biến, chuỗi ngày, nút "Mời bạn"** | Vòng lặp chia sẻ, quay lại mỗi ngày | Miễn phí, không thu tiền |
| **Hệ thống theme + fallback** | Bán theme mùa lễ; designer giao file nào thay file đó | |

## 5. Lộ trình 30 / 60 / 90 ngày

**0–30 ngày (tận dụng lúc trào lưu còn nóng)**

- [ ] Gửi `docs/design/` cho designer; ưu tiên `hall.jpg` + 6 nhân vật ngồi + logo (tuần 1–2), sau đó làm dải đi bộ.
- [ ] Đặt repo private. Đóng gói bản cài cho Windows (Node portable + file `.bat` "Bấm để chạy").
- [ ] Làm landing page một trang: video 30 giây, bảng giá, nút Zalo. Điền link vào `STREAMER_URL` trong `index.html`.
- [ ] Đưa web `index.html` lên Cloudflare Pages (đã có file `_headers`) với domain riêng.
- [ ] Tự chạy 1 kênh mẫu mỗi tối 20:00–22:00, có mặt nói chuyện (TikTok không trả tiền cho phiên tự động), để thu video demo.
- [ ] Tìm 10 streamer đầu tiên: tặng 1 tháng Pro, đổi lại phản hồi và video.

**30–60 ngày**

- [ ] Ra theme Tịnh Tâm thương mại (đổi `commercialReady: true`) + theme Tết (bán trước Tết).
- [ ] Hỗ trợ thêm YouTube Live và Facebook Live (cùng overlay, chỉ thêm một bộ đọc sự kiện).
- [ ] Thống kê cuối phiên cho streamer: số người ngồi, số người quay lại, vòng niệm, thời gian xem trung bình.
- [ ] Gửi giọng đọc qua dịch vụ có hợp đồng thương mại thay cho Edge Read Aloud (xem rủi ro bên dưới).

**60–90 ngày**

- [ ] Tiếp cận 3–5 chùa hoặc đạo tràng cho gói white-label (phân khúc C): đi qua Ban Thông tin truyền thông giáo hội cấp tỉnh, không chào hàng đại trà.
- [ ] Bản web nhiều người thật (WebSocket server) nếu số liệu phễu web tốt.

## 6. Chỉ số theo dõi

- Phễu: lượt vào web → lượt "Vào chánh điện" → quay lại ngày 2 → bấm link streamer → tải bản Free → kích hoạt Pro.
- Streamer: số phiên/tuần, người xem trung bình, tỉ lệ quay lại, tỉ lệ gia hạn tháng 2.
- Mục tiêu tháng đầu (giả định): 300 lượt tải Free, 30 khách Pro (≈ 5–10 triệu đồng), tỉ lệ gia hạn ≥ 50%.

## 7. Rủi ro và cách giảm

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Quy định siết sau 01/01/2027 (Luật TNTG + Nghị định) | Cao | Định vị giải trí/thư giãn, chế độ An toàn mặc định, theo dõi Nghị định, sẵn sàng tắt tính năng đọc lời nguyện/hồi hướng bằng một nút |
| **`tiktok-live-connector` 2.5.0 dùng giấy phép AGPL-3.0** (bản gốc ghim 2.5.0) | **Cao, phải quyết trước khi bán** | Xem mục 9 |
| TikTok đổi giao thức, `tiktok-live-connector` (thư viện cộng đồng) ngừng chạy | Cao | Theo dõi bản cập nhật thư viện; dự phòng tích hợp TikFinity/Streamer.bot; hỗ trợ YouTube/Facebook |
| TikTok khóa quyền nhận quà của khách vì tự động hóa | Trung bình | Hướng dẫn streamer có mặt và trò chuyện; khóa bot khi LIVE (đã làm) |
| Giọng đọc Edge Read Aloud là dịch vụ miễn phí, không có hợp đồng dùng thương mại | Trung bình | Chuyển sang Azure TTS (trả phí, có điều khoản) hoặc TTS chạy trên máy trước khi bán số lượng lớn |
| Đồ họa/nhạc cũ không rõ quyền thương mại | Cao nếu bán với đồ họa cũ | Theme `classic` để `commercialReady: false`; chỉ bán khi `tinh-tam` đã có giấy tờ |
| Dư luận cho rằng "trục lợi tâm linh" | Trung bình | Thông điệp nhất quán: miễn phí cho người xem, không bán công đức; dòng miễn trừ trên màn hình |
| Bị chép (MIT, nhiều fork) | Chắc chắn xảy ra | Cạnh tranh bằng đồ họa riêng, theme theo mùa, hỗ trợ và tốc độ cập nhật |

## 8. Pháp lý của mã nguồn

- Mã gốc: **MIT, © 2026 Kent Juno**. Được dùng thương mại, sửa và bán, **với điều kiện giữ nguyên thông báo bản quyền và giấy phép** trong mọi bản phân phối (đã giữ trong `LICENSE` và `NOTICE.md`).
- Bản gốc có một đoạn code bị làm rối (obfuscated) chèn chữ "✦ Mã nguồn được chia sẻ bởi Kent Juno ✦" lên livestream mỗi 5–10 phút. MIT không bắt buộc hiển thị dòng chữ này trên sản phẩm, nên đã gỡ. Bù lại, ghi công tác giả gốc ở chân bảng điều khiển, trong `README.md` và trong `NOTICE.md`.
- Thông tin ủng hộ tác giả gốc (số tài khoản cá nhân của người khác) đã bỏ khỏi README vì không liên quan đến sản phẩm này.

## 9. Giấy phép thư viện đọc sự kiện TikTok (AGPL) — cần quyết định

`live/package.json` (giữ nguyên từ bản gốc) ghim `tiktok-live-connector@2.5.0`, và bản này dùng giấy phép **AGPL-3.0-only**. Lịch sử giấy phép trên npm: bản **2.4.0 trở về trước là MIT**, từ **2.4.1 chuyển sang AGPL** (tra ngày 03/11/2026).

Hệ quả nếu bán bộ LIVE kèm thư viện này: người mua có quyền yêu cầu mã nguồn toàn bộ chương trình theo AGPL, và có quyền sửa (kể cả gỡ phần kiểm tra key) rồi chia sẻ lại. Bán vẫn được, nhưng mô hình "khóa bằng key" gần như mất tác dụng pháp lý. Đây là nhận định kỹ thuật, không phải tư vấn pháp lý; nên hỏi luật sư sở hữu trí tuệ trước khi bán số lượng lớn.

Các hướng xử lý (chọn một):

| Hướng | Cách làm | Được | Mất |
|---|---|---|---|
| **A. Hạ về 2.4.0 (MIT)** | `cd live && npm i tiktok-live-connector@2.4.0 --save-exact` | API giống hệt (đã kiểm tra: có `TikTokLiveConnection`, `WebcastEvent`, `ControlEvent`); giữ được mô hình key | Mất các bản sửa giao thức sau 2.4.0; **phải thử với một phiên live thật** xem còn kết nối được không |
| **B. Đọc sự kiện qua TikFinity hoặc Streamer.bot** | Streamer tự cài TikFinity; server nhận sự kiện qua WebSocket nội bộ của ứng dụng đó, không còn phụ thuộc thư viện AGPL | Không vướng AGPL; TikFinity tự lo việc TikTok đổi giao thức | Cần viết bộ chuyển đổi sự kiện; streamer phải cài thêm một ứng dụng |
| **C. Chấp nhận AGPL** | Công khai mã bộ LIVE theo AGPL; chỉ bán **theme/đồ họa** (tài sản riêng, không phải mã), dịch vụ cài đặt, hỗ trợ, theme theo mùa | Minh bạch, cộng đồng đóng góp được | Không giữ được mã kín; key chỉ còn là tiện ích chứ không có giá trị pháp lý |

Khuyến nghị: thử **A** ngay (5 phút với một phiên live). Nếu 2.4.0 không còn kết nối được thì làm **B**. Trong lúc chờ, mô hình doanh thu nên dựa vào **đồ họa riêng + theme mùa lễ + hỗ trợ**, vì phần này đứng vững với cả ba hướng.
