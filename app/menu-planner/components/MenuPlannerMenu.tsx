// app/menu-planner/components/MenuPlannerMenu.tsx (FINAL)
import { Fragment } from 'react';
import { Folder, BookOpen } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import MenuCategoriesSettings from './MenuCategoriesSettings'; 
import MenuRecipesSettings from './MenuRecipesSettings'; 
import { DialogTrigger } from '@/components/ui/dialog';

export default function MenuPlannerMenu() {
  return (
    <Fragment>
      <MenuCategoriesSettings>
        {/* El children que se pasa ahora es el DropdownMenuItem con el handler */}
          <DialogTrigger asChild>
            <DropdownMenuItem className="cursor-pointer">
                <Folder className="mr-2 h-4 w-4" />
                <span>Gestionar Categorías</span>
            </DropdownMenuItem>
        </DialogTrigger>
      </MenuCategoriesSettings>
      <MenuRecipesSettings>
        <DialogTrigger asChild>
            <DropdownMenuItem className="cursor-pointer">
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Libro de Recetas</span>
            </DropdownMenuItem>
        </DialogTrigger>
      </MenuRecipesSettings>

    </Fragment>
  );
}