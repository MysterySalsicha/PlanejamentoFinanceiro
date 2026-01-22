import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner"; // Importamos o componente de notificação
import { FinancialProvider } from "@/context/FinancialContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Controle Financeiro",
  description: "Gerenciamento de finanças pessoais",
  manifest: "/manifest.json",
  icons: {
    icon: '/favicon.svg',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <FinancialProvider>
          {children}
          <Toaster richColors position="top-center" visibleToasts={1} />
        </FinancialProvider>
      </body>
    </html>
  );
}