# NOTICE

## Mã nguồn gốc

Chùa Online phát triển từ **Chánh Điện Online** của Kent Juno
(https://github.com/kentjuno/chanh-dien-online), phát hành theo giấy phép MIT:

    Copyright (c) 2026 Kent Juno

Toàn văn giấy phép nằm trong `LICENSE` và phải đi kèm mọi bản phân phối, kể cả bản đã đóng gói để bán.

## Phạm vi giấy phép

| Phần | Giấy phép |
|---|---|
| Mã nguồn (`*.html`, `*.js`, `*.mjs`, `tools/`, `live/`) | MIT: © 2026 Kent Juno (bản gốc) và © 2026 DANG-PH (phần sửa đổi) |
| `assets/themes/classic/` | Tài nguyên đi kèm mã nguồn gốc. Theo tác giả gốc, ảnh được tạo bằng Google Flow và nhạc bằng Gemini. Quyền dùng thương mại phụ thuộc điều khoản của các dịch vụ đó, nên chỉ dùng để phát triển và thử nghiệm |
| `assets/themes/<id>/` khác (ví dụ `tinh-tam`) sau khi designer giao | **Không thuộc MIT.** Bản quyền thuộc chủ dự án Chùa Online, mọi quyền được bảo lưu, trừ khi `theme.json` của theme đó ghi khác |
| `docs/` | Thuộc chủ dự án Chùa Online |

## Thư viện bên thứ ba (`live/package.json`)

- `ws`: MIT
- `msedge-tts`: MIT; gọi dịch vụ Read Aloud của Microsoft Edge
- `tiktok-live-connector` **2.5.0: AGPL-3.0-only** (từ bản 2.4.1 trở đi; bản 2.4.0 trở về trước là MIT). Đây là thư viện cộng đồng,
  không phải API chính thức của TikTok. AGPL yêu cầu: khi phân phối phần mềm có dùng thư viện này, phải cung cấp mã nguồn
  cho người nhận theo AGPL. Xem mục "Giấy phép thư viện" trong `docs/business/ke-hoach-thuong-mai-hoa.md` trước khi bán.
- Phông chữ Noto Serif và Be Vietnam Pro tải từ Google Fonts (SIL Open Font License)

Giấy phép của từng thư viện nằm trong `live/node_modules/<tên>/LICENSE` sau khi cài.
