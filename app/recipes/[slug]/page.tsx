// app/recipes/[slug]/page.tsx (Lista de Recetas Filtrada)

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { fetchAllCategories, fetchRecipeListByCategoryId } from '../data'; 
import RecipeList from '../components/RecipeList'; // Tu componente cliente de lista
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';

// 🚨 NOTA: Asegúrate de que las props de RecipeList ahora son:
// initialRecipes: MenuRecipeWithDetails[]
// categories: MenuRecipeCategory[]
// activeCategoryId: string | null;

export default async function CategoryRecipePage({ params }: { params: { slug: string } }) {
    const { slug } = await params;
    //const slug = params.slug || 'fallo-slug-vacio';
    const supabase = await createClient();
    
    // --- 1. Autenticación y Perfil ---
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login'); 

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const userRole = profile?.role || 'user';
    
    // --- 2. Encontrar la Categoría por Slug ---
    // Si la categoría no existe o si se usa el slug especial 'all', lo manejamos aquí.
    let activeCategory = null;
    
    if (slug !== 'all') {
        const { data: category, error: categoryError } = await supabase
            .from('menu_recipe_categories')
            .select('*')
            .eq('slug', slug) 
            .single();
        
        if (categoryError && categoryError.code !== 'PGRST116') { // 116 = No rows found
            console.error("SUPABASE ERROR - Category Fetch:", categoryError.message);
        }
        activeCategory = category;

        // Si el slug no es 'all' y no encontramos la categoría, es un 404
        if (!activeCategory) {
            console.error("No se ha encontrado la categoría : ", slug)
            notFound();
        }
    }

    // --- 3. Obtención de Datos de Recetas y Categorías ---
    
    const [allCategories, allRecipes] = await Promise.all([
        fetchAllCategories(),
        // 🚨 Fetch de recetas: Si el slug es 'all', traemos todas las recetas (ID = null).
        // Si es un slug real, traemos las recetas de esa categoría.
        fetchRecipeListByCategoryId(activeCategory?.id || null), 
    ]);
    
    const pageTitle = activeCategory ? activeCategory.name : 'Todas las Recetas';
    
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            
            <UnifiedAppHeader
                title={pageTitle} 
                backHref="/recipes" // Vuelve al Hub principal
                userEmail={user.email || ''} 
                userRole={userRole}
            />
            
            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                
                {/* 🚨 CARGAR EL COMPONENTE CLIENTE CON LOS DATOS YA FILTRADOS */}
                <RecipeList 
                    // Lista de recetas ya filtrada por el Server Component
                    initialRecipes={allRecipes} 
                    
                    // Lista completa de categorías para el panel lateral de filtros
                    categories={allCategories} 
                    
                    // Pasamos el ID de la categoría activa para que RecipeList sepa qué resaltar en el menú
                    initialActiveCategoryId={activeCategory?.id || 'all'} 
                    
                    // El onBackToHub ya no es un callback, sino una navegación al Hub
                    // Aunque RecipeList ya no lo usa para navegación, si lo necesita como prop, debes pasarlo.
                    slug={slug}
                    //onBackToHub={() => redirect('/recipes')} // Implementación simplificada (aunque no se usará)
                />
            </main>
        </div>
    );
}