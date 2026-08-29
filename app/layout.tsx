import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "住宅購入タイミング シミュレーター",
  description: "今買う場合と、頭金を増やしてから買う場合を比較します。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
