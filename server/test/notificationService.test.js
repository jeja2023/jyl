const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCheckupNotice,
  buildMedicationNotices,
  sortNotifications
} = require('../services/NotificationService');

test('buildMedicationNotices returns upcoming reminder within one hour', () => {
  const now = new Date('2026-03-28T08:15:00+08:00');
  const notices = buildMedicationNotices([
    {
      id: 1,
      medicineName: '优甲乐',
      dosage: '1片',
      takeTime: '09:00:00',
      isActive: true,
      lastTakenDate: null,
      notes: '早餐前半小时'
    }
  ], now);

  assert.equal(notices.length, 1);
  assert.equal(notices[0].type, 'medication');
  assert.equal(notices[0].isRead, false);
  assert.match(notices[0].content, /09:00/);
});

test('buildMedicationNotices skips plans already taken today or too far away', () => {
  const now = new Date('2026-03-28T08:15:00+08:00');
  const notices = buildMedicationNotices([
    {
      id: 1,
      medicineName: '优甲乐',
      dosage: '1片',
      takeTime: '09:00:00',
      isActive: true,
      lastTakenDate: '2026-03-28'
    },
    {
      id: 2,
      medicineName: '维生素D',
      dosage: '2粒',
      takeTime: '12:30:00',
      isActive: true,
      lastTakenDate: null
    }
  ], now);

  assert.equal(notices.length, 0);
});

test('buildMedicationNotices returns overdue reminder after scheduled time', () => {
  const now = new Date('2026-03-28T10:20:00+08:00');
  const notices = buildMedicationNotices([
    {
      id: 1,
      medicineName: '优甲乐',
      dosage: '1片',
      takeTime: '09:00:00',
      isActive: true,
      lastTakenDate: null
    }
  ], now);

  assert.equal(notices.length, 1);
  assert.equal(notices[0].title, '待服药提醒');
  assert.equal(notices[0].isRead, false);
});

test('buildCheckupNotice marks only near-term checkups as unread', () => {
  const now = new Date('2026-03-28T10:00:00+08:00');
  const nearNotice = buildCheckupNotice({
    id: 1,
    date: '2026-03-30',
    note: '',
    createdAt: new Date('2026-03-01T09:00:00+08:00')
  }, now);
  const farNotice = buildCheckupNotice({
    id: 2,
    date: '2026-04-10',
    note: '',
    createdAt: new Date('2026-03-01T09:00:00+08:00')
  }, now);

  assert.equal(nearNotice.isRead, false);
  assert.equal(farNotice.isRead, true);
});

test('sortNotifications keeps unread reminders ahead of read items', () => {
  const items = [
    {
      id: 'system_1',
      type: 'system',
      isRead: true,
      createdAt: new Date('2026-03-28T09:00:00+08:00')
    },
    {
      id: 'medication_1',
      type: 'medication',
      isRead: false,
      remindAt: new Date('2026-03-28T08:30:00+08:00')
    },
    {
      id: 'checkup_1',
      type: 'checkup',
      isRead: false,
      remindAt: new Date('2026-03-29T09:00:00+08:00')
    }
  ];

  items.sort(sortNotifications);

  assert.deepEqual(items.map((item) => item.id), ['medication_1', 'checkup_1', 'system_1']);
});
