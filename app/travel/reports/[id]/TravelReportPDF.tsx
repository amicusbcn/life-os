/* app/travel/reports/[id]/TravelReportPDF.tsx */
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { ReportSummary } from '@/utils/report-logic';
import { TravelReportWithDetails } from '@/types/travel';

// ESTILOS COMUNES
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  headerBox: { border: '1px solid #000', marginBottom: 20 },
  headerRow: { flexDirection: 'row', borderBottom: '1px solid #000' },
  headerLabel: { width: '25%', backgroundColor: '#f1f5f9', padding: 5, borderRight: '1px solid #000', fontWeight: 'bold', textTransform: 'uppercase' },
  headerValue: { width: '75%', padding: 5 },
  title: { fontSize: 18, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'underline', marginBottom: 20, fontWeight: 'bold' },
  
  // Tablas
  table: { width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#000', marginBottom: 20 },
  tableRow: { margin: 'auto', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000' },
  tableHeader: { backgroundColor: '#e2e8f0', fontWeight: 'bold' },
  colConcept: { width: '40%', borderRightWidth: 1, borderRightColor: '#000', padding: 5 },
  colMoney: { width: '20%', borderRightWidth: 1, borderRightColor: '#000', padding: 5, textAlign: 'right' },
  colTotal: { width: '20%', padding: 5, textAlign: 'right' },
  
  // Resumen final
  summaryBox: { width: '50%', marginLeft: 'auto', border: '1px solid #000' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 5, borderBottom: '1px solid #000', borderStyle: 'dashed' },
  summaryTotal: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: '#f8fafc', fontWeight: 'bold', fontSize: 12 },

  // Firmas
  signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 50, paddingTop: 10 },
  signatureBox: { width: '40%', borderTop: '1px solid #000', textAlign: 'center', paddingTop: 5 },

  // Detalle y Tickets
  sectionTitle: { fontSize: 14, fontWeight: 'bold', borderBottom: '2px solid #000', marginBottom: 10, marginTop: 20, textTransform: 'uppercase' },
  categoryHeader: { backgroundColor: '#f1f5f9', padding: 3, paddingLeft: 8, borderLeft: '4px solid #000', fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  detailRow: { flexDirection: 'row', borderBottom: '1px solid #e2e8f0', paddingVertical: 3 },
  
  // Grid Tickets
  receiptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  receiptItem: { width: '48%', border: '1px solid #cbd5e1', padding: 5, marginBottom: 10 },
  receiptImage: { width: '100%', height: 200, objectFit: 'contain' }
});

interface PDFProps {
  report: TravelReportWithDetails;
  summaryData: ReportSummary;
  employeeName: string;
}

const CategoryLabels: Record<string, string> = {
    'Kilometraje': 'KILOMETRAJE',
    'Parking/Peajes': 'PARKING / PEAJES',
    'Billetes': 'BILLETES (Avión/Tren)',
    'Dietas/Comidas': 'COMIDAS / DIETAS',
    'Hotel': 'HOTELES',
    'Taxis': 'TAXIS',
    'Varios': 'VARIOS'
};

// --- PDF 1: RESUMEN Y FIRMAS ---
export const SummaryPDF = ({ report, summaryData, employeeName }: PDFProps) => {
  const { summary, totalPropio, totalEmpresa, orderedKeys } = summaryData;
  const dateStr = new Date(report.created_at).toLocaleDateString('es-ES', { month: '2-digit', year: 'numeric' }).replace('/', ' ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBox}>
          <View style={styles.headerRow}>
             <Text style={styles.headerLabel}>Nombre:</Text>
             <Text style={styles.headerValue}>{employeeName}</Text>
          </View>
          <View style={styles.headerRow}>
             <Text style={styles.headerLabel}>Número:</Text>
             <Text style={styles.headerValue}>JA {dateStr}</Text>
          </View>
          <View style={{ ...styles.headerRow, borderBottom: 0 }}>
             <Text style={styles.headerLabel}>Concepto:</Text>
             <Text style={styles.headerValue}>{report.employer_name} - {report.name}</Text>
          </View>
        </View>

        <Text style={styles.title}>Gastos de Viaje (Resumen)</Text>

        <View style={styles.table}>
           <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.colConcept}>CONCEPTO</Text>
              <Text style={styles.colMoney}>PROPIO</Text>
              <Text style={styles.colMoney}>EMPRESA</Text>
              <Text style={styles.colTotal}>TOTAL</Text>
           </View>
           {orderedKeys.map(key => {
             const row = summary[key];
             return (
               <View key={key} style={styles.tableRow}>
                  <Text style={[styles.colConcept, { fontWeight: 'bold' }]}>{CategoryLabels[key]}</Text>
                  <Text style={styles.colMoney}>{row.propio > 0 ? row.propio.toFixed(2) : '-'}</Text>
                  <Text style={styles.colMoney}>{row.empresa > 0 ? row.empresa.toFixed(2) : '-'}</Text>
                  <Text style={[styles.colTotal, { backgroundColor: '#f8fafc', fontWeight: 'bold' }]}>{row.total > 0 ? row.total.toFixed(2) : '-'}</Text>
               </View>
             )
           })}
           <View style={[styles.tableRow, styles.tableHeader, { borderBottom: 0 }]}>
              <Text style={styles.colConcept}>TOTALES</Text>
              <Text style={styles.colMoney}>{totalPropio.toFixed(2)}</Text>
              <Text style={styles.colMoney}>{totalEmpresa.toFixed(2)}</Text>
              <Text style={styles.colTotal}>{(totalPropio + totalEmpresa).toFixed(2)} €</Text>
           </View>
        </View>

        <View style={styles.summaryBox}>
           <View style={[styles.summaryRow, { backgroundColor: '#e2e8f0', borderBottomStyle: 'solid' }]}>
              <Text style={{fontWeight: 'bold', width: '100%', textAlign: 'center'}}>RESUMEN LIQUIDACIÓN</Text>
           </View>
           <View style={styles.summaryRow}>
              <Text>Total Gastado:</Text>
              <Text>{(totalPropio + totalEmpresa).toFixed(2)} €</Text>
           </View>
           <View style={styles.summaryRow}>
              <Text style={{color: '#64748b'}}>(-) Pagado Empresa:</Text>
              <Text style={{color: '#64748b'}}>{totalEmpresa.toFixed(2)} €</Text>
           </View>
           <View style={styles.summaryTotal}>
              <Text>A REEMBOLSAR:</Text>
              <Text>{totalPropio.toFixed(2)} €</Text>
           </View>
        </View>

        <View style={styles.signatures}>
           <View style={styles.signatureBox}>
              <Text style={{fontWeight: 'bold'}}>Firma del Empleado</Text>
              <Text style={{marginTop: 30, fontSize: 8}}>{new Date().toLocaleDateString()}</Text>
           </View>
           <View style={styles.signatureBox}>
              <Text style={{fontWeight: 'bold'}}>Vº Bº Empresa</Text>
           </View>
        </View>
      </Page>
    </Document>
  );
};

// --- PDF 2: DETALLE MOVIMIENTOS ---
export const DetailPDF = ({ report, summaryData }: PDFProps) => {
  const { groupedForDetail } = summaryData;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
         <Text style={styles.title}>{report.name}</Text>
         <Text style={styles.sectionTitle}>Detalle de Movimientos</Text>
         
         {Object.keys(groupedForDetail).map((catName) => {
            if(groupedForDetail[catName].length === 0) return null;
            return (
               <View key={catName} wrap={false}>
                  <Text style={styles.categoryHeader}>{catName}</Text>
                  <View style={{ flexDirection: 'row', borderBottom: '1px solid #94a3b8', marginBottom: 2, paddingBottom: 2, color: '#64748b', fontSize: 8 }}>
                     <Text style={{ width: '20%' }}>Fecha</Text>
                     <Text style={{ width: '60%' }}>Concepto</Text>
                     <Text style={{ width: '20%', textAlign: 'right' }}>Importe</Text>
                  </View>
                  {groupedForDetail[catName].map(e => (
                     <View key={e.id} style={styles.detailRow}>
                        <Text style={{ width: '20%' }}>{new Date(e.date).toLocaleDateString()}</Text>
                        <View style={{ width: '60%' }}>
                           <Text>{e.concept}</Text>
                           <Text style={{ color: '#94a3b8', fontSize: 8, fontStyle: 'italic' }}>({e.tripName}) {e.mileage_distance ? ` - ${e.mileage_distance} km` : ''}</Text>
                        </View>
                        <Text style={{ width: '20%', textAlign: 'right' }}>
                           {e.amount.toFixed(2)} {e.is_reimbursable ? '' : '(Visa)'}
                        </Text>
                     </View>
                  ))}
                  <View style={{ marginBottom: 10 }} />
               </View>
            )
         })}
      </Page>
    </Document>
  );
};

// --- PDF 3: TICKETS ---
export const ReceiptsPDF = ({ report, summaryData }: PDFProps) => {
  const { receipts } = summaryData;
  return (
    <Document>
       <Page size="A4" style={styles.page}>
          <Text style={styles.title}>{report.name}</Text>
          <Text style={styles.sectionTitle}>Anexo: Justificantes</Text>
          
          {receipts.length === 0 ? (
             <Text style={{color: '#94a3b8', textAlign: 'center', marginTop: 50}}>No hay tickets adjuntos en este reporte.</Text>
          ) : (
             <View style={styles.receiptGrid}>
                {receipts.map(rec => (
                   <View key={rec.id} style={styles.receiptItem} wrap={false}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', marginBottom: 5, paddingBottom: 2 }}>
                         <Text style={{ fontSize: 8, width: '70%', maxLines: 1 }}>{rec.concept}</Text>
                         <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{rec.amount}€</Text>
                      </View>
                      {rec.receipt_url && (
                         <Image src={rec.receipt_url} style={styles.receiptImage} />
                      )}
                   </View>
                ))}
             </View>
          )}
       </Page>
    </Document>
  );
};