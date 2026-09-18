'use client';

import React from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Collapse from '@mui/material/Collapse';

interface AlertMessageProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
  title?: string;
}

export default function AlertMessage({
  type,
  message,
  onClose,
  className = '',
  title,
}: AlertMessageProps) {
  if (!message) return null;

  const severity = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';

  return (
    <Collapse in={Boolean(message)}>
      <Alert
        severity={severity}
        onClose={onClose}
        className={className}
        sx={{
          borderRadius: 3,
          fontWeight: 500,
          fontSize: '0.875rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          alignItems: 'center',
        }}
      >
        {title && <AlertTitle sx={{ fontWeight: 700 }}>{title}</AlertTitle>}
        {message}
      </Alert>
    </Collapse>
  );
}
