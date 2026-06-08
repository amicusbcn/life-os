// app/finance/actions/historical-import.ts
'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";

export async function importHistoricalBatchAction(
  csvRows: any[],
  accountMapping: Record<string, string>,
  categoryMapping: Record<string, string>,
  csvAccountColumns: string[],
  fileName: string = 'Contabilidad_Familiar_Movimientos.csv'
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Usuario no autenticado.' };

  try {
    // 1. Crear auditoría en finance_importers
    const { data: importerRecord, error: importerError } = await supabase
      .from('finance_importers')
      .insert({
        user_id: user.id,
        filename: fileName,
        account_id: "44c09b88-67b8-483e-a24d-c8b32155f117",
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (importerError) throw new Error(`Error en finance_importers: ${importerError.message}`);
    const importId = importerRecord.id;

    const simpleTransactions: any[] = [];
    const transferPairs: { date: string; amount: number; concept: string; fromAccountId: string; toAccountId: string }[] = [];

    csvRows.forEach((row,index) => {
      const rowCategory = row.Categoría || row.category;
      const isTransfer = rowCategory === 'TRANSFERENCIAS';
      
      const activeStandardCols = csvAccountColumns.filter(col => Math.abs(row[col] || 0) > 0.01);
      const hasInvestmentMoney = Math.abs(row['INV'] || 0) > 0.01;
      const currentInvName = row.Cat2 ? String(row.Cat2).trim() : '';

      const parsedDate = parseExcelDate(row.Fecha || row.date);
      const dateStr: string = parsedDate || new Date().toISOString().split('T')[0];
      const conceptStr = row.Concepto || row.concept || 'Importación Histórica';

      // --- ESCENARIO A: ES UNA TRANSFERENCIA ENLAZADA ---
      if (isTransfer) {
        let fromAccountId: string | undefined;
        let toAccountId: string | undefined;
        let transferAmount = 0; // Guardaremos la magnitud absoluta temporalmente sólo para construir el par

        if (hasInvestmentMoney && activeStandardCols.length === 1 && currentInvName) {
          const stdCol = activeStandardCols[0];
          const stdId = accountMapping[stdCol];
          const invId = accountMapping[`INV_${currentInvName}`];

          if (stdId && invId) {
            // Si la columna estándar es negativa, el dinero SALE de estándar hacia inversión
            const isStandardNegative = row[stdCol] < 0;
            fromAccountId = isStandardNegative ? stdId : invId;
            toAccountId = isStandardNegative ? invId : stdId;
            transferAmount = Math.abs(row[stdCol]);
          }
        } 
        else if (activeStandardCols.length === 2) {
          const colA = activeStandardCols[0];
          const colB = activeStandardCols[1];
          const idA = accountMapping[colA];
          const idB = accountMapping[colB];

          if (idA && idB) {
            fromAccountId = row[colA] < 0 ? idA : idB;
            toAccountId = row[colA] > 0 ? idA : idB;
            transferAmount = Math.abs(row[colA]);
          }
        }

        // Si es transferencia válida con dos contrapartidas encontradas
        if (fromAccountId && toAccountId) {
          transferPairs.push({
            date: dateStr,
            amount: transferAmount,
            concept: conceptStr,
            fromAccountId,
            toAccountId
          });
        }
        // Transferencia Huérfana (Se convierte en ajuste simple respetando el signo exacto del Excel)
        else if (fromAccountId || toAccountId) {
          const mappedCol = activeStandardCols.length === 1 ? activeStandardCols[0] : (hasInvestmentMoney ? 'INV' : '');
          const mappedAccountId = mappedCol === 'INV' ? accountMapping[`INV_${currentInvName}`] : accountMapping[mappedCol];
          const rawAmount = mappedCol === 'INV' ? row['INV'] : row[mappedCol];

          if (mappedAccountId) {
            simpleTransactions.push({
              user_id: user.id,
              import_id: importId,
              import_sequence: index, 
              date: dateStr,
              amount: rawAmount,
              concept: `[Ajuste] ${conceptStr}`,
              account_id: mappedAccountId,
              category_id: categoryMapping[rowCategory] || null,
              type: rawAmount > 0 ? 'income' : 'expense'
            });
          }
        }
      } 
      // --- ESCENARIO B: MOVIMIENTO SIMPLE (GASTOS O INGRESOS) ---
      else {
        // 1. Columnas bancarias normales
        activeStandardCols.forEach(col => {
          const supabaseAccountId = accountMapping[col];
          const rawAmount = row[col]; // Signo real del Excel
          if (supabaseAccountId) {
            simpleTransactions.push({
              user_id: user.id,
              import_id: importId,
              import_sequence: index, 
              date: dateStr,
              amount: rawAmount, 
              concept: conceptStr,
              account_id: supabaseAccountId,
              category_id: categoryMapping[rowCategory] || null,
              type: rawAmount > 0 ? 'income' : 'expense'
            });
          }
        });

        // 2. Carteras de inversión (Cat2)
        if (hasInvestmentMoney && currentInvName) {
          const supabaseInvId = accountMapping[`INV_${currentInvName}`];
          const rawAmount = row['INV'];
          if (supabaseInvId) {
            simpleTransactions.push({
              user_id: user.id,
              import_id: importId,
              import_sequence: index, 
              date: dateStr,
              amount: rawAmount,
              concept: conceptStr,
              account_id: supabaseInvId,
              category_id: categoryMapping[rowCategory] || null,
              type: rawAmount > 0 ? 'income' : 'expense'
            });
          }
        }
      }
    });

    // --- ESCRITURA EN BASE DE DATOS ---
    
    // Insertar transacciones simples
    if (simpleTransactions.length > 0) {
      const { error: simpleError } = await supabase.from('finance_transactions').insert(simpleTransactions);
      if (simpleError) throw simpleError;
    }

    // Insertar pares de transferencias respetando estrictamente el signo (+ / -)
    let totalTransfersInserted = 0;
    for (const pair of transferPairs) {
      
      // Tramo Origen: Dinero que SALE de la cuenta (Debe ser NEGATIVO)
      const { data: sourceTx, error: sErr } = await supabase
        .from('finance_transactions')
        .insert({
          user_id: user.id,
          import_id: importId,
          import_sequence: null, // No es parte del orden original, es un par generado
          date: pair.date,
          amount: -pair.amount,
          concept: pair.concept,
          account_id: pair.fromAccountId,
          category_id: TRANSFER_CAT_ID,
          type: 'expense'
        })
        .select('id')
        .single();

      if (sErr) throw sErr;

      // Tramo Destino: Dinero que ENTRA en la cuenta (Debe ser POSITIVO)
      const { data: targetTx, error: tErr } = await supabase
        .from('finance_transactions')
        .insert({
          user_id: user.id,
          import_id: importId,
          import_sequence: null,
          date: pair.date,
          amount: pair.amount, // <--- OBLIGATORIAMENTE POSITIVO porque entra dinero
          concept: pair.concept,
          account_id: pair.toAccountId,
          category_id: TRANSFER_CAT_ID,
          type: 'income',
          transfer_id: sourceTx.id
        })
        .select('id')
        .single();

      if (tErr) throw tErr;

      // Actualizar retroactivamente el tramo origen para completar la bidireccionalidad
      const { error: updateError } = await supabase
        .from('finance_transactions')
        .update({ transfer_id: targetTx.id })
        .eq('id', sourceTx.id);

      if (updateError) throw updateError;
      totalTransfersInserted += 2;
    }

    revalidatePath('/finance');
    return { 
      success: true, 
      importId: importId,
      insertedCount: simpleTransactions.length + totalTransfersInserted 
    };

  } catch (error: any) {
    console.error('❌ Error crítico en el motor histórico:', error);
    return { success: false, error: error.message };
  }
}

function parseExcelDate(val: any) {
  if (!val) return null;
  const str = String(val);
  const [d, m, y] = str.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}