import { AlertTriangle } from 'lucide-react';

type NotFoundPageVariant = 'missing-token' | 'invalid-qr';

interface NotFoundPageProps {
  variant?: NotFoundPageVariant;
}

const pageCopy: Record<NotFoundPageVariant, { title: string; description?: string; hint: string }> = {
  'missing-token': {
    title: '请扫码二维码',
    hint: '请回到微信或相机，重新扫描名牌上的二维码。',
  },
  'invalid-qr': {
    title: '该二维码已经过期',
    description: '可能是二维码已经停用、链接不完整，或者这张名牌已经更换了新二维码。',
    hint: '请重新扫描老人名牌上的二维码；如果多次尝试仍打不开，请联系工作人员核对或更换名牌。',
  },
};

export function NotFoundPage({ variant = 'invalid-qr' }: NotFoundPageProps) {
  const copy = pageCopy[variant];

  return (
    <div className="sl-page center">
      <div className="sl-empty">
        <AlertTriangle size={48} />
        <h2>{copy.title}</h2>
        {copy.description ? <p>{copy.description}</p> : null}
        <p>{copy.hint}</p>
      </div>
    </div>
  );
}
