import { safeRedirect, webUrl } from '../oauth-redirect';

describe('safeRedirect', () => {
  it('giữ nguyên đường dẫn tương đối', () => {
    expect(safeRedirect('/lich-su-diem-danh')).toBe('/lich-su-diem-danh');
  });

  it('từ chối URL tuyệt đối và đường dẫn hai gạch (chống open redirect)', () => {
    expect(safeRedirect('https://evil.example/phish')).toBe('/');
    expect(safeRedirect('//evil.example/phish')).toBe('/');
    expect(safeRedirect(undefined)).toBe('/');
  });
});

describe('webUrl', () => {
  it('ghép origin, path và query', () => {
    expect(
      webUrl('http://localhost:3000', '/dang-nhap', { error: 'tu-choi' }),
    ).toBe('http://localhost:3000/dang-nhap?error=tu-choi');
  });
});
