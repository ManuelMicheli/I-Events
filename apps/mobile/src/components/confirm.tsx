import { createContext, Fragment, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { space } from "@/theme";
import { Button } from "./button";
import { Sheet } from "./sheet";
import { T } from "./text";

/**
 * Confirmation (Carta item 9), as the website's modal: a sheet with the question, an optional body,
 * the action across the whole width (red when it destroys something) and "Annulla" under it. It
 * replaces the system alert, so it looks like I-Events and also works in the web build.
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Eliminare la bozza?", confirmLabel: "Elimina", danger: true })) …
 */
export type ConfirmOptions = {
  title: string;
  /** A sentence, or a small piece of screen (an amount, a checkbox). */
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
};

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  // The options stay while the sheet fades out; `visible` says whether it is up.
  const [open, setOpen] = useState<(ConfirmOptions & { id: number }) | null>(null);
  const seq = useRef(0);
  const [visible, setVisible] = useState(false);
  const answer = useRef<(ok: boolean) => void>(undefined);
  const ask = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        answer.current?.(false);
        answer.current = resolve;
        seq.current += 1;
        setOpen({ ...o, id: seq.current });
        setVisible(true);
      }),
    [],
  );
  const close = (ok: boolean) => {
    answer.current?.(ok);
    answer.current = undefined;
    setVisible(false);
  };
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <Sheet visible={visible} title={open?.title ?? ""} onClose={() => close(false)}>
        {open && (
          // Keyed by the question, so a body with its own state (a checkbox) starts fresh each time.
          <Fragment key={open.id}>
            {typeof open.body === "string" ? (
              <T variant="body" tone="secondary">
                {open.body}
              </T>
            ) : (
              open.body
            )}
            <View style={styles.actions}>
              <Button block variant={open.danger ? "destructive" : "primary"} label={open.confirmLabel} onPress={() => close(true)} />
              <Button block variant="secondary" label={open.cancelLabel ?? "Annulla"} onPress={() => close(false)} />
            </View>
          </Fragment>
        )}
      </Sheet>
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space[2], paddingTop: space[2] },
});
