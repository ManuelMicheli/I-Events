import { Perforation } from "@/components/perforation";

/** While a page of the app loads: the perforation, only if the wait goes past 200 ms. */
export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-text">
      <Perforation late label="Caricamento" />
    </div>
  );
}
