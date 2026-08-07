import { generateId, generatePassword, slugifyName } from '../characters.lib';

/** Bảng chữ cái dùng cho mật khẩu và hậu tố id — đã bỏ các ký tự dễ nhầm. */
const ALPHABET = /^[abcdefghijkmnpqrstuvwxyz23456789]+$/;

describe('slugifyName', () => {
  it('bỏ dấu tiếng Việt và nối bằng gạch ngang', () => {
    expect(slugifyName('Mèo Béo')).toBe('meo-beo');
    expect(slugifyName('Nhậm Doanh Doanh')).toBe('nham-doanh-doanh');
  });

  it('quy chữ đ về d', () => {
    expect(slugifyName('Đông Phương Bất Bại')).toBe('dong-phuong-bat-bai');
  });

  it('gộp ký tự lạ và khoảng trắng thừa thành một gạch ngang', () => {
    expect(slugifyName('  Mèo___Mập !! Giang  Hồ  ')).toBe('meo-map-giang-ho');
  });

  it('trả về thanh-vien khi không còn ký tự nào slug hoá được', () => {
    expect(slugifyName('小明')).toBe('thanh-vien');
    expect(slugifyName('!!!')).toBe('thanh-vien');
  });
});

describe('generateId', () => {
  it('ghép prefix từ tên với hậu tố 6 ký tự', () => {
    const id = generateId('Mèo Béo');

    expect(id).toMatch(/^meo-beo-[abcdefghijkmnpqrstuvwxyz23456789]{6}$/);
  });

  it('sinh id khác nhau cho cùng một tên', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId('Mèo Béo')));

    expect(ids.size).toBe(50);
  });
});

describe('generatePassword', () => {
  it('dài đúng 8 ký tự và chỉ dùng bảng chữ cái đã chọn', () => {
    for (let i = 0; i < 100; i += 1) {
      const password = generatePassword();

      expect(password).toHaveLength(8);
      expect(password).toMatch(ALPHABET);
    }
  });

  it('không sinh ra hai mật khẩu giống nhau liên tiếp', () => {
    const passwords = new Set(
      Array.from({ length: 50 }, () => generatePassword()),
    );

    expect(passwords.size).toBe(50);
  });
});
