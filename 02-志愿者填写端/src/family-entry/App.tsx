import { HashRouter } from 'react-router-dom';
import { AppRouter } from './routes/router';

export default function FamilyEntryApp() {
  return (
    <HashRouter basename="/family">
      <AppRouter />
    </HashRouter>
  );
}
