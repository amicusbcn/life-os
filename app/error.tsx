'use client';
export default function Error({ error }: { error: Error }) {
  return <div>Error en la Home: {error.message}</div>
}