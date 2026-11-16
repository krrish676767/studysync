import './globals.css';

export const metadata = {
  title: 'StudySync',
  description: 'Student Course & Study Management System - DBMS Mini Project',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
