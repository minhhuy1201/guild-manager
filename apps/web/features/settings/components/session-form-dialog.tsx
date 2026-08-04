"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { defaultDeadline } from "@shared/lib/battle-session";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BattleSession } from "@/features/attendance";
import { ApiError } from "@/lib/api-client";
import {
  useCreateSession,
  useUpdateSession,
} from "../hooks/use-session-mutations";
import { fromInputValue, toInputValue } from "../lib/datetime-input";

interface SessionFormDialogProps {
  /** Dialog đang mở hay không */
  open: boolean;
  /** Trận đang sửa; null nghĩa là đang thêm mới */
  session: BattleSession | null;
  /** Gọi khi dialog đóng lại */
  onOpenChange: (open: boolean) => void;
}

/**
 * Form thêm/sửa một trận. Chọn giờ đánh xong thì hạn chót tự điền theo luật gợi ý,
 * nhưng chỉ khi người dùng chưa tự sửa ô đó — đang gõ tay mà bị ghi đè là khó chịu nhất.
 * @param open - Dialog đang mở hay không
 * @param session - Trận đang sửa; null nghĩa là thêm mới
 * @param onOpenChange - Gọi khi dialog đóng lại
 * @returns Dialog form
 */
export function SessionFormDialog({
  open,
  session,
  onOpenChange,
}: SessionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Form nằm ở component con nên state tự reset mỗi lần mở lại. */}
        {open && (
          <SessionForm session={session} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface SessionFormProps {
  /** Trận đang sửa; null nghĩa là thêm mới */
  session: BattleSession | null;
  /** Gọi khi lưu thành công */
  onDone: () => void;
}

/**
 * Ba ô nhập của một trận: giờ đánh, tên bang đối thủ, hạn chót.
 * @param session - Trận đang sửa; null nghĩa là thêm mới
 * @param onDone - Gọi khi lưu thành công
 * @returns Form thêm/sửa trận
 */
function SessionForm({ session, onDone }: SessionFormProps) {
  const isGuildWar = session?.isGuildWar ?? false;

  const [dateTime, setDateTime] = useState(
    session ? toInputValue(session.dateTime) : ""
  );
  const [deadline, setDeadline] = useState(
    session ? toInputValue(session.deadline) : ""
  );
  const [opponent, setOpponent] = useState(session?.opponent ?? "");
  const [deadlineTouched, setDeadlineTouched] = useState(Boolean(session));
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateSession();
  const updateMutation = useUpdateSession();
  const saving = createMutation.isPending || updateMutation.isPending;

  /**
   * Đổi giờ đánh, đồng thời điền sẵn hạn chót nếu người dùng chưa tự sửa ô đó.
   * @param value - Giá trị mới của ô giờ đánh
   */
  function handleDateTimeChange(value: string) {
    setDateTime(value);

    if (deadlineTouched || value === "") return;

    const suggested = defaultDeadline(new Date(value));
    setDeadline(toInputValue(suggested.toISOString()));
  }

  /**
   * Gửi form: tạo mới hoặc cập nhật tuỳ theo đang sửa trận nào.
   * @param event - Sự kiện submit form
   * @returns Promise hoàn tất khi đã lưu xong hoặc đã hiển thị lỗi
   */
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const input = {
      dateTime: fromInputValue(dateTime),
      deadline: fromInputValue(deadline),
      opponent: isGuildWar ? null : opponent.trim() || null,
    };

    try {
      if (session) {
        await updateMutation.mutateAsync({ id: session.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      onDone();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Không lưu được thay đổi."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {session ? "Sửa ngày đánh" : "Thêm trận scrim"}
        </DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="session-date-time">Ngày giờ đánh</Label>
        <Input
          id="session-date-time"
          type="datetime-local"
          required
          value={dateTime}
          onChange={(event) => handleDateTimeChange(event.target.value)}
        />
      </div>

      {!isGuildWar && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="session-opponent">Tên bang đối thủ</Label>
          <Input
            id="session-opponent"
            maxLength={100}
            placeholder="Để trống nếu chưa chốt"
            value={opponent}
            onChange={(event) => setOpponent(event.target.value)}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="session-deadline">Hạn chót điểm danh</Label>
        <Input
          id="session-deadline"
          type="datetime-local"
          required
          value={deadline}
          onChange={(event) => {
            setDeadlineTouched(true);
            setDeadline(event.target.value);
          }}
        />
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu"}
        </Button>
      </DialogFooter>
    </form>
  );
}
