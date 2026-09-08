import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEMO_STAGES } from '@/lib/demoStages';

const STORAGE_KEY = 'pp_demo_state';
const DemoContext = createContext(null);

function readStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(state) {
  if (!state || !state.active) sessionStorage.removeItem(STORAGE_KEY);
  else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const IDLE = { active: false, mode: null, stageIndex: 0, showFullMenu: false };

export function DemoProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState(() => readStored() || IDLE);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => { write(state); }, [state]);

  // Keep the tour step in sync with the current route.
  useEffect(() => {
    if (!state.active) return;
    const idx = DEMO_STAGES.findIndex((s) => s.route === location.pathname);
    if (idx >= 0) {
      setState((prev) => (prev.stageIndex !== idx ? { ...prev, stageIndex: idx } : prev));
    }
  }, [location.pathname, state.active]);

  const startGuided = useCallback(() => {
    setState({ active: true, mode: 'guided', stageIndex: 0, showFullMenu: false });
    navigate(DEMO_STAGES[0].route);
  }, [navigate]);

  const startFree = useCallback(() => {
    setState({ active: true, mode: 'free', stageIndex: 0, showFullMenu: false });
    navigate(DEMO_STAGES[0].route);
  }, [navigate]);

  const goToStage = useCallback((idx) => {
    const i = Math.max(0, Math.min(DEMO_STAGES.length - 1, idx));
    setState((prev) => ({ ...prev, stageIndex: i }));
    navigate(DEMO_STAGES[i].route);
  }, [navigate]);

  const next = useCallback(() => {
    setState((prev) => {
      const i = Math.min(DEMO_STAGES.length - 1, prev.stageIndex + 1);
      navigate(DEMO_STAGES[i].route);
      return { ...prev, stageIndex: i };
    });
  }, [navigate]);

  const prev = useCallback(() => {
    setState((prev) => {
      const i = Math.max(0, prev.stageIndex - 1);
      navigate(DEMO_STAGES[i].route);
      return { ...prev, stageIndex: i };
    });
  }, [navigate]);

  const exit = useCallback(() => {
    setState(IDLE);
    navigate('/');
  }, [navigate]);

  const setShowFullMenu = useCallback((v) => {
    setState((prev) => ({ ...prev, showFullMenu: v }));
  }, []);

  const openTutorial = useCallback(() => setTutorialOpen(true), []);
  const closeTutorial = useCallback(() => setTutorialOpen(false), []);

  return (
    <DemoContext.Provider
      value={{
        // La plantilla entregable no permite activar el modo demo ni omitir permisos.
        demoActive: false,
        demoMode: state.mode,
        stageIndex: state.stageIndex,
        stage: DEMO_STAGES[state.stageIndex] || DEMO_STAGES[0],
        stages: DEMO_STAGES,
        startGuided,
        startFree,
        goToStage,
        next,
        prev,
        exit,
        showFullMenu: state.showFullMenu,
        setShowFullMenu,
        tutorialOpen,
        openTutorial,
        closeTutorial,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    return {
      demoActive: false, demoMode: null, stageIndex: 0, stage: null, stages: [],
      startGuided: () => {}, startFree: () => {}, goToStage: () => {},
      next: () => {}, prev: () => {}, exit: () => {},
      showFullMenu: false, setShowFullMenu: () => {},
      tutorialOpen: false, openTutorial: () => {}, closeTutorial: () => {},
    };
  }
  return ctx;
}