import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Rail } from './components/Rail';
import { DemoBanner, Toasts } from './components/Shell';
import { Tour } from './components/Tour';
import { Ask } from './screens/Ask';
import { Audit } from './screens/Audit';
import { Board } from './screens/Board';
import { Budgets } from './screens/Budgets';
import { Contributors } from './screens/Contributors';
import { JobPage } from './screens/JobPage';
import { NotFound } from './screens/NotFound';
import { Overview } from './screens/Overview';
import { Published } from './screens/Published';
import { Review } from './screens/Review';
import { useSwarm } from './store/useSwarm';
import s from './App.module.css';

function useThemeAttribute() {
  const theme = useSwarm((st) => st.theme);
  useEffect(() => {
    const el = document.documentElement;
    if (theme) el.dataset.theme = theme;
    else delete el.dataset.theme;
  }, [theme]);
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export default function App() {
  useThemeAttribute();
  return (
    <div className={s.app}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      <Rail />
      <div className={s.main}>
        <DemoBanner />
        <main id="main" tabIndex={-1} className={s.content}>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/ask" element={<Ask />} />
            <Route path="/board" element={<Board />} />
            <Route path="/jobs/:id" element={<JobPage />} />
            <Route path="/review" element={<Review />} />
            <Route path="/published" element={<Published />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/contributors" element={<Contributors />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
      <Toasts />
      <Tour />
    </div>
  );
}
