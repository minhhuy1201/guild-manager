import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { DiscordLoginButton, loginErrorMessage } from "@/features/auth";

export const metadata: Metadata = {
  title: "Đăng nhập — Mèo Mập Giang Hồ",
  description: "Đăng nhập bằng Discord để điểm danh",
};

/**
 * Route "/dang-nhap" — trang duy nhất khách chưa đăng nhập vào được.
 * @param props.searchParams - `error` (mã lỗi từ API) và `redirect` (trang định vào)
 * @returns Trang đăng nhập
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect } = await searchParams;
  const message = loginErrorMessage(error);

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <h1 className="text-xl font-semibold">Mèo Mập Giang Hồ</h1>
        <p className="text-sm text-muted-foreground">
          Đăng nhập bằng Discord để xem và điểm danh lịch đánh trong tuần.
        </p>
        {message && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        )}
        <DiscordLoginButton redirect={redirect} />
      </CardContent>
    </Card>
  );
}
