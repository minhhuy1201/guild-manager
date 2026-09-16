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

  // Trình duyệt đổi `\` thành `/` trước khi resolve, nên `/\evil.example` ra đúng
  // `https://evil.example/`. Luật chỉ soi `//` cho nó đi lọt.
  it('từ chối gạch ngược, thứ trình duyệt đọc y như hai gạch', () => {
    expect(new URL('/\\evil.example', 'https://mmgh.example').href).toBe(
      'https://evil.example/',
    );
    expect(safeRedirect('/\\evil.example')).toBe('/');
    expect(safeRedirect('/\\\\evil.example')).toBe('/');
  });

  // Tab, xuống dòng và khoảng trắng bị trình duyệt xoá lúc resolve, nên chúng lận được một
  // authority qua một phép kiểm đọc chuỗi theo đúng mặt chữ.
  it('từ chối ký tự bị trình duyệt nuốt lúc resolve', () => {
    expect(safeRedirect('/\t/evil.example')).toBe('/');
    expect(safeRedirect('/\n/evil.example')).toBe('/');
    expect(safeRedirect('/ /evil.example')).toBe('/');
  });
});

describe('webUrl', () => {
  it('ghép origin, path và query', () => {
    expect(
      webUrl('http://localhost:3000', '/dang-nhap', { error: 'tu-choi' }),
    ).toBe('http://localhost:3000/dang-nhap?error=tu-choi');
  });
});
