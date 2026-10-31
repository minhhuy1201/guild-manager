# 05: Nhắc người chưa điền

Spec: [`docs/specs/2026-10-31-class-change-survey.md`](../../specs/2026-10-31-class-change-survey.md)

**What to build:** `/khao-sat-luu-phai nhac` (cùng quyền `KHAO_SAT_LUU_PHAI`) ping từng thành viên đã liên
kết Discord mà chưa trả lời đợt đang mở, kèm nút "Điền khảo sát". Không có đợt mở thì báo rõ. Mọi người đã
điền thì báo "mọi người đã điền" và không ping ai.

**Blocked by:** 01

**Status:** todo

- [ ] Subcommand `nhac` trong cùng file lệnh của ticket 01.
- [ ] Mention cắt theo giới hạn tin nhắn bằng helper sẵn có (như `cat-race-announcement`); tin ghi số người
      bị bỏ ra; `allowed_mentions.users` đúng bằng các id có trong nội dung.
- [ ] Thành viên chưa liên kết Discord không bị đếm vào danh sách ping nhưng tin ghi số người chưa điền mà
      không ping được.
- [ ] Test lệnh (kiểu `nhac-diem-danh.command.spec.ts`): không quyền, không có đợt mở, có người chưa điền,
      mọi người đã điền, danh sách vượt giới hạn.
- [ ] Ghi chú sau merge chạy `pnpm --filter api discord:register` nằm trong PR body.
