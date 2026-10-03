// Seed dummy data for every model from data/dummy-data.json, using pictures from /images.
//   npm run seed           => (re)insert dummy data
//   npm run seed:destroy   => remove dummy data only
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { Connection, Model, Types } from 'mongoose';
import { dirname, join } from 'path';
import sharp from 'sharp';
import slugify from 'slugify';
import { Branch } from '../../branches/schemas/branch.schema';
import { Brand } from '../../brands/schemas/brand.schema';
import { Cart } from '../../cart/schemas/cart.schema';
import { Category } from '../../categories/schemas/category.schema';
import {
  deleteImage,
  ImageFolder,
  initImageStorage,
  saveImage as saveUpload,
} from '../../common/uploads/image-storage';
import { toFileName } from '../../common/utils/image-url';
import { Coupon } from '../../coupons/schemas/coupon.schema';
import { Order } from '../../orders/schemas/order.schema';
import { Product } from '../../products/schemas/product.schema';
import { Review } from '../../reviews/schemas/review.schema';
import { SubCategory } from '../../subcategories/schemas/subcategory.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { SeedModule } from './seed.module';

interface Localized {
  en?: string;
  ar?: string;
}

interface DummyData {
  userPassword: string;
  categories: { name: string; nameAr: string; image: string }[];
  subCategories: { name: string; nameAr: string; category: string }[];
  brands: { name: string; nameAr: string; color: string; initials: string }[];
  products: {
    title: string;
    titleAr?: string;
    description: string;
    descriptionAr?: string;
    benefits?: Localized[];
    ingredients?: Localized[];
    directions?: Localized;
    sizes?: Localized[];
    featured?: boolean;
    quantity: number;
    sold?: number;
    price: number;
    priceAfterDiscount?: number;
    colors?: string[];
    cover: string;
    images: string[];
    category: string;
    sub: string;
    brand: string;
  }[];
  users: { name: string; email: string; role: UserRole; image: string; city: string }[];
  reviews: { title: string; ratings: number }[];
  coupons: { name: string; discount: number }[];
  branches: (Record<string, unknown> & { name: string; lat: number; lng: number })[];
}

const logger = new Logger('Seed');
const data = JSON.parse(readFileSync(join(__dirname, 'data', 'dummy-data.json'), 'utf8')) as DummyData;
const IMAGES_DIR = join(process.cwd(), 'images');

// process image from /images into /uploads/<folder> exactly like an API upload
const saveImage = (file: string, folder: ImageFolder, suffix?: string) =>
  saveUpload(join(IMAGES_DIR, file), folder, suffix);

// delete stored images of old dummy data so re-running the seed does not pile up files
const removeImages = async (folder: ImageFolder, names: (string | undefined)[]) => {
  await Promise.all(
    names.filter((n): n is string => Boolean(n)).map((value) => deleteImage(folder, toFileName(value) as string)),
  );
};

const slug = (s: string) => slugify(s, { lower: true, strict: true });
const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Generates a square brand logo (images/brands/<slug>.png) when it does not exist yet
const ensureBrandLogo = async (brand: DummyData['brands'][number]) => {
  const file = `brands/${slug(brand.name)}.png`;
  const target = join(IMAGES_DIR, file);
  if (existsSync(target)) return file;
  mkdirSync(dirname(target), { recursive: true });
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${brand.color}" stop-opacity="0.95"/>
        <stop offset="1" stop-color="${brand.color}" stop-opacity="0.7"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="#ffffff"/>
    <circle cx="300" cy="245" r="150" fill="url(#g)"/>
    <circle cx="300" cy="245" r="132" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="4"/>
    <text x="300" y="245" dy="0.35em" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
      font-size="120" font-weight="700" fill="#ffffff" letter-spacing="4">${escapeXml(brand.initials)}</text>
    <text x="300" y="490" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
      font-size="54" font-weight="700" fill="#2b2b2b">${escapeXml(brand.name)}</text>
    <rect x="230" y="520" width="140" height="5" rx="2.5" fill="${brand.color}"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(target);
  return file;
};

interface Models {
  Category: Model<Category>;
  SubCategory: Model<SubCategory>;
  Brand: Model<Brand>;
  Product: Model<Product>;
  User: Model<User>;
  Review: Model<Review>;
  Coupon: Model<Coupon>;
  Cart: Model<Cart>;
  Order: Model<Order>;
  Branch: Model<Branch>;
}

const destroyData = async (m: Models) => {
  const users = await m.User.find({ email: { $in: data.users.map((u) => u.email) } })
    .select('_id profileImg')
    .lean();
  const userIds = users.map((u) => u._id);
  const products = await m.Product.find({ title: { $in: data.products.map((p) => p.title) } })
    .select('_id imageCover images')
    .lean();
  const productIds = products.map((p) => p._id);
  const brands = await m.Brand.find({ name: { $in: data.brands.map((b) => b.name) } })
    .select('image')
    .lean();
  const categories = await m.Category.find({ name: { $in: data.categories.map((c) => c.name) } })
    .select('image')
    .lean();

  await removeImages(
    'users',
    users.map((u) => u.profileImg),
  );
  await removeImages(
    'products',
    products.flatMap((p) => [p.imageCover, ...(p.images || [])]),
  );
  await removeImages(
    'brands',
    brands.map((b) => b.image),
  );
  await removeImages(
    'categories',
    categories.map((c) => c.image),
  );

  await m.Order.deleteMany({ user: { $in: userIds } });
  await m.Cart.deleteMany({ user: { $in: userIds } });
  await m.Review.deleteMany({ $or: [{ user: { $in: userIds } }, { product: { $in: productIds } }] });
  await m.Coupon.deleteMany({ name: { $in: data.coupons.map((c) => c.name) } });
  await m.Product.deleteMany({ _id: { $in: productIds } });
  await m.User.deleteMany({ _id: { $in: userIds } });
  await m.SubCategory.deleteMany({ name: { $in: data.subCategories.map((s) => s.name) } });
  await m.Brand.deleteMany({ name: { $in: data.brands.map((b) => b.name) } });
  await m.Category.deleteMany({ name: { $in: data.categories.map((c) => c.name) } });
  await m.Branch.deleteMany({ name: { $in: data.branches.map((b) => b.name) } });
};

const insertData = async (m: Models) => {
  // remove old dummy data first so the script can be re-run safely
  await destroyData(m);

  const categories = await m.Category.insertMany(
    await Promise.all(
      data.categories.map(async (c) => ({
        name: c.name,
        nameAr: c.nameAr,
        slug: slug(c.name),
        image: await saveImage(c.image, 'categories'),
      })),
    ),
  );
  const categoryId = (name: string) => categories.find((c) => c.name === name)!._id;
  logger.log(`Categories: ${categories.length}`);

  const subCategories = await m.SubCategory.insertMany(
    data.subCategories.map((s) => ({
      name: s.name,
      nameAr: s.nameAr,
      slug: slug(s.name),
      category: categoryId(s.category),
    })),
  );
  const subId = (name: string) => subCategories.find((s) => s.name === name)!._id;
  logger.log(`SubCategories: ${subCategories.length}`);

  // Brands (logos are generated once into images/brands)
  const brandDocs: Partial<Brand>[] = [];
  for (const b of data.brands) {
    const logo = await ensureBrandLogo(b);
    brandDocs.push({ name: b.name, nameAr: b.nameAr, slug: slug(b.name), image: await saveImage(logo, 'brands') });
  }
  const brands = await m.Brand.insertMany(brandDocs);
  const brandId = (name: string) => brands.find((b) => b.name === name)!._id;
  logger.log(`Brands: ${brands.length}`);

  const products = await m.Product.insertMany(
    await Promise.all(
      data.products.map(async (p) => ({
        title: p.title,
        titleAr: p.titleAr,
        slug: slug(p.title),
        description: p.description,
        descriptionAr: p.descriptionAr,
        benefits: p.benefits,
        ingredients: p.ingredients,
        directions: p.directions,
        sizes: p.sizes,
        featured: p.featured,
        quantity: p.quantity,
        sold: p.sold,
        price: p.price,
        priceAfterDiscount: p.priceAfterDiscount,
        colors: p.colors,
        imageCover: await saveImage(p.cover, 'products', '-cover'),
        images: await Promise.all(p.images.map((img, index) => saveImage(img, 'products', `-${index + 1}`))),
        category: categoryId(p.category),
        subcategories: [subId(p.sub)],
        brand: brandId(p.brand),
      })),
    ),
  );
  logger.log(`Products: ${products.length}`);

  // Users (create => password gets hashed by pre save hook)
  const addressOf = (u: DummyData['users'][number], i: number) => ({
    details: `${i + 1} Main Street`,
    phone: `0100000000${i}`,
    city: u.city,
    postalCode: `1${i}000`,
  });
  const users = await m.User.create(
    await Promise.all(
      data.users.map(async (u, i) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        slug: slug(u.name),
        password: data.userPassword,
        phone: `0100000000${i}`,
        profileImg: await saveImage(u.image, 'users'),
        wishlist: [products[i % products.length]._id, products[(i + 7) % products.length]._id],
        addresses: [{ id: new Types.ObjectId(), alias: 'home', ...addressOf(u, i) }],
      })),
    ),
  );
  const shoppers = users.filter((u) => u.role === 'user');
  logger.log(`Users: ${users.length}`);

  // Reviews: two different shoppers per product (create => recalculates product ratings)
  let reviewCount = 0;
  for (const [i, product] of products.entries()) {
    for (const k of [0, 1]) {
      const r = data.reviews[(i * 2 + k) % data.reviews.length];
      await m.Review.create({
        title: r.title,
        ratings: r.ratings,
        user: shoppers[(i + k * 3) % shoppers.length]._id,
        product: product._id,
      });
      reviewCount += 1;
    }
  }
  logger.log(`Reviews: ${reviewCount}`);

  const coupons = await m.Coupon.insertMany(
    data.coupons.map((c, i) => ({
      name: c.name,
      discount: c.discount,
      expire: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000),
    })),
  );
  logger.log(`Coupons: ${coupons.length}`);

  // Carts + Orders (one each per user)
  const priceOf = (p: DummyData['products'][number]) => p.priceAfterDiscount || p.price;
  const buildItems = (i: number) => {
    const a = i % products.length;
    const b = (i + 3) % products.length;
    return [
      { product: products[a]._id, quantity: 1, price: priceOf(data.products[a]) },
      { product: products[b]._id, quantity: 2, price: priceOf(data.products[b]) },
    ];
  };
  const total = (items: { price: number; quantity: number }[]) =>
    items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const carts = await m.Cart.insertMany(
    users.map((u, i) => {
      const cartItems = buildItems(i);
      return { user: u._id, cartItems, totalCartPrice: total(cartItems) };
    }),
  );
  logger.log(`Carts: ${carts.length}`);

  const orders = await m.Order.insertMany(
    users.map((u, i) => {
      const cartItems = buildItems(i + 5);
      const isPaid = i % 2 === 0;
      const isDelivered = i % 3 === 0;
      return {
        user: u._id,
        cartItems,
        taxPrice: 0,
        shippingPrice: 0,
        totalOrderPrice: total(cartItems),
        paymentMethodType: isPaid ? 'card' : 'cash',
        isPaid,
        paidAt: isPaid ? new Date() : undefined,
        isDelivered,
        deliveredAt: isDelivered ? new Date() : undefined,
        shippingAddress: addressOf(data.users[i], i),
      };
    }),
  );
  logger.log(`Orders: ${orders.length}`);

  // Branches (store locator map)
  const branches = await m.Branch.insertMany(
    data.branches.map(({ lat, lng, ...b }) => ({ ...b, location: { lat, lng } })),
  );
  logger.log(`Branches: ${branches.length}`);
};

async function run() {
  const flag = process.argv[2];
  if (!['-i', '-d'].includes(flag)) {
    logger.error('Usage: seed-all -i | -d');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['log', 'error', 'warn'] });
  const model = <T>(name: string) => app.get<Model<T>>(getModelToken(name));
  // images are stored in MongoDB (GridFS)
  initImageStorage(app.get<Connection>(getConnectionToken()));
  const models: Models = {
    Category: model(Category.name),
    SubCategory: model(SubCategory.name),
    Brand: model(Brand.name),
    Product: model(Product.name),
    User: model(User.name),
    Review: model(Review.name),
    Coupon: model(Coupon.name),
    Cart: model(Cart.name),
    Order: model(Order.name),
    Branch: model(Branch.name),
  };

  try {
    if (flag === '-i') {
      await insertData(models);
      logger.log('Dummy Data Inserted');
      logger.log(`Login: ${data.users[0].email} / <userPassword from dummy-data.json>`);
    } else {
      await destroyData(models);
      logger.log('Dummy Data Destroyed');
    }
  } catch (error) {
    logger.error(error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void run();
