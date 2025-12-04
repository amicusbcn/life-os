export function getSortedLocations(locations: any[]) {
  // 1. Separamos los que no tienen padre (Raíces) de los que sí (Hijos)
  const roots = locations.filter((l: any) => !l.parent_id);
  const children = locations.filter((l: any) => l.parent_id);
  
  let result: any[] = [];
  
  // 2. Función recursiva
  const addNode = (node: any, level: number) => {
      // --- CAMBIO AQUÍ ---
      // Calculamos la "sangría" visual usando espacios en blanco fijos (\u00A0)
      // Si el nivel es mayor a 0, añadimos la flechita
      const prefix = '\u00A0\u00A0'.repeat(level * 2) + (level > 0 ? '↳ ' : '');

      // Empujamos el nodo modificando su 'name' para que incluya la sangría
      result.push({ 
          ...node, 
          level,
          // Al sobrescribir 'name', el <select> mostrará la jerarquía automáticamente
          name: prefix + node.name 
      });
      // -------------------
      
      // Buscamos hijos directos de este nodo
      const myChildren = children.filter((c: any) => c.parent_id === node.id);
      
      // Ordenamos alfabéticamente los hijos
      myChildren.sort((a: any, b: any) => a.name.localeCompare(b.name));
      
      // Los procesamos (esto buscará a su vez a los nietos)
      myChildren.forEach((child: any) => addNode(child, level + 1));
  }

  // 3. Empezamos por las raíces (ordenadas alfabéticamente)
  roots.sort((a: any, b: any) => a.name.localeCompare(b.name));
  roots.forEach((root: any) => addNode(root, 0));
  
  return result;
}