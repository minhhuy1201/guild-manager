import { create } from "zustand";

interface AuthState {
  /** Modal đăng nhập có đang mở hay không */
  isDialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
}

/**
 * Store client state cho đăng nhập (Zustand) — chỉ giữ trạng thái modal.
 * Thông tin phiên đăng nhập nằm ở cookie httpOnly và do server cung cấp xuống,
 * KHÔNG lưu ở client để tránh giả mạo.
 */
export const useAuthStore = create<AuthState>((set) => ({
  isDialogOpen: false,
  setDialogOpen: (open) => set({ isDialogOpen: open }),
}));
