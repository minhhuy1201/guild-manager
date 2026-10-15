"use client";

import type { FormEvent } from "react";
import { ArrowRight, Plus, Trash2, Type, X } from "lucide-react";
import {
  CAT_RACE_NAME_MAX,
  CAT_RACE_PRIZE_NAME_MAX,
  CAT_RACE_PRIZE_QUANTITY_MAX,
  type CatRacePrizeTemplate,
} from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import { Button } from "@/components/ui/button";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PRIZE_TIER_HINT } from "../lib/prize-tier-style";
import { CreateRaceStepIndicator } from "./create-race-step-indicator";
import { PrizeTierSelect } from "./prize-tier-select";

/**
 * One grid for the caption row and every prize row, so each caption sits over its column. Below `sm`
 * four columns leave the name about 15px (360px floor, root font 115%), so the quantity drops under
 * the tier and name and the captions go: the quantity carries its own "Số lượng" there.
 */
const PRIZE_ROW_GRID =
  "grid items-center gap-2 max-sm:grid-cols-[5rem_minmax(0,1fr)_2.5rem] sm:grid-cols-[5rem_minmax(0,1fr)_5rem_2.5rem]";

interface CreateRacePrizesStepProps {
  name: string;
  prizes: readonly CatRacePrizeTemplate[];
  onNameChange: (name: string) => void;
  onEditPrize: (index: number, patch: Partial<CatRacePrizeTemplate>) => void;
  onAddPrize: () => void;
  onRemovePrize: (index: number) => void;
  onCancel: () => void;
  onNext: () => void;
}

/**
 * Step 1 of the create form: the event's name and its prizes. Its own `<form>`, so the browser
 * blocks "Tiếp" on an empty prize name or a quantity out of range.
 * @param name - Event name
 * @param prizes - Prize lines
 * @param onNameChange - Receives the new name
 * @param onEditPrize - Patches one prize line
 * @param onAddPrize - Adds a blank prize line
 * @param onRemovePrize - Removes one prize line
 * @param onCancel - Closes the dialog
 * @param onNext - Goes to the roster step
 * @returns The step
 */
export function CreateRacePrizesStep({
  name,
  prizes,
  onNameChange,
  onEditPrize,
  onAddPrize,
  onRemovePrize,
  onCancel,
  onNext,
}: CreateRacePrizesStepProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader className="mb-2">
        <DialogTitle>Tạo đợt quay</DialogTitle>
      </DialogHeader>
      <CreateRaceStepIndicator current="prizes" />

      <div className="grid gap-2">
        <FieldLabel htmlFor="cat-race-name" icon={<Type />}>
          Tên đợt (không bắt buộc)
        </FieldLabel>
        <Input
          id="cat-race-name"
          value={name}
          maxLength={CAT_RACE_NAME_MAX}
          placeholder="Để trống: Đợt quay theo ngày"
          onChange={(event) => onNameChange(event.target.value)}
        />
      </div>

      <div className="grid gap-2">
        {/* Same inset as the inputs' own padding, so a caption starts where its text does. */}
        <div aria-hidden className={`${PRIZE_ROW_GRID} text-sm font-medium max-sm:hidden [&>span]:px-3.5`}>
          <span>Độ quý</span>
          <span>Hạng mục</span>
          <span>SL</span>
          <span />
        </div>
        {prizes.map((prize, index) => (
          <div
            key={index}
            className={`${PRIZE_ROW_GRID} max-sm:border-b max-sm:border-border max-sm:pb-3`}
          >
            <PrizeTierSelect
              label={`Độ quý của giải ${index + 1}`}
              value={prize.tier}
              onChange={(tier) => onEditPrize(index, { tier })}
            />
            <Input
              aria-label={`Tên hạng mục ${index + 1}`}
              value={prize.name}
              maxLength={CAT_RACE_PRIZE_NAME_MAX}
              onChange={(event) => onEditPrize(index, { name: event.target.value })}
              required
            />
            <div className="flex items-center gap-2 max-sm:col-span-2 max-sm:col-start-1 max-sm:row-start-2">
              <span aria-hidden className="shrink-0 text-sm font-medium whitespace-nowrap sm:hidden">
                Số lượng
              </span>
              <Input
                aria-label={`Số lượng hạng mục ${index + 1}`}
                type="number"
                min={1}
                max={CAT_RACE_PRIZE_QUANTITY_MAX}
                className="max-sm:w-24"
                value={prize.quantity}
                onChange={(event) => onEditPrize(index, { quantity: Number(event.target.value) })}
                required
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="max-sm:col-start-3 max-sm:row-start-1"
              aria-label={`Xoá hạng mục ${index + 1}`}
              disabled={prizes.length === 1}
              onClick={() => onRemovePrize(index)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={onAddPrize}>
          <Plus />
          Thêm hạng mục
        </Button>
        <p className="text-sm text-muted-foreground">{PRIZE_TIER_HINT}</p>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X />
          Huỷ
        </Button>
        <Button type="submit">
          Tiếp
          <ArrowRight />
        </Button>
      </DialogFooter>
    </form>
  );
}
