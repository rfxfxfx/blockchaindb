import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "BlockchainDB — the blockchain is your database",
  description:
    "A self-hosted blockchain database with a Supabase-like dashboard. Deploy one smart contract and manage collections of JSON documents on any EVM network.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
