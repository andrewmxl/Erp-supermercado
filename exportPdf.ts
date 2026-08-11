import { PrismaClient } from '@prisma/client';
import { getExecutiveSummary } from './executiveSummary';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();

  const summary = await getExecutiveSummary(startDate, endDate);
  const { financials, topProduct, inventoryAlerts } = summary;

  // Generar reporte en formato Markdown/Texto para exportación limpia
  const reportContent = `
# REPORTE EJECUTIVO DE OPERACIONES Y MÉTRICAS ERP
Fecha de Generación: ${new Date().toLocaleDateString('es-MX')}
Periodo Evaluado: Últimos 30 días

---

## 1. RESUMEN FINANCIERO
- Transacciones Registradas: ${financials.totalSalesCount}
- Ingresos Totales: $${financials.totalRevenue.toFixed(2)} MXN
- Costo Total de Operación: $${financials.totalCost.toFixed(2)} MXN
- Ganancia Neta: $${financials.netProfit.toFixed(2)} MXN
- Margen de Utilidad: ${financials.profitMarginPercentage}%

---

## 2. RENDIMIENTO DE PRODUCTOS
- Producto Estrella: ${topProduct ? topProduct.name : 'N/A'}
- Unidades Vendidas: ${topProduct ? topProduct.quantity : 0}
- Ingresos Generados por Producto Estrella: $${topProduct ? topProduct.revenue.toFixed(2) : 0} MXN

---

## 3. ESTADO DE INVENTARIO Y RIESGOS
- Productos en Stock Crítico: ${inventoryAlerts.totalCriticalItems}
${inventoryAlerts.items.map(i => `- [ALERTA REABASTECIMIENTO] ${i.name} | Stock Actual: ${i.stock} | Stock Mínimo: ${i.minStock}`).join('\n')}

---
*Documento generado automáticamente por el Sistema ERP Supermercado.*
`;

  fs.writeFileSync('Reporte_Ejecutivo.md', reportContent);
  console.log('📄 Reporte ejecutivo exportado exitosamente como "Reporte_Ejecutivo.md".');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());