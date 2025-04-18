// frontend/src/App.jsx (Using .jsx extension is common)
import React from 'react';
import './App.css';

import { Routes, Route } from 'react-router-dom';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import HomePage from './pages/HomePage';
import FolderDetailPage from './pages/FolderDetailPage';
import ConnectionTests from './components/ConnectionTests'; // Keep if using debug route

function App() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Media Sharer
        </Typography>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/folders/:folderId" element={<FolderDetailPage />} />
          <Route path="/debug" element={<ConnectionTests />} /> {/* Optional debug route */}
          <Route path="*" element={<Typography variant="h5" align="center" sx={{mt: 5}}>404 Not Found</Typography>} />
        </Routes>
      </Box>
    </Container>
  );
}

export default App;