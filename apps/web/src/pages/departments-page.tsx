import { DepartmentsScreen } from '@/features/departments/departments-screen';
import { ProtectedPage } from '@/features/identity/protected-page';
export function DepartmentsPage() {
  return (
    <ProtectedPage>
      {(session) => (
        <DepartmentsScreen
          canManage={session.permissions.manageOrganization}
          csrfToken={session.csrfToken}
        />
      )}
    </ProtectedPage>
  );
}
