import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getExecutiveSummary(startDate: Date, endDate: Date) {
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: {
        select: { name: true, role: true },
      },
    },
  });

  let totalRevenue = 0;
  let totalCost = 0;
  const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

  sales.forEach((sale) => {
    totalRevenue += sale.totalAmount;

    sale.items.forEach((item) => {
      const itemCost = item.product.buyPrice * item.quantity;
      totalCost += itemCost;

      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.product.name,
          quantity: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.productId].quantity += item.quantity;
      productSalesMap[item.productId].revenue += item.price * item.quantity;
    });
  });

  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const lowStockProducts = await prisma.product.findMany({
    where: {
      stock: {
        lte: prisma.product.fields.minStock,
      },
    },
    select: {
      id: true,
      name: true,
      stock: true,
      minStock: true,
    },
  });

  const topProduct = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity)[0] || null;

  return {
    period: { startDate, endDate },
    financials: {
      totalSalesCount: sales.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      profitMarginPercentage: Number(profitMargin.toFixed(2)),
    },
    topProduct,
    inventoryAlerts: {
      totalCriticalItems: lowStockProducts.length,
      items: lowStockProducts,
    },
  };
}