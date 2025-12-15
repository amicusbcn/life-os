// app/menu-planner/components/MenuPlannerMenu.tsx (FINAL)
import { Fragment } from 'react';
import { DropdownMenuItem,DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Folder,BookOpen } from 'lucide-react';
import MenuCategoriesSettings from './MenuCategoriesSettings'; // Tu wrapper Dialog
import MenuRecipesSettings from './MenuRecipesSettings';

export default function MenuPlannerMenu() {
    return (
        <Fragment>
            {/* 🚨 El MenuCategoriesSettings ahora recibe SOLAMENTE el DropdownMenuItem */}
            <MenuCategoriesSettings>
                <DropdownMenuItem className="cursor-pointer">
                    <Folder className="mr-2 h-4 w-4" />
                    <span>Gestionar Categorías</span>
                </DropdownMenuItem>
            </MenuCategoriesSettings>
      <MenuRecipesSettings>

            <DropdownMenuItem className="cursor-pointer">
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Libro de Recetas</span>
            </DropdownMenuItem>

      </MenuRecipesSettings>
            {/* 2. SEPARADOR: Para aislar de los ítems CORE (Logout, etc.) */}
            <DropdownMenuSeparator />
    </Fragment>
  );
}
