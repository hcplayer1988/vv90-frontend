import axios from 'axios'
 
/**
 * Shared Axios instance for all backend calls.
 *
 * withCredentials: true is essential here - the backend uses httpOnly
 * cookies for the JWT access/refresh tokens (not the Authorization header),
 * so the browser needs to be told to actually send/accept cookies on
 * cross-origin requests (localhost:5173 -> localhost:8000).
 */
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})
 
export default api
 