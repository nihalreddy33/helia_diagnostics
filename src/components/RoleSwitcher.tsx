import { switchRole } from "@/app/actions/auth";
import { ROLES, ROLE_LABELS } from "@/lib/types";
import type { Role } from "@/lib/types";

/**
 * Mock-auth dev control: toggle the active role. Renders as a row of buttons,
 * each a tiny form posting to the `switchRole` server action — no client JS
 * required.
 */
export function RoleSwitcher({ activeRole }: { activeRole: Role }) {
  return (
    <div
      className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
      role="group"
      aria-label="Switch active role (mock auth)"
    >
      {ROLES.map((role) => {
        const isActive = role === activeRole;
        return (
          <form key={role} action={switchRole}>
            <input type="hidden" name="role" value={role} />
            <button
              type="submit"
              aria-pressed={isActive}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {ROLE_LABELS[role]}
            </button>
          </form>
        );
      })}
    </div>
  );
}
