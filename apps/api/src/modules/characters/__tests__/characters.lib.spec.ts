import { generateId, slugifyName } from '../characters.lib';

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
    const ids = new Set(
      Array.from({ length: 50 }, () => generateId('Mèo Béo')),
    );

    expect(ids.size).toBe(50);
  });
});
