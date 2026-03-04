// app/settings/holidays/page.tsx
import { redirect } from "next/navigation";

export default function RegionalRedirect() {
  const currentYear = new Date().getFullYear();
  redirect(`/settings/holidays/${currentYear}`);
}