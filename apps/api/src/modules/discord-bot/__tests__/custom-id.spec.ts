import { ClassChangeConfidence, GuildClass } from '@guild/shared/enums';

import {
  decodeSurveyComponentId,
  encodeSurveyLevelId,
  encodeSurveySelectId,
  decodeAttendanceButtonId,
  decodeSurveyFillId,
  encodeAttendanceButtonId,
  encodeSurveyFillId,
} from '../custom-id';

describe('custom_id của nút điểm danh', () => {
  it('mã hoá rồi giải mã ra đúng ba mảnh', () => {
    const value = {
      sessionId: 'gw-2026-08-31',
      characterId: 'meo-beo-k7ma3x',
      isPresent: true,
    };

    expect(decodeAttendanceButtonId(encodeAttendanceButtonId(value))).toEqual(
      value,
    );
  });

  it('phân biệt Có với Không', () => {
    const no = encodeAttendanceButtonId({
      sessionId: 'gw-2026-08-31',
      characterId: 'meo-beo-k7ma3x',
      isPresent: false,
    });

    expect(decodeAttendanceButtonId(no)?.isPresent).toBe(false);
  });

  it('giải mã ra null khi custom_id không phải của nút điểm danh', () => {
    // Other bot messages will send their custom_id through this same endpoint later on.
    expect(decodeAttendanceButtonId('something-else')).toBeNull();
    expect(decodeAttendanceButtonId('dd:chi-co-hai-manh')).toBeNull();
    expect(decodeAttendanceButtonId('dd:a:b:9')).toBeNull();
  });

  it('ném lỗi thay vì dựng một custom_id quá dài', () => {
    // Discord rejects the whole message rather than just the button, so this has to blow up at
    // build time.
    expect(() =>
      encodeAttendanceButtonId({
        sessionId: 'x'.repeat(60),
        characterId: 'y'.repeat(60),
        isPresent: true,
      }),
    ).toThrow();
  });
});

describe('custom_id của nút Điền khảo sát', () => {
  it('mã hoá rồi giải mã ra đúng id đợt', () => {
    expect(decodeSurveyFillId(encodeSurveyFillId('cl9x0survey'))).toBe(
      'cl9x0survey',
    );
  });

  it('giải mã ra null khi không phải nút này, kể cả nút điểm danh', () => {
    expect(decodeSurveyFillId('ann:diem-danh')).toBeNull();
    expect(decodeSurveyFillId('dd:a:b:1')).toBeNull();
    expect(decodeSurveyFillId('cs:khac:cl9x0survey')).toBeNull();
    expect(decodeSurveyFillId('cs:dien:')).toBeNull();
    expect(decodeSurveyFillId('cs:dien')).toBeNull();
  });

  it('nút điểm danh không bị nhầm với nút khảo sát', () => {
    expect(
      decodeAttendanceButtonId(encodeSurveyFillId('cl9x0survey')),
    ).toBeNull();
  });

  it('ném lỗi thay vì dựng một custom_id quá dài', () => {
    expect(() => encodeSurveyFillId('x'.repeat(100))).toThrow();
  });
});

describe('custom_id của bảng trả lời khảo sát', () => {
  it('menu chọn và nút mức độ mã hoá rồi giải mã đúng', () => {
    expect(decodeSurveyComponentId(encodeSurveySelectId('s1'))).toEqual({
      kind: 'select',
      surveyId: 's1',
    });

    const level = {
      surveyId: 's1',
      targetClass: GuildClass.HUYET_HA,
      confidence: ClassChangeConfidence.CONSIDERING,
    };

    expect(decodeSurveyComponentId(encodeSurveyLevelId(level))).toEqual({
      kind: 'level',
      ...level,
    });
  });

  it('nút Điền khảo sát giải mã ra loại fill', () => {
    expect(decodeSurveyComponentId(encodeSurveyFillId('s1'))).toEqual({
      kind: 'fill',
      surveyId: 's1',
    });
  });

  it.each([
    'something-else',
    'cs:chon',
    'cs:chon:',
    'cs:chon:a:b',
    'cs:muc:s1:HUYET_HA',
    'cs:muc:s1:PHAI_LA:SURE',
    'cs:muc:s1:HUYET_HA:CHAC',
    'cs:muc::HUYET_HA:SURE',
    'cs:cu:s1',
  ])('id lạ %s giải mã ra null', (customId) => {
    expect(decodeSurveyComponentId(customId)).toBeNull();
  });

  it('ném lỗi thay vì dựng custom_id quá dài', () => {
    expect(() => encodeSurveySelectId('x'.repeat(100))).toThrow();
    expect(() =>
      encodeSurveyLevelId({
        surveyId: 'x'.repeat(100),
        targetClass: GuildClass.TO_VAN,
        confidence: ClassChangeConfidence.SURE,
      }),
    ).toThrow();
  });
});
