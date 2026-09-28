import './globals.css';
import SiteShell from '@/components/site-shell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://ndraaaidv1.my.id'),

  title: {
    default: 'NDRAAAID.v1 — Top Up Game Cepat, Aman & Terpercaya',
    template: '%s | NDRAAAID.v1',
  },

  description:
    'Top up game dan voucher digital dengan cepat, aman, dan mudah hanya di NDRAAAID.v1.',

  applicationName: 'NDRAAAID.v1',

  alternates: {
    canonical: '/',
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
    },
  },

  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://ndraaaidv1.my.id/',
    siteName: 'NDRAAAID.v1',
    title: 'NDRAAAID.v1 — Top Up Game Cepat, Aman & Terpercaya',
    description:
      'Top up game dan voucher digital dengan cepat, aman, dan mudah hanya di NDRAAAID.v1.',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'NDRAAAID.v1 — Top Up Game Cepat, Aman & Terpercaya',
    description:
      'Top up game dan voucher digital dengan cepat, aman, dan mudah hanya di NDRAAAID.v1.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <SiteShell>{children}</SiteShell>

        <footer className="mt-20 border-t border-white/10 bg-[#03050d]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
            <div>
              <div className="text-xl font-black">
                NDRA<span className="gradient-text">AAID</span>
              </div>

              <p className="mt-3 text-sm text-slate-400">
                Top Up Game Cepat, Aman & Terpercaya.
              </p>
            </div>

            <div>
              <b>Menu</b>

              <div className="mt-3 grid gap-2 text-sm text-slate-400">
                <a href="/games/">Games</a>
                <a href="/orders/track/">Cek Transaksi</a>
                <a href="/terms/">Bantuan</a>
              </div>
            </div>

            <div>
              <b>Legal</b>

              <div className="mt-3 grid gap-2 text-sm text-slate-400">
                <a href="/terms/">Syarat & Ketentuan</a>
                <a href="/privacy/">Kebijakan Privasi</a>
                <a href="/refund/">Refund Policy</a>
              </div>
            </div>

            <div>
              <b>Support</b>

              <p className="mt-3 text-sm text-slate-400">
                Live Chat dan WhatsApp tersedia sesuai konfigurasi Owner.
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
            © 2026 NDRAAAID. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
