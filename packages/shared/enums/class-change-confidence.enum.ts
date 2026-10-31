/** How sure a member is about a class change they plan, in a Class survey. */
export enum ClassChangeConfidence {
  SURE = "SURE",
  CONSIDERING = "CONSIDERING",
}

/** Vietnamese display label per confidence. */
export const CLASS_CHANGE_CONFIDENCE_LABEL: Record<ClassChangeConfidence, string> = {
  [ClassChangeConfidence.SURE]: "Chắc chắn",
  [ClassChangeConfidence.CONSIDERING]: "Đang cân nhắc",
};
