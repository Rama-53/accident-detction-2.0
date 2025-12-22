// src/components/Layout.jsx
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import './Layout.css';

export function Layout({ children }) {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content-area">
                <Header />
                <div className="content-scroll-area">
                    {children}
                </div>
            </main>
        </div>
    );
}
