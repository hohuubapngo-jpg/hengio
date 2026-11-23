# My Free Time

React + Vite + Tailwind + Supabase (Auth, Postgres RLS, Realtime), deploy trên Netlify.

## 1. Tạo Supabase
1. supabase.com → New project.
2. SQL Editor → dán toàn bộ `supabase/schema.sql` → Run (tạo bảng, RLS, trigger tạo profile, bật Realtime).
3. Authentication → Providers → Email: bật. (Có thể tắt "Confirm email" khi thử nghiệm.)
4. Authentication → URL Configuration: đặt Site URL = địa chỉ Netlify của bạn (dùng cho email quên mật khẩu).
5. Project Settings → API: lấy **Project URL** và **anon public key**. KHÔNG dùng service_role key.

## 2. Chạy thử trên máy
```
cp .env.example .env   # điền 2 giá trị ở trên
npm install
npm run dev
```

## 3. Deploy
1. Đẩy thư mục này lên GitHub (file `.env` đã nằm trong `.gitignore`).
2. Netlify → Add new site → Import from Git → chọn repo (build `npm run build`, publish `dist` đã có trong `netlify.toml`).
3. Site settings → Environment variables: thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
4. Deploy site.

## Ghi chú thiết kế
- Mỗi người không thể có hai khoảng giờ chồng nhau (ràng buộc `exclude` trong DB) → không có Rảnh/Bận đối lập cùng lúc.
- Ghi chú nằm ở bảng `schedule_notes`, RLS chỉ cho chủ sở hữu đọc → người khác không thấy.
- `user_id` không thể bị đổi (RLS `with check` + trigger).
