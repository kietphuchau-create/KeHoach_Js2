'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import RefreshIcon from '@mui/icons-material/Refresh';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Hiện tại hệ thống chưa ghi nhận bản ghi nào phù hợp.',
  onRetry,
  icon,
}: EmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 6,
        textAlign: 'center',
        backgroundColor: 'rgba(248, 250, 252, 0.6)',
        borderStyle: 'dashed',
        borderColor: 'divider',
        borderRadius: 4,
        my: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 3,
          backgroundColor: '#F1F5F9',
          color: '#94A3B8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon || <InboxIcon sx={{ fontSize: 32 }} />}
      </Box>

      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary' }}>
        {title}
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 400, fontSize: '0.85rem' }}>
        {description}
      </Typography>

      {onRetry && (
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{ mt: 1, borderRadius: 3 }}
        >
          Thử lại
        </Button>
      )}
    </Paper>
  );
}
