import React from 'react';

const LoadingComponent = ({ size = 8, color = 'border-gray-800' }) => {


  return (
   <div className="fixed inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-50 animate-fadeIn">
    <div
      className={`animate-spin rounded-full border-4 border-t-transparent ${color}`}
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    />
  </div>
  );
};

export default LoadingComponent;