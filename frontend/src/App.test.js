import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders ecommerce storefront', () => {
  render(<App />);
  expect(screen.getByText(/JioBasket/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Products/i })).toBeInTheDocument();
});
