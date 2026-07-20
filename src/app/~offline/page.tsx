import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="page text-center">
      <h1 className="page-title">Sin conexión</h1>
      <p className="page-sub">Revisá tu red e intentá de nuevo.</p>
      <Link href="/" className="btn mt-8 inline-flex">
        Reintentar
      </Link>
    </div>
  );
}
