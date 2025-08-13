import "@/styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Stellantis Garage",
  description:
    "A platform for managing Stellantis garage operations, AI engineer assignment, and task tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="overflow-hidden">
          <TRPCReactProvider>
            {children}
            <Toaster />
          </TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
