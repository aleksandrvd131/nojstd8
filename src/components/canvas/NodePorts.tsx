import { createContext, useContext, useLayoutEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { sides, type Side, type Role } from '../../engine/ports';

export const PortRoles = createContext(new Map<string, Partial<Record<Side, Role>>>());
const positions = { left: Position.Left, right: Position.Right, top: Position.Top, bottom: Position.Bottom };

export function NodePorts({ id }: { id: string }) {
  const roles = useContext(PortRoles).get(id);
  const signature = sides.map(side => roles?.[side] ?? '-').join();
  const update = useUpdateNodeInternals();
  useLayoutEffect(() => { update(id); }, [id, signature, update]);
  return <>{sides.map(side => {
    const role = roles?.[side];
    return <Handle key={side} id={side} position={positions[side]}
      type={role === 'in' ? 'target' : 'source'}
      title={role === 'in' ? 'Вход' : role === 'out' ? 'Выход' : 'Свободная точка'}
      className={`!w-2.5 !h-2.5 !border-2 !border-white dark:!border-zinc-900 ${
        role === 'in' ? '!bg-sky-500 !rounded-full' : role === 'out' ? '!bg-amber-500 !rounded-sm' : '!bg-zinc-400 !rounded-full'
      }`} />;
  })}</>;
}
