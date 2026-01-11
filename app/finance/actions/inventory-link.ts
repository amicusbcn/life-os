// app/finance/actions/inventory-link.ts
'use server'
import { createClient } from '@/utils/supabase/server'


export async function createInventoryItemFromTxAction(
    txId: string, 
    data: { name: string; date: string; price: number }
) {
    const supabase = await createClient();

    // 1. Creamos el ítem en el inventario
    const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .insert({
            name: data.name,
            purchase_date: data.date,
            purchase_price: data.price,
            transaction_id: txId,
            status: 'active',
            // Calculamos garantía: fecha compra + 3 años
            warranty_expiry: new Date(new Date(data.date).setFullYear(new Date(data.date).getFullYear() + 3)).toISOString()
        })
        .select()
        .single();

    if (itemError) return { success: false, error: itemError.message };

    // 2. Opcional: Podríamos marcar la transacción con un tag o nota 
    // indicando que ya está en el inventario para que no se duplique.
    
    return { success: true, item };
}

export async function linkTransactionToInventoryAction(
    txId: string, 
    itemId: string, 
    isInitialPurchase: boolean
) {
    const supabase = await createClient();

    // 1. Vinculamos la transacción al ítem
    const { error: txError } = await supabase
        .from('finance_transactions')
        .update({ inventory_item_id: itemId })
        .eq('id', txId);

    if (txError) return { success: false, error: txError.message };

    // 2. Si es compra inicial, actualizamos los datos del objeto
    if (isInitialPurchase) {
        // Obtenemos los datos de la transacción para aplicarlos al ítem
        const { data: tx } = await supabase
            .from('finance_transactions')
            .select('amount, date')
            .eq('id', txId)
            .single();

        if (tx) {
            const purchaseDate = new Date(tx.date);
            // Calculamos garantía (fecha + 3 años)
            const warrantyDate = new Date(purchaseDate);
            warrantyDate.setFullYear(warrantyDate.getFullYear() + 3);

            const { error: invError } = await supabase
                .from('inventory_items')
                .update({
                    purchase_price: Math.abs(tx.amount),
                    purchase_date: tx.date,
                    warranty_expiry: warrantyDate.toISOString()
                })
                .eq('id', itemId);

            if (invError) return { success: false, error: invError.message };
        }
    }

    return { success: true };
}

export async function getInventoryItemsAction() {
    const supabase = await createClient();
    
    // Consultamos id, name y el nombre de la categoría (asumiendo que la tabla se llama inventory_categories)
    const { data, error } = await supabase
        .from('inventory_items')
        .select(`
            id, 
            name, 
            category_id,
            inventory_categories (name)
        `)
        .order('name', { ascending: true });

    if (error) {
        console.error("❌ Error en getInventoryItemsAction:", error);
        return { success: false, error: error.message };
    }
    
    return { success: true, data };
}