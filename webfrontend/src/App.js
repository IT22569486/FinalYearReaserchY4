import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import Dashboard from './components/Dashboard.jsx';
import DeviceDetails from './components/DeviceDetails.jsx';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/device/:deviceKey" element={<DeviceDetails />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
