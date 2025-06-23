"use client"
import { Provider } from "react-redux";
import { store } from '../store'
import React from 'react';
import AuthLoader from '../components/ui/AuthLoader'
import Footer from './ui/Footer';

const ClientLayout: React.FC<{ children: React.ReactNode }> =({
    children,
}) => {
    return (
        <Provider store={store}>
            <div className="min-h-screen flex flex-col">
                {/* <AuthLoader /> 로그인 정보 복원 */}
                <main className="flex-1">{children}</main>
                <Footer />
            </div>
        </Provider>
    );
};

export default ClientLayout;