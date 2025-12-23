import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner"; // Importamos o componente de notificação
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Controle Financeiro",
  description: "Gerenciamento de finanças pessoais",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        {/* Adicionamos o Toaster aqui. richColors deixa verde para sucesso e vermelho para erro */}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}