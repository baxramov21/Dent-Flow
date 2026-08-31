import "./globals.css";

export const metadata = {
  title: "DentFlow",
  description: "Dental Clinic CRM",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
