import React, { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import ThemePickerButton from './ThemePickerButton';
import { observeDataTables } from '../utils/responsiveTables';

export default function Layout({ children }) {
  useEffect(() => {
    const watcher = observeDataTables();
    return () => watcher.disconnect();
  }, []);

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
