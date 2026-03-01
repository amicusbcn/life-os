// app/maintenance/calendar/page.tsx
import { redirect } from "next/navigation";

export default function CalendarRootPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth()+1; // 1-12
    
  // Redirigimos automáticamente al mes actual
  redirect(`/maintenance/calendar/${year}/${month}`);
}