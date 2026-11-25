import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import HoursCalculator from './pages/HoursCalculator';
import Overtime from './pages/Overtime';
import TimeToDecimal from './pages/TimeToDecimal';
import MilitaryTime from './pages/MilitaryTime';
import Printable from './pages/Printable';
import TimeDuration from './pages/TimeDuration';
import Biweekly from './pages/Biweekly';
import Privacy from './pages/Privacy';
import View from './pages/View';
import Saved from './pages/Saved';
import NotFound from './pages/NotFound';

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hours-calculator/" element={<HoursCalculator />} />
        <Route path="/overtime-calculator/" element={<Overtime />} />
        <Route path="/time-to-decimal/" element={<TimeToDecimal />} />
        <Route path="/military-time-converter/" element={<MilitaryTime />} />
        <Route path="/printable-timesheet/" element={<Printable />} />
        <Route path="/time-duration-calculator/" element={<TimeDuration />} />
        <Route path="/biweekly-time-card-calculator/" element={<Biweekly />} />
        <Route path="/privacy/" element={<Privacy />} />
        <Route path="/view/" element={<View />} />
        <Route path="/saved/" element={<Saved />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
