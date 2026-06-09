export const metadata = {
  title: "Shopify Agent Admin",
  description: "Merchant onboarding, settings, and real-time analytics for high-conversion Shopify stores."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, Arial, sans-serif", background: "#0b0f19", color: "#e8ecf3" }}>
        {children}
      </body>
    </html>
  );
}
