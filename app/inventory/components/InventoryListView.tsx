'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Box } from "lucide-react"
import Link from "next/link" // <--- 1. IMPORTAR ESTO

export function InventoryListView({ items }: any) {
  
  if (!items?.length) {
    return <div className="text-center py-10 text-slate-500">Sin items.</div>
  }

  const getImageUrl = (path: string) => {
    if (!path) return null
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${path}`
  }

  return (
    <div className="grid gap-3">
        {items.map((item: any) => (
          // 2. ENVOLVER TODO EN UN LINK
          <Link href={`/inventory/${item.id}`} key={item.id} className="block">
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0 flex">
                <div className="w-24 h-24 bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {item.photo_path ? (
                      <img 
                        src={getImageUrl(item.photo_path) || ''} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                      />
                  ) : (
                      <Box className="text-slate-400 h-8 w-8" />
                  )}
                </div>
                
                <div className="p-3 flex flex-col justify-between flex-grow">
                  <div>
                      <h3 className="font-semibold text-slate-800">{item.name}</h3>
                      <p className="text-sm text-slate-500">{item.model}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                      {item.inventory_categories && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                              {item.inventory_categories.name}
                          </Badge>
                      )}
                      {item.inventory_locations && (
                          <div className="flex items-center text-[10px] text-slate-500">
                              <MapPin className="h-3 w-3 mr-0.5" />
                              {item.inventory_locations.name}
                          </div>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
    </div>
  )
}