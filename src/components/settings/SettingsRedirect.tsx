import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSettingsModalStore } from "../../store/settings-modal-store";

export function SettingsRedirect() {
  const open = useSettingsModalStore((state) => state.open);

  useEffect(() => {
    open();
  }, [open]);

  return <Navigate to="/play" replace />;
}
