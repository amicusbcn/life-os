// app/maintenance/calendar/page.tsx
import { redirect } from "next/navigation";

export default async function CalendarRootPage({ params }: { params: { slug: string } }) {
  const { slug } = await params; 
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth()+1; // 1-12
    
  // Redirigimos automáticamente al mes actual
  redirect(`/properties/${slug}/maintenance/calendar/${year}/${month}`);
}