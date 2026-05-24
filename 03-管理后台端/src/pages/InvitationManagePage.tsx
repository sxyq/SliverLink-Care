import { InvitationManageSection } from '../components/InvitationManageSection';

export function InvitationManagePage() {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">邀请码管理</p>
          <h2>邀请码管理</h2>
        </div>
      </header>

      <InvitationManageSection />
    </>
  );
}
