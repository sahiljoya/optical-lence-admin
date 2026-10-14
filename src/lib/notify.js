import { toast } from "sonner";

export const notify = {
  success: (message) => toast.success(message),
  warning: (message) => toast.warning(message),
  error: (message) => toast.error(message),
};
