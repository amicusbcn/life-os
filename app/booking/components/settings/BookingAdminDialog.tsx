'use client';

import { useEffect, useState } from 'react';
import { BookingProperty, BookingProfile, BookingHoliday } from '@/types/booking';
import { createProperty, deleteProperty, upsertGlobalProfile, deleteGlobalProfile, createHoliday, deleteHoliday, duplicateHolidays, updatePropertiesOrder } from '../../actions/admin';
import { toast } from 'sonner';

// UI Imports
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, Trash2, Save, Loader2, Search, Building2, 
  Users, Edit2, ArrowRight, LayoutDashboard, 
  UserX,X,
  Settings,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface BookingAdminDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: BookingProfile[];
  properties: BookingProperty[];
  onManageProperty?: (property: BookingProperty) => void;
  holidays: BookingHoliday[];
}

function getContrastColor(hexColor: string) {
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

export function BookingAdminDialog({ isOpen, onClose, profiles, properties, onManageProperty,holidays }: BookingAdminDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        
        {/* HEADER */}
        <DialogHeader className="px-6 py-4 border-b bg-slate-50">
          <DialogTitle className="flex items-center gap-2 text-indigo-900">
            <LayoutDashboard className="h-5 w-5"/> Administración del Módulo
          </DialogTitle>
          <DialogDescription>
            Gestión global de propiedades y usuarios de la aplicación.
          </DialogDescription>
        </DialogHeader>

        {/* TABS PRINCIPALES */}
        <Tabs defaultValue="profiles" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-2 border-b bg-white">
            <TabsList className="mb-0">
              <TabsTrigger value="profiles" className="flex gap-2"><Users size={14}/> Usuarios Globales</TabsTrigger>
              <TabsTrigger value="properties" className="flex gap-2"><Building2 size={14}/> Propiedades</TabsTrigger>
              <TabsTrigger value="holidays">🎉 Festivos</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden bg-slate-50/30 relative">
            
            {/* TAB 1: GESTIÓN DE USUARIOS */}
            <TabsContent value="profiles" className="h-full m-0 p-0 border-none outline-none">
                <ProfilesManager profiles={profiles} />
            </TabsContent>

            {/* TAB 2: GESTIÓN DE PROPIEDADES */}
            <TabsContent value="properties" className="h-full m-0 p-0 border-none outline-none">
                <PropertiesManager properties={properties} onManage={(p) => {
                    onClose(); // Cerramos el admin dialog
                    if (onManageProperty) onManageProperty(p); // Ejecutamos la acción
                }}/>
            </TabsContent>
            
            {/* TAB 2: GESTIÓN DE FESTIVOS */}
            <TabsContent value="holidays"><HolidaysManager holidays={holidays} /></TabsContent>

          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SUB-COMPONENTE: GESTOR DE PROPIEDADES
// ============================================================================

// --- COMPONENTE FILA ARRASTRABLE (NUEVO) ---
function SortablePropertyRow({ 
    property, 
    onDelete, 
    onManage 
}: { 
    property: any, 
    onDelete: (id: string) => void, 
    onManage: (p: any) => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: property.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1, // Que pase por encima al arrastrar
    opacity: isDragging ? 0.5 : 1,
  };

  const owners = property.members?.filter((m: any) => m.role === 'owner') || [];

  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:border-indigo-200 group relative"
    >
        <div className="flex items-center gap-3">
            {/* GRIP HANDLE (Donde se agarra) */}
            <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab text-slate-300 hover:text-slate-600 active:cursor-grabbing p-1"
            >
                <GripVertical size={16} />
            </div>

            {/* Icono Casa */}
            <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-white shrink-0 text-xs" style={{ backgroundColor: property.color || '#94a3b8' }}>
                {property.name.substring(0,1)}
            </div>
            
            {/* Info */}
            <div>
                <h4 className="font-bold text-sm text-slate-800">{property.name}</h4>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">/{property.slug}</span>
                    {owners.length > 0 && (
                        <span className="text-[9px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-100">
                             👑 {owners[0].profile?.display_name}
                        </span>
                    )}
                </div>
            </div>
        </div>

        {/* Botones (igual que antes) */}
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] px-2"
                onClick={() => onManage(property)}
            >
                <Settings className="h-3 w-3 mr-1"/> Gestión
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-600" onClick={() => onDelete(property.id)}>
                <Trash2 className="h-3.5 w-3.5"/>
            </Button>
        </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ACTUALIZADO ---
function PropertiesManager({ properties, onManage }: { properties: any[], onManage: (prop: any) => void }) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [items, setItems] = useState(properties); // Estado local para el Drag&Drop
  const [formData, setFormData] = useState({ name: '', slug: '' }); // (Tu lógica de create)
  const [isLoading, setIsLoading] = useState(false);

  // Sincronizar si properties cambian desde el padre (ej: al borrar)
  useEffect(() => {
    setItems(properties);
  }, [properties]);

  // Configuración de sensores DND (Ratón, Táctil, Teclado)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Distancia 5px para evitar clicks accidentales
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- LÓGICA AL SOLTAR ---
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        // 1. Reordenar Array visualmente
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // 2. Preparar datos para DB (asignar índice 0, 1, 2...)
        const updates = newOrder.map((item, index) => ({
            id: item.id,
            sort_order: index,
            // 🔥 AÑADIMOS ESTO PARA QUE 'UPSERT' NO SE QUEJE
            name: item.name, 
            slug: item.slug,
            // Si tienes algún otro campo NOT NULL sin valor por defecto (ej: max_slots), añádelo aquí también:
            // max_slots: item.max_slots 
        }));

        // 3. Guardar en segundo plano (Optimistic UI)
        updatePropertiesOrder(updates).then(res => {
            if(!res.success) toast.error("Error guardando orden");
        });

        return newOrder;
      });
    }
  };

  // Auto-generar slug simple
  const handleNameChange = (val: string) => {
    const slug = val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setFormData({ name: val, slug });
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) return toast.error("Faltan datos");
    setIsLoading(true);
    const res = await createProperty(formData);
    setIsLoading(false);
    
    if (res.success) {
      toast.success(res.message);
      setFormData({ name: '', slug: '' });
      setView('list');
    } else {
      toast.error(res.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("⛔ ¿BORRAR PROPIEDAD?\nEsto eliminará TODAS las reservas, turnos y configuración de esta casa.\nEsta acción es irreversible.")) return;
    const res = await deleteProperty(id);
    if (res.success) toast.success("Propiedad eliminada");
    else toast.error(res.message);
  };

  if (view === 'create') {
    return (
      <div className="p-8 max-w-md mx-auto animate-in fade-in slide-in-from-right-4">
        <h3 className="font-bold text-lg mb-4">Nueva Propiedad</h3>
        <div className="space-y-4 bg-white p-6 rounded-lg border shadow-sm">
          <div className="space-y-2">
             <Label>Nombre de la Casa</Label>
             <Input 
                placeholder="Ej: Casa Pirineos" 
                value={formData.name} 
                onChange={(e) => handleNameChange(e.target.value)}
             />
          </div>
          <div className="space-y-2">
             <Label>Identificador (Slug)</Label>
             <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">/booking?prop=</span>
                <Input 
                    value={formData.slug} 
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    className="font-mono text-sm"
                />
             </div>
          </div>
          <div className="pt-4 flex gap-2">
             <Button variant="outline" className="flex-1" onClick={() => setView('list')}>Cancelar</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin h-4 w-4"/> : <Save className="h-4 w-4 mr-2"/>} Crear
             </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="p-4 border-b flex justify-between items-center bg-white">
        <div>
           <h3 className="font-bold text-sm">Propiedades</h3>
           <p className="text-xs text-muted-foreground">Arrastra para reordenar.</p>
        </div>
        <Button size="sm" onClick={() => setView('create')}>
            <Plus className="h-4 w-4 mr-2"/> Nueva
        </Button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={items.map(i => i.id)} 
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2">
                    {items.map((p) => (
                        <SortablePropertyRow 
                            key={p.id} 
                            property={p} 
                            onDelete={(id) => {/* handleDelete(id) */}} // Conecta tu función
                            onManage={onManage}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTE: GESTOR DE PERFILES (FÁBRICA)
// ============================================================================

function ProfilesManager({ profiles }: { profiles: any[] }) {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
      display_name: '', initials: '', email: '', secondary_email: '', phone: ''
    });
  
    const filteredProfiles = profiles.filter(p => 
      p.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
    const handleEdit = (profile: BookingProfile) => {
      setEditingId(profile.id);
      setFormData({
        display_name: profile.display_name,
        initials: profile.initials,
        email: profile.email || '',
        secondary_email: profile.secondary_email || '',
        phone: profile.phone || ''
      });
      setView('form');
    };
  
    const handleCreate = () => {
      setEditingId(null);
      setFormData({ display_name: '', initials: '', email: '', secondary_email: '', phone: '' });
      setView('form');
    };
  
    const handleSave = async () => {
      if (!formData.display_name) return toast.error("Nombre obligatorio");
      setIsLoading(true);
      const res = await upsertGlobalProfile({ id: editingId || undefined, ...formData });
      setIsLoading(false);
      if (res.success) { toast.success(res.message); setView('list'); } 
      else { toast.error(res.message); }
    };
  
    const handleDelete = async (id: string) => {
      if(!confirm("⚠️ ¿Eliminar usuario globalmente?")) return;
      const res = await deleteGlobalProfile(id);
      if (res.success) toast.success("Usuario eliminado");
      else toast.error("Error al eliminar");
    };
    if (view === 'form') {
        const currentProfile = editingId ? profiles.find(p => p.id === editingId) : null;
        const userProperties = currentProfile?.booking_property_members?.map((m: any) => m.property) || [];

        return (
            <div className="p-6 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                <div className="mb-4"><Button variant="ghost" size="sm" onClick={() => setView('list')}>← Volver</Button></div>
                <div className="space-y-4 max-w-md mx-auto w-full">
                    <h3 className="font-bold text-lg">{editingId ? 'Editar Usuario' : 'Nuevo Usuario Global'}</h3>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3 space-y-2">
                            <Label>Nombre</Label>
                            <Input value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} />
                        </div>
                        <div className="col-span-1 space-y-2">
                            <Label>Iniciales</Label>
                            <Input value={formData.initials} onChange={e => setFormData({...formData, initials: e.target.value})} maxLength={2}/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Email Principal</Label>
                        <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Email Secundario</Label><Input value={formData.secondary_email} onChange={e => setFormData({...formData, secondary_email: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Teléfono</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                    </div>
                    {/* --- NUEVA SECCIÓN: PROPIEDADES ASIGNADAS --- */}
                    {editingId && (
                        <div className="pt-4 pb-2">
                            <Label className="text-xs uppercase text-slate-400 font-bold mb-2 block">Acceso a Propiedades</Label>
                            
                            <div className="bg-slate-50 p-3 rounded-lg border min-h-[60px] flex flex-wrap items-center gap-2">
                                {userProperties.length > 0 ? (
                                    userProperties.map((prop: any) => (
                                        <Badge 
                                            key={prop.id} 
                                            variant="secondary"
                                            className="px-2 py-1 text-xs border"
                                            style={{ 
                                                backgroundColor: prop.color || '#e2e8f0',
                                                color: getContrastColor(prop.color || '#e2e8f0'),
                                                borderColor: 'transparent'
                                            }}
                                        >
                                            <Building2 className="h-3 w-3 mr-1 opacity-50"/>
                                            {prop.name}
                                        </Badge>
                                    ))
                                ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm italic">
                                        <UserX className="h-4 w-4"/>
                                        No pertenece a ninguna casa todavía.
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
                                * Para añadirlo a una casa, usa el menú "Configuración" de la propiedad correspondiente.
                            </p>
                        </div>
                    )}
                    <Button onClick={handleSave} disabled={isLoading} className="w-full mt-4">
                        {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>} Guardar
                    </Button>
                </div>
            </div>
        );
    }
    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b flex gap-3 bg-white">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Buscar..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
                <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2"/> Crear</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredProfiles.map(p => {
                    // Extraemos las propiedades de la relación anidada
                    const userProperties = p.booking_property_members?.map((m: any) => m.property) || [];

                    return (
                        <div key={p.id} className="flex items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 group transition-all gap-3">
                            
                            {/* 1. AVATAR (Izquierda fija) */}
                            <Avatar className="h-9 w-9 border bg-indigo-50 text-indigo-700 shrink-0">
                                <AvatarFallback className="font-bold text-xs">{p.initials}</AvatarFallback>
                            </Avatar>
                            
                            {/* 2. DATOS (Centro flexible) */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-slate-900 truncate">{p.display_name}</p>
                                <p className="text-xs text-slate-500 truncate">{p.email || 'Sin email'}</p>
                            </div>

                            {/* 3. ZONA DERECHA: BADGES + BOTONES */}
                            <div className="flex items-center gap-3 shrink-0">
                                
                                {/* Badges alineados a la derecha */}
                                {userProperties.length > 0 && (
                                    <div className="flex flex-wrap justify-end gap-1 max-w-[120px] sm:max-w-[200px]">
                                        {userProperties.map((prop: any) => (
                                            <Badge 
                                                key={prop.id} 
                                                variant="secondary"
                                                className="px-1.5 py-0 text-[9px] font-semibold border h-5 whitespace-nowrap"
                                                style={{ 
                                                    backgroundColor: prop.color || '#e2e8f0',
                                                    color: getContrastColor(prop.color || '#e2e8f0'),
                                                    borderColor: 'transparent'
                                                }}
                                            >
                                                {prop.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Botones de Acción */}
                                {/* FIX MÓVIL: opacity-100 en móvil, opacity-0 en escritorio (hasta hover) */}
                                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" onClick={() => handleEdit(p)}>
                                        <Edit2 className="h-4 w-4"/>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(p.id)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>

                        </div>
                    );
                })}
                
                {filteredProfiles.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-sm">No se encontraron usuarios.</div>
                )}
            </div>
        </div>
    );
  }

  
// ============================================================================
// SUB-COMPONENTE: GESTOR DE FESTIVOS
// ============================================================================

function HolidaysManager({ holidays }: { holidays: BookingHoliday[] }) {
  // Estado para el año visualizado
  const currentYearNum = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYearNum);

  // Estado formulario
  const [date, setDate] = useState<Date | undefined>(new Date(selectedYear, 0, 1)); // Empezar en enero del año seleccionado
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Filtrar festivos del año seleccionado
  const filteredHolidays = holidays
    .filter(h => h.date.startsWith(String(selectedYear)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Verificar si el año anterior tiene datos (para poder importar)
  const prevYear = selectedYear - 1;
  const hasPrevYearData = holidays.some(h => h.date.startsWith(String(prevYear)));

  const handleAdd = async () => {
    if (!date || !name) return toast.error("Faltan datos");
    setIsLoading(true);
    
    // Asegurarnos de que la fecha seleccionada coincide con el año que estamos viendo
    // (Opcional, pero evita confusiones de UI)
    const dateString = format(date, 'yyyy-MM-dd');
    if (!dateString.startsWith(String(selectedYear))) {
        if(!confirm(`Estás añadiendo un festivo para ${format(date, 'yyyy')}, pero estás viendo ${selectedYear}. ¿Seguir?`)) {
            setIsLoading(false);
            return;
        }
    }

    const res = await createHoliday({ date: dateString, name });
    setIsLoading(false);
    if (res.success) {
      toast.success(res.message);
      setName('');
    } else {
      toast.error(res.message);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteHoliday(id);
    if (res.success) toast.success("Borrado");
  };

  const handleImport = async () => {
    if (!confirm(`¿Copiar todos los festivos de ${prevYear} a ${selectedYear}?\n\nOJO: Recuerda revisar Semana Santa y festivos variables después.`)) return;
    
    setIsLoading(true);
    const res = await duplicateHolidays(prevYear, selectedYear);
    setIsLoading(false);
    
    if (res.success) toast.success(res.message);
    else toast.error(res.message);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      
      {/* 1. PAGER DE AÑO */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
         <Button variant="ghost" size="icon" onClick={() => setSelectedYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
         </Button>
         <div className="text-sm font-bold font-mono text-slate-700">
            AÑO {selectedYear}
         </div>
         <Button variant="ghost" size="icon" onClick={() => setSelectedYear(y => y + 1)}>
            <ChevronRight className="h-4 w-4" />
         </Button>
      </div>

      {/* 2. FORMULARIO AÑADIR */}
      <div className="p-4 border-b bg-white space-y-3">
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal text-xs", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-3 w-3" />
                {date ? format(date, "d MMM yyyy", { locale: es }) : <span>Fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar 
                mode="single" 
                selected={date} 
                onSelect={setDate} 
                // Forzamos al calendario a mostrar el mes del año seleccionado por defecto
                defaultMonth={new Date(selectedYear, 0)} 
                initialFocus 
                locale={es}
              />
            </PopoverContent>
          </Popover>
          
          <Input 
            placeholder="Nombre (ej: Año Nuevo)" 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="flex-1 text-xs h-9"
          />
          
          <Button onClick={handleAdd} disabled={isLoading} size="sm" className="h-9">
             {isLoading ? <Loader2 className="animate-spin h-3 w-3"/> : <Plus className="h-4 w-4"/>}
          </Button>
        </div>
      </div>

      {/* 3. LISTA O IMPORTACIÓN */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredHolidays.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-80">
                <div className="p-3 bg-slate-100 rounded-full">
                    <CalendarIcon className="h-6 w-6 text-slate-400" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">Sin festivos en {selectedYear}</p>
                    <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
                        No hay fechas marcadas para este año.
                    </p>
                </div>

                {/* BOTÓN MÁGICO DE IMPORTAR */}
                {hasPrevYearData && (
                    <Button variant="outline" onClick={handleImport} disabled={isLoading} className="mt-2 border-dashed border-slate-300">
                        <Copy className="mr-2 h-3 w-3 text-indigo-500"/> 
                        Importar de {prevYear}
                    </Button>
                )}
            </div>
        ) : (
            <div className="space-y-2">
                {filteredHolidays.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-2.5 bg-white border rounded-md shadow-sm hover:border-slate-300 transition-colors group">
                    <div className="flex items-center gap-3">
                       <div className="bg-red-50 text-red-600 font-bold text-[10px] px-2 py-1 rounded text-center min-w-[50px] uppercase border border-red-100">
                         {format(new Date(h.date), 'd MMM', { locale: es })}
                       </div>
                       <span className="text-xs font-medium text-slate-700">{h.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(h.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}