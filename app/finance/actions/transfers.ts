// app/finance/actions/transfers.ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'


export async function handleTransferAction(sourceTxId: string, targetAccountId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";

    // 1. Obtener transacción origen y LA CONFIGURACIÓN de la cuenta destino
    const [{ data: source }, { data: targetAccount }] = await Promise.all([
        supabase.from('finance_transactions').select('*').eq('id', sourceTxId).single(),
        // Ahora pedimos explícitamente nuestra nueva columna
        supabase.from('finance_accounts').select('account_type, auto_mirror_transfers').eq('id', targetAccountId).single()
    ]);

    if (!source || !targetAccount) return { success: false, error: "Datos no encontrados" };

    // 2. Lógica de decisión basada en la configuración de la cuenta
    // Si el switch está ON, creamos espejo. Si está OFF, solo categorizamos.
    const shouldCreateMirror = targetAccount.auto_mirror_transfers === true;

    if (shouldCreateMirror) {
        // --- CASO A: GENERAR MOVIMIENTO ESPEJO ---
        const { data: mirror, error: mirrorError } = await supabase
            .from('finance_transactions')
            .insert({
                account_id: targetAccountId,
                amount: -source.amount, 
                concept: `VÍNCULO: ${source.concept}`,
                date: source.date,
                category_id: TRANSFER_CAT_ID,
                user_id: user.id,
                transfer_id: source.id 
            })
            .select().single();

        if (mirrorError) return { success: false, error: mirrorError.message };

        await supabase.from('finance_transactions')
            .update({ 
                transfer_id: mirror.id, 
                category_id: TRANSFER_CAT_ID 
            })
            .eq('id', source.id);
            
        revalidatePath('/finance');
        return { success: true, message: "Movimiento espejo creado automáticamente según configuración" };
    } else {
        // --- CASO B: SOLO CATEGORIZAR (Esperar a importación) ---
        await supabase.from('finance_transactions')
            .update({ category_id: TRANSFER_CAT_ID })
            .eq('id', source.id);

        revalidatePath('/finance');
        return { success: true, message: "Categorizado como transferencia. No se ha creado espejo por configuración de la cuenta." };
    }
}

export async function findMirrorCandidatesAction(amount: number, date: string, currentId: string) {
    const supabase = await createClient();
    // El espejo es el signo contrario (-100 -> 100)
    const searchAmount = Number(amount) * -1;
    
    // Rango de 5 días
    const d = new Date(date);
    const minDate = new Date(d.getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    const maxDate = new Date(d.getTime() + (5 * 24 * 60 * 60 * 1000)).toISOString();

    const { data, error } = await supabase
        .from('finance_transactions')
        .select(`
            id, 
            concept, 
            amount, 
            date, 
            account_id,
            finance_accounts (name)
        `)
        .eq('amount', searchAmount)
        .gte('date', minDate)
        .lte('date', maxDate)
        .is('transfer_id', null) // Solo los que no estén ya vinculados
        .neq('id', currentId);

    return { success: !error, candidates: data || [] };
}

export async function reconcileTransactionsAction(id1: string, id2: string) {
    const supabase = await createClient();
    
    // Vinculación bidireccional usando transfer_id
    const { error: err1 } = await supabase
        .from('finance_transactions')
        .update({ transfer_id: id2, category_id: '10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a' })
        .eq('id', id1);

    const { error: err2 } = await supabase
        .from('finance_transactions')
        .update({ transfer_id: id1, category_id: '10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a' })
        .eq('id', id2);

    if (err1 || err2) return { success: false, error: "Error al conciliar" };
    
    revalidatePath('/finance');
    return { success: true };
}