// /app/properties/[slug]/booking/page.tsx
import { redirect } from 'next/navigation';

export default async function BookingIndexPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Redirigimos automáticamente al mes actual: /booking/2026/3
  redirect(`/properties/${slug}/booking/${year}/${month}`);
}