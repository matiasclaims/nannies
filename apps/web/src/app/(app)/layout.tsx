import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { BottomNav } from '@/components/bottom-nav';

/** Shell autenticado: sidebar (escritorio) + topbar + bottom nav (celular). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-fondo">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:pb-6">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
