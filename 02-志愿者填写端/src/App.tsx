import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './app/AuthProvider';
import { AppShell } from './app/AppShell';
import { LoginPage } from './pages/LoginPage';
import { AssignedElderListPage } from './pages/AssignedElderListPage';
import { ElderDetailPage } from './pages/ElderDetailPage';
import { BasicInfoFormPage } from './pages/BasicInfoFormPage';
import { HealthRecordFormPage } from './pages/HealthRecordFormPage';
import { MedicationFormPage } from './pages/MedicationFormPage';
import { ScaleFormPage } from './pages/ScaleFormPage';
import type { AssignedElder } from './types';
import FamilyEntryApp from './family-entry/App';

type Page = 'list' | 'detail' | 'basic' | 'health' | 'medication' | 'scale';

function isFamilyEntryHash(hash: string): boolean {
  return hash === '#/family' || hash === '#/family/' || hash.startsWith('#/family/');
}

function Main() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (isFamilyEntryHash(hash)) {
    return <FamilyEntryApp />;
  }

  const { loggedIn } = useAuth();
  const [page, setPage] = useState<Page>('list');
  const [selectedElder, setSelectedElder] = useState<AssignedElder | null>(null);

  if (!loggedIn) {
    return <LoginPage />;
  }

  function goList() {
    setPage('list');
    setSelectedElder(null);
  }

  function selectElder(elder: AssignedElder) {
    setSelectedElder(elder);
    setPage('detail');
  }

  function editBasic(elder: AssignedElder) {
    setSelectedElder(elder);
    setPage('basic');
  }

  return (
    <AppShell>
      {page === 'list' && (
        <AssignedElderListPage onSelect={selectElder} onEditBasic={editBasic} />
      )}
      {page === 'detail' && selectedElder && (
        <ElderDetailPage
          elder={selectedElder}
          onBack={goList}
          onEditBasic={() => setPage('basic')}
          onEditHealth={() => setPage('health')}
          onEditMedication={() => setPage('medication')}
          onEditScale={() => setPage('scale')}
        />
      )}
      {page === 'basic' && selectedElder && (
        <BasicInfoFormPage elder={selectedElder} onBack={goList} />
      )}
      {page === 'health' && selectedElder && (
        <HealthRecordFormPage elder={selectedElder} onBack={goList} />
      )}
      {page === 'medication' && selectedElder && (
        <MedicationFormPage elder={selectedElder} onBack={goList} />
      )}
      {page === 'scale' && selectedElder && (
        <ScaleFormPage elder={selectedElder} onBack={goList} />
      )}
      {selectedElder && page !== 'list' && page !== 'detail' && (
        <div className="sl-quick-actions">
          <button className={page === 'basic' ? 'sl-tab sl-tab-active' : 'sl-tab'} onClick={() => setPage('basic')}>基本信息</button>
          <button className={page === 'health' ? 'sl-tab sl-tab-active' : 'sl-tab'} onClick={() => setPage('health')}>健康档案</button>
          <button className={page === 'medication' ? 'sl-tab sl-tab-active' : 'sl-tab'} onClick={() => setPage('medication')}>用药</button>
          <button className={page === 'scale' ? 'sl-tab sl-tab-active' : 'sl-tab'} onClick={() => setPage('scale')}>量表</button>
        </div>
      )}
    </AppShell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}
