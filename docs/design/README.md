# Bộ đồ họa mới cho Chùa Online — hướng dẫn cho designer

Đồ họa hiện tại (`assets/themes/classic/`) đi kèm mã nguồn gốc. Ảnh được tạo bằng Google Flow, nhạc bằng Gemini, và quyền dùng thương mại chưa rõ. Muốn bán sản phẩm thì phải thay toàn bộ bằng đồ họa đặt làm riêng, giao vào thư mục `assets/themes/tinh-tam/`.

Thư mục đó đã có sẵn `theme.json`. File nào chưa giao, phần mềm tự dùng tạm file cùng tên của bản classic. Vì vậy designer giao file nào thì thả file đó vào, chạy thử là thấy ngay.

## Giao gì

| # | File (đặt trong `assets/themes/tinh-tam/`) | Kích thước xuất | Định dạng | Prompt |
|---|---|---|---|---|
| 1 | `hall.jpg` — chánh điện, nền chính | 1080×1920 (gửi kèm bản gốc 2160×3840) | JPG chất lượng 85, < 600 KB | `prompts/01-chanh-dien.txt` |
| 2 | `c_man.png`, `c_woman.png`, `c_granny.png`, `c_monk.png`, `c_nun.png`, `c_child.png` — nhân vật ngồi trên bồ đoàn, nhìn từ sau lưng | 196×260 (riêng `c_child` 160×230) | PNG trong suốt | `prompts/02-nhan-vat-ngoi.txt` |
| 3 | `anim_man.png`, `anim_woman.png`, `anim_granny.png`, `anim_monk.png`, `anim_nun.png`, `anim_child.png` — dải 8 khung: đi vào rồi ngồi xuống | 1696×300 (8 khung × 212×300) | PNG trong suốt | `prompts/03-hoat-anh-di-ngoi.txt` |
| 4 | `fx_halo.png`, `fx_petal.png`, `fx_incense.png`, `fx_lotus.png`, `fx_bell.png` — hiệu ứng | xem prompt | PNG trong suốt | `prompts/04-hieu-ung.txt` |
| 5 | `music/*.mp3` — 3–4 bài nhạc thiền | 3–5 phút/bài | MP3 192 kbps | `prompts/05-nhac-nen.txt` |
| 6 | `assets/logo-512.png`, `assets/favicon.png` | 512×512, 64×64 | PNG | `prompts/06-logo.txt` |
| 7 | `assets/og.jpg` — ảnh khi chia sẻ link | 1200×630 | JPG | `prompts/07-anh-chia-se.txt` |
| 8 | Ảnh bìa LIVE, ảnh quảng cáo | xem prompt | JPG/PNG | `prompts/08-anh-bia-live-quang-cao.txt` |
| 9 | Theme mùa lễ (gói Pro) | như mục 1–4 | | `prompts/09-theme-mua-le.txt` |

Đọc `prompts/00-phong-cach-chung.txt` trước tiên. Mọi file khác đều theo phong cách đó.

## Bản đồ màn hình 1080×1920 (bắt buộc giữ đúng)

Phần mềm vẽ nhân vật, chữ và khung lên trên ảnh nền theo tọa độ cố định. Ảnh nền mới phải để đúng các vùng sau, nếu không nhân vật sẽ "ngồi trên không" hoặc bị chữ che mất phần quan trọng.

```
y=0    ┌──────────────────────────────────────┐
       │  (trần, xà nhà – ít chi tiết)         │  ← y 70–220: biển tên thiền đường đè lên
       │                                      │  ← y 244–310: 3 ô đếm (người, giờ, niệm)
y=330  │        [ vùng banner chữ ]            │  ← y 330–600: băng tụng kinh / quà hiện ở đây
       │              ( hào quang )            │  ← tâm hào quang x=540, y=560
y=630  │ ▒▒▒▒▒▒▒▒   TƯỢNG PHẬT   ▒▒▒▒▒▒▒▒     │  ← x 24–314 và x 766–1056, y 630–960:
       │ ▒ thẻ  ▒   (tòa sen)    ▒ bảng ▒     │    hai thẻ thông tin che – để cột/tường tối
y=960  │ ▒▒▒▒▒▒▒▒      lư hương   ▒▒▒▒▒▒▒▒     │  ← khói bốc lên từ x=540, y=1000
       │   🧘300   ███ BÀN THỜ ███   🧘780     │  ← 3 vị sư ngồi tại (300,1085) (540,1100) (780,1085)
y=1215 │      ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾╲        │  ← mép trên sàn: x 250 → 830
       │     ╱   SÀN GỖ TRỐNG (không vẽ  ╲       │
       │    ╱    bồ đoàn), lối đi giữa     ╲      │  ← tối đa 100 người ngồi tự sinh ở vùng này
y=1845 │   ╱_________________________________╲    │  ← mép dưới sàn: x 110 → 970
y=1860 │   [ dòng miễn trừ trách nhiệm ]        │
y=1920 └──────────────────────────────────────┘
```

Khuyến nghị: **sàn để trống, không vẽ sẵn bồ đoàn**. Mỗi nhân vật đã mang bồ đoàn của mình, và số chỗ ngồi thay đổi từ 16 đến 100.

Nếu vẫn muốn vẽ sẵn bồ đoàn (như bản classic) thì phải gửi kèm tọa độ từng cái: tâm x, đáy y, chiều rộng. Lập trình viên sẽ khai báo vào `seats` / `perspective` trong `theme.json`. Khi ít người, mỗi người sẽ ngồi đúng lên một bồ đoàn vẽ. Bồ đoàn vẽ nên dẹt giống bồ đoàn trong ảnh nhân vật (tỉ lệ cao/rộng ≈ 1/3), nếu không mép trên sẽ lộ ra sau lưng người ngồi.

Nếu bố cục bắt buộc phải lệch (ví dụ tượng Phật cao hơn), báo lại tọa độ mới. Lập trình viên sửa các số trong `assets/themes/tinh-tam/theme.json` (`floor`, `altar`, `teachers`) mà không phải sửa code.

## Yêu cầu bản quyền (quan trọng hơn cả chất lượng hình)

1. Hợp đồng hoặc biên bản bàn giao ghi rõ **chuyển giao quyền tài sản** đối với tác phẩm cho chủ dự án, được dùng thương mại, sửa đổi và phân phối trong phần mềm.
2. Nếu dùng AI để tạo ảnh hoặc nhạc: chỉ dùng công cụ mà điều khoản cho phép dùng thương mại với gói đang trả tiền. Ghi lại tên công cụ, gói, ngày tạo và prompt, rồi lưu vào `docs/design/nhat-ky-tao-anh.md`.
3. Không dùng ảnh hay kiến trúc dễ nhận ra của một ngôi chùa có thật. Không chép tượng Phật từ ảnh chụp có bản quyền.
4. Không để chữ Hán/Nôm do AI tự sinh, vì AI thường tạo ra chữ sai, vô nghĩa và dễ bị coi là bất kính. Câu đối và hoành phi để trống, chỉ vẽ hoa văn. Nếu cần chữ thật thì designer tự đặt chữ đúng vào bằng tay.

Khi đã nhận đủ file và có giấy tờ, đổi `"commercialReady": true` trong `assets/themes/tinh-tam/theme.json`.

## Kiểm tra sau khi giao

```bash
cd live && npm install && npm start
# mở http://localhost:3000/live/control.html → Cảnh → Giao diện "Tịnh Tâm"
# Đổ người mẫu 24 / 64 / 100 → mở overlay → xem nhân vật có ngồi đúng sàn, tên có bị che không
```

Trang web: mở `index.html?theme=tinh-tam` qua một web server tĩnh bất kỳ (ví dụ `python3 -m http.server`).

Danh sách kiểm tra:

- [ ] Nhân vật ở hàng sau (y≈1215) và hàng trước (y≈1845) đều ngồi trên sàn, không lơ lửng, không lún.
- [ ] Ba vị sư trước bàn thờ không bị che hay đè lên đồ vật khó coi.
- [ ] Hào quang khi chuông vang nằm đúng sau đầu/thân tượng Phật.
- [ ] Khói hương bốc lên từ đúng miệng lư hương.
- [ ] Chữ trên biển tên, ô đếm và hai thẻ hai bên vẫn đọc rõ trên nền mới.
- [ ] Dải đi bộ: nhân vật không nhảy giật giữa các khung, chân chạm đáy khung, bồ đoàn ở khung 4–7 cùng vị trí.
- [ ] Tổng dung lượng `assets/themes/tinh-tam/` dưới 6 MB (overlay tải một lần, trang web tải trên điện thoại).
