# Phân tích kỹ thuật (reverse engineering) và những gì đã đổi

Tài liệu cho lập trình viên tiếp quản. Phần 1–5 mô tả cách bản gốc (kentjuno/chanh-dien-online, commit `bee578d`) hoạt động. Phần 6 liệt kê những gì Chùa Online đã thay đổi.

## 1. Kiến trúc

```
TikTok LIVE ──(tiktok-live-connector, WebSocket không chính thức)──► live/server.mjs  (Node, 127.0.0.1:3000)
                                                                     │  giữ danh sách người ngồi (Map)
                                                                     │  Edge TTS → file mp3 trong live/tts/
                                                                     ├──WS role=overlay──► live/overlay.html  (canvas 1080×1920, chỉ nghe)
                                                                     └──WS role=control◄─► live/control.html  (gửi lệnh)
index.html  (web tĩnh, Cloudflare Pages)  — chạy một mình, không cần server, đám đông mô phỏng
assets/theme-loader.js + assets/themes/<id>/theme.json  — dùng chung cho index.html và overlay.html
```

Không có framework, không có bước build. Mỗi trang là một file HTML tự chứa. Phụ thuộc runtime chỉ gồm `ws`, `msedge-tts` và `tiktok-live-connector` (đã ghim phiên bản).

## 2. Luồng sự kiện (server)

| Sự kiện TikTok | Hàm | Kết quả |
|---|---|---|
| `CHAT` | `onChat` | `seat()` nếu là người mới → kiểm duyệt → `broadcast chat` (bong bóng thoại) → đếm niệm chung → có thể đọc lời nguyện |
| `GIFT` | `onGift` | Bỏ qua khi chuỗi quà combo chưa kết thúc (`giftType===1 && !repeatEnd`) → cộng xu → `broadcast gift` (banner + hiệu ứng theo bậc: <10 / ≥10 / ≥99 xu) → TTS |
| `LIKE` | `onLike` | Hiện tim trên đầu nhân vật; tối đa 1 lần / 10 giây mỗi người được tính vào niệm chung |
| `MEMBER` | — | Cho ngồi luôn nếu bật `joinOnEnter` |

`seat()`: khi đã đủ chỗ, người **im lặng lâu nhất mà chưa tặng quà** phải nhường chỗ. Người đã tặng quà không bao giờ bị mời ra.

Đổi trang phục (`skinFromText`): chỉ khi **toàn bộ** bình luận là từ khóa (≤ 3 từ), nên "Nam mô A Di Đà Phật" không bị hiểu là "nam". Thứ tự kiểm tra: cao tăng → sư → ni → tiểu → bà → nữ → nam.

TTS: hàng đợi tối đa 15 câu, xử lý tuần tự. Text được escape XML rồi gửi Edge Read Aloud (giọng `vi-VN-NamMinhNeural` hoặc `HoaiMyNeural`). Kết quả lưu thành `live/tts/tts_<time>_<seq>.mp3`, chỉ giữ 40 file mới nhất. Overlay phát lần lượt và tự giảm nhạc nền (ducking) khi đang đọc.

## 3. Dựng hình (overlay)

- **Sân khấu cố định 1080×1920.** CSS `transform: scale()` thu khung vừa cửa sổ. Mọi tọa độ trong code tính theo hệ 1080×1920.
- **Lưới chỗ ngồi** (`layout(cap)`): hình thang phối cảnh `FLOOR {yTop, yBot, halfTop, halfBot}`. Lưới đổi theo sức chứa: 24 = 6×4, 36 = 6×6, 64 = 8×8, 100 = 10×10. Tỉ lệ nhân vật là `(.26 + .24·t) · (6/cols)^.75`, với t từ 0 (hàng sau) đến 1 (hàng trước). Lối đi giữa được mở bằng `u = sign(u)·(.14 + .86|u|)`. Ghế được sắp **hàng trước, gần lối đi trước**, nên vài người cũng trông như đông.
- **Bồ đoàn vẽ sẵn (thêm ở Chùa Online):** nếu ảnh nền đang hiển thị có `seats` trong `theme.json` (classic: 16 bồ đoàn đo tay trên `hall.jpg`), mức sức chứa đầu tiên bằng đúng số đó. Mỗi người ngồi đúng lên một bồ đoàn, tỉ lệ lấy từ `perspective` (nội suy tuyến tính theo y; khi đi vào cũng dùng tỉ lệ này). `seatsExtra` (classic: 8 chỗ chen giữa) mở mức tiếp theo (24). Đông hơn thì chuyển sang lưới; khi đổi chế độ, cỡ nhân vật thay đổi mượt. Server tính các mức sức chứa theo cùng dữ liệu (`hallSlots()`); bồ đoàn đi theo đúng ảnh `hall.jpg` thực sự được dùng, kể cả khi đang mượn ảnh của theme fallback.
- **Máy trạng thái nhân vật:** `walk` → `sitting` → `sit`. Khi `walk`, nhân vật đi dọc lối giữa đến đúng hàng rồi bước ngang vào ghế. Khung đi bộ 0–3 chạy khoảng 6 fps; đi sang trái thì lật ngang. Khi `sitting`, khung 4–7 chạy trong khoảng 0,9 giây. Khi `sit`, nhân vật "thở" bằng một dao động sin 2 px. Lúc chào hoặc tặng quà, nhân vật cúi bằng cách nén trục y 4% quanh điểm bồ đoàn.
- **Dải hoạt ảnh:** khung `fw×fh` (212×300). `seatH` là chiều cao nhìn thấy của khung ngồi, dùng để khớp cỡ với ảnh tĩnh `c_*.png` cao 260 px: hệ số `k = scale·1.05·260/seatH`.
- **Thứ tự vẽ:** nền → hào quang (cộng sáng, nhấp nháy theo chuông) → lớp ánh nến chập chờn → khói hương (hạt tròn) → 3 vị sư → khách xếp theo y tăng dần → bong bóng thoại → hiệu ứng quà → cánh sen và tim.
- **Thẻ tên:** cỡ chữ theo độ sâu. Khi đã ngồi, thẻ bị cắt cho vừa khoảng cách giữa hai ghế (`gap`); quá hẹp thì bỏ avatar.
- **Âm thanh:** chuông và mõ được **tổng hợp bằng Web Audio** (cộng sóng sin, lọc bandpass), không cần file. Nhạc nền là file mp3 phát nối tiếp. Trình duyệt chặn tự phát tiếng nên cần nút "Bấm để bật âm thanh".

## 4. Mô hình bảo mật (giữ nguyên từ bản gốc, đã mở rộng)

- Chỉ lắng nghe trên `127.0.0.1`. Header `Host` phải là localhost, nếu không trả 421 (chống DNS rebinding).
- WebSocket kiểm tra `Origin`. Overlay chỉ nhận dữ liệu; lệnh chỉ được chấp nhận từ `role=control`.
- File tĩnh dùng danh sách trắng `/assets`, `/live`. Chặn file bắt đầu bằng dấu chấm, `node_modules`, `.mjs/.json/.md/.log/.key/.pem` ngoài `/assets` và chặn **`/live/data/`** (nơi chứa license, cài đặt, danh sách người quen).
- Không tin dữ liệu vào: `SETTING_RULES` kẹp từng khóa về đúng kiểu và giới hạn. Mọi chữ hiển thị qua `textContent` hoặc canvas, không chèn HTML.

## 5. Watermark bị làm rối trong bản gốc

Commit `7325cf9` "Lantern ambience" thêm vào cuối `index.html` và `overlay.html` một IIFE trông như hiệu ứng đèn lồng. Thực chất nó:

1. Giữ một mảng số `_q` và giải mã bằng `String.fromCharCode(c ^ ((i*31+7) % 251))`. Kết quả là chuỗi **"✦ Mã nguồn được chia sẻ bởi Kent Juno ✦"**.
2. Bọc lại hàm `window.tick` / `window.frame` để mỗi 5–10 phút (`3e5 + random·3e5` ms) vẽ chuỗi đó trong 7 giây, ở giữa màn hình (y=1060 trên web, y=322 trên overlay), tức là ngay trên livestream của người dùng.

Đoạn này đã bị gỡ. Giấy phép MIT chỉ yêu cầu giữ thông báo bản quyền trong mã nguồn, không yêu cầu hiển thị trên sản phẩm. Phần ghi công đã chuyển sang `NOTICE.md`, README và chân bảng điều khiển (chỉ người vận hành thấy).

## 6. Những gì đã thay đổi trong Chùa Online

| Hạng mục | Bản gốc | Bây giờ |
|---|---|---|
| Đồ họa | Hard-code đường dẫn `assets/*.png`, tọa độ sàn/hào quang/sư viết thẳng trong code | **Hệ thống theme**: `assets/themes/<id>/theme.json` chứa ảnh, tọa độ, nhạc, màu. Có `fallback` theo từng file. Chọn theme trong bảng điều khiển. Web dùng `?theme=` |
| Bản quyền | Không có | `live/license.mjs`: key Ed25519 ký offline, gắn được với một kênh TikTok, có hạn dùng. Free 36 chỗ + nhãn; Pro 100 chỗ. `tools/license.mjs keygen/issue/verify` |
| Cách xướng khi có quà | "Phật tử X thành tâm dâng… [lời nguyện công đức ngẫu nhiên]" | Mặc định **An toàn**: "Xin cảm ơn X đã gửi tặng…", chỉ đọc lời nguyện **của chính người đó**. Chế độ truyền thống vẫn còn (tùy chọn) |
| Bảng xếp hạng | "Công Đức" + số xu | Tên tùy chỉnh (mặc định "Tri Ân"); ẩn số xu theo mặc định |
| Thẻ hướng dẫn | "🎁 Tặng quà được xướng tên hồi hướng" | Theo chế độ; bản An toàn không có lời kêu gọi tặng quà |
| Kiểm duyệt | Không có | Ẩn bình luận có từ cấm, link, hoặc dãy ≥ 8 chữ số; tên tục thay bằng "Phật tử" |
| Bot / người mẫu | Chạy được cả khi đang LIVE thật | Bị khóa khi đã kết nối LIVE; tự dọn khi vừa kết nối |
| Tương tác cộng đồng | Chỉ có tim | Niệm chung (21/54/108/1080), hồi hướng định kỳ, chào người quay lại (lưu `live/data/regulars.json`), đọc lời nguyện từ bình luận |
| Cài đặt | Mất khi khởi động lại | Lưu vào `live/data/settings.json` |
| Web `index.html` | Nút "coin" mô phỏng quà, bảng "Tấm lòng thành" | Hoạt động miễn phí (thắp hương, dâng hoa, thỉnh chuông), niệm 108 biến, chuỗi ngày (localStorage), nút "Mời bạn" (Web Share) |
| Ảnh thừa | `fx_banner`, `fx_scroll`, `fx_mo` được tải nhưng không bao giờ vẽ | Đã xóa |

## 7. Giao thức WebSocket (tóm tắt)

Server → client: `state` (ảnh chụp toàn bộ), `settings`, `license`, `join` (`back`: người quay lại), `leave`, `skin`, `chat`, `gift` (`own`: lời nguyện là của chính người tặng), `like`, `tts`, `chant`, `dedicate`, `beads` (`done`: vừa đủ vòng), `bell`, `mo1`, `tiktok`, `log`, `logs`, `bots`.

Control → server (`{t:'ctl', cmd}`): `connect`, `disconnect`, `chat`*, `gift`*, `fill`*, `bots`*, `clear`, `bell`, `mo`, `chant`, `dedicate`, `say`, `settings`, `license`. Các lệnh có dấu * bị từ chối khi đang LIVE thật.

## 8. Kiểm thử đã chạy (03/11/2026)

Script end-to-end qua WebSocket (21 trường hợp, tất cả đạt): Origin lạ bị từ chối; overlay không gửi được lệnh; Free tối đa 36 chỗ; ẩn link, số điện thoại, từ tục; quà đọc đúng lời nguyện của người tặng; chế độ An toàn không bịa lời nguyện; niệm chung đủ 21 thì sang vòng 1; hồi hướng tối đa 12 tên; cài đặt sai kiểu bị kẹp; key sai bị từ chối; key đúng thì lên Pro 100 chỗ; gỡ key thì tự cắt về 36 chỗ; cài đặt được lưu ra file.

Kiểm tra HTTP: `/live/data/*`, `/live/*.mjs`, `package.json`, `%2e%2e` đều trả 404; Host giả trả 421.

Giao diện: chụp overlay, bảng điều khiển và web bằng Chrome headless. Đã kiểm tra: vào chánh điện, chạm niệm 5 lần (đếm đúng, lưu chuỗi ngày), thắp hương.

**Chưa kiểm tra được:** kết nối TikTok LIVE thật (cần một phiên đang live), và key gắn kênh khi đang live sai kênh. Hai trường hợp này cần chạy tay trước khi bán.

## 9. Nợ kỹ thuật / việc nên làm tiếp

- `index.html` và `overlay.html` vẫn lặp code vẽ (thẻ tên, nhân vật, hiệu ứng). Nếu thêm nhiều tính năng nữa thì nên tách ra `assets/stage.js`.
- Edge Read Aloud là endpoint miễn phí, không có SLA; nên thêm lựa chọn Azure TTS (có key) cho khách Pro.
- Chưa có thống kê cuối phiên và chưa có xuất CSV.
- Chưa có bộ đọc sự kiện cho YouTube và Facebook.
