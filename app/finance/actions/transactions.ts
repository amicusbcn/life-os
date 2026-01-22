'use server'
import { createClient } from '@/utils/supabase/server'
import {ActionResponse } from '@/types/common'
import {FinanceCategory} from '@/types/finance'; 
import { revalidatePath } from 'next/cache'

type CreateCategoryResult = ActionResponse<{ id: string, category: FinanceCategory }>;


export async function createCategory(
    _prevState: ActionResponse, 
    formData: FormData
): Promise<CreateCategoryResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { revalidatePath } = await import('next/cache');
    
    if (!user) return { success: false, error: 'Acceso denegado.' };

    const name = formData.get('name') as string;
    const isIncomeStr = formData.get('is_income') as string;
    const parentId = formData.get('parent_id') as string | null;
    const iconName = formData.get('icon_name') as string; // Capturamos icon_name

    if (!name) return { success: false, error: 'El nombre es obligatorio.' };

    try {
        const { data, error } = await supabase
            .from('finance_categories')
            .insert({
                user_id: user.id,
                name: name.trim(),
                is_income: isIncomeStr === 'true',
                parent_id: parentId && parentId !== 'no-parent' ? parentId : null,
                icon_name: iconName || 'Tag',
                // Si es raíz, le asignamos un color neutro inicial
                color: (!parentId || parentId === 'no-parent') ? '#64748b' : null,
            })
            .select('*')
            .single();

        if (error) throw error;

        revalidatePath('/finance');
        return { success: true, data: { id: data.id, category: data as FinanceCategory } };
    } catch (e: any) {
        return { success: false, error: e.message || 'Error inesperado' };
    }
}

// ==========================================
// 4. UPDATE CATEGORY (Nueva)
// ==========================================
export async function updateCategory(
  _prevState: ActionResponse, 
  formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const { revalidatePath } = await import('next/cache');

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const iconName = formData.get('icon_name') as string;
    const color = formData.get('color') as string;

    if (!id || !name) return { success: false, error: 'Faltan datos obligatorios.' };

    try {
        const { error } = await supabase
            .from('finance_categories')
            .update({
                name: name.trim(),
                icon_name: iconName,
                color: color || null,
            })
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/finance');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Error inesperado' };
    }
}


// ==========================================
// 5. DELETE CATEGORY (Nueva)
// ==========================================
export async function deleteCategory(categoryId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { revalidatePath } = await import('next/cache');

    if (!categoryId) {
        return { success: false, error: 'ID de categoría es obligatorio.' };
    }

    try {
        const { error } = await supabase
            .from('finance_categories')
            .delete()
            .eq('id', categoryId);

        if (error) {
            console.error('Supabase error deleting category:', error);
            if (error.code === '23503') { // Foreign Key Constraint
                return { success: false, error: 'No se puede eliminar la categoría porque tiene subcategorías o transacciones asociadas.' };
            }
            return { success: false, error: `Error de base de datos: ${error.message}` };
        }

        revalidatePath('/finance');
        return { success: true };
    } catch (e) {
        console.error('Unexpected error in deleteCategory:', e);
        return { success: false, error: 'Ocurrió un error inesperado.' };
    }
}

export async function updateTransactionNoteAction(transactionId: string, notes: string) {
    const supabase = await createClient(); // Asegúrate de que esto usa el cliente de servidor
    
    const { data, error } = await supabase
        .from('finance_transactions')
        .update({ notes: notes }) // Verifica que la columna en la BBDD se llame exactamente 'notes'
        .eq('id', transactionId);

    if (error) {
        console.error("Error en Supabase:", error.message);
        return { success: false, error: error.message };
    }
    
    revalidatePath('/finance'); // Esto es vital para que la UI se entere del cambio
    return { success: true };
}