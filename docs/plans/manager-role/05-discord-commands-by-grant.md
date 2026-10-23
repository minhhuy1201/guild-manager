# 05: Command Discord theo Grant

Spec: [`docs/specs/2026-10-22-manager-role.md`](../../specs/2026-10-22-manager-role.md).

**What to build:** Manager được tick command admin nào thì chạy được command đó trên Discord, không
cần Capability web nào. Ai gọi command admin mà không có Grant (Member, hoặc Manager chưa được tick)
nhận cùng một câu ephemeral "Bạn chưa được cấp quyền dùng lệnh này". Câu "chưa liên kết nhân vật"
vẫn đi trước. Bot nạp Grant của người gọi khi resolve actor. Grant `/diem-danh-ho` cũng cho điểm
danh hộ qua bot mà không cần Capability điểm danh, nhưng chỉ cho người khác: bảng của chính nhân
vật mình vẫn theo luật Member.

**Blocked by:** 02

**Status:** done

- [x] Mỗi command admin có test: Admin chạy được, Manager được cấp chạy được, Manager chưa cấp và
      Member nhận câu từ chối chung, người chưa liên kết nhận câu chưa liên kết
- [x] `/ping` và `/diem-danh` vẫn mở cho mọi người
