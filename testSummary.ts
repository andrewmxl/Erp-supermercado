import { PrismaClient } from '@prisma/client';
import { getExecutiveSummary } from './executiveSummary';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Limpiando e insertando datos de prueba ---');

  // Limpiar tablas previas
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 1. Crear un usuario (cajero)
  const user = await prisma.user.create({
    data: {
      name: 'Carlos Cajero',
      email: 'carlos@tienda.com',
      role: 'CASHIER',
    },
  });

  // 2. Crear productos
  const prod1 = await prisma.product.create({
    data: {
      name: 'Leche Entera 1L',
      sku: 'LEC-001',
      buyPrice: 18.0,
      sellPrice: 25.0,
      stock: 3, // Stock crítico (menor al minStock de 5)
      minStock: 5,
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      name: 'Pan Dulce Integrado',
      sku: 'PAN-001',
      buyPrice: 8.0,
      sellPrice: 15.0,
      stock: 40,
      minStock: 10,
    },
  });

  // 3. Registrar una venta de prueba
  await prisma.sale.create({
    data: {
      cashRegister: 1,
      totalAmount: 95.0,
      userId: user.id,
      items: {
        create: [
          { productId: prod1.id, quantity: 2, price: 25.0 }, // $50
          { productId: prod2.id, quantity: 3, price: 15.0 }, // $45
        ],
      },
    },
  });

  console.log('¡Datos de prueba insertados con éxito!\n');

  // 4. Probar el módulo de Resumen Ejecutivo
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 1); // Desde ayer
  const endDate = new Date(); // Hasta hoy

  const summary = await getExecutiveSummary(startDate, endDate);

  console.log('=== RESULTADO DEL RESUMEN EJECUTIVO ===');
  console.dir(summary, { depth: null });
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });