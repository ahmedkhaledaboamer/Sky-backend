# E-Commerce API — دليل الفرونت اند

الملف ده فيه كل الـ endpoints اللي الباك اند بيوفرها، شكل الـ request والـ response، والصلاحيات، والحاجات اللي لازم تاخد بالك منها.

---

## 1. أساسيات

| البند | القيمة |
|---|---|
| Base URL | `{{BASE_URL}}/api/v1` (هيتبعتلك الرابط الفعلي) |
| Content-Type | `application/json` — ما عدا الـ endpoints اللي فيها رفع صور بتبقى `multipart/form-data` |
| Auth header | `Authorization: Bearer <token>` |
| الصور | بترجع URL كامل جاهز تحطه في `<img src>` (ما عدا صورة اليوزر `profileImg` بترجع اسم الملف بس، والـ URL بتاعها `{{BASE_URL}}/users/<fileName>`) |

### الـ Roles
- `user` — العميل العادي (Cart, Wishlist, Addresses, Orders, Reviews)
- `manager` — لوحة التحكم (إضافة/تعديل منتجات، أقسام، براندات، كوبونات، أوردرات)
- `admin` — نفس صلاحيات الـ manager + الحذف

> الـ token بيرجع مع `signup` و `login` و `resetPassword` و `changeMyPassword`. خزّنه واستخدمه في كل request محمي.
> لو الـ token انتهى أو اليوزر غيّر الباسورد → هيرجع `401` → وديه على صفحة الـ login.

---

## 2. شكل الـ Responses

### قائمة (List) — كل الـ GET اللي بترجع أكتر من عنصر
```json
{
  "results": 10,
  "pagination": {
    "currentPage": 1,
    "limit": "10",
    "skip": 0,
    "numberOfPage": 5,
    "next": 2,
    "prev": 0
  },
  "data": [ ... ]
}
```
`next` و `prev` بيظهروا بس لو فيه صفحة بعد/قبل.

### عنصر واحد
```json
{ "data": { ... } }
```

### الحذف
`204 No Content` — مفيش body.

### الأخطاء
**أخطاء الـ validation** (status `400`):
```json
{
  "errors": [
    { "type": "field", "value": "", "msg": "Email required", "path": "email", "location": "body" }
  ]
}
```
استخدم `path` عشان تعرض الرسالة `msg` تحت الـ input المناسب.

**باقي الأخطاء** (`401`, `403`, `404`, `500`...):
```json
{ "status": "fail", "message": "Incorrect email or password" }
```

---

## 3. Query Params (فلترة، بحث، ترتيب، صفحات)

شغالة على أي GET بيرجع list (products, categories, brands, subcategories, reviews, users, orders, coupons).

| Param | مثال | الوصف |
|---|---|---|
| `page` | `?page=2` | رقم الصفحة (default 1) |
| `limit` | `?limit=12` | عدد العناصر في الصفحة (default 50) |
| `sort` | `?sort=-price` / `?sort=price,-sold` | ترتيب، `-` يعني تنازلي |
| `field` | `?field=title,price,imageCover` | ترجع حقول معينة بس (**لاحظ: `field` مش `fields`**) |
| `keyword` | `?keyword=iphone` | بحث — في المنتجات بيدور في `title` و `description`، في الباقي في `name` |
| أي حقل | `?category=<id>` / `?brand=<id>` | فلترة بقيمة |
| مقارنة | `?price[gte]=100&price[lte]=500` / `?ratingsAverage[gte]=4` | `gt`, `gte`, `lt`, `lte` |

مثال كامل:
```
GET /api/v1/products?keyword=shirt&category=65ab...&price[lte]=1000&sort=-sold&page=1&limit=12
```

---

## 4. Auth — `/api/v1/auth`

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/auth/signup` | Public | `{ name, email, password, passwordConfirm }` |
| POST | `/auth/login` | Public | `{ email, password }` |
| POST | `/auth/forgotPassword` | Public | `{ email }` |
| POST | `/auth/verifyResetCode` | Public | `{ resetCode }` |
| PUT | `/auth/resetPassword` | Public | `{ email, newPassword }` |

**Response بتاع signup / login:**
```json
{ "data": { "_id": "...", "name": "...", "email": "...", "role": "user", ... }, "token": "eyJhbGci..." }
```
استخدم `data.role` عشان تحدد تظهر لوحة الأدمن ولا لأ.

**Validation:**
- `name` على الأقل 3 حروف
- `email` صحيح ومش مستخدم قبل كده
- `password` على الأقل 6 حروف ولازم يساوي `passwordConfirm`

### Flow نسيت كلمة السر (3 شاشات)
1. اليوزر يكتب الإيميل → `POST /auth/forgotPassword` → بيوصله كود 6 أرقام على الإيميل (صالح 10 دقايق)
2. اليوزر يكتب الكود → `POST /auth/verifyResetCode` `{ "resetCode": "123456" }` → `{ "status": "Success" }`
3. اليوزر يكتب الباسورد الجديد → `PUT /auth/resetPassword` `{ "email", "newPassword" }` → `{ "token" }` (يعتبر عمل login)

> احتفظ بالإيميل من الخطوة 1 عشان تبعته في الخطوة 3.

---

## 5. Profile (اليوزر اللي عامل login) — `/api/v1/users`

كلها محتاجة token (أي role).

| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/users/getMe` | — | `{ data: user }` |
| PUT | `/users/updateMe` | `{ name?, email, phone? }` | `{ data: user }` |
| PUT | `/users/changeMyPassword` | `{ password }` | `{ data: user, token }` ← **خزّن الـ token الجديد**، القديم بيبطل |
| DELETE | `/users/deleteMe` | — | `204` (بيعمل deactivate للحساب) |

- `phone` لازم يكون رقم مصري أو سعودي.
- ⚠️ `updateMe`: الـ `email` حالياً **إجباري** ولازم يكون **مش مستخدم** — يعني لو اليوزر مغيرش الإيميل هيرجع error `E-mail already in user`. (مشكلة في الباك اند هتتصلح — انظر قسم 17)

---

## 6. Categories — `/api/v1/categories`

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| GET | `/categories` | Public | — |
| GET | `/categories/:id` | Public | — |
| POST | `/categories` | admin, manager | **form-data**: `name` (3-32 حرف), `image` (file) |
| PUT | `/categories/:id` | admin, manager | **form-data**: `name`, `image` (file) |
| DELETE | `/categories/:id` | admin | — |

**Category object:**
```json
{ "_id": "...", "name": "Electronics", "slug": "Electronics", "image": "https://.../categories/xxx.jpeg", "createdAt": "...", "updatedAt": "..." }
```
> ⚠️ لازم تبعت `image` مع الـ POST والـ PUT (لو مبعتش صورة هيرجع 500).

---

## 7. SubCategories — `/api/v1/subcategories`

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| GET | `/subcategories` | Public | — |
| GET | `/categories/:categoryId/subcategory` | Public | — (الأقسام الفرعية لقسم معين) |
| GET | `/subcategories/:id` | Public | — |
| POST | `/subcategories` | admin, manager | `{ name, category: "<categoryId>" }` |
| POST | `/categories/:categoryId/subcategory` | admin, manager | `{ name }` |
| PUT | `/subcategories/:id` | admin, manager | `{ name }` |
| DELETE | `/subcategories/:id` | admin | — |

> لاحظ الـ nested route اسمه `subcategory` (مفرد).

---

## 8. Brands — `/api/v1/brands`

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| GET | `/brands` | Public | — |
| GET | `/brands/:id` | Public | — |
| POST | `/brands` | admin, manager | **form-data**: `name` (3-32 حرف), `nameAr`, `image` (اختياري) |
| PUT | `/brands/:id` | admin, manager | **form-data**: نفس الحقول — الصورة اختيارية |
| DELETE | `/brands/:id` | admin | — |

> صورة البراند اختيارية، ولو مبعتهاش في التعديل الصورة الحالية بتفضل زي ما هي.

---

## 9. Products — `/api/v1/products`

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| GET | `/products` | Public | — (استخدم query params من قسم 3) |
| GET | `/products/:id` | Public | — (بيرجع معاه `reviews`) |
| POST | `/products` | admin, manager | **form-data** (تحت) |
| PUT | `/products/:id` | admin, manager | **form-data** |
| DELETE | `/products/:id` | admin | — |

**حقول الـ form-data للـ POST:**

| Field | Type | Required | ملاحظات |
|---|---|---|---|
| `title` | text | ✅ | 3-100 حرف |
| `description` | text | ✅ | 20-2000 حرف |
| `quantity` | number | ✅ | |
| `price` | number | ✅ | أقصى حاجة 200000 |
| `priceAfterDiscount` | number | | لازم يكون أقل من `price` |
| `colors` | text (يتكرر) | | ابعته أكتر من مرة: `colors=red`, `colors=blue` |
| `category` | id | ✅ | |
| `brand` | id | | |
| `imageCover` | file | ✅ | صورة واحدة |
| `images` | file (يتكرر) | ✅ حالياً | لحد 5 صور |

> ⚠️ لازم تبعت على الأقل صورة واحدة في `images` في الـ POST والـ PUT، وإلا الـ request هيفضل معلّق (مش هيرجع رد).
> ⚠️ حقل `subcategories` بيرجع error دايماً حالياً — متبعتوش. (انظر قسم 17)

**Product object:**
```json
{
  "_id": "...",
  "title": "...",
  "slug": "...",
  "description": "...",
  "quantity": 20,
  "sold": 3,
  "price": 500,
  "priceAfterDiscount": 450,
  "colors": ["red", "blue"],
  "imageCover": "https://.../products/xxx-cover.jpeg",
  "images": ["https://.../products/xxx-1.jpeg"],
  "category": { "name": "Electronics" },
  "subcategories": ["..."],
  "brand": "<brandId>",
  "ratingsAverage": 4.3,
  "ratingsQuantity": 12,
  "reviews": [ ... ],
  "id": "..."
}
```
- `category` بيرجع populated بالاسم بس (من غير `_id`)، `brand` بيرجع ID.
- لو فيه `priceAfterDiscount` اعرض السعر القديم مشطوب.
- `quantity = 0` → اعرض "Out of stock".

---

## 10. Reviews

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| GET | `/products/:productId/reviews` | Public | — (ريفيوهات منتج) |
| GET | `/reviews` | Public | — (كل الريفيوهات) |
| GET | `/reviews/:id` | Public | — |
| POST | `/products/:productId/reviews` | user | `{ title?, ratings }` |
| PUT | `/reviews/:id` | user (صاحب الريفيو بس) | `{ title?, ratings? }` |
| DELETE | `/reviews/:id` | user (صاحبه) / admin / manager | — |

- `ratings` من 1 لـ 5.
- اليوزر يقدر يعمل ريفيو واحد بس لكل منتج (`You already created a review before`).
- الريفيو بيرجع فيه `user: { _id, name }`.
- `ratingsAverage` و `ratingsQuantity` في المنتج بيتحدثوا أوتوماتيك.

---

## 11. Wishlist — `/api/v1/wishlist` (role: user)

| Method | Endpoint | Body | Response `data` |
|---|---|---|---|
| GET | `/wishlist` | — | array منتجات كاملة |
| POST | `/wishlist` | `{ productId }` | array IDs |
| DELETE | `/wishlist/:productId` | — | array IDs |

> استخدم الـ IDs اللي بترجع من POST/DELETE عشان تلوّن أيقونة القلب.

---

## 12. Addresses — `/api/v1/address` (role: user)

> لاحظ: `address` مفرد.

| Method | Endpoint | Body |
|---|---|---|
| GET | `/address` | — |
| POST | `/address` | `{ alias, details, phone, city, postalCode }` |
| DELETE | `/address/:addressId` | — |

كلهم بيرجعوا `data` = array العناوين. كل عنوان له `_id` (استخدمه في الحذف). مفيش endpoint لتعديل عنوان — احذف وضيف جديد.

---

## 13. Cart — `/api/v1/cart` (role: user)

| Method | Endpoint | Body | ملاحظات |
|---|---|---|---|
| GET | `/cart` | — | `404` لو مفيش كارت → اعرض "السلة فاضية" |
| POST | `/cart` | `{ productId, color? }` | لو المنتج بنفس اللون موجود الكمية بتزيد 1 |
| PUT | `/cart/:itemId` | `{ quantity }` | `itemId` = `_id` بتاع العنصر جوه `cartItems` (مش الـ productId) |
| DELETE | `/cart/:itemId` | — | حذف عنصر |
| DELETE | `/cart` | — | تفريغ السلة (`204`) |
| PUT | `/cart/applyCoupon` | `{ coupon: "SUMMER20" }` | اسم الكوبون |

**Response:**
```json
{
  "status": "success",
  "numOfCartItems": 2,
  "data": {
    "_id": "<cartId>",
    "user": "...",
    "cartItems": [
      { "_id": "<itemId>", "product": "<productId>", "quantity": 2, "color": "red", "price": 500 }
    ],
    "totalCartPrice": 1000,
    "totalPriceAfterDiscount": 800
  }
}
```
- `numOfCartItems` → للـ badge على أيقونة السلة.
- `cartItems[].product` بيرجع **ID بس** — هتحتاج تجيب بيانات المنتج (صورة/اسم) من `/products/:id` أو من الكاش عندك.
- `totalPriceAfterDiscount` بيظهر بس بعد تطبيق كوبون، وبيتشال لو اليوزر عدّل السلة (لازم يطبق الكوبون تاني).
- **احتفظ بـ `data._id` (الـ cartId)** — محتاجه في إنشاء الأوردر.

---

## 14. Orders — `/api/v1/orders`

### لليوزر
| Method | Endpoint | Body | ملاحظات |
|---|---|---|---|
| POST | `/orders/:cartId` | `{ shippingAddress: { details, phone, city, postalCode } }` | أوردر كاش — السلة بتتمسح بعدها |
| GET | `/orders/checkout-session/:cartId` | — | دفع بالفيزا (Stripe) — انظر تحت |
| GET | `/orders` | — | أوردرات اليوزر بس |
| GET | `/orders/:id` | — | تفاصيل أوردر |

### للأدمن/المانجر
| Method | Endpoint | ملاحظات |
|---|---|---|
| GET | `/orders` | كل الأوردرات |
| PUT | `/orders/:id/pay` | تعليم الأوردر "مدفوع" |
| PUT | `/orders/:id/deliver` | تعليم الأوردر "تم التوصيل" |

**Order object:**
```json
{
  "_id": "...",
  "user": { "_id": "...", "name": "...", "email": "...", "phone": "..." },
  "cartItems": [
    { "product": { "_id": "...", "title": "...", "imageCover": "..." }, "quantity": 2, "color": "red", "price": 500 }
  ],
  "shippingAddress": { "details": "...", "phone": "...", "city": "...", "postalCode": "..." },
  "taxPrice": 0,
  "shippingPrice": 0,
  "totalOrderPrice": 1000,
  "paymentMethodType": "cash",
  "isPaid": false,
  "paidAt": null,
  "isDelivered": false,
  "deliveredAt": null,
  "createdAt": "..."
}
```

### الدفع بالفيزا (Stripe)
1. `GET /orders/checkout-session/:cartId`
2. الرد: `{ status: "success", session: { url: "https://checkout.stripe.com/..." , ... } }`
3. اعمل redirect لـ `session.url`
4. بعد الدفع الأوردر بيتعمل أوتوماتيك من السيرفر (webhook) — مفيش حاجة مطلوبة منك.

> ⚠️ الـ checkout بالفيزا محتاج تعديلات في الباك اند قبل ما يشتغل (انظر قسم 17). ابدأ بالكاش.

---

## 15. Admin Dashboard

### Users — `/api/v1/users` (admin, manager)
| Method | Endpoint | Body |
|---|---|---|
| GET | `/users` | — |
| GET | `/users/:id` | — |
| POST | `/users` | **form-data**: `name, email, password, passwordConfirm, phone?, role?, profileImg? (file)` |
| PUT | `/users/:id` | **form-data**: `name?, email, phone?, role?, profileImg? (file)` |
| DELETE | `/users/:id` | — |
| PUT | `/users/changeMyPassword/:id` | `{ currentPassword, password, passwordConfirm }` |

`role` قيمه: `user` / `manager` / `admin`.

### Coupons — `/api/v1/coupon` (admin, manager)
| Method | Endpoint | Body |
|---|---|---|
| GET | `/coupon` | — |
| GET | `/coupon/:id` | — |
| POST | `/coupon` | `{ name, expire: "2026-12-31", discount: 20 }` |
| PUT | `/coupon/:id` | أي حقل |
| DELETE | `/coupon/:id` | — |

`discount` نسبة مئوية (20 = خصم 20%). لاحظ `coupon` مفرد.

---

## 16. ملخص الصفحات المطلوبة

**الموقع (User):**
- Home (منتجات الأكثر مبيعاً `sort=-sold`، أقسام، براندات)
- Products list + فلاتر (قسم، براند، سعر، تقييم) + بحث + pagination
- Product details + reviews + إضافة ريفيو
- Categories / Brands / SubCategories
- Login / Signup / Forgot password (3 خطوات)
- Cart + كوبون
- Checkout (اختيار عنوان + كاش/فيزا)
- My Orders + تفاصيل الأوردر
- Wishlist
- Profile (تعديل البيانات، تغيير الباسورد، العناوين)

**لوحة التحكم (admin/manager):**
- CRUD: Products, Categories, SubCategories, Brands, Coupons, Users
- Orders: عرض الكل + تعليم مدفوع/تم التوصيل
- إخفاء زراير الحذف عن الـ manager (الحذف admin بس، ما عدا الريفيوهات)

---

## 17. المشاكل المعروفة — اتصلحت ✅

| # | المشكلة | الحالة |
|---|---|---|
| 1 | `updateMe` / `PUT /users/:id` بيرفضوا نفس الإيميل | ✅ نفس الإيميل مقبول، والإيميل المستخدم مع يوزر تاني بيرجع 400 |
| 2 | رفع صورة البراند | ✅ شغال (form-data، الصورة اختيارية) |
| 3 | تعديل قسم من غير صورة | ✅ الصورة اختيارية في التعديل |
| 4 | منتج من غير `images` | ✅ `images` اختياري؛ في التعديل ابعت روابط الصور اللي عايز تحتفظ بيها في `images` (JSON) + الملفات الجديدة |
| 5 | `subcategories` في المنتج | ✅ شغال (array أو JSON) ولازم تكون تابعة للقسم |
| 6 | Stripe | ✅ `POST /orders/checkout-session/:cartId` بـ `{ shippingAddress }` والـ redirect على `FRONTEND_URL` (محتاج `STRIPE_SECRET`) |
| 7 | `numberOfPage` مع الفلاتر | ✅ بيتحسب على نتيجة الفلتر + `totalResults` |
| 8 | كوبون / كود reset غلط بيرجع 500 | ✅ بيرجع 400 |
| 9 | `GET /cart` 404 لو فاضية | ✅ بيرجع 200 بسلة فاضية |

**إصلاحات إضافية:** روابط الصور مبقتش بتتكرر بعد التعديل، السلة بتستخدم سعر الخصم، تقييم المنتج بيتحدث مع تعديل/حذف الريفيو، أخطاء الـ JWT بترجع 401 في كل البيئات، الباسورد مبقاش بيرجع في أي response، اليوزر مبيقدرش يشوف أوردر يوزر تاني، والأوردر بيتأكد من المخزون.

**حقول جديدة:** `nameAr` للأقسام والبراندات والأقسام الفرعية — وللمنتج: `titleAr`, `descriptionAr`, `benefits`, `ingredients`, `sizes` (`[{ en, ar }]`), `directions` (`{ en, ar }`), `featured`. الـ `category` في المنتج بقت بترجع `{ _id, name, nameAr, slug }`. السلة فيها `coupon` (اسم الكوبون المطبّق).

---

## 18. Branches (الفروع والخريطة) — `/api/v1/branches`

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| GET | `/branches` | Public | — (الفروع الظاهرة بس؛ `?all=true` للكل) |
| GET | `/branches/:id` | Public | — |
| POST | `/branches` | admin, manager | JSON (تحت) |
| PUT | `/branches/:id` | admin, manager | JSON |
| DELETE | `/branches/:id` | admin | — |

```json
{
  "name": "Royal Care - Nasr City", "nameAr": "رويال كير - مدينة نصر",
  "city": "Cairo", "cityAr": "القاهرة",
  "address": "15 Abbas El Akkad St", "addressAr": "15 شارع عباس العقاد",
  "phone": "+20 2 2270 1100", "workingHours": "10:00 AM - 11:00 PM",
  "location": { "lat": 30.0566, "lng": 31.3437 },
  "isMain": true, "active": true
}
```

---

## 19. Dummy data

`npm run seed` بيضيف/يجدد الداتا التجريبية (10 أقسام، 13 قسم فرعي، 10 براندات، 26 منتج، 10 يوزرز، 52 ريفيو، 10 كوبونات، سلات، أوردرات، 10 فروع) من `utils/dommyData/dummyData.json` — و `npm run seed:destroy` بيمسحها بس.
الدخول: `admin@care.com` / `123456` (أدمن) — `manager@care.com` (مانجر) — `sara@care.com` (يوزر).
