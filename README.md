# Hikaye

Bu repo, tek bir ana hikayenin günlük devam ettiği ve kullanıcıların kısa katkılar yaptığı bir uygulama için başlangıç iskeletidir.

Teknoloji yığını:
- Next.js (App Router)
- Supabase (Auth, Postgres, Realtime)
- Tailwind CSS

Kurulum (local):
1. Supabase projesi oluşturun; projenizin URL ve Service Role Key'ini alın.
2. Kök dizine `.env.local` oluşturun ve aşağıyı koyun:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Paketleri yükleyin:

npm install

4. Veritabanı migration'ını çalıştırın: `db/schema.sql` içindeki SQL'i Supabase SQL Editor / psql ile uygulayın.

5. Next.js uygulamasını başlatın:

npm run dev

Önemli notlar:
- Admin (resmi hikaye parçalarını ekleyebilen) rolünü kendiniz oluşturun. Bu başlangıç kodu örnektir ve güvenlik (RLS) kuralları eklenmelidir.
- process_vote isimli RPC fonksiyonu DB içinde tanımlıdır; oy mantığını atomik tutar ve kullanıcı toplam puanını 0'ın altına düşürmez.
