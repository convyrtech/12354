"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

export type WaiterInputHandle = { focus: () => void };

type Props = {
  onSubmit: (text: string) => Promise<void> | void;
  busy?: boolean;
};

export const WaiterInput = forwardRef<WaiterInputHandle, Props>(
  function WaiterInput({ onSubmit, busy }, ref) {
    const [expanded, setExpanded] = useState(false);
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus() {
        setExpanded(true);
      },
    }));

    useEffect(() => {
      if (!expanded) return;
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [expanded]);

    const submit = async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!value.trim() || busy) return;
      await onSubmit(value.trim());
      setValue("");
      setExpanded(false);
    };

    const handleKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void submit();
      }
      if (event.key === "Escape") {
        setExpanded(false);
        setValue("");
      }
    };

    if (!expanded) {
      return (
        <button
          type="button"
          className="menu-hero__input"
          onClick={() => setExpanded(true)}
          aria-label="Раскрыть поле для вопроса официанту"
        >
          <span className="menu-hero__input-affordance" aria-hidden>
            ⟶
          </span>
          <span>— спросите официанта</span>
        </button>
      );
    }

    return (
      <form className="menu-hero__input-form" onSubmit={submit}>
        <textarea
          ref={textareaRef}
          className="menu-hero__input-field"
          rows={2}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKey}
          placeholder="Что сегодня собираем? «Том-ям», «без остроты», «к столу на четверых»"
          disabled={busy}
          maxLength={240}
        />
        <div className="menu-hero__input-controls">
          <button
            type="button"
            className="menu-hero__input-cancel"
            onClick={() => {
              setExpanded(false);
              setValue("");
            }}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="menu-hero__input-submit"
            disabled={busy || !value.trim()}
            aria-label={busy ? "Отправка…" : undefined}
          >
            {busy ? "…" : "Спросить"}
          </button>
        </div>
      </form>
    );
  },
);
