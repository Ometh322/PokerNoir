import React from "react";
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Button, 
  useDisclosure 
} from "@heroui/react";
import { Icon } from "@iconify/react";

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "primary" | "danger" | "success" | "warning";
  icon?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const useConfirmation = () => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [options, setOptions] = React.useState<ConfirmationOptions>({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const confirm = (options: ConfirmationOptions) => {
    setOptions(options);
    onOpen();
  };

  const handleConfirm = () => {
    options.onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (options.onCancel) {
      options.onCancel();
    }
    onClose();
  };

  const dialog = (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex gap-2 items-center">
              {options.icon && (
                <Icon 
                  icon={options.icon} 
                  className={`text-xl ${
                    options.confirmColor === "danger" ? "text-danger" : 
                    options.confirmColor === "success" ? "text-success" :
                    options.confirmColor === "warning" ? "text-warning" :
                    "text-primary"
                  }`} 
                />
              )}
              {options.title}
            </ModalHeader>
            <ModalBody>
              <p>{options.message}</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={handleCancel}>
                {options.cancelLabel || "Отмена"}
              </Button>
              <Button 
                color={options.confirmColor || "primary"} 
                onPress={handleConfirm}
              >
                {options.confirmLabel || "Подтвердить"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );

  return { confirm, dialog };
};