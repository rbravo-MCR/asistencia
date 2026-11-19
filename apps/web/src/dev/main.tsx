import { createRoot } from 'react-dom/client';
import { DesignSystem } from './design-system';
if (import.meta.env.DEV)
  createRoot(document.getElementById('root')!).render(<DesignSystem />);
