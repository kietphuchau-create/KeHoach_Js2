'use client';

import React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  className?: string;
}

export default function LoadingSpinner({
  message = 'Đang tải dữ liệu từ máy chủ...',
  size = 32,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 6,
        textAlign: 'center',
        gap: 2,
      }}
    >
      <CircularProgress size={size} color="primary" thickness={4} />
      {message && (
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
