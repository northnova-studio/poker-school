import { lazy, Suspense, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Spinner } from '@/components/ui/Spinner'
import PublicLayout from '@/components/layout/PublicLayout'

// Layout area riservata (caricati in lazy: non pesano sulla home)
const AppLayout = lazy(() => import('@/components/layout/AppLayout'))
const AdminLayout = lazy(() => import('@/components/layout/AdminLayout'))

// Pubblico
const Home = lazy(() => import('@/pages/public/Home'))
const Coaching = lazy(() => import('@/pages/public/Coaching'))
const Team = lazy(() => import('@/pages/public/Team'))
const Results = lazy(() => import('@/pages/public/Results'))
const Courses = lazy(() => import('@/pages/public/Courses'))
const CourseDetail = lazy(() => import('@/pages/public/CourseDetail'))
const Community = lazy(() => import('@/pages/public/Community'))
const Pricing = lazy(() => import('@/pages/public/Pricing'))
const BrandLab = lazy(() => import('@/pages/public/BrandLab'))
const Legal = lazy(() => import('@/pages/public/Legal'))
const NotFound = lazy(() => import('@/pages/public/NotFound'))
// Auth
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const VerifyIdentity = lazy(() => import('@/pages/auth/VerifyIdentity'))
// Area studente
const Dashboard = lazy(() => import('@/pages/app/Dashboard'))
const Stats = lazy(() => import('@/pages/app/Stats'))
const Sessions = lazy(() => import('@/pages/app/Sessions'))
const Rank = lazy(() => import('@/pages/app/Rank'))
const Card = lazy(() => import('@/pages/app/Card'))
const MyCourses = lazy(() => import('@/pages/app/MyCourses'))
const CoursePlayer = lazy(() => import('@/pages/app/CoursePlayer'))
const Lessons = lazy(() => import('@/pages/app/Lessons'))
const DailySpot = lazy(() => import('@/pages/app/DailySpot'))
const Roast = lazy(() => import('@/pages/app/Roast'))
const DeepRun = lazy(() => import('@/pages/app/DeepRun'))
const Lobby = lazy(() => import('@/pages/app/Lobby'))
const HandReview = lazy(() => import('@/pages/app/HandReview'))
const Profile = lazy(() => import('@/pages/app/Profile'))
// Admin / gestionale
const AdminOverview = lazy(() => import('@/pages/admin/Overview'))
const AdminPlayers = lazy(() => import('@/pages/admin/Players'))
const AdminPlayerDetail = lazy(() => import('@/pages/admin/PlayerDetail'))
const AdminKyc = lazy(() => import('@/pages/admin/Kyc'))
const AdminStaking = lazy(() => import('@/pages/admin/Staking'))
const AdminFinance = lazy(() => import('@/pages/admin/Finance'))
const AdminCourses = lazy(() => import('@/pages/admin/CoursesAdmin'))
const AdminLessons = lazy(() => import('@/pages/admin/LessonsAdmin'))
const AdminContent = lazy(() => import('@/pages/admin/Content'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function RequireAuth({ children, role }: { children: ReactNode; role?: 'ADMIN' }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/accedi" replace state={{ from: location.pathname }} />
  if (role === 'ADMIN' && user.role !== 'ADMIN') return <Navigate to="/app" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="coaching/:format" element={<Coaching />} />
            <Route path="team" element={<Team />} />
            <Route path="risultati" element={<Results />} />
            <Route path="corsi" element={<Courses />} />
            <Route path="corsi/:slug" element={<CourseDetail />} />
            <Route path="community" element={<Community />} />
            <Route path="prezzi" element={<Pricing />} />
            <Route path="brand-lab" element={<BrandLab />} />
            <Route path="legal/:page" element={<Legal />} />
            <Route path="accedi" element={<Login />} />
            <Route path="registrati" element={<Register />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route
            path="app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="verifica-identita" element={<VerifyIdentity />} />
            <Route path="statistiche" element={<Stats />} />
            <Route path="sessioni" element={<Sessions />} />
            <Route path="rank" element={<Rank />} />
            <Route path="card" element={<Card />} />
            <Route path="corsi" element={<MyCourses />} />
            <Route path="corsi/:slug" element={<CoursePlayer />} />
            <Route path="lezioni" element={<Lessons />} />
            <Route path="daily-spot" element={<DailySpot />} />
            <Route path="roast" element={<Roast />} />
            <Route path="deep-run" element={<DeepRun />} />
            <Route path="lobby" element={<Lobby />} />
            <Route path="hand-review" element={<HandReview />} />
            <Route path="profilo" element={<Profile />} />
          </Route>

          <Route
            path="admin"
            element={
              <RequireAuth role="ADMIN">
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="giocatori" element={<AdminPlayers />} />
            <Route path="giocatori/:id" element={<AdminPlayerDetail />} />
            <Route path="kyc" element={<AdminKyc />} />
            <Route path="staking" element={<AdminStaking />} />
            <Route path="finanze" element={<AdminFinance />} />
            <Route path="corsi" element={<AdminCourses />} />
            <Route path="lezioni" element={<AdminLessons />} />
            <Route path="contenuti" element={<AdminContent />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
