import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from "@heroui/react";
import { Icon } from "@iconify/react";

interface ConfirmationProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "primary" | "secondary" | "success" | "warning" | "danger";
  icon?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const useConfirmation = () => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [config, setConfig] = React.useState<ConfirmationProps>({
    title: "",
    message: "",
    confirmLabel: "Подтвердить",
    cancelLabel: "Отмена",
    confirmColor: "primary",
    onConfirm: () => {},
  });

  const confirm = (props: ConfirmationProps) => {
    // Проверяем, что message - это строка
    const safeProps = {
      ...props,
      message: typeof props.message === 'string' ? props.message : String(props.message)
    };
    
    setConfig(safeProps);
    onOpen();
  };

  const handleConfirm = () => {
    onClose();
    config.onConfirm();
  };

  const handleCancel = () => {
    onClose();
    if (config.onCancel) {
      config.onCancel();
    }
  };

  const dialog = (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center gap-2">
              {config.icon && <Icon icon={config.icon} className="text-xl" />}
              {config.title}
            </ModalHeader>
            <ModalBody>
              <p>{config.message}</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={handleCancel}>
                {config.cancelLabel}
              </Button>
              <Button color={config.confirmColor} onPress={handleConfirm}>
                {config.confirmLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );

  return { confirm, dialog };
};