import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './src/component/navbar/Navbar';


const DefaultLayout = () => {
  return (
    <>
      <Navbar />
      <main className="pt-8 gap-y-4">
        <Outlet />
      </main>
    </>
  );
};

export default DefaultLayout;