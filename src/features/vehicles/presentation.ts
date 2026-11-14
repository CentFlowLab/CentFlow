import type { TFunction } from 'i18next';

import type { Vehicle, VehicleKind } from '@/core/finance';
import type { IconName } from '@/ui/components';

const KIND_ICONS: Record<VehicleKind, IconName> = {
  car: 'car-outline',
  motorcycle: 'bicycle-outline',
  van: 'bus-outline',
  bicycle: 'bicycle-outline',
  other: 'cube-outline',
};

/** Ícones que a pessoa pode escolher para um veículo. */
export const VEHICLE_ICON_CHOICES: readonly IconName[] = [
  'car-outline',
  'car-sport-outline',
  'bus-outline',
  'bicycle-outline',
  'boat-outline',
  'airplane-outline',
  'construct-outline',
  'cube-outline',
];

/** Tipo mostrado: o escrito pela pessoa ou, sem ele, o tipo base traduzido. */
export function vehicleKindLabel(t: TFunction, vehicle: Pick<Vehicle, 'kind' | 'kindLabel'>) {
  return vehicle.kindLabel ?? t(`vehicles.kinds.${vehicle.kind}`);
}

/**
 * País da matrícula, só para a apresentação (ADR-078): reconhece os quatro formatos portugueses
 * (LL-DD-LL, DD-LL-DD, DD-DD-LL, LL-DD-DD), sem distinguir maiúsculas e ignorando espaços e
 * hífenes. Não reformata nem guarda nada.
 */
export function plateCountry(plate: string): 'PT' | null {
  const compact = plate.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(compact)) return null;
  const shape = compact.replace(/[A-Z]/g, 'L').replace(/[0-9]/g, 'D');
  return ['LLDDLL', 'DDLLDD', 'DDDDLL', 'LLDDDD'].includes(shape) ? 'PT' : null;
}

export function vehicleIcon(vehicle: Pick<Vehicle, 'kind' | 'icon'>): IconName {
  return (vehicle.icon as IconName | null) ?? KIND_ICONS[vehicle.kind];
}

/**
 * Tipo base, só para regras (ex.: o IUC não se aplica a bicicletas). Deduzido do que a pessoa
 * escolheu: as sugestões conhecidas mantêm o seu tipo; o ícone de bicicleta conta como bicicleta.
 */
export function deriveVehicleKind(
  label: string,
  icon: IconName | null,
  known: Readonly<Record<string, VehicleKind>>,
): VehicleKind {
  const fromLabel = known[label.trim().toLocaleLowerCase()];
  if (fromLabel) return fromLabel;
  if (icon === 'bicycle-outline') return 'bicycle';
  if (icon === 'bus-outline') return 'van';
  if (icon === 'car-outline' || icon === 'car-sport-outline') return 'car';
  return 'other';
}

/** Unidade da energia: kWh nos elétricos, litros nos restantes. */
export type EnergyUnit = 'litre' | 'kwh';

export function energyUnit(vehicle: Pick<Vehicle, 'fuelType'> | null | undefined): EnergyUnit {
  return vehicle?.fuelType === 'electric' ? 'kwh' : 'litre';
}
