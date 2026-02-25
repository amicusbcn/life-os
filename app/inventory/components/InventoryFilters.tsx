// app/inventory/components/InventoryFilters.tsx
// app/inventory/components/InventoryFilters.tsx
import { Search, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProgressiveLocationSelector } from "./ProgressiveLocationSelector";

interface FilterProps {
    search: string;
    onSearchChange: (val: string) => void;
    categories: any[];
    activeCategory: string | null;
    onCategoryChange: (val: string | null) => void;
    locations: any[];
    activeLocation: string | null;
    onLocationChange: (val: string | null) => void;
}

export function InventoryFilters({
    search, onSearchChange,
    categories, activeCategory, onCategoryChange,
    locations, activeLocation, onLocationChange
}: FilterProps) {
    
    const hasFilters = search || activeCategory || activeLocation;

    return (
        <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col md:flex-row items-center gap-3 w-full">
                
                {/* 1. BUSCADOR - Corregido el solapamiento */}
                <div className="relative flex-[3] w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10" />
                    <Input 
                        placeholder="¿Qué estás buscando? (Nombre, marca, modelo...)" 
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        // pl-12 es la clave para que el texto no pise la lupa
                        className="pl-12 bg-white border-slate-200 shadow-sm rounded-2xl h-12 text-sm focus-visible:ring-blue-500 transition-all"
                    />
                </div>

                {/* 2. SELECT CATEGORÍA - Ahora más ancho y robusto */}
                <div className="flex-[1.2] w-full min-w-[220px]"> 
                    <Select 
                        value={activeCategory || "all"} 
                        onValueChange={(v) => onCategoryChange(v === "all" ? null : v)}
                    >
                        <SelectTrigger className="w-full bg-white h-12 py-6 rounded-2xl shadow-sm border-slate-200 focus:ring-blue-500 px-4">
                            <div className="flex items-center gap-3 truncate">
                                <Tag className="h-4 w-4 text-slate-400 shrink-0" />
                                <SelectValue placeholder="Categoría" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                            <SelectItem value="all" className="font-medium text-slate-500">Todas las categorías</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* 3. PROGRESSIVE LOCATION SELECTOR */}
                <div className="flex-[1.2] w-full min-w-[240px]">
                    <ProgressiveLocationSelector 
                        locations={locations}
                        value={activeLocation}
                        onChange={onLocationChange}
                    />
                </div>
            </div>

            {/* Indicador visual de filtros activos (opcional pero ayuda) */}
            {hasFilters && (
                <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtros activos:</span>
                    {search && <BadgeFilter label={`"${search}"`} onClear={() => onSearchChange("")} />}
                    {activeCategory && (
                        <BadgeFilter 
                            label={categories.find(c => c.id === activeCategory)?.name} 
                            onClear={() => onCategoryChange(null)} 
                        />
                    )}
                    {activeLocation && (
                        <BadgeFilter 
                            label={locations.find(l => l.id === activeLocation)?.name} 
                            onClear={() => onLocationChange(null)} 
                        />
                    )}
                </div>
            )}
        </div>
    );
}

// Subcomponente pequeño para los tags de filtros activos
function BadgeFilter({ label, onClear }: { label: string, onClear: () => void }) {
    return (
        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-100 animate-in fade-in zoom-in duration-200">
            {label}
            <button onClick={onClear} className="hover:text-blue-900">
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}