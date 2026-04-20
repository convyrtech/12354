type Props = {
  children?: string;
};

export function StopListNote({
  children = "сегодня закончилось · будет завтра",
}: Props) {
  return (
    <em className="menu-stop-list-note" aria-live="polite">
      {children}
    </em>
  );
}
