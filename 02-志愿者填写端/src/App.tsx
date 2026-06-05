import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './app/AuthProvider';
import { AppShell } from './app/AppShell';
import { LoginPage } from './pages/LoginPage';
import { AssignedElderListPage } from './pages/AssignedElderListPage';
import { ElderDetailPage } from './pages/ElderDetailPage';
import { BasicInfoFormPage } from './pages/BasicInfoFormPage';
import { MedicationFormPage } from './pages/MedicationFormPage';
import { ScaleFormPage } from './pages/ScaleFormPage';
import { QrCodeManagePage } from './pages/QrCodeManagePage';
import type { AssignedElder } from './types';
import FamilyEntryApp from './family-entry/App';

type Page = 'list' | 'detail' | 'basic' | 'medication' | 'scale' | 'qrcode';

function isFamilyEntryHash(hash: string): boolean {
  return hash === '#/family' || hash === '#/family/' || hash.startsWith('#/family/');
}

function Main() {
  const [hash, setHash] = useState(() => window.location.hash);
  const { loggedIn } = useAuth();
  const [page, setPage] = useState<Page>('list');
  const [selectedElder, setSelectedElder] = useState<AssignedElder | null>(null);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (isFamilyEntryHash(hash)) {
    return <FamilyEntryApp />;
  }

  if (!loggedIn) {
    return <LoginPage />;
  }

  function goList() {
    setPage('list');
    setSelectedElder(null);
  }

  function goDetail() {
    if (!selectedElder) {
      goList();
      return;
    }
    setPage('detail');
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
          onEditMedication={() => setPage('medication')}
          onEditScale={() => setPage('scale')}
          onManageQrCode={() => setPage('qrcode')}
        />
      )}
      {page === 'basic' && selectedElder && (
        <BasicInfoFormPage elder={selectedElder} onBack={goDetail} />
      )}
      {page === 'medication' && selectedElder && (
        <MedicationFormPage elder={selectedElder} onBack={goDetail} />
      )}
      {page === 'scale' && selectedElder && (
        <ScaleFormPage elder={selectedElder} onBack={goDetail} />
      )}
      {page === 'qrcode' && selectedElder && (
        <QrCodeManagePage elder={selectedElder} onBack={goDetail} />
      )}
      {selectedElder && page !== 'list' && page !== 'detail' && (
        <nav className="sl-quick-nav" aria-label="档案快捷切换">
          <button
            type="button"
            className={page === 'basic' ? 'sl-quick-nav-btn is-active' : 'sl-quick-nav-btn'}
            onClick={() => setPage('basic')}
          >
            <span className="sl-quick-nav-title">基本信息</span>
            <span className="sl-quick-nav-desc">档案资料</span>
          </button>
          <button
            type="button"
            className={page === 'medication' ? 'sl-quick-nav-btn is-active' : 'sl-quick-nav-btn'}
            onClick={() => setPage('medication')}
          >
            <span className="sl-quick-nav-title">主要用药</span>
            <span className="sl-quick-nav-desc">用药记录</span>
          </button>
          <button
            type="button"
            className={page === 'scale' ? 'sl-quick-nav-btn is-active' : 'sl-quick-nav-btn'}
            onClick={() => setPage('scale')}
          >
            <span className="sl-quick-nav-title">量表信息</span>
            <span className="sl-quick-nav-desc">评估记录</span>
          </button>
          <button
            type="button"
            className={page === 'qrcode' ? 'sl-quick-nav-btn is-active' : 'sl-quick-nav-btn'}
            onClick={() => setPage('qrcode')}
          >
            <span className="sl-quick-nav-title">二维码管理</span>
            <span className="sl-quick-nav-desc">扫码名牌</span>
          </button>
        </nav>
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
