# 05: Xoá hook sửa và xoá đợt đua không dùng

**What to build:** Bỏ `useUpdateCatRace` và `useDeleteCatRace` vì không màn hình nào gọi tới. Người dùng không thấy gì thay đổi.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Hai hook và test của chúng bị xoá.
- [x] Server action `updateCatRace` / `deleteCatRace` bị xoá nếu không còn chỗ dùng, cùng test của chúng; endpoint API giữ nguyên.
- [x] Test, typecheck, lint của web xanh.
