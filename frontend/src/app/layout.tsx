import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "him&her 💕 retro compatibility",
  description: "Find out how compatible you are in 8-bit style! Take a fun quiz and get a compatibility score.",
  keywords: ["compatibility", "quiz", "retro", "8bit", "love"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
