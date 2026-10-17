import { readFileSync } from 'node:fs';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const fontBytes = readFileSync(new URL('../../assets/fonts/NotoSans-Regular.ttf', import.meta.url));
const ink = rgb(0.027, 0.114, 0.286);
const muted = rgb(0.32, 0.38, 0.48);
const lineColor = rgb(0.82, 0.85, 0.91);
const money = amount => `Q ${Number(amount || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = value => new Date(value).toLocaleDateString('es-GT', { timeZone: 'America/Guatemala', day: '2-digit', month: 'long', year: 'numeric' });

async function sheet(title, subtitle) {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(fontBytes, { subset: true });
  const page = document.addPage([595, 842]);
  const draw = (value, x, y, size = 11, color = ink) => page.drawText(String(value ?? ''), { x, y, size, font, color });
  draw('MFN Digital', 42, 796, 15);
  draw(title, 42, 751, 21);
  draw(subtitle, 42, 728, 10, muted);
  page.drawLine({ start: { x: 42, y: 710 }, end: { x: 553, y: 710 }, thickness: 0.8, color: lineColor });
  draw('Documento generado a partir de los registros del sistema.', 42, 40, 8, muted);
  return { document, page, draw, font };
}

function fitted(value, font, size, maxWidth) {
  const clean = String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim();
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  let result = clean;
  while (result.length && font.widthOfTextAtSize(`${result}…`, size) > maxWidth) result = result.slice(0, -1);
  return `${result}…`;
}

export async function transactionReceiptPdf(tx) {
  const { document, page, draw, font } = await sheet('Constancia interna de registro', 'Movimiento financiero registrado en la plataforma');
  const fields = [
    ['Código', tx.codigo], ['Fecha', day(tx.fecha)], ['Tipo', tx.tipo],
    ['Cuenta', tx.cuentaBancaria], ['Categoría', tx.categoria], ['Municipio', tx.municipio || 'Regional'],
    ['Comprobante original', `${tx.comprobanteTipo} · ${tx.comprobanteNumero}`],
    ['Concepto', tx.descripcion],
  ];
  let y = 674;
  for (const [label, value] of fields) {
    draw(label, 42, y, 9, muted);
    draw(fitted(value, font, 10, 365), 186, y, 10);
    y -= 35;
  }
  page.drawLine({ start: { x: 42, y: y - 6 }, end: { x: 553, y: y - 6 }, thickness: 0.8, color: lineColor });
  draw('Monto registrado', 42, y - 42, 12);
  draw(money(tx.monto), 345, y - 42, 18);
  draw('Constancia administrativa interna. No sustituye factura, recibo fiscal ni conciliación bancaria.', 42, 88, 8, muted);
  return Buffer.from(await document.save());
}

export async function annualFinanceReportPdf(year, transactions, scopeLabel) {
  const { document, draw, font } = await sheet('Informe de ejecución financiera', `Año fiscal ${year} · ${scopeLabel}`);
  const groups = ['Fondos Públicos', 'Cooperación Internacional'].map(account => {
    const rows = transactions.filter(tx => tx.cuentaBancaria === account);
    const income = rows.filter(tx => tx.tipo === 'Ingreso').reduce((sum, tx) => sum + tx.monto, 0);
    const expense = rows.filter(tx => tx.tipo === 'Egreso').reduce((sum, tx) => sum + tx.monto, 0);
    return { account, income, expense, balance: income - expense };
  });
  const totalIncome = groups.reduce((sum, group) => sum + group.income, 0);
  const totalExpense = groups.reduce((sum, group) => sum + group.expense, 0);
  draw(`Ingresos: ${money(totalIncome)}`, 42, 668, 12);
  draw(`Egresos: ${money(totalExpense)}`, 42, 641, 12);
  draw(`Saldo registrado: ${money(totalIncome - totalExpense)}`, 42, 614, 12);
  draw('Cuenta', 42, 558, 10, muted); draw('Ingresos', 265, 558, 10, muted); draw('Egresos', 370, 558, 10, muted); draw('Saldo', 473, 558, 10, muted);
  let y = 533;
  for (const group of groups) {
    draw(fitted(group.account, font, 9, 210), 42, y, 9);
    draw(money(group.income), 265, y, 9); draw(money(group.expense), 370, y, 9); draw(money(group.balance), 473, y, 9);
    y -= 30;
  }
  draw('Ejecución mensual', 42, 433, 12);
  draw('Mes', 42, 405, 9, muted); draw('Ingresos', 265, 405, 9, muted); draw('Egresos', 370, 405, 9, muted); draw('Saldo', 473, 405, 9, muted);
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  for (let month = 0; month < 12; month++) {
    const rows = transactions.filter(tx => new Date(tx.fecha).getUTCMonth() === month);
    const income = rows.filter(tx => tx.tipo === 'Ingreso').reduce((sum, tx) => sum + tx.monto, 0);
    const expense = rows.filter(tx => tx.tipo === 'Egreso').reduce((sum, tx) => sum + tx.monto, 0);
    const rowY = 382 - month * 24;
    draw(monthNames[month], 42, rowY, 9);
    draw(money(income), 265, rowY, 9); draw(money(expense), 370, rowY, 9); draw(money(income - expense), 473, rowY, 9);
  }
  draw(`Registros incluidos: ${transactions.length}. Cifras sujetas a conciliación con documentos originales.`, 42, 70, 8, muted);
  return Buffer.from(await document.save());
}
