import './globals.css';
export const metadata = {
  title: 'HomePay Live',
  description: 'Paycheck and home affordability with live public data',
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
