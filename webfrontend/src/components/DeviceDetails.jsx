import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Tabs,
  Tab,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import {
  DirectionsBus,
  ArrowBack,
  Refresh,
  Speed,
  Memory,
  Storage,
  Thermostat,
  Battery80,
  SignalCellular4Bar,
  AccessTime,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Timeline,
  FiberManualRecord,
  Route,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { deviceApi, violationApi } from '../services/api';
import socketService from '../services/socket';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function HealthMetricCard({ icon, label, value, unit, percent, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          {icon}
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold" color={color}>
          {value !== undefined && value !== null ? `${value}${unit}` : '--'}
        </Typography>
        {percent !== undefined && (
          <Box mt={1}>
            <LinearProgress
              variant="determinate"
              value={Math.min(percent, 100)}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor: color,
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function DeviceDetails() {
  const { deviceKey } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [healthLogs, setHealthLogs] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [deviceRes, healthRes, violationsRes] = await Promise.all([
          deviceApi.getDevice(deviceKey),
          deviceApi.getDeviceHealth(deviceKey, 100),
          violationApi.getViolationsByDevice(deviceKey, 50),
        ]);

        setDevice(deviceRes.data.device || deviceRes.data);
        setHealthLogs(Array.isArray(healthRes.data) ? healthRes.data : healthRes.data.healthLogs || []);
        setViolations(Array.isArray(violationsRes.data) ? violationsRes.data : violationsRes.data.violations || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching device data:', err);
        setError('Failed to fetch device data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deviceKey]);

  useEffect(() => {
    socketService.connect();
    socketService.subscribeToDevice(deviceKey);

    const unsubHealth = socketService.onDeviceHealthUpdate((data) => {
      if (data.deviceKey === deviceKey) {
        const healthData = data.health || data;
        setDevice((prev) => (prev ? { ...prev, ...healthData, status: 'online' } : prev));
        setHealthLogs((prev) => [{ ...healthData, timestamp: new Date().toISOString() }, ...prev].slice(0, 100));
      }
    });

    const unsubViolation = socketService.onNewViolation((data) => {
      if (data.deviceKey === deviceKey) {
        setViolations((prev) => [data, ...prev].slice(0, 50));
      }
    });

    return () => {
      unsubHealth();
      unsubViolation();
      socketService.unsubscribeFromDevice(deviceKey);
    };
  }, [deviceKey]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [deviceRes, healthRes] = await Promise.all([
        deviceApi.getDevice(deviceKey),
        deviceApi.getDeviceHealth(deviceKey, 100),
      ]);
      setDevice(deviceRes.data.device || deviceRes.data);
      setHealthLogs(Array.isArray(healthRes.data) ? healthRes.data : []);
      setError(null);
    } catch (err) {
      setError('Failed to refresh');
    }
    setLoading(false);
  };

  const getHealthColor = (value, warning = 70, danger = 90) => {
    if (value === undefined || value === null) return 'grey.400';
    if (value >= danger) return 'error.main';
    if (value >= warning) return 'warning.main';
    return 'success.main';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
    return date.toLocaleString();
  };

  const formatChartData = () => {
    return healthLogs
      .slice(0, 20)
      .reverse()
      .map((log, index) => ({
        time: index + 1,
        cpu: log.cpu_percent,
        memory: log.memory_percent,
        disk: log.disk_percent,
        temp: log.temperature,
      }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !device) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #1a5f2a, #2d8f42)' }}>
          <Toolbar>
            <IconButton color="inherit" onClick={() => navigate('/')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h6">Device Details</Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ px: { xs: 2, sm: 3, md: 5, lg: 6 }, py: 4 }}>
          <Alert severity="error">
            {error || 'Device not found'}
            <Button onClick={() => navigate('/')} sx={{ ml: 2 }}>
              Back to Dashboard
            </Button>
          </Alert>
        </Box>
      </Box>
    );
  }

  const isOnline = device.status === 'online';
  const health = device.lastHealth || device;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #1a5f2a, #2d8f42)' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <DirectionsBus sx={{ mr: 1 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              {device.busNumber || 'Unknown Bus'}
            </Typography>
            <Typography variant="caption">{deviceKey}</Typography>
          </Box>
          <Chip
            icon={<FiberManualRecord sx={{ fontSize: 12 }} />}
            label={isOnline ? 'Online' : 'Offline'}
            color={isOnline ? 'success' : 'error'}
            sx={{ mr: 2, color: 'white', '& .MuiChip-icon': { color: 'white' } }}
          />
          <IconButton color="inherit" onClick={handleRefresh}>
            <Refresh />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: { xs: 2, sm: 3, md: 5, lg: 6 }, py: 4 }}>
        {/* Device Info Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' },
                gap: 3,
                alignItems: 'center',
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 2,
                    bgcolor: isOnline ? 'success.light' : 'error.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DirectionsBus sx={{ fontSize: 48, color: isOnline ? 'success.dark' : 'error.dark' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {device.busNumber || 'Unknown Bus'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {deviceKey}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Route color="primary" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Route</Typography>
                    <Typography variant="body1" fontWeight="bold">{device.routeNumber || 'N/A'}</Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <AccessTime color="primary" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Last Seen</Typography>
                    <Typography variant="body2">{formatTime(device.lastSeen)}</Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircle color="success" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Registered</Typography>
                    <Typography variant="body2">{formatTime(device.registeredAt || device.createdAt)}</Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Warning color="warning" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Violations</Typography>
                    <Typography variant="body1" fontWeight="bold" color="warning.main">{violations.length}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth">
            <Tab label="Overview" icon={<Speed />} iconPosition="start" />
            <Tab label={`Health History (${healthLogs.length})`} icon={<Timeline />} iconPosition="start" />
            <Tab label={`Violations (${violations.length})`} icon={<Warning />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Health Metrics - CSS Grid Layout */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(4, 1fr)',
                lg: 'repeat(5, 1fr)',
              },
              gap: 3,
              mb: 4,
            }}
          >
            <HealthMetricCard
              icon={<Speed color="primary" />}
              label="CPU Usage"
              value={device.system?.cpu_percent?.toFixed(1)}
              unit="%"
              percent={device.system?.cpu_percent}
              color={getHealthColor(device.system?.cpu_percent)}
            />
            <HealthMetricCard
              icon={<Memory color="primary" />}
              label="Memory Usage"
              value={device.system?.memory_percent?.toFixed(1)}
              unit="%"
              percent={device.system?.memory_percent}
              color={getHealthColor(device.system?.memory_percent)}
            />
            <HealthMetricCard
              icon={<Storage color="primary" />}
              label="Disk Usage"
              value={device.system?.disk_percent?.toFixed(1)}
              unit="%"
              percent={device.system?.disk_percent}
              color={getHealthColor(device.system?.disk_percent, 80, 95)}
            />

            {/* Additional Metrics */}
            {health.battery_percent !== undefined && (
              <HealthMetricCard
                icon={<Battery80 color="primary" />}
                label="Battery"
                value={device.system?.battery_percent?.toFixed(0)}
                unit="%"
                percent={device.system?.battery_percent}
                color={getHealthColor(100 - device.system?.battery_percent)}
              />
            )}
            {health.network_latency !== undefined && (
              <HealthMetricCard
                icon={<SignalCellular4Bar color="primary" />}
                label="Network Latency"
                value={device.system?.network_latency?.toFixed(0)}
                unit="ms"
                color={getHealthColor(device.system?.network_latency, 100, 500)}
              />
            )}



            {/* Component Status - Full Width */}
            {health.components && (
              <Card sx={{ gridColumn: { xs: 'span 2', sm: 'span 4', lg: 'span 5' } }}>
                <CardContent>
                  <Typography variant="h6" mb={2}>
                    Component Status
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        sm: 'repeat(3, 1fr)',
                        md: 'repeat(4, 1fr)',
                      },
                      gap: 2,
                    }}
                  >
                    {Object.entries(health.components).map(([name, status]) => (
                      <Paper key={name} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {status === 'running' ? (
                          <CheckCircle color="success" />
                        ) : status === 'error' ? (
                          <ErrorIcon color="error" />
                        ) : (
                          <FiberManualRecord color="disabled" />
                        )}
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {name.replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {status}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Recent Violations - Full Width */}
            <Card sx={{ gridColumn: { xs: 'span 3', sm: 'span 4', lg: 'span 5' } }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Recent Violations
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<Warning />}
                    onClick={() => setTabValue(2)}
                  >
                    View All ({violations.length})
                  </Button>
                </Box>
                {violations.length === 0 ? (
                  <Box textAlign="center" py={3}>
                    <CheckCircle sx={{ fontSize: 50, color: 'success.light', mb: 1 }} />
                    <Typography color="text.secondary">No violations recorded</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {violations.slice(0, 5).map((violation, index) => (
                      <Paper
                        key={violation.id || index}
                        sx={{
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          borderLeft: 4,
                          borderColor: violation.severity?.toLowerCase() === 'high' ? 'error.main' :
                            violation.severity?.toLowerCase() === 'low' ? 'success.main' : 'warning.main',
                        }}
                      >
                        <Warning color={violation.severity?.toLowerCase() === 'high' ? 'error' : 'warning'} />
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight="bold">
                            {violation.type?.replace(/_/g, ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {violation.description || 'No description'}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={violation.severity || 'MEDIUM'}
                          color={violation.severity?.toLowerCase() === 'high' ? 'error' :
                            violation.severity?.toLowerCase() === 'low' ? 'success' : 'warning'}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(violation.createdAt)}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Health History Tab */}
        <TabPanel value={tabValue} index={1}>
          <Card>
            <CardContent>
              {healthLogs.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Timeline sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
                  <Typography color="text.secondary">No health history available</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell align="right">CPU %</TableCell>
                        <TableCell align="right">Memory %</TableCell>
                        <TableCell align="right">Disk %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {healthLogs.slice(0, 50).map((log, index) => (
                        <TableRow key={log.id || index}>
                          <TableCell>{formatTime(log.timestamp)}</TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={`${log.cpu_percent?.toFixed(1) || '--'}%`}
                              color={log.cpu_percent >= 90 ? 'error' : log.cpu_percent >= 70 ? 'warning' : 'success'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={`${log.memory_percent?.toFixed(1) || '--'}%`}
                              color={log.memory_percent >= 90 ? 'error' : log.memory_percent >= 70 ? 'warning' : 'success'}
                            />
                          </TableCell>
                          <TableCell align="right">{log.disk_percent?.toFixed(1) || '--'}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Violations Tab */}
        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              {violations.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Warning sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
                  <Typography color="text.secondary">No violations recorded for this device</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Details</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {violations.map((violation, index) => (
                        <TableRow key={violation.id || index}>
                          <TableCell>
                            <Chip
                              icon={<Warning />}
                              label={violation.type?.replace(/_/g, ' ').toUpperCase() || 'VIOLATION'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={violation.severity || 'MEDIUM'}
                              color={
                                violation.severity?.toLowerCase() === 'high' ||
                                  violation.severity?.toLowerCase() === 'critical'
                                  ? 'error'
                                  : violation.severity?.toLowerCase() === 'low'
                                    ? 'success'
                                    : 'warning'
                              }
                            />
                          </TableCell>
                          <TableCell>{violation.description || 'No description'}</TableCell>
                          <TableCell>
                            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                              {violation.details?.speed_kmh !== undefined && (
                                <Box>Speed: {violation.details.speed_kmh} km/h</Box>
                              )}
                              {violation.details?.traffic_level && (
                                <Box>Traffic: {violation.details.traffic_level}</Box>
                              )}
                              {violation.details?.duration_seconds && (
                                <Box>Duration: {violation.details.duration_seconds}s</Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{formatTime(violation.timestamp || violation.createdAt)}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={violation.status || 'pending'}
                              color={violation.status === 'reviewed' ? 'default' : 'warning'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </TabPanel>
      </Box>
    </Box>
  );
}

export default DeviceDetails;
