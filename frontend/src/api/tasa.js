import api from './axios'

export const getTasa = () => api.get('/tasa')

// Tasa real de cobro fijada por el administrador (cae a la BCV si no hay).
export const getTasaCobro = () => api.get('/tasa/cobro')

export const setTasaCobro = (rate) => api.post('/tasa/cobro', { rate })
