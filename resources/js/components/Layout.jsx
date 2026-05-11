import React from 'react';
import Header from './Header';
import Footer from './Footer';
import '../../css/erp-styles.css';

export default function Layout({ children }) {
  return (
    <div className="erp-dashboard-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <main className="main" style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
