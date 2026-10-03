import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextField, Button, Typography, Box, Alert, InputAdornment, IconButton, Checkbox, FormControlLabel, CircularProgress } from '@mui/material'
import { login } from '../api/usuarios'
import { writeSession } from '../utils/session'
import { mensajeError } from '../utils/error'

// Botella de vino: silueta con hombros, foil dorado y etiqueta. El oro del
// foil y el morado del vidrio son los dos acentos de la paleta.
const WINE_LOGO = `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wine" x1="0" y1="0" x2="26" y2="80" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#C77BA8"/>
      <stop offset="55%" stop-color="#8E4A7D"/>
      <stop offset="100%" stop-color="#5C2149"/>
    </linearGradient>
    <linearGradient id="foil" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#E8C46A"/>
      <stop offset="100%" stop-color="#C9952A"/>
    </linearGradient>
  </defs>

  <!-- cuerpo -->
  <path d="M34 12 L46 12 L46 25 C46 32 52.5 35.5 56.5 39.5 L58 43 L58 67.5 Q58 72 53.5 72 L26.5 72 Q22 72 22 67.5 L22 43 L23.5 39.5 C27.5 35.5 34 32 34 25 Z"
        fill="url(#wine)" fill-opacity="0.22" stroke="url(#wine)" stroke-width="2.4" stroke-linejoin="round"/>

  <!-- foil / capsula -->
  <path d="M33.5 4 L46.5 4 L46.5 13 L33.5 13 Z" fill="url(#foil)"/>
  <path d="M33.5 8.5 L46.5 8.5" stroke="#0B0609" stroke-opacity="0.28" stroke-width="1.1"/>

  <!-- etiqueta -->
  <path d="M27 45 L53 45 L53 60 L27 60 Z" fill="#FBF3F8" fill-opacity="0.13"
        stroke="#C77BA8" stroke-opacity="0.5" stroke-width="1.3"/>
  <circle cx="40" cy="50.5" r="3.1" fill="none" stroke="url(#foil)" stroke-width="1.5"/>
  <path d="M35.8 55.6 L44.2 55.6" stroke="#C77BA8" stroke-opacity="0.55" stroke-width="1.3" stroke-linecap="round"/>

  <!-- brillo del vidrio -->
  <path d="M25.4 43.5 L25.4 66.5" stroke="#FBF3F8" stroke-opacity="0.2" stroke-width="2" stroke-linecap="round"/>
</svg>`

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login({ username, password })
      if (res.data.ok && res.data.token) {
        writeSession('token', res.data.token, remember)
        writeSession('user', JSON.stringify(res.data.user), remember)
        navigate('/')
      } else {
        setError(res.data.message || 'Credenciales inválidas')
      }
    } catch (err) {
      const status = err?.response?.status
      if (status === 429) {
        setError(mensajeError(err, 'Demasiados intentos. Intenta más tarde.'))
      } else {
        setError('Error de conexión con el servidor')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(160deg, #0B0609 0%, #170A16 25%, #2A0F24 50%, #170A16 75%, #0B0609 100%)',
    }}>
      {/* Resplandores de uva */}
      <Box aria-hidden="true" sx={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 600px 400px at 30% 20%, rgba(181,97,143,0.13) 0%, transparent 70%),
          radial-gradient(ellipse 500px 500px at 70% 80%, rgba(199,123,168,0.07) 0%, transparent 70%),
          radial-gradient(ellipse 800px 600px at 50% 50%, rgba(42,15,36,0.35) 0%, transparent 80%)
        `,
      }} />

      {/* Viñeta de la etiqueta: puntadas finas */}
      <Box aria-hidden="true" sx={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(199,123,168,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(199,123,168,0.035) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Textura de grano */}
      <Box aria-hidden="true" sx={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
      }} />

      {/* Acentos de esquina */}
      {[
        { top: 0, left: 0, gradient: '90deg', x1: 'rgba(199,123,168,0.35)', x2: 'transparent' },
        { top: 0, right: 0, gradient: '270deg', x1: 'rgba(199,123,168,0.35)', x2: 'transparent' },
        { bottom: 0, left: 0, gradient: '90deg', x1: 'transparent', x2: 'rgba(199,123,168,0.35)' },
        { bottom: 0, right: 0, gradient: '270deg', x1: 'transparent', x2: 'rgba(199,123,168,0.35)' },
      ].map((c, i) => (
        <Box key={i} aria-hidden="true" sx={{
          position: 'absolute', [c.top === 0 ? 'top' : 'bottom']: 0, [c.left === 0 ? 'left' : 'right']: 0,
          width: 140, height: 140, zIndex: 1, pointerEvents: 'none',
          '&::before': {
            content: '""', position: 'absolute',
            [c.top === 0 ? 'top' : 'bottom']: 32, [c.left === 0 ? 'left' : 'right']: 32,
            width: 48, height: 1,
            background: `linear-gradient(${c.gradient}, ${c.x1}, ${c.x2})`,
          },
          '&::after': {
            content: '""', position: 'absolute',
            [c.top === 0 ? 'top' : 'bottom']: 32, [c.left === 0 ? 'left' : 'right']: 32,
            width: 1, height: 48,
            background: `linear-gradient(${c.gradient === '90deg' ? '180deg' : '0deg'}, ${c.x1}, ${c.x2})`,
          },
        }} />
      ))}

      {/* Tarjeta principal */}
      <Box sx={{
        position: 'relative', zIndex: 3,
        width: '100%', maxWidth: 440, mx: 2,
        animation: 'fade-in-up 0.7s ease-out both',
      }}>
        {/* Marca */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 88, height: 88, mb: 2.5,
            background: 'linear-gradient(135deg, rgba(181,97,143,0.18) 0%, rgba(181,97,143,0.04) 100%)',
            borderRadius: '50%',
            border: '1.5px solid rgba(199,123,168,0.22)',
            boxShadow: '0 0 40px rgba(142,74,125,0.12), inset 0 0 20px rgba(181,97,143,0.05)',
            position: 'relative',
            '&::before': {
              content: '""', position: 'absolute', inset: -6, borderRadius: '50%',
              border: '1px solid rgba(199,123,168,0.07)',
            },
            '&::after': {
              content: '""', position: 'absolute', inset: -12, borderRadius: '50%',
              border: '1px solid rgba(199,123,168,0.035)',
            },
          }}
            dangerouslySetInnerHTML={{ __html: WINE_LOGO }}
          />
          <Typography
            variant="h2"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 700, color: '#FBF3F8',
              fontSize: { xs: '2.1rem', sm: '2.4rem' },
              letterSpacing: '-0.02em', lineHeight: 1.1,
            }}
          >
            DonBeni
          </Typography>
          <Typography
            sx={{
              color: '#DFA3C4', letterSpacing: '0.22em',
              textTransform: 'uppercase', fontSize: '0.72rem',
              mt: 0.8, fontWeight: 500,
            }}
          >
            Bodegón
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(251,243,248,0.32)', mt: 2.5, fontSize: '0.82rem' }}
          >
            Inicia sesión para continuar
          </Typography>
        </Box>

        {/* Formulario */}
        <Box sx={{
          background: 'linear-gradient(135deg, rgba(251,243,248,0.06) 0%, rgba(251,243,248,0.02) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: 3.5,
          border: '1px solid rgba(251,243,248,0.07)',
          boxShadow: '0 8px 40px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(199,123,168,0.07)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""', position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(199,123,168,0.3), transparent)',
          },
        }}>
          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            {error && (
              <Alert
                severity="error" role="alert"
                sx={{
                  mb: 2.5, borderRadius: 2,
                  bgcolor: 'rgba(198,40,40,0.12)',
                  color: '#FF8A80',
                  border: '1px solid rgba(198,40,40,0.18)',
                  '& .MuiAlert-icon': { color: '#FF8A80' },
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleLogin} noValidate>
              <TextField
                label="Usuario"
                id="login-username"
                name="username"
                type="text"
                fullWidth
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                slotProps={{ htmlInput: { id: 'login-username', 'aria-required': 'true' } }}
                sx={{
                  mb: 2.5,
                  '& .MuiOutlinedInput-root': {
                    color: '#FBF3F8', borderRadius: 2.5,
                    bgcolor: 'rgba(251,243,248,0.025)',
                    transition: 'all 0.25s ease',
                    '& fieldset': { borderColor: 'rgba(251,243,248,0.08)' },
                    '&:hover fieldset': { borderColor: 'rgba(199,123,168,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#B5618F', borderWidth: 1.5 },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(251,243,248,0.3)', fontSize: '0.82rem' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#C77BA8' },
                  '& .MuiInputLabel-shrink': { color: '#C77BA8' },
                }}
              />
              <TextField
                label="Contraseña"
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                slotProps={{
                  htmlInput: {
                    'aria-required': 'true',
                    'aria-label': 'Contraseña',
                  },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          onClick={() => setShowPassword(s => !s)}
                          edge="end" size="small"
                          sx={{ color: 'rgba(251,243,248,0.3)', '&:hover': { color: '#C77BA8' } }}
                        >
                          {showPassword
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="m14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          }
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  mb: 1.5,
                  '& .MuiOutlinedInput-root': {
                    color: '#FBF3F8', borderRadius: 2.5,
                    bgcolor: 'rgba(251,243,248,0.025)',
                    transition: 'all 0.25s ease',
                    '& fieldset': { borderColor: 'rgba(251,243,248,0.08)' },
                    '&:hover fieldset': { borderColor: 'rgba(199,123,168,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#B5618F', borderWidth: 1.5 },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(251,243,248,0.3)', fontSize: '0.82rem' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#C77BA8' },
                  '& .MuiInputLabel-shrink': { color: '#C77BA8' },
                }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    size="small"
                    sx={{
                      color: 'rgba(251,243,248,0.2)',
                      '&.Mui-checked': { color: '#B5618F' },
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: 'rgba(251,243,248,0.35)', fontSize: '0.78rem' }}>
                    Recordar sesión
                  </Typography>
                }
                sx={{ mb: 3, ml: 0 }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                aria-label="Iniciar sesión"
                sx={{
                  py: 1.8, borderRadius: 2.5,
                  fontSize: '0.95rem', fontWeight: 600,
                  letterSpacing: '0.03em',
                  background: 'linear-gradient(135deg, #8E4A7D 0%, #5C2149 100%)',
                  color: '#FBF3F8',
                  boxShadow: '0 4px 24px rgba(142,74,125,0.28)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #A85A90 0%, #8E4A7D 100%)',
                    boxShadow: '0 8px 36px rgba(168,90,144,0.38)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': { transform: 'translateY(0)' },
                  '&.Mui-disabled': {
                    background: 'rgba(142,74,125,0.35)',
                    color: 'rgba(251,243,248,0.35)',
                    boxShadow: 'none',
                  },
                  transition: 'all 0.25s ease',
                }}
              >
                {loading
                  ? <CircularProgress size={22} sx={{ color: 'rgba(251,243,248,0.7)' }} />
                  : 'Ingresar'
                }
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Pie */}
        <Typography
          variant="caption" align="center"
          sx={{
            display: 'block', mt: 4,
            color: 'rgba(251,243,248,0.12)',
            fontSize: '0.68rem', letterSpacing: '0.06em',
          }}
        >
          Sistema de Gestión &mdash; DonBeni Bodegón
        </Typography>
      </Box>
    </Box>
  )
}