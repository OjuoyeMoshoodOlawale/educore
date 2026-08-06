// Renders a number-sequence format string into an actual value, and advances the counter.
// Supported tokens: {PREFIX} {YEAR} {YY} {SESSION} {SEQ3} {SEQ4} {SEQ5}
// e.g. "{PREFIX}/{YEAR}/{SEQ4}" + prefix "ISS", year 2026, next_number 143 -> "ISS/2026/0143"

export function renderSequence(format, { prefix, next_number, currentSessionName }) {
  const now = new Date();
  const year = now.getFullYear();
  const yy = String(year).slice(-2);

  return format
    .replace('{PREFIX}', prefix || '')
    .replace('{YEAR}', String(year))
    .replace('{YY}', yy)
    .replace('{SESSION}', (currentSessionName || '').replace('/', ''))
    .replace(/\{SEQ(\d)\}/, (_, width) => String(next_number).padStart(Number(width), '0'));
}

// Presets shown in the settings UI, matching SchoolFees Manager's RegNumberTab.
export const SEQUENCE_PRESETS = [
  { label: 'PREFIX/YEAR/SEQ4', format: '{PREFIX}/{YEAR}/{SEQ4}', example: 'ISS/2026/0143' },
  { label: 'PREFIX-SEQ5', format: '{PREFIX}-{SEQ5}', example: 'ISS-00143' },
  { label: 'PREFIX/YY/SEQ3', format: '{PREFIX}/{YY}/{SEQ3}', example: 'ISS/26/143' },
  { label: 'SESSION/PREFIX/SEQ4', format: '{SESSION}/{PREFIX}/{SEQ4}', example: '20252026/ISS/0143' }
];

export async function nextInSequence(db, schoolId, sequenceFor) {
  return db.transaction(async (trx) => {
    const seq = await trx('number_sequences')
      .where({ school_id: schoolId, sequence_for: sequenceFor })
      .first();
    if (!seq) throw new Error(`No number sequence configured for "${sequenceFor}"`);

    const currentSession = await trx('sessions').where({ school_id: schoolId, is_active: true }).first();
    const value = renderSequence(seq.format, {
      prefix: seq.prefix,
      next_number: seq.next_number,
      currentSessionName: currentSession?.name
    });

    await trx('number_sequences')
      .where({ id: seq.id })
      .update({ next_number: seq.next_number + 1, updated_at: trx.fn.now() });

    return value;
  });
}
