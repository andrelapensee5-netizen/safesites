import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './pages/LoginPage';

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('SafeSite')).toBeInTheDocument();
  });
});
