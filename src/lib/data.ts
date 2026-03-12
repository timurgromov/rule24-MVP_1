export type SessionStatus = 'SCHEDULED' | 'PAID' | 'NO_SHOW' | 'CANCELLED_LATE';

export interface Session {
  id: string;
  clientName: string;
  date: string;
  time: string;
  price: number;
  status: SessionStatus;
  isPaid: boolean;
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  sessionsCount: number;
  cancellationRate: number;
  totalPaid: number;
  totalLost: number;
  riskLevel: 'low' | 'medium' | 'high';
  hasCard: boolean;
  maskedCard?: string;
}

export const statusLabels: Record<SessionStatus, string> = {
  SCHEDULED: 'План',
  PAID: 'Оплачена',
  NO_SHOW: 'Неявка',
  CANCELLED_LATE: 'Отмена',
};

export const statusVariants: Record<SessionStatus, 'success' | 'danger' | 'warning' | 'muted' | 'secondary'> = {
  SCHEDULED: 'muted',
  PAID: 'success',
  NO_SHOW: 'danger',
  CANCELLED_LATE: 'danger',
};

export const fakeSessions: Session[] = [
  { id: '1', clientName: 'Анна К.', date: '2026-03-08', time: '10:00', price: 5000, status: 'PAID', isPaid: true },
  { id: '2', clientName: 'Дмитрий В.', date: '2026-03-08', time: '12:00', price: 5000, status: 'CANCELLED_LATE', isPaid: false },
  { id: '3', clientName: 'Елена М.', date: '2026-03-08', time: '14:00', price: 4500, status: 'SCHEDULED', isPaid: false },
  { id: '4', clientName: 'Сергей Л.', date: '2026-03-07', time: '10:00', price: 5000, status: 'NO_SHOW', isPaid: false },
  { id: '5', clientName: 'Ольга Т.', date: '2026-03-07', time: '13:00', price: 5000, status: 'PAID', isPaid: true },
  { id: '6', clientName: 'Марина Р.', date: '2026-03-07', time: '15:00', price: 4500, status: 'SCHEDULED', isPaid: false },
  { id: '7', clientName: 'Алексей Н.', date: '2026-03-06', time: '11:00', price: 5000, status: 'PAID', isPaid: true },
  { id: '8', clientName: 'Ирина С.', date: '2026-03-06', time: '14:00', price: 5000, status: 'CANCELLED_LATE', isPaid: false },
  { id: '9', clientName: 'Павел Д.', date: '2026-03-05', time: '10:00', price: 4500, status: 'PAID', isPaid: true },
  { id: '10', clientName: 'Наталья Б.', date: '2026-03-05', time: '16:00', price: 5000, status: 'PAID', isPaid: true },
  { id: '11', clientName: 'Виктор Г.', date: '2026-03-04', time: '09:00', price: 5000, status: 'NO_SHOW', isPaid: false },
  { id: '12', clientName: 'Татьяна Ж.', date: '2026-03-04', time: '11:00', price: 4500, status: 'PAID', isPaid: true },
  { id: '13', clientName: 'Андрей П.', date: '2026-03-03', time: '10:00', price: 5000, status: 'PAID', isPaid: true },
  { id: '14', clientName: 'Юлия Ф.', date: '2026-03-03', time: '14:00', price: 5000, status: 'CANCELLED_LATE', isPaid: false },
  { id: '15', clientName: 'Кирилл Х.', date: '2026-03-02', time: '12:00', price: 4500, status: 'PAID', isPaid: true },
];

export const fakeClients: Client[] = [
  { id: '1', name: 'Анна К.', sessionsCount: 24, cancellationRate: 4, totalPaid: 120000, totalLost: 0, riskLevel: 'low', hasCard: true, maskedCard: '•••• 4821' },
  { id: '2', name: 'Дмитрий В.', sessionsCount: 12, cancellationRate: 25, totalPaid: 45000, totalLost: 15000, riskLevel: 'high', hasCard: true, maskedCard: '•••• 7903' },
  { id: '3', name: 'Елена М.', sessionsCount: 18, cancellationRate: 6, totalPaid: 81000, totalLost: 4500, riskLevel: 'low', hasCard: true, maskedCard: '•••• 1256' },
  { id: '4', name: 'Сергей Л.', sessionsCount: 8, cancellationRate: 38, totalPaid: 25000, totalLost: 15000, riskLevel: 'high', hasCard: false },
  { id: '5', name: 'Ольга Т.', sessionsCount: 30, cancellationRate: 3, totalPaid: 150000, totalLost: 5000, riskLevel: 'low', hasCard: true, maskedCard: '•••• 5512' },
  { id: '6', name: 'Марина Р.', sessionsCount: 10, cancellationRate: 10, totalPaid: 45000, totalLost: 4500, riskLevel: 'medium', hasCard: false },
  { id: '7', name: 'Алексей Н.', sessionsCount: 15, cancellationRate: 7, totalPaid: 75000, totalLost: 5000, riskLevel: 'low', hasCard: true, maskedCard: '•••• 3347' },
  { id: '8', name: 'Ирина С.', sessionsCount: 6, cancellationRate: 33, totalPaid: 15000, totalLost: 10000, riskLevel: 'high', hasCard: false },
];
