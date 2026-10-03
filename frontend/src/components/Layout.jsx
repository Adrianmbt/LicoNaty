import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, IconButton, Box, Divider, Tooltip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Snackbar, Alert
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import InventoryIcon from '@mui/icons-material/Inventory'
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import LogoutIcon from '@mui/icons-material/Logout'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import StorefrontIcon from '@mui/icons-material/Storefront'
import GroupIcon from '@mui/icons-material/Group'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import PriceCheckIcon from '@mui/icons-material/PriceCheck'
import { getTasa, getTasaCobro, setTasaCobro } from '../api/tasa'
import { clearSession } from '../api/axios'
import { useEffect } from 'react'
import { readSession } from '../utils/session'
import ConsultaPrecios from './ConsultaPrecios'

const drawerWidth = 250

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', adminOnly: true },
  { text: 'Inventario', icon: <InventoryIcon />, path: '/productos' },
  { text: 'Ventas', icon: <PointOfSaleIcon />, path: '/ventas' },
  { text: 'Compras', icon: <ShoppingCartIcon />, path: '/compras' },
  { text: 'Créditos', icon: <AccountBalanceWalletIcon />, path: '/creditos', adminOnly: true },
  { text: 'Usuarios', icon: <GroupIcon />, path: '/usuarios', adminOnly: true },
]

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tasa, setTasa] = useState(null)
  const [consultaOpen, setConsultaOpen] = useState(false)
  const [cobro, setCobro] = useState(null)
  const [cobroDialogOpen, setCobroDialogOpen] = useState(false)
  const [cobroValor, setCobroValor] = useState('')
  const [guardandoCobro, setGuardandoCobro] = useState(false)
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' })
  const navigate = useNavigate()
  const location = useLocation()
  const rawUser = readSession('user')
  const user = JSON.parse(rawUser || '{}')
  const isAdmin = user.role === 'admin'

  useEffect(() => {
    getTasa().then(res => setTasa(res.data.rate)).catch(() => {})
    getTasaCobro().then(res => setCobro(res.data)).catch(() => {})
  }, [])

  const abrirDialogoCobro = () => {
    setCobroValor(cobro?.rate != null ? String(cobro.rate) : '')
    setCobroDialogOpen(true)
  }

  const guardarTasaCobro = async () => {
    const valor = parseFloat(cobroValor)
    if (!valor || valor <= 0) {
      setSnack({ open: true, msg: 'La tasa debe ser mayor que cero', severity: 'error' })
      return
    }
    setGuardandoCobro(true)
    try {
      const res = await setTasaCobro(valor)
      setCobro(res.data)
      setCobroDialogOpen(false)
      setSnack({ open: true, msg: `Tasa de cobro fijada en Bs. ${res.data.rate}`, severity: 'success' })
    } catch (err) {
      const msg = err.response?.data?.detail || 'No se pudo guardar la tasa de cobro'
      setSnack({ open: true, msg, severity: 'error' })
    } finally {
      setGuardandoCobro(false)
    }
  }

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  const fetchTasa = async () => {
    try {
      const res = await getTasa()
      setTasa(res.data.rate)
    } catch {}
  }

  const visibleItems = menuItems.filter(item => !item.adminOnly || isAdmin)

  const drawer = (
    <Box sx={{
      height: '100%',
      background: 'linear-gradient(180deg, #2A0F24 0%, #3D1636 100%)',
      color: '#FBF3F8',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Box sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        borderBottom: '1px solid rgba(251, 243, 248, 0.1)',
      }}>
        <Avatar sx={{
          bgcolor: '#8E4A7D',
          width: 42,
          height: 42,
          boxShadow: '0 2px 12px rgba(142, 74, 125, 0.45)',
        }}>
          <StorefrontIcon />
        </Avatar>
        <Box>
          <Typography sx={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            fontSize: '1.15rem',
            lineHeight: 1.2,
            color: '#FBF3F8',
          }}>
            DonBeni
          </Typography>
          <Typography sx={{
            fontSize: '0.7rem',
            color: '#DFA3C4',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Bodegón
          </Typography>
        </Box>
      </Box>

      <List sx={{ flex: 1, pt: 2 }}>
        {visibleItems.map((item, i) => {
          const selected = location.pathname === item.path
          return (
            <ListItemButton
              key={item.text}
              selected={selected}
              onClick={() => { navigate(item.path); setMobileOpen(false) }}
              sx={{
                mx: 1.5,
                my: 0.5,
                borderRadius: 3,
                color: selected ? '#FBF3F8' : 'rgba(251, 243, 248, 0.65)',
                bgcolor: selected ? 'rgba(181, 97, 143, 0.22)' : 'transparent',
                '&:hover': {
                  bgcolor: selected ? 'rgba(181, 97, 143, 0.3)' : 'rgba(251, 243, 248, 0.06)',
                  color: '#FBF3F8',
                },
                transition: 'all 0.2s ease',
                animation: `fade-in-left 0.4s ease-out ${0.1 + i * 0.1}s both`,
              }}
            >
              <ListItemIcon sx={{
                color: 'inherit',
                minWidth: 40,
                '& .MuiSvgIcon-root': { fontSize: '1.3rem' },
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                slotProps={{
                  primary: {
                    fontWeight: selected ? 600 : 400,
                    fontSize: '0.9rem',
                  },
                }}
              />
            </ListItemButton>
          )
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(251, 243, 248, 0.1)' }} />

      <List sx={{ pb: 2 }}>
        <ListItemButton
          onClick={fetchTasa}
          sx={{ mx: 1.5, my: 0.5, borderRadius: 3, color: 'rgba(251, 243, 248, 0.65)', '&:hover': { bgcolor: 'rgba(251, 243, 248, 0.06)', color: '#FBF3F8' } }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
            <AccountBalanceIcon sx={{ fontSize: '1.3rem' }} />
          </ListItemIcon>
          <ListItemText
            primary={tasa ? `Bs. ${tasa}` : 'Ver Tasa BCV'}
            slotProps={{ primary: { fontSize: '0.85rem' } }}
          />
        </ListItemButton>
        {user.full_name && (
          <ListItemButton
            sx={{ mx: 1.5, my: 0.5, borderRadius: 3, color: 'rgba(251, 243, 248, 0.5)', cursor: 'default' }}
          >
            <ListItemText
              primary={`👤 ${user.full_name}`}
              slotProps={{ primary: { fontSize: '0.8rem' } }}
            />
          </ListItemButton>
        )}
        <ListItemButton
          onClick={handleLogout}
          sx={{ mx: 1.5, my: 0.5, borderRadius: 3, color: 'rgba(251, 243, 248, 0.65)', '&:hover': { bgcolor: 'rgba(198, 40, 40, 0.15)', color: '#EF5350' } }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
            <LogoutIcon sx={{ fontSize: '1.3rem' }} />
          </ListItemIcon>
          <ListItemText primary="Salir" slotProps={{ primary: { fontSize: '0.9rem' } }} />
        </ListItemButton>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: 'rgba(23, 10, 22, 0.82)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(199, 123, 168, 0.18)',
          color: '#FBF3F8',
          ml: { sm: `${drawerWidth}px` },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
          boxShadow: '0 4px 24px rgba(23, 10, 22, 0.28)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' }, color: '#FBF3F8' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            sx={{
              flexGrow: 1,
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              color: '#FBF3F8',
              fontSize: '1.1rem',
            }}
          >
            {menuItems.find(m => m.path === location.pathname)?.text || 'DonBeni Bodegón'}
          </Typography>
          <Tooltip title="Consulta de precios" arrow>
            <IconButton
              onClick={() => setConsultaOpen(true)}
              sx={{
                mr: 1,
                color: '#FBF3F8',
                '&:hover': { bgcolor: 'rgba(199, 123, 168, 0.16)' },
              }}
            >
              <PriceCheckIcon />
            </IconButton>
          </Tooltip>
          {cobro && (
            <Tooltip
              title={isAdmin ? 'Tasa de cambio del dólar (clic para editarla)' : 'Tasa de cambio del dólar'}
              arrow
            >
              <Box
                onClick={abrirDialogoCobro}
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.5,
                  mr: 1,
                  borderRadius: 8,
                  bgcolor: 'rgba(142, 74, 125, 0.24)',
                  border: '1px solid rgba(199, 123, 168, 0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: 'rgba(142, 74, 125, 0.34)' },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: '#DFA3C4',
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                  }}
                >
                  Tasa
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: '#FBF3F8', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  Bs. {cobro.rate}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>

      <Box component="nav" aria-label="Menú de navegación" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        id="main-content"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          mt: 8,
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #FBF3F8 0%, #F4E8F0 50%, #FBF3F8 100%)',
        }}
      >
        {children}
      </Box>

      <ConsultaPrecios open={consultaOpen} onClose={() => setConsultaOpen(false)} />

      <Dialog
        open={cobroDialogOpen}
        onClose={() => setCobroDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: '#3D1636', fontFamily: '"Playfair Display", serif', pb: 1 }}>
          Tasa de cambio del dólar
        </DialogTitle>
        <DialogContent>
          {/* Referencial BCV: solo lectura, arriba. */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              px: 2,
              py: 1.25,
              mb: 2.5,
              borderRadius: 2,
              bgcolor: 'rgba(142, 74, 125, 0.07)',
              border: '1px solid rgba(142, 74, 125, 0.22)',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: '#8E4A7D',
                fontSize: '0.68rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
              }}
            >
              BCV referencial
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: '#5C2149', fontWeight: 700, fontSize: '1.05rem' }}
            >
              Bs. {cobro?.bcv_rate ?? tasa ?? '—'}
            </Typography>
          </Box>

          {/* Tasa real de cobro: editable. */}
          <TextField
            autoFocus
            fullWidth
            label="Tasa a la que vas a cobrar"
            type="number"
            value={cobroValor}
            onChange={e => setCobroValor(e.target.value)}
            disabled={!isAdmin}
            inputProps={{ step: '0.01', min: '0' }}
            helperText={
              isAdmin
                ? 'Se aplica a las ventas nuevas, los abonos de crédito y el Reporte Z. Queda fija aunque la BCV se actualice.'
                : 'Solo el administrador puede cambiarla.'
            }
            sx={{
              '& .MuiInputBase-input.Mui-disabled': {
                WebkitTextFillColor: '#3D1636',
                opacity: 1,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCobroDialogOpen(false)} sx={{ color: '#6B3A5C' }}>
            Cerrar
          </Button>
          {isAdmin && (
            <Button
              onClick={guardarTasaCobro}
              variant="contained"
              disabled={guardandoCobro}
              sx={{ bgcolor: '#8E4A7D', '&:hover': { bgcolor: '#A85A90' } }}
            >
              Guardar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
