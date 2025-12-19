import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
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
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">
            {error || 'Device not found'}
            <Button onClick={() => navigate('/')} sx={{ ml: 2 }}>
              Back to Dashboard
            </Button>
          </Alert>
        </Container>
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

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Device Info Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
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
              </Grid>
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Route color="primary" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Route</Typography>
                        <Typography variant="body1" fontWeight="bold">{device.routeNumber || 'N/A'}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <AccessTime color="primary" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Last Seen</Typography>
                        <Typography variant="body2">{formatTime(device.lastSeen)}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CheckCircle color="success" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Registered</Typography>
                        <Typography variant="body2">{formatTime(device.registeredAt || device.createdAt)}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Warning color="warning" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Violations</Typography>
                        <Typography variant="body1" fontWeight="bold" color="warning.main">{violations.length}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
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
          <Grid container spacing={3}>
            {/* Health Metrics */}
            <Grid item xs={6} sm={3}>
              <HealthMetricCard
                icon={<Speed color="primary" />}
                label="CPU Usage"
                value={device.system.cpu_percent?.toFixed(1)}
                unit="%"
                percent={device.system.cpu_percent}
                color={getHealthColor(device.system.cpu_percent)}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <HealthMetricCard
                icon={<Memory color="primary" />}
                label="Memory Usage"
                value={device.system.memory_percent?.toFixed(1)}
                unit="%"
                percent={device.system.memory_percent}
                color={getHealthColor(device.system.memory_percent)}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <HealthMetricCard
                icon={<Storage color="primary" />}
                label="Disk Usage"
                value={device.system.disk_percent?.toFixed(1)}
                unit="%"
                percent={device.system.disk_percent}
                color={getHealthColor(device.system.disk_percent, 80, 95)}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <HealthMetricCard
                icon={<Thermostat color="primary" />}
                label="Temperature"
                value={device.system.temperature?.toFixed(1)}
                unit="°C"
                percent={device.system.temperature ? (device.system.temperature / 100) * 100 : undefined}
                color={getHealthColor(device.system.temperature, 60, 80)}
              />
            </Grid>

            {/* Additional Metrics */}
            {health.battery_percent !== undefined && (
              <Grid item xs={6} sm={3}>
                <HealthMetricCard
                  icon={<Battery80 color="primary" />}
                  label="Battery"
                  value={device.system.battery_percent?.toFixed(0)}
                  unit="%"
                  percent={device.system.battery_percent}
                  color={getHealthColor(100 - device.system.battery_percent)}
                />
              </Grid>
            )}
            {health.network_latency !== undefined && (
              <Grid item xs={6} sm={3}>
                <HealthMetricCard
                  icon={<SignalCellular4Bar color="primary" />}
                  label="Network Latency"
                  value={device.system.network_latency?.toFixed(0)}
                  unit="ms"
                  color={getHealthColor(device.system.network_latency, 100, 500)}
                />
              </Grid>
            )}

            {/* Chart */}
            {healthLogs.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" mb={2}>
                      Resource Usage Trend
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formatChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="cpu" stroke="#1a5f2a" name="CPU %" strokeWidth={2} />
                          <Line type="monotone" dataKey="memory" stroke="#f4a020" name="Memory %" strokeWidth={2} />
                          <Line type="monotone" dataKey="disk" stroke="#dc3545" name="Disk %" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Component Status */}
            {health.components && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" mb={2}>
                      Component Status
                    </Typography>
                    <Grid container spacing={2}>
                      {Object.entries(health.components).map(([name, status]) => (
                        <Grid item xs={6} sm={4} md={3} key={name}>
                          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
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
                        <TableCell align="right">Temperature</TableCell>
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
                          <TableCell align="right">{log.temperature?.toFixed(1) || '--'}°C</TableCell>
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
      </Container>
    </Box>
  );
}

export default DeviceDetails;
