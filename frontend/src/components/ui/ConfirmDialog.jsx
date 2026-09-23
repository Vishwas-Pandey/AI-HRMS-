import { Modal } from "./Modal";
import { Button } from "./Button";

export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", tone = "danger", loading }) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-sm text-slate-600">{message}</p>
  </Modal>
);
