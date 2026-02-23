// app/inventory/[context]/layout.tsx
export default function ContextLayout({
  children,
  modal, // Este es el slot @modal
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}