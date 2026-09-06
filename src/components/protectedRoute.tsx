import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { LoggedInUser } from '../api/auth'
 
interface ProtectedRouteProps {
  currentUser: LoggedInUser | null
  children: ReactNode
}
 
/**
 * ProtectedRoute: wraps any route that should only be reachable while
 * logged in. If currentUser is null, redirects to the homepage instead of
 * rendering the protected content - prevents direct URL access to member-
 * only pages (e.g. typing /forum straight into the address bar).
 */
function ProtectedRoute({ currentUser, children }: ProtectedRouteProps) {
  if (!currentUser) {
    return <Navigate to="/" replace />
  }
 
  return children
}
 
export default ProtectedRoute
 