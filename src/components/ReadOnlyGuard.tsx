import { ReactNode, useEffect, useRef } from "react";
import { Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ACTION_TEXT = /\b(novo|nova|criar|adicionar|editar|excluir|remover|salvar|arquivar|desarquivar|duplicar|convidar|lançar|registrar|concluir|marcar|mover|gerar|importar|enviar)\b/i;
const ACTION_ICONS = ["lucide-plus", "lucide-pencil", "lucide-pen", "lucide-trash", "lucide-trash-2", "lucide-save", "lucide-archive", "lucide-edit", "lucide-square-pen"];

function isActionButton(el: HTMLElement) {
  const text = `${el.textContent ?? ""} ${el.getAttribute("aria-label") ?? ""} ${el.getAttribute("title") ?? ""}`;
  if (ACTION_TEXT.test(text)) return true;
  return ACTION_ICONS.some((cls) => el.querySelector(`svg.${cls}`));
}

/** Viewers: disables create/edit/delete controls. The database enforces the same rule. */
export function ReadOnlyGuard({ children }: { children: ReactNode }) {
  const { unitRole } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const readOnly = unitRole === "viewer";

  useEffect(() => {
    const root = ref.current;
    if (!readOnly || !root) return;
    const apply = () => {
      root.querySelectorAll<HTMLElement>("button, [role='checkbox'], [role='switch']").forEach((el) => {
        const isToggle = el.getAttribute("role") === "checkbox" || el.getAttribute("role") === "switch";
        if ((isToggle || isActionButton(el)) && !el.hasAttribute("disabled")) {
          el.setAttribute("disabled", "");
          el.setAttribute("aria-disabled", "true");
          el.style.pointerEvents = "none";
          el.style.opacity = "0.5";
        }
      });
      root.querySelectorAll<HTMLElement>("[draggable='true']").forEach((el) => el.setAttribute("draggable", "false"));
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [readOnly]);

  return (
    <div ref={ref}>
      {readOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" /> Modo somente leitura — seu papel nesta unidade é Visualizador.
        </div>
      )}
      {children}
    </div>
  );
}
