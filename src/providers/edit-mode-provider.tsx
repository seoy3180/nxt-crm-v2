'use client';

import { createContext, useContext, useState, useMemo } from 'react';

interface EditModeContextType {
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType>({ isEditing: false, setIsEditing: () => {} });

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [isEditing, setIsEditing] = useState(false);
  const value = useMemo(() => ({ isEditing, setIsEditing }), [isEditing]);
  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}
