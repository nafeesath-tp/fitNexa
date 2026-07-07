import React from 'react';
import Loader from './Loader';

const PageLoader = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#f9fafb'
    }}>
      <Loader size="3rem" />
    </div>
  );
};

export default PageLoader;
