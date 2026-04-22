// ***********************************************************
// This file is processed and loaded automatically before your
// test files. Put global configuration and behavior here.
//
// Read more: https://on.cypress.io/configuration
// ***********************************************************

// Import commands
import './commands';

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err) => {
  // Angular sometimes throws navigation errors during testing
  if (err.message.includes('Navigation triggered outside Angular zone')) {
    return false;
  }
  if (err.message.includes('Cannot match any routes')) {
    return false;
  }
  // Let other errors fail the test
  return true;
});
