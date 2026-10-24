"use client";

import { useId } from "react";
import type { CatRaceEventDetail } from "@guild/shared/schemas";

import { toastError, toastSuccess } from "@/components/shared/toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { errorMessageOf } from "@/lib/error-message";
import { useSetCatRaceFeatured } from "../hooks/use-cat-race-mutations";
import { FEATURE_LOCK_LABEL, featureLockReason } from "../lib/feature-lock";

interface FeatureRaceSwitchProps {
  event: CatRaceEventDetail;
}

/**
 * "Hiện ở trang chủ": shows the ended event on the landing page's Bảng vàng. An event already
 * featured stays switchable off even if it could no longer be featured.
 * @param event - The event
 * @returns The switch, with the reason beside it when it is locked
 */
export function FeatureRaceSwitch({ event }: FeatureRaceSwitchProps) {
  const id = useId();
  const reasonId = useId();
  const setFeatured = useSetCatRaceFeatured();
  const recoverSession = useSessionRecovery();
  const reason = featureLockReason(event);
  const isLocked = reason !== null && !event.featured;

  const change = async (featured: boolean) => {
    try {
      await setFeatured.mutateAsync({ id: event.id, featured });
    } catch (error) {
      if (recoverSession(error)) return;
      toastError(errorMessageOf(error, "Không đổi được trạng thái ở trang chủ."));
      return;
    }

    toastSuccess(
      featured
        ? "Đã hiện đợt đua ở trang chủ."
        : "Đã ẩn đợt đua khỏi trang chủ."
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Switch
        id={id}
        checked={event.featured}
        aria-describedby={isLocked ? reasonId : undefined}
        disabled={isLocked || setFeatured.isPending}
        onCheckedChange={(checked) => void change(checked)}
      />
      <Label htmlFor={id} className="text-sm">
        Hiện ở trang chủ
      </Label>
      {isLocked ? (
        <span id={reasonId} className="text-sm text-muted-foreground">{FEATURE_LOCK_LABEL[reason]}</span>
      ) : null}
    </div>
  );
}
