"use client";

import { useState } from "react";
import { AlertCircle, LoaderCircle, Save } from "lucide-react";

import {
  deadlineCapFor,
  isWithinDeadlineCap,
} from "@shared/lib";
import { DEADLINE_CAP_MESSAGE, type BattleSession } from "@shared/schemas";

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
import { ApiError } from "@/lib/api-client";
import {
  useCreateSession,
  useUpdateSession,
} from "../hooks/use-session-mutations";
import { fromInputValue, toInputValue } from "../lib/datetime-input";
import { DateTimeField } from "./date-time-field";

// Thêm trận mới thì hai ô giờ điền sẵn mốc hay dùng nhất, chỉ còn phải chọn ngày.
const DEFAULT_BATTLE_TIME = "20:30";
const DEFAULT_DEADLINE_TIME = "10:00";

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
   * Giá trị điền sẵn chính là trần — muộn nhất có thể mà vẫn hợp lệ.
   * @param value - Giá trị mới của ô giờ đánh
   */
  function handleDateTimeChange(value: string) {
    setDateTime(value);

    if (deadlineTouched || value === "") return;

    const cap = deadlineCapFor(new Date(value));
    setDeadline(toInputValue(cap.toISOString()));
  }

  /**
   * Gửi form: tạo mới hoặc cập nhật tuỳ theo đang sửa trận nào.
   * @param event - Sự kiện submit form
   * @returns Promise hoàn tất khi đã lưu xong hoặc đã hiển thị lỗi
   */
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Ô ngày giờ trả về rỗng khi người dùng gõ dở hoặc gõ ngày không có thật.
    if (!dateTime || (!isGuildWar && !deadline)) {
      setError("Ngày giờ chưa hợp lệ. Nhập theo dạng dd/mm/yyyy và HH:mm.");
      return;
    }

    // Ô ngày giờ là hai input text có mask, không phải `datetime-local`, nên
    // không có thuộc tính `max` để trình duyệt tự chặn — kiểm tra ở đây thay thế.
    if (
      !isGuildWar &&
      !isWithinDeadlineCap(new Date(deadline), new Date(dateTime))
    ) {
      setError(DEADLINE_CAP_MESSAGE);
      return;
    }

    try {
      if (!session) {
        await createMutation.mutateAsync({
          dateTime: fromInputValue(dateTime),
          deadline: fromInputValue(deadline),
          opponent: opponent.trim() || null,
        });
      } else {
        // Hạn chót của Guild War do hệ thống đặt; gửi lên là 400.
        await updateMutation.mutateAsync({
          id: session.id,
          input: {
            dateTime: fromInputValue(dateTime),
            ...(isGuildWar ? {} : { deadline: fromInputValue(deadline) }),
            opponent: isGuildWar ? null : opponent.trim() || null,
          },
        });
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

      <DateTimeField
        id="session-date-time"
        label="Ngày giờ đánh"
        value={dateTime}
        onChange={handleDateTimeChange}
        defaultTime={DEFAULT_BATTLE_TIME}
      />

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

      {isGuildWar ? (
        <div className="flex flex-col gap-1.5">
          <Label>Hạn chót điểm danh</Label>
          <p className="text-sm text-muted-foreground">
            17:00 Thứ 5 — cố định, không sửa được.
          </p>
        </div>
      ) : (
        <DateTimeField
          id="session-deadline"
          label="Hạn chót điểm danh"
          value={deadline}
          onChange={(value) => {
            setDeadlineTouched(true);
            setDeadline(value);
          }}
          defaultTime={DEFAULT_DEADLINE_TIME}
          description="Muộn nhất 10:00 sáng ngày đánh."
        />
      )}

      {error && (
        <div className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
          {saving ? "Đang lưu…" : "Lưu"}
        </Button>
      </DialogFooter>
    </form>
  );
}
