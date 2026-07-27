import { Toaster } from "sonner";
import "./globals.css";

export const metadata = {
  title: "PROCURE - Enterprise Procurement Platform",
  description: "World-class procurement ecosystem",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}