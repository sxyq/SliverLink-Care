import { AuthLoginShell } from '@/pages/auth/login';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

function HomePage() {
  return <AuthLoginShell showScanEntry />;
}

export default function HomePageEntry() {
  return (
    <I18nPageShell navigationTitleKey='common.brandTitle'>
      <HomePage />
    </I18nPageShell>
  );
}
