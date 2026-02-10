import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/components/useAuth';
import { useBilling } from '@/features/billing/components/useBilling';
import PlanBadge from '@/features/billing/components/PlanBadge';
import DeleteAccountDialog from '@/features/auth/components/DeleteAccountDialog';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { planId } = useBilling();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-(--text-primary) mb-6">Perfil</h1>

      <div className="bg-(--bg-surface) p-6 rounded-(--radius-card) shadow-sm border border-(--border-subtle) flex flex-col items-center mb-6">
        <div className="w-20 h-20 bg-(--info)/20 rounded-full flex items-center justify-center text-2xl font-bold text-(--info) mb-3">
          {user?.email?.[0].toUpperCase() || 'U'}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-bold text-gray-900">{user?.email?.split('@')[0] || 'Usuario'}</h2>
          <PlanBadge planId={planId} />
        </div>
        <p className="text-sm text-(--text-muted)">{user?.email}</p>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => navigate('/app/profile/edit')}
          className="w-full p-4 bg-(--bg-surface) rounded-(--radius-card) shadow-sm border border-(--border-subtle) text-left font-medium text-(--text-secondary) hover:bg-(--bg-hover)"
        >
          Editar Perfil
        </button>
        <button
          onClick={() => navigate('/app/billing')}
          className="w-full p-4 bg-(--bg-surface) rounded-(--radius-card) shadow-sm border border-(--border-subtle) text-left font-medium text-(--text-secondary) hover:bg-(--bg-hover)"
        >
          Billing
        </button>
        <button className="w-full p-4 bg-(--bg-surface) rounded-(--radius-card) shadow-sm border border-(--border-subtle) text-left font-medium text-(--text-secondary) hover:bg-(--bg-hover)">
          Configuracion
        </button>
        <button
          onClick={() => signOut()}
          className="w-full p-4 bg-(--bg-surface) rounded-(--radius-card) shadow-sm border border-(--border-subtle) text-left font-medium text-(--error) hover:bg-(--error)/10"
        >
          Cerrar Sesion
        </button>
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="w-full p-4 bg-(--bg-surface) rounded-(--radius-card) shadow-sm border border-(--error)/20 text-left font-medium text-(--error) hover:bg-(--error)/10"
        >
          Eliminar Cuenta
        </button>
      </div>

      <DeleteAccountDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}