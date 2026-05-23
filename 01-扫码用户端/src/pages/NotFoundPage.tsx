import { AlertTriangle } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="sl-page center">
      <div className="sl-empty">
        <AlertTriangle size={48} />
        <h2>二维码无效</h2>
        <p>该二维码已过期、停用或不存在。</p>
        <p>请确认名牌二维码完整清晰后重新扫描。</p>
      </div>
    </div>
  );
}
