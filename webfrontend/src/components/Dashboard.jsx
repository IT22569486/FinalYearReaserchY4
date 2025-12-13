import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  AppBar,
  Toolbar,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Badge,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Avatar,
} from '@mui/material';
import {
  DirectionsBus,
  WifiOff,
  Warning,
  Devices,
  Refresh,
  Add,
  FiberManualRecord,
  Speed,
  Memory,
  Storage,
  Thermostat,
  AccessTime,
  Notifications,
  CheckCircle,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { deviceApi, violationApi } from '../services/api';
import socketService from '../services/socket';

// Modern Gradient Stat Card
function ModernStatCard({ title, value, icon, gradient, trend }) {
  return (
    <Card
      sx={{
        background: gradient,
        color: 'white',
        height: '100%',
        minHeight: '150px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '150px',
          height: '150px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          transform: 'translate(50%, -50%)',
        },
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Box display="flex" flexDirection="column" gap={2}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                {title}
              </Typography>
              <Typography variant="h3" fontWeight="bold" sx={{ mt: 1 }}>
                {value}
              </Typography>
            </Box>
            <Avatar
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                width: 64,
                height: 64,
              }}
            >
              {icon}
            </Avatar>
          </Box>
          {trend && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <TrendingUp fontSize="small" />
              <Typography variant="caption">{trend}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// Modern Device Card
function ModernDeviceCard({ device, onClick }) {
  const isOnline = device.status === 'online';
  const health = device.lastHealth || device;

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getHealthValue = (value) => {
    if (value === undefined || value === null) return 0;
    return Math.min(Math.max(value, 0), 100);
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        background: isOnline
          ? 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
          : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        borderLeft: 4,
        borderColor: isOnline ? 'success.main' : 'error.main',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: -50,
          right: -50,
          width: 150,
          height: 150,
          background: isOnline
            ? 'radial-gradient(circle, rgba(40,167,69,0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(220,53,69,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
        },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar
              sx={{
                bgcolor: isOnline ? 'success.light' : 'error.light',
                width: 48,
                height: 48,
              }}
            >
              <DirectionsBus sx={{ color: isOnline ? 'success.dark' : 'error.dark' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {device.busNumber || 'Unknown'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Route: {device.routeNumber || 'N/A'}
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={<FiberManualRecord sx={{ fontSize: 10 }} />}
            label={isOnline ? 'Online' : 'Offline'}
            size="small"
            sx={{
              bgcolor: isOnline ? 'success.main' : 'error.main',
              color: 'white',
              fontWeight: 600,
              '& .MuiChip-icon': { color: 'white' },
            }}
          />
        </Box>

        {/* Device ID */}
        <Paper
          sx={{
            p: 0.5,
            mb: 2,
            bgcolor: 'grey.100',
            border: '1px dashed',
            borderColor: 'grey.300',
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
          >
            {device.deviceKey?.substring(0, 30)}...
          </Typography>
        </Paper>

        {/* Health Metrics */}
        {isOnline && (health.cpu_percent !== undefined || health.memory_percent !== undefined) && (
          <Box>
            <Typography variant="caption" fontWeight="600" color="text.secondary" mb={1} display="block">
              SYSTEM HEALTH
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {health.cpu_percent !== undefined && (
                <Box>
                  <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                    <Speed sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Typography variant="caption" fontWeight="600">
                      CPU
                    </Typography>
                  </Box>
                  <Box sx={{ position: 'relative', height: 6, bgcolor: 'grey.200', borderRadius: 3, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${getHealthValue(device.system?.cpu_percent || health.cpu_percent)}%`,
                        background: (device.system?.cpu_percent || health.cpu_percent) > 80
                          ? 'linear-gradient(90deg, #dc3545, #ff6b6b)'
                          : (device.system?.cpu_percent || health.cpu_percent) > 60
                          ? 'linear-gradient(90deg, #ffc107, #ffdb4d)'
                          : 'linear-gradient(90deg, #28a745, #48c766)',
                        borderRadius: 3,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {health.cpu_percent?.toFixed(0)}%
                  </Typography>
                </Box>
              )}
              {health.memory_percent !== undefined && (
                <Box>
                  <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                    <Memory sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Typography variant="caption" fontWeight="600">
                      RAM
                    </Typography>
                  </Box>
                  <Box sx={{ position: 'relative', height: 6, bgcolor: 'grey.200', borderRadius: 3, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${getHealthValue(health.memory_percent)}%`,
                        background: health.memory_percent > 80
                          ? 'linear-gradient(90deg, #dc3545, #ff6b6b)'
                          : health.memory_percent > 60
                          ? 'linear-gradient(90deg, #ffc107, #ffdb4d)'
                          : 'linear-gradient(90deg, #28a745, #48c766)',
                        borderRadius: 3,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {health.memory_percent?.toFixed(0)}%
                  </Typography>
                </Box>
              )}
              {health.disk_percent !== undefined && (
                <Box>
                  <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                    <Storage sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Typography variant="caption" fontWeight="600">
                      Disk
                    </Typography>
                  </Box>
                  <Box sx={{ position: 'relative', height: 6, bgcolor: 'grey.200', borderRadius: 3, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${getHealthValue(health.disk_percent)}%`,
                        background: health.disk_percent > 90
                          ? 'linear-gradient(90deg, #dc3545, #ff6b6b)'
                          : health.disk_percent > 70
                          ? 'linear-gradient(90deg, #ffc107, #ffdb4d)'
                          : 'linear-gradient(90deg, #28a745, #48c766)',
                        borderRadius: 3,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {health.disk_percent?.toFixed(0)}%
                  </Typography>
                </Box>
              )}
              {health.temperature !== undefined && (
                <Box>
                  <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                    <Thermostat sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Typography variant="caption" fontWeight="600">
                      Temp
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="600" color="primary.main">
                    {health.temperature?.toFixed(1)}°C
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Footer */}
        <Divider sx={{ my: 2 }} />
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={0.5}>
            <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {formatTime(device.lastSeen)}
            </Typography>
          </Box>
          <Button size="small" variant="text" sx={{ fontSize: '0.7rem' }}>
            View Details →
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

// Modern Violation Item
function ModernViolationItem({ violation }) {
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
      case 'critical':
        return { bg: '#fff5f5', color: '#c53030', border: '#fc8181' };
      case 'low':
        return { bg: '#f0fff4', color: '#2f855a', border: '#9ae6b4' };
      default:
        return { bg: '#fffaf0', color: '#c05621', border: '#fbd38d' };
    }
  };

  const colors = getSeverityColor(violation.severity);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleString();
  };

  return (
    <Paper
      sx={{
        p: 1.5,
        mb: 1,
        bgcolor: colors.bg,
        borderLeft: 3,
        borderColor: colors.border,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateX(4px)',
          boxShadow: 2,
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: colors.border }}>
            <Warning sx={{ fontSize: 18, color: colors.color }} />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="700" color={colors.color}>
              {violation.type?.replace(/_/g, ' ').toUpperCase() || 'VIOLATION'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {violation.busNumber || violation.deviceKey?.substring(0, 20)}
            </Typography>
          </Box>
        </Box>
        <Box textAlign="right">
          <Chip
            label={violation.severity || 'MEDIUM'}
            size="small"
            sx={{
              bgcolor: colors.color,
              color: 'white',
              fontWeight: 700,
              fontSize: '0.65rem',
              height: 20,
            }}
          />
          <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
            {formatTime(violation.timestamp || violation.createdAt)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

// Main Dashboard
function Dashboard() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [registerOpen, setRegisterOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ busNumber: '', routeNumber: '' });

  const stats = {
    totalDevices: devices.length,
    onlineDevices: devices.filter((d) => d.status === 'online').length,
    offlineDevices: devices.filter((d) => d.status !== 'online').length,
    totalViolations: violations.length,
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [devicesRes, violationsRes] = await Promise.all([
          deviceApi.getAllDevices(),
          violationApi.getAllViolations(20),
        ]);

        const deviceList = Array.isArray(devicesRes.data) ? devicesRes.data : devicesRes.data.devices || [];
        const violationList = Array.isArray(violationsRes.data) ? violationsRes.data : violationsRes.data.violations || [];

        setDevices(deviceList);
        setViolations(violationList);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data. Backend: http://localhost:3000');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    socketService.connect();

    const unsubHealth = socketService.onDeviceHealthUpdate((data) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceKey === data.deviceKey
            ? { ...d, ...data.health, lastHealth: data.health, status: 'online', lastSeen: new Date() }
            : d
        )
      );
    });

    const unsubStatus = socketService.onDeviceStatusUpdate((data) => {
      setDevices((prev) =>
        prev.map((d) => (d.deviceKey === data.deviceKey ? { ...d, status: data.status, lastSeen: new Date() } : d))
      );
    });

    const unsubViolation = socketService.onNewViolation((data) => {
      setViolations((prev) => [data, ...prev].slice(0, 20));
    });

    const unsubDeviceUpdate = socketService.onDeviceUpdate((data) => {
      setDevices((prev) => {
        const exists = prev.find((d) => d.deviceKey === data.deviceKey);
        if (exists) {
          return prev.map((d) => (d.deviceKey === data.deviceKey ? { ...d, ...data } : d));
        }
        return [data, ...prev];
      });
    });

    return () => {
      unsubHealth();
      unsubStatus();
      unsubViolation();
      unsubDeviceUpdate();
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [devicesRes, violationsRes] = await Promise.all([
        deviceApi.getAllDevices(),
        violationApi.getAllViolations(20),
      ]);
      setDevices(Array.isArray(devicesRes.data) ? devicesRes.data : []);
      setViolations(Array.isArray(violationsRes.data) ? violationsRes.data : []);
      setError(null);
    } catch (err) {
      setError('Failed to refresh data');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    try {
      await deviceApi.registerDevice(newDevice);
      setRegisterOpen(false);
      setNewDevice({ busNumber: '', routeNumber: '' });
      handleRefresh();
    } catch (err) {
      console.error('Failed to register device:', err);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <CircularProgress size={60} sx={{ color: 'white', mb: 2 }} />
        <Typography variant="h6" color="white">
          Loading Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      {/* Modern App Bar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #1a5f2a 0%, #2d8f42 100%)',
          borderBottom: '3px solid rgba(255,255,255,0.1)',
        }}
      >
        <Toolbar sx={{ py: 1, px: { xs: 2, sm: 3, md: 5, lg: 6 } }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
              <DirectionsBus />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="800" letterSpacing={-0.5}>
                CTB Monitor
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Real-time Bus Management System
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'rgba(255,255,255,0.15)',
                px: 2,
                py: 0.75,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#48c766',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1, transform: 'scale(1)' },
                    '50%': { opacity: 0.5, transform: 'scale(1.2)' },
                    '100%': { opacity: 1, transform: 'scale(1)' },
                  },
                }}
              />
              <Typography variant="body2" fontWeight="600">
                Live
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight="500">
              {currentTime.toLocaleTimeString()}
            </Typography>
            <IconButton color="inherit" onClick={handleRefresh} size="large">
              <Refresh />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setRegisterOpen(true)}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                fontWeight: 700,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              }}
            >
              Add Device
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content - Using CSS Grid for Full Width */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 5, lg: 6 }, py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Stats Grid - CSS Grid Layout */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 3,
            mb: 4,
          }}
        >
          <ModernStatCard
            title="Total Devices"
            value={stats.totalDevices}
            icon={<Devices sx={{ fontSize: 32 }} />}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            trend="+2 this week"
          />
          <ModernStatCard
            title="Online Now"
            value={stats.onlineDevices}
            icon={<CheckCircle sx={{ fontSize: 32 }} />}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            trend="94% uptime"
          />
          <ModernStatCard
            title="Offline"
            value={stats.offlineDevices}
            icon={<WifiOff sx={{ fontSize: 32 }} />}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          />
          <ModernStatCard
            title="Violations"
            value={stats.totalViolations}
            icon={<Warning sx={{ fontSize: 32 }} />}
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
            trend="-5% today"
          />
        </Box>

        {/* Main Content - CSS Grid Layout */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: '1fr 350px',
            },
            gap: 3,
          }}
        >
          {/* Devices Section */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              background: 'white',
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h5" fontWeight="800" gutterBottom>
                  Connected Devices
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Monitor all active buses in real-time
                </Typography>
              </Box>
              <Chip
                label={`${devices.length} Total`}
                color="primary"
                sx={{ fontWeight: 700 }}
              />
            </Box>

            {devices.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'grey.100',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <DirectionsBus sx={{ fontSize: 40, color: 'grey.400' }} />
                </Avatar>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Devices Found
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Start by registering your first device
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setRegisterOpen(true)}
                >
                  Register Device
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    xl: 'repeat(3, 1fr)',
                  },
                  gap: 3,
                }}
              >
                {devices.map((device) => (
                  <ModernDeviceCard
                    key={device.deviceKey || device.id}
                    device={device}
                    onClick={() => navigate(`/device/${device.deviceKey}`)}
                  />
                ))}
              </Box>
            )}
          </Paper>

          {/* Violations Section */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              background: 'white',
              border: '1px solid',
              borderColor: 'grey.200',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <Typography variant="h5" fontWeight={800} gutterBottom>
                  Violations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Latest rule violations
                </Typography>
              </div>
              <Badge badgeContent={violations.length} color="error" max={99}>
                <Notifications color="action" />
              </Badge>
            </div>

            {violations.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 40, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    bgcolor: 'success.light',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <CheckCircle sx={{ fontSize: 32, color: 'success.main' }} />
                </Avatar>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  All Clear!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No violations detected
                </Typography>
              </div>
            ) : (
              <div style={{ flexGrow: 1, maxHeight: 600, overflow: 'auto' }}>
                {violations.map((violation, index) => (
                  <div key={violation.id || index} style={{ marginBottom: 12 }}>
                    <ModernViolationItem violation={violation} />
                  </div>
                ))}
              </div>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Register Dialog */}
      <Dialog open={registerOpen} onClose={() => setRegisterOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #1a5f2a 0%, #2d8f42 100%)',
            color: 'white',
            fontWeight: 700,
          }}
        >
          Register New Device
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Bus Number"
              placeholder="e.g., NA-1234"
              value={newDevice.busNumber}
              onChange={(e) => setNewDevice({ ...newDevice, busNumber: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Route Number"
              placeholder="e.g., 138"
              value={newDevice.routeNumber}
              onChange={(e) => setNewDevice({ ...newDevice, routeNumber: e.target.value })}
              variant="outlined"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setRegisterOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleRegister} sx={{ px: 3 }}>
            Register
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;