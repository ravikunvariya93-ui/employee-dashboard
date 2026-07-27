import { Lexend } from 'next/font/google';
import './globals.css';

const lexend = Lexend({ subsets: ['latin'] });

export const metadata = {
  title: 'EduBVN – Pension Management System',
  description: 'Teacher Pension & Retirement Management Portal for Bhavnagar District Schools',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={lexend.className}>
        {children}
      </body>
    </html>
  );
}
