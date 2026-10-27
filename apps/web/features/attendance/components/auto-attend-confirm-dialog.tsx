"use client";

import { Repeat } from "lucide-react";

import { MutationDialog } from "@/components/shared/mutation-dialog";
import { useSetAutoAttend } from "../hooks/use-auto-attend";

interface AutoAttendConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog wants to open or close */
  onOpenChange: (open: boolean) => void;
}

/**
 * The confirmation a member passes before turning Auto-attend on. It says plainly that it commits
 * them to every future battle, because turning it on is one press and its effect is not.
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the dialog wants to open or close
 * @returns The confirmation dialog
 */
export function AutoAttendConfirmDialog({
  open,
  onOpenChange,
}: AutoAttendConfirmDialogProps) {
  const setAutoAttend = useSetAutoAttend();

  return (
    <MutationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Bật tự động điểm danh?"
      submitLabel="Bật"
      pendingLabel="Đang bật…"
      submitIcon={<Repeat />}
      cancelLabel="Để sau"
      fallbackError="Không bật được tự động điểm danh, thử lại giúp mình."
      successMessage="Đã bật tự động điểm danh."
      showCancel
      run={async () => {
        await setAutoAttend.mutateAsync(true);
      }}
    >
      <div className="flex flex-col gap-3 text-sm">
        <p>
          Mọi trận đánh trong tương lai sẽ được tự động điểm danh <strong>Có</strong> cho bạn.
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
          <li>
            Trận nào bận, vào đổi thành <strong>Không</strong> trước hạn chót, hoặc dùng Xin nghỉ
            phép.
          </li>
          <li>Câu trả lời bạn đã bấm giữ nguyên.</li>
          <li>Tắt bất cứ lúc nào. Các ngày đã khoá vẫn giữ Có.</li>
        </ul>
      </div>
    </MutationDialog>
  );
}
