import React from 'react';

const LoadingComponent = ({ size = 8, color = 'border-gray-800' }) => {


  return (
   <div
    className={`animate-spin rounded-full border-4 border-t-transparent ${color}`}
    style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
  />
  
  );
};

export default LoadingComponent;