interface ErrorNoticeProps {
  /** The Vietnamese sentence to show */
  message: string;
}

/**
 * A short refusal or failure, shown inline above the content it is about.
 *
 * One component rather than two copies of the same markup: the login page and the home page both
 * report a redirect the user did not ask for, and they should look the same when they do.
 * @param message - The Vietnamese sentence to show
 * @returns The notice banner
 */
export function ErrorNotice({ message }: ErrorNoticeProps) {
  return (
    <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}
