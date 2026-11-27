import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Rail } from './components/Rail';
import { DemoBanner, Toasts } from './components/Shell';
import { Tour } from './components/Tour';
import { Approvals } from './screens/Approvals';
import { Audit } from './screens/Audit';
import { Budgets } from './screens/Budgets';
import { Contributors } from './screens/Contributors';
import { CouncilPage } from './screens/CouncilPage';
import { IdeaPage } from './screens/IdeaPage';
import { Improvement } from './screens/Improvement';
import { Library } from './screens/Library';
import { MissionPage } from './screens/MissionPage';
import { Missions } from './screens/Missions';
import { NewMission } from './screens/NewMission';
import { NotFound } from './screens/NotFound';
import { Overview } from './screens/Overview';
import { Published } from './screens/Published';
import { Scoreboard } from './screens/Scoreboard';
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
            <Route path="/new" element={<NewMission />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/missions/:id" element={<MissionPage />} />
            <Route path="/ideas/:id" element={<IdeaPage />} />
            <Route path="/council/:id" element={<CouncilPage />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/library" element={<Library />} />
            <Route path="/improvement" element={<Improvement />} />
            <Route path="/scoreboard" element={<Scoreboard />} />
            <Route path="/published" element={<Published />} />
            <Route path="/contributors" element={<Contributors />} />
            <Route path="/budgets" element={<Budgets />} />
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
