// Test file with unfixable lint errors
import React from 'react';

const TestLintError = () => {
  // Reference to undefined variable (unfixable error)
  console.log(undefinedVariable);
  
  return <div>Test Lint Error</div>;
};

export default TestLintError; 