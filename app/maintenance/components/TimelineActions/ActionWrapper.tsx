export function ActionWrapper({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</h3>
        <button onClick={onClose} className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase">Cancelar</button>
      </div>
      {children}
    </div>
  );
}