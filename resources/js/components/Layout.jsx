import React from 'react';
import Header from './Header';
import Footer from './Footer';
import ThemePickerButton from './ThemePickerButton';

export default function Layout({ children }) {
  return (
    <div className="erp-dashboard-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <main className="main" style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
      <ThemePickerButton />
    </div>
  );
}
