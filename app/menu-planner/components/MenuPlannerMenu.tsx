// app/menu-planner/components/MenuPlannerMenu.tsx (FINAL)
import { Fragment } from 'react';
import { Folder, BookOpen } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import MenuCategoriesSettings from './MenuCategoriesSettings'; 
import MenuRecipesSettings from './MenuRecipesSettings'; 

// 🚨 La función onSelect es vacía y simple para que sea serializable por el Server Component
// y evite el cierre prematuro del menú desplegable.
const preventClose = (e: any) => e.preventDefault(); 

export default function MenuPlannerMenu() {
  return (
    <Fragment>
      <MenuCategoriesSettings>
        {/* El children que se pasa ahora es el DropdownMenuItem con el handler */}
        <DropdownMenuItem 
            className="cursor-pointer" 
            onSelect={preventClose} // 🚨 Usamos el handler simple que es serializable
        >
          <Folder className="mr-2 h-4 w-4" />
          <span>Gestionar Categorías</span>
        </DropdownMenuItem>
      </MenuCategoriesSettings>

      {/* ... similar para MenuRecipesSettings ... */}
      <MenuRecipesSettings>
        {/* El children que se pasa ahora es el DropdownMenuItem con el handler */}
        <DropdownMenuItem 
            className="cursor-pointer" 
            onSelect={preventClose} // 🚨 Usamos el handler simple que es serializable
        >
          <BookOpen className="mr-2 h-4 w-4" />
          <span>Libro de Recetas</span>
        </DropdownMenuItem>
      </MenuRecipesSettings>

    </Fragment>
  );
}