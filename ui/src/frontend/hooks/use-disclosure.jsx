import { useCallback, useState } from "react";

export function useDisclosure(isOpenDefault = false) {
  const [isOpen, setIsOpen] = useState(isOpenDefault);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback((toSet) => {
    if (typeof toSet === "undefined") {
      setIsOpen((state) => !state);
    } else {
      setIsOpen(Boolean(toSet));
    }
  }, []);

  return { isOpen, open, close, toggle };
}