/**
 * CentFlow Doctor — diagnóstico interno (erros, mutations, validação).
 * Em produção mantém-se discreto; em dev/beta expõe painel de logs.
 */
export {
  logDoctorMutationFailure,
  logDoctorValidationFailure,
} from './log-mutation';

export {
  traceOcrFailure,
  traceOcrStep,
} from './financial-mutation-trace';

export {
  traceMovementStep,
  traceMovementError,
} from './movement-flow-trace';

export {
  traceTransferStep,
  traceTransferError,
} from './transfer-flow-trace';

export const DOCTOR_SOURCE = 'centflow-doctor';
