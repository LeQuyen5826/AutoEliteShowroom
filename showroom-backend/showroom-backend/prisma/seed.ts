import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...');

  // ── Chi nhánh ─────────────────────────────────────────────────────────────
  const branchHN = await prisma.branch.upsert({
    where: { id: '11111111-1111-4111-8111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Showroom Hà Nội',
      address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
      phone: '024-1234-5678',
    },
  });

  const branchHCM = await prisma.branch.upsert({
    where: { id: '22222222-2222-4222-8222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Showroom Hồ Chí Minh',
      address: '456 Điện Biên Phủ, Bình Thạnh, TP.HCM',
      phone: '028-8765-4321',
    },
  });

  console.log('✅  Chi nhánh:', branchHN.name, '|', branchHCM.name);

  // ── Tài khoản ─────────────────────────────────────────────────────────────
  const adminPass = await bcrypt.hash('admin123', 12);
  const staffPass = await bcrypt.hash('staff123', 12);
  const custPass  = await bcrypt.hash('customer123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@showroom.vn' },
    update: {},
    create: {
      full_name: 'Quản Trị Viên',
      email: 'admin@showroom.vn',
      password_hash: adminPass,
      phone: '0901000001',
      role: 'admin',
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@showroom.vn' },
    update: {},
    create: {
      full_name: 'Nguyễn Văn Nhân Viên',
      email: 'staff@showroom.vn',
      password_hash: staffPass,
      phone: '0901000002',
      role: 'staff',
      branch_id: branchHN.id,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      full_name: 'Trần Thị Khách Hàng',
      email: 'customer@example.com',
      password_hash: custPass,
      phone: '0901000003',
      role: 'customer',
    },
  });

  console.log('✅  Tài khoản:', admin.email, '|', staff.email, '|', customer.email);

  // ── Xe mẫu ────────────────────────────────────────────────────────────────
  const carsData = [
    {
      stock_code: 'HN-CAMRY-2023-001',
      branch_id: branchHN.id,
      brand: 'Toyota', model: 'Camry', year: 2023,
      price: 1_180_000_000, fuel_type: 'Xăng', transmission: 'Tự động',
      status: 'available' as const,
      description: 'Toyota Camry 2023 – sedan hạng D, nội thất sang trọng, an toàn 5 sao.',
      specs: { engine: '2.5L 4-cylinder', power: '203 hp', seats: 5, color: 'Trắng Ngọc' },
    },
    {
      stock_code: 'HN-CRV-2024-001',
      branch_id: branchHN.id,
      brand: 'Honda', model: 'CR-V', year: 2024,
      price: 1_119_000_000, fuel_type: 'Xăng', transmission: 'Tự động',
      status: 'available' as const,
      description: 'Honda CR-V 2024 – SUV cỡ C, tiết kiệm nhiên liệu, rộng rãi cho gia đình.',
      specs: { engine: '1.5L Turbo', power: '190 hp', seats: 7, color: 'Đen Ánh' },
    },
    {
      stock_code: 'HCM-C200-2023-001',
      branch_id: branchHCM.id,
      brand: 'Mercedes-Benz', model: 'C200', year: 2023,
      price: 1_699_000_000, fuel_type: 'Xăng', transmission: 'Tự động',
      status: 'available' as const,
      description: 'Mercedes C200 2023 – sedan hạng sang, hệ thống giải trí MBUX thế hệ mới.',
      specs: { engine: '1.5L EQ Boost', power: '204 hp', seats: 5, color: 'Bạc Iridium' },
    },
    {
      stock_code: 'HCM-VF8-2024-001',
      branch_id: branchHCM.id,
      brand: 'VinFast', model: 'VF8', year: 2024,
      price: 888_000_000, fuel_type: 'Điện', transmission: 'Tự động',
      status: 'available' as const,
      description: 'VinFast VF8 2024 – SUV điện thuần túy, phạm vi 420 km, sạc nhanh DC 150kW.',
      specs: { motor: 'Dual motor AWD', power: '402 hp', range_km: 420, seats: 7, color: 'Xanh Dương' },
    },
    {
      stock_code: 'HN-CX5-2023-001',
      branch_id: branchHN.id,
      brand: 'Mazda', model: 'CX-5', year: 2023,
      price: 899_000_000, fuel_type: 'Xăng', transmission: 'Tự động',
      status: 'reserved' as const,
      description: 'Mazda CX-5 2023 – Skyactiv-G, thiết kế Kodo tinh tế, trang bị i-Activsense.',
      specs: { engine: '2.0L Skyactiv-G', power: '165 hp', seats: 5, color: 'Đỏ Soul' },
    },
  ];

  for (const carData of carsData) {
    await prisma.car.upsert({
      where: { stock_code: carData.stock_code },
      update: carData,
      create: carData,
    });
  }

  console.log(`✅  Đã tạo ${carsData.length} xe mẫu`);
  console.log('\n🎉 Seed hoàn tất!\n');
  console.log('Tài khoản mẫu:');
  console.log('  Admin    – admin@showroom.vn    / admin123');
  console.log('  Staff    – staff@showroom.vn    / staff123');
  console.log('  Customer – customer@example.com / customer123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
