import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "旅の割り勘",
  description: "旅行の立て替え費用をかんたんに精算できる割り勘アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
